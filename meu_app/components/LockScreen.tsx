import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, BackHandler, Pressable, TextInput } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withRepeat, withSpring } from 'react-native-reanimated';
import { useAppContext } from '@/src/contexts/AppContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LockScreenProps {
  visible: boolean;
  onUnlocked: () => void;
}

export default function LockScreen({ visible, onUnlocked }: LockScreenProps) {
  const router = useRouter();
  const { activePalette: theme, setFakeVault, disguiseMode } = useAppContext();
  const [pin, setPin] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [lockStyle, setLockStyle] = useState<'geometric' | 'standard'>('geometric');
  
  const [crashKeypadVisible, setCrashKeypadVisible] = useState(false);
  const [tapHistory, setTapHistory] = useState<{ time: number; type: 'tap' | 'long' }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');

  // Browser Disguise States
  const [browserKeypadVisible, setBrowserKeypadVisible] = useState(false);
  const [browserKeyword, setBrowserKeyword] = useState('Batman');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultsVisible, setSearchResultsVisible] = useState(false);

  const shakeOffset = useSharedValue(0);

  const triggerShake = () => {
    shakeOffset.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withRepeat(withTiming(10, { duration: 50 }), 3, true),
      withTiming(0, { duration: 50 })
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }]
  }));

  useEffect(() => {
    if (visible) {
      setPin('');
      setErrorVisible(false);
      setErrorCount(0);
      setCrashKeypadVisible(false);
      setBrowserKeypadVisible(false);
      setSearchQuery('');
      setSearchResultsVisible(false);
      setTapHistory([]);
      SecureStore.getItemAsync('disguise_keyword').then(kw => {
        if (kw) setBrowserKeyword(kw);
      });
      SecureStore.getItemAsync('lock_bg_uri').then(uri => {
        if (uri) setCustomBg(uri);
      });
      SecureStore.getItemAsync('lock_style').then(style => {
        if (style === 'standard') setLockStyle('standard');
        else setLockStyle('geometric');
      });
      SecureStore.getItemAsync('intruder_video_duration').then(val => {
        if (val && val !== '0') setCameraMode('video');
        else setCameraMode('picture');
      });
    }
  }, [visible]);

  const cameraRef = React.useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const captureIntruder = async () => {
    try {
      // Verifica se a permissão foi dada e se a configuração de alerta está ativada
      const alertsEnabled = await SecureStore.getItemAsync('breakin_alerts');
      if (alertsEnabled === 'false') {
        Alert.alert('Aviso', 'A função de selfie de intruso está desligada nas configurações!');
        return;
      }
      if (!permission?.granted) {
        Alert.alert('Aviso', 'O aplicativo não tem permissão para usar a câmera.');
        return;
      }

      if (!cameraRef.current) {
        Alert.alert('Aviso', 'O hardware da câmera ainda não terminou de ligar. Tente errar de novo.');
        return;
      }

      const videoDuration = await SecureStore.getItemAsync('intruder_video_duration');
      const isVideo = videoDuration && videoDuration !== '0';

        const logAlert = async (uri: string, type: 'photo' | 'video') => {
        const timestamp = new Date().toISOString();
        const logsStr = await AsyncStorage.getItem('intruder_alerts');
        let logs = logsStr ? JSON.parse(logsStr) : [];
        logs.unshift({ id: Date.now().toString(), timestamp, type, uri });
        if (logs.length > 20) logs = logs.slice(0, 20);
        await AsyncStorage.setItem('intruder_alerts', JSON.stringify(logs));
      };

      // Alarme Sonoro de Pânico
      const alarmEnabled = await SecureStore.getItemAsync('alarm_siren_enabled');
      if (alarmEnabled === 'true') {
        try {
          const soundFile = (await SecureStore.getItemAsync('alarm_siren_sound')) || 'digital_watch_alarm_long.ogg';
          const { sound } = await Audio.Sound.createAsync(
            { uri: `https://actions.google.com/sounds/v1/alarms/${soundFile}` },
            { shouldPlay: true, isLooping: true, volume: 1.0 }
          );
          Vibration.vibrate([500, 200, 500, 200], true);
          
          setTimeout(async () => {
            await sound.stopAsync();
            await sound.unloadAsync();
            Vibration.cancel();
          }, 15000); // Toca por 15 segundos ou até o app fechar
        } catch (e) {
        }
      }

      if (isVideo) {
        const { status: micStatus } = await Audio.requestPermissionsAsync();
        if (micStatus !== 'granted') {
          Alert.alert('Aviso', 'Permissão de microfone necessária para o vídeo.');
          return;
        }

        setIsRecording(true);
        const durationSec = parseInt(videoDuration, 10);
        
        setTimeout(() => {
          if (cameraRef.current) {
            cameraRef.current.stopRecording();
          }
          setIsRecording(false);
        }, durationSec * 1000);

        const video = await cameraRef.current.recordAsync();
        if (video && video.uri) {
          const { importToAlbum } = await import('@/src/services/VaultService');
          const secureUri = await importToAlbum(video.uri, 'INTRUSOS', false);
          await logAlert(secureUri, 'video');
          Alert.alert('🚨 Intruso Detectado', 'Protocolo de vídeo acionado e salvo.');
        }
      } else {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.3 });
        if (photo && photo.uri) {
          const { importToAlbum } = await import('@/src/services/VaultService');
          const secureUri = await importToAlbum(photo.uri, 'INTRUSOS', false);
          await logAlert(secureUri, 'photo');

          // Microfone Espião Premium
          const micEnabled = await SecureStore.getItemAsync('spy_mic_enabled');
          if (micEnabled === 'true') {
            const { status: micStatus } = await Audio.requestPermissionsAsync();
            if (micStatus === 'granted') {
              try {
                await Audio.setAudioModeAsync({
                  allowsRecordingIOS: true,
                  playsInSilentModeIOS: true,
                });
                const recording = new Audio.Recording();
                await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
                await recording.startAsync();

                setTimeout(async () => {
                  try {
                    await recording.stopAndUnloadAsync();
                    const audioUri = recording.getURI();
                    if (audioUri) {
                      let finalAudioUri = audioUri;
                      if (!audioUri.endsWith('.m4a') && !audioUri.endsWith('.caf') && !audioUri.endsWith('.3gp') && !audioUri.endsWith('.wav')) {
                        const tempAudioUri = FileSystem.cacheDirectory + 'spy_recording_' + Date.now() + '.m4a';
                        await FileSystem.copyAsync({ from: audioUri, to: tempAudioUri });
                        finalAudioUri = tempAudioUri;
                      }

                      const { importToAlbum: importFile } = await import('@/src/services/VaultService');
                      const secAudioUri = await importFile(finalAudioUri, 'INTRUSOS', false);
                      await logAlert(secAudioUri, 'photo');

                      if (finalAudioUri !== audioUri) {
                        try {
                          await FileSystem.deleteAsync(finalAudioUri, { idempotent: true });
                        } catch (delErr) {}
                      }
                    }
                  } catch (audioErr) {
                  }
                }, 15000);
              } catch (audioStartErr) {
              }
            }
          }

          Alert.alert('🚨 Intruso Detectado', 'Protocolo de segurança premium acionado. Evidências salvas no cofre!');
        }
      }
    } catch (e: any) {
      setIsRecording(false);
      Alert.alert('Erro Fatal Câmera', e.message || String(e));
    }
  };

  const validatePin = async (currentPin: string) => {
    const savedPin = await SecureStore.getItemAsync('user_pin');
    const fakePin = await SecureStore.getItemAsync('fake_pin');
    const kamikazePin = await SecureStore.getItemAsync('kamikaze_pin');

    if (currentPin === savedPin) {
      setFakeVault(false);
      setErrorCount(0);
      await SecureStore.setItemAsync('last_login_timestamp', new Date().toISOString());
      router.replace('/');
      onUnlocked();
    } else if (currentPin === fakePin) {
      setFakeVault(true);
      setErrorCount(0);
      await SecureStore.setItemAsync('last_login_timestamp', new Date().toISOString());
      router.replace('/');
      onUnlocked();
    } else if (kamikazePin && currentPin === kamikazePin) {
      // Modo Kamikaze: Apaga o cofre real em background e abre o cofre falso (isca)
      const { nukeRealVault } = await import('@/src/services/VaultService');
      await nukeRealVault();
      setFakeVault(true);
      setErrorCount(0);
      await SecureStore.setItemAsync('last_login_timestamp', new Date().toISOString());
      router.replace('/');
      onUnlocked();
    } else {
      setErrorVisible(true);
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const newErrors = errorCount + 1;
      setErrorCount(newErrors);
      
      // Solicita permissão no primeiro erro para dar tempo da câmera ligar no background
      if (newErrors === 1 && !permission?.granted) {
        requestPermission();
      }
      
      if (newErrors >= 3) {
        captureIntruder();
      } else {
        // Se ainda não chegou a 3 erros, avisamos no modo debug ou fazemos uma vibração mais forte
      }
      
      setTimeout(() => setPin(''), 500);
    }
  };

  const handlePress = async (num: string) => {
    if (isRecording) return;
    if (disguiseMode === 'calculator') {
      if (pin.length < 8) setPin(pin + num);
      return;
    }

    if (pin.length < 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newPin = pin + num;
      setPin(newPin);
      setErrorVisible(false);

      if (newPin.length === 4) {
        validatePin(newPin);
      }
    }
  };

  // Calculator Logic
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcMemory, setCalcMemory] = useState<number | null>(null);
  const [calcOperator, setCalcOperator] = useState<string | null>(null);

  const handleCalcPress = (key: string) => {
    if (isRecording) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Secret Unlock Logic
    if (key === '=') {
      validatePin(pin);
      // Reset after attempt
      setPin('');
    } else if (!isNaN(Number(key))) {
      setPin(pin + key);
    } else {
      setPin(''); // Reset hidden pin buffer if they press operators
    }

    // Real Math Logic
    if (key === 'AC') {
      setCalcDisplay('0');
      setCalcMemory(null);
      setCalcOperator(null);
    } else if (key === '+/-') {
      setCalcDisplay(String(Number(calcDisplay) * -1));
    } else if (key === '%') {
      setCalcDisplay(String(Number(calcDisplay) / 100));
    } else if (['/', 'x', '-', '+'].includes(key)) {
      setCalcOperator(key);
      setCalcMemory(Number(calcDisplay));
      setCalcDisplay('0');
    } else if (key === '=') {
      if (calcOperator && calcMemory !== null) {
        let result = 0;
        const current = Number(calcDisplay);
        if (calcOperator === '+') result = calcMemory + current;
        if (calcOperator === '-') result = calcMemory - current;
        if (calcOperator === 'x') result = calcMemory * current;
        if (calcOperator === '/') result = current !== 0 ? calcMemory / current : 0;
        setCalcDisplay(String(result));
        setCalcOperator(null);
        setCalcMemory(null);
      }
    } else if (key === '.') {
      if (!calcDisplay.includes('.')) setCalcDisplay(calcDisplay + '.');
    } else {
      setCalcDisplay(calcDisplay === '0' ? key : calcDisplay + key);
    }
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPin('');
  };
  
  const handleCrashTextPress = () => {
    const now = Date.now();
    const updated = [...tapHistory, { time: now, type: 'tap' as const }].slice(-4);
    if (updated.length === 4) {
      const timeDiff = updated[3].time - updated[0].time;
      if (timeDiff < 2000) { // 4 toques em menos de 2 segundos
        setCrashKeypadVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTapHistory([]);
        return;
      }
    }
    setTapHistory(updated);
  };

  const handleCrashTextLongPress = () => {
    setCrashKeypadVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTapHistory([]);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(pin.slice(0, -1));
  };

  if (disguiseMode === 'crash' && !crashKeypadVisible) {
    return (
      <Modal visible={visible} animationType="fade" transparent={false}>
        <View style={styles.crashContainer}>
          {permission?.granted && (
            <View style={{ position: 'absolute', width: 16, height: 16, top: 0, left: 0, overflow: 'hidden', opacity: 0.01 }}>
              <CameraView 
                ref={cameraRef} 
                facing="front" 
                mode={cameraMode}
                style={{ width: 16, height: 16 }} 
              />
            </View>
          )}

          <View style={styles.crashDialog}>
            <Pressable 
              onPress={handleCrashTextPress} 
              onLongPress={handleCrashTextLongPress}
              delayLongPress={1500}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 10, paddingRight: 20 }}
            >
              <Text style={styles.crashTitle}>Erro</Text>
              <Text style={[styles.crashTitle, { marginLeft: 6 }]}>do Sistema</Text>
            </Pressable>
            <Text style={styles.crashText}>
              O aplicativo StashFlix parou de funcionar inesperadamente devido a uma falha crítica de sistema.
            </Text>
            <TouchableOpacity 
              style={styles.crashButton} 
              onPress={() => BackHandler.exitApp()}
              activeOpacity={0.8}
            >
              <Text style={styles.crashButtonText}>Fechar app</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (disguiseMode === 'browser' && !browserKeypadVisible) {
    const handleSearchSubmit = () => {
      if (searchQuery.trim().toLowerCase() === browserKeyword.toLowerCase().trim()) {
        setBrowserKeypadVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (searchQuery.trim() !== '') {
        setSearchResultsVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    };

    return (
      <Modal visible={visible} animationType="fade" transparent={false}>
        <View style={[styles.browserContainer, { backgroundColor: '#121212' }]}>
          {permission?.granted && (
            <View style={{ position: 'absolute', width: 16, height: 16, top: 0, left: 0, overflow: 'hidden', opacity: 0.01 }}>
              <CameraView 
                ref={cameraRef} 
                facing="front" 
                mode={cameraMode}
                style={{ width: 16, height: 16 }} 
              />
            </View>
          )}

          {/* Browser Address Bar */}
          <View style={styles.browserHeader}>
            <Text style={{ marginRight: 6 }}>🔒</Text>
            <Text style={styles.browserAddress} numberOfLines={1}>https://www.google.com</Text>
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResultsVisible(false); }}>
              <Text style={{ color: '#888', fontSize: 16 }}>↻</Text>
            </TouchableOpacity>
          </View>

          {/* Main View */}
          <View style={styles.browserBody}>
            {!searchResultsVisible ? (
              // Mock Google Search Page
              <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                {/* Logo Google */}
                <View style={{ flexDirection: 'row', marginBottom: 30 }}>
                  <Text style={[styles.googleLetter, { color: '#4285F4' }]}>G</Text>
                  <Text style={[styles.googleLetter, { color: '#EA4335' }]}>o</Text>
                  <Text style={[styles.googleLetter, { color: '#FBBC05' }]}>o</Text>
                  <Text style={[styles.googleLetter, { color: '#4285F4' }]}>g</Text>
                  <Text style={[styles.googleLetter, { color: '#34A853' }]}>l</Text>
                  <Text style={[styles.googleLetter, { color: '#EA4335' }]}>e</Text>
                </View>

                {/* Simulated Google Search Bar */}
                <View style={styles.searchBarContainer}>
                  <Text style={{ color: '#9aa0a6', fontSize: 16, marginRight: 10 }}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Pesquise ou digite um URL"
                    placeholderTextColor="#9aa0a6"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearchSubmit}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Text style={{ color: '#9aa0a6', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.browserShortcuts}>
                  {[
                    { label: 'Notícias', icon: '📰' },
                    { label: 'Imagens', icon: '🖼️' },
                    { label: 'Gmail', icon: '✉️' },
                    { label: 'Drive', icon: '💾' }
                  ].map((sc, i) => (
                    <View key={i} style={styles.shortcutBtn}>
                      <View style={styles.shortcutIconBox}>
                        <Text style={{ fontSize: 20 }}>{sc.icon}</Text>
                      </View>
                      <Text style={styles.shortcutLabel}>{sc.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              // Mock Google Search Results
              <View style={{ width: '100%', flex: 1, paddingHorizontal: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 15 }}>
                  <Text style={{ color: '#4285F4', fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', marginRight: 10 }}>G</Text>
                  <View style={[styles.searchBarContainer, { flex: 1, height: 40 }]}>
                    <TextInput
                      style={[styles.searchInput, { fontSize: 13 }]}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onSubmitEditing={handleSearchSubmit}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                    />
                  </View>
                </View>
                
                <Text style={styles.resultsHeader}>Aproximadamente 0 resultados para &quot;{searchQuery}&quot;</Text>

                <View style={styles.resultCard}>
                  <Text style={styles.resultTitle}>Nenhum resultado de inteligência pública encontrado</Text>
                  <Text style={styles.resultSnippet}>
                    Verifique sua conexão ou digite termos adicionais. O tráfego de dados para este servidor está encriptado com protocolo de ponta-a-ponta.
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.backSearchBtn}
                  onPress={() => setSearchResultsVisible(false)}
                >
                  <Text style={styles.backSearchBtnText}>Voltar para o Buscador</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  if (disguiseMode === 'calculator') {
    return (
      <Modal visible={visible} animationType="fade" transparent={false}>
        <View style={[styles.container, { backgroundColor: '#000' }]}>
          
          {/* Câmera Oculta para capturar invasores no Modo Calculadora */}
          {permission?.granted && (
            <View style={{ position: 'absolute', width: 16, height: 16, top: 0, left: 0, overflow: 'hidden', opacity: 0.01 }}>
              <CameraView 
                ref={cameraRef} 
                facing="front" 
                mode={cameraMode}
                style={{ width: 16, height: 16 }} 
              />
            </View>
          )}

          <View style={styles.calcDisplayContainer}>
            <Text style={styles.calcLogo}>K</Text>
            <Text style={styles.calcText} numberOfLines={1} adjustsFontSizeToFit>{calcDisplay}</Text>
          </View>
          <View style={styles.calcKeypad}>
            {['AC','+/-','%','/','7','8','9','x','4','5','6','-','1','2','3','+','0','.','='].map((key, i) => {
              const isOpCol = ['/','x','-','+','='].includes(key);
              const isTopRow = ['AC','+/-','%'].includes(key);
              const isZero = key === '0';
              return (
                <TouchableOpacity 
                  key={i} 
                  style={[
                    styles.calcKey, 
                    isOpCol && styles.calcKeyOp,
                    isTopRow && styles.calcKeyTop,
                    isZero && { width: '47%', alignItems: 'flex-start', paddingLeft: 35 }
                  ]} 
                  onPress={() => handleCalcPress(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.calcKeyText, 
                    isTopRow && { color: '#000' }
                  ]}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        
        {customBg && (
          <Animated.Image 
            source={{ uri: customBg }} 
            style={StyleSheet.absoluteFillObject} 
            resizeMode="cover" 
          />
        )}
        
        {/* Overlay Escuro para garantir leitura dos números */}
        {customBg && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        )}

        {/* Câmera Oculta para capturar invasores */}
        {permission?.granted && (
          <View style={{ position: 'absolute', width: 16, height: 16, top: 0, left: 0, overflow: 'hidden', opacity: 0.01 }}>
            <CameraView 
              ref={cameraRef} 
              facing="front" 
              mode="picture"
              style={{ width: 16, height: 16 }} 
            />
          </View>
        )}

        <Text style={[styles.title, { color: theme.text }]}>StashFlix</Text>
        <Text style={[styles.subtitle, { color: errorVisible ? theme.error : theme.textSecondary }]}>
          {isRecording ? 'VERIFICANDO PIN...' : (errorVisible ? 'ACESSO NEGADO' : 'SISTEMA TRANCADO')}
        </Text>
        
        <Animated.View style={[styles.display, animatedStyle]}>
          {[0, 1, 2, 3].map((i) => {
            const isFilled = pin.length > i;
            return (
              <View key={i} style={[
                styles.dot, 
                { borderColor: errorVisible ? '#FF0033' : (isFilled ? '#00FF66' : '#333') }, 
                isFilled && { 
                  backgroundColor: errorVisible ? '#FF0033' : '#00FF66',
                  shadowColor: errorVisible ? '#FF0033' : '#00FF66',
                  shadowOpacity: 0.8,
                  shadowRadius: 10,
                  elevation: 8
                }
              ]} />
            );
          })}
        </Animated.View>

        <View style={styles.keypad}>
          {['1','2','3','4','5','6','7','8','9','','0','<'].map((key, i) => (
            <TouchableOpacity 
              key={i} 
              style={[
                lockStyle === 'standard' ? styles.keyStandardWrapper : styles.keyGeometricWrapper, 
                key === '' && styles.keyEmpty,
                key === '<' && styles.keyDeleteWrapper
              ]} 
              onPress={() => {
                if (key === '<') handleDelete();
                else if (key !== '') handlePress(key);
              }}
              disabled={key === ''}
              activeOpacity={0.6}
            >
              <View style={[
                lockStyle === 'standard' ? styles.keyStandardInner : styles.keyGeometricInner,
                key === '<' && styles.keyDeleteInner
              ]}>
                {key === '<' ? (
                  <Text style={[styles.keyText, lockStyle === 'geometric' && styles.textStraight, { color: '#FF0033' }]}>⌫</Text>
                ) : (
                  <Text style={[styles.keyText, lockStyle === 'geometric' && styles.textStraight, { color: '#FFF' }]}>{key}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505' },
  title: { fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, color: '#FFF' },
  subtitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 10, marginBottom: 50, letterSpacing: 2 },
  display: { flexDirection: 'row', gap: 24, marginBottom: 60 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  keypad: { width: 320, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 },
  keyGeometricWrapper: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginVertical: 5 },
  keyGeometricInner: { width: 70, height: 70, backgroundColor: '#111', borderWidth: 1, borderColor: '#333', transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 10, elevation: 5, borderRadius: 12 },
  keyStandardWrapper: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginVertical: 5 },
  keyStandardInner: { width: 70, height: 70, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center', borderRadius: 35 },
  keyEmpty: { opacity: 0 },
  keyDeleteWrapper: { },
  keyDeleteInner: { backgroundColor: '#1A0A0A', borderColor: '#3A1010' },
  keyText: { fontSize: 28, fontFamily: 'SpaceGrotesk_400Regular' },
  textStraight: { transform: [{ rotate: '-45deg' }] },
  
  // Calculator Styles
  calcDisplayContainer: { width: '100%', height: 250, justifyContent: 'space-between', alignItems: 'flex-end', padding: 30, paddingBottom: 10, backgroundColor: '#000' },
  calcLogo: { position: 'absolute', top: 50, left: 30, fontSize: 32, fontFamily: 'SpaceGrotesk_700Bold', color: '#333' },
  calcText: { fontSize: 80, fontWeight: '300', color: '#FFF' },
  calcKeypad: { width: '100%', flex: 1, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#000', padding: 10, justifyContent: 'space-between' },
  calcKey: { width: '22%', aspectRatio: 1, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', borderRadius: 100, marginBottom: 15 },
  calcKeyOp: { backgroundColor: '#FF9F0A' },
  calcKeyTop: { backgroundColor: '#A5A5A5' },
  calcKeyText: { fontSize: 32, color: '#FFF', fontFamily: 'SpaceGrotesk_400Regular' },

  // Crash Styles
  crashContainer: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  crashDialog: { width: 300, backgroundColor: '#1E1E1E', borderRadius: 8, padding: 24, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  crashTitle: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: '#FFF' },
  crashText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#B3B3B3', lineHeight: 20, marginBottom: 24 },
  crashButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 16 },
  crashButtonText: { fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', color: '#8AB4F8', letterSpacing: 0.5 },

  // Browser Disguise Styles
  browserContainer: { flex: 1, paddingTop: 40 },
  browserHeader: { height: 45, backgroundColor: '#1f2023', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#2f3033' },
  browserAddress: { flex: 1, color: '#e8eaed', fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'left' },
  browserBody: { flex: 1, backgroundColor: '#202124', justifyContent: 'center', alignItems: 'center' },
  googleLetter: { fontSize: 44, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  searchBarContainer: { flexDirection: 'row', width: '100%', height: 46, backgroundColor: '#303134', borderRadius: 24, borderWidth: 1, borderColor: '#5f6368', alignItems: 'center', paddingHorizontal: 16 },
  searchInput: { flex: 1, color: '#e8eaed', fontSize: 15, fontFamily: 'Inter_400Regular' },
  browserShortcuts: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 40 },
  shortcutBtn: { alignItems: 'center', width: 70 },
  shortcutIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#303134', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  shortcutLabel: { color: '#bdc1c6', fontSize: 11, fontFamily: 'Inter_400Regular' },
  resultsHeader: { color: '#9aa0a6', fontSize: 12, marginVertical: 10, fontFamily: 'Inter_400Regular' },
  resultCard: { backgroundColor: '#303134', borderRadius: 8, padding: 16, marginVertical: 10 },
  resultTitle: { color: '#8ab4f8', fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  resultSnippet: { color: '#bdc1c6', fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  backSearchBtn: { backgroundColor: '#4285F4', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 30 },
  backSearchBtnText: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 }
});
