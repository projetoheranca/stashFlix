import React, { useState, useEffect } from 'react';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, BackHandler, Pressable, TextInput, Dimensions } from 'react-native';
import * as SecureStore from '@/src/services/SecureStoreManager';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withRepeat } from 'react-native-reanimated';
import { useAppContext } from '@/src/contexts/AppContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/src/services/FirebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { triggerIntruderAlarm, stopIntruderAlarm } from '@/src/services/IntruderAlarm';

const { width: SCREEN_W } = Dimensions.get('window');
const CALC_BTN = (SCREEN_W - 40) / 4; // 4 columns with 10px margin each side

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
  const [isRecording, setIsRecording] = useState(false);
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');

  // Crash disguise states
  const [crashKeypadVisible, setCrashKeypadVisible] = useState(false);
  const [tapHistory, setTapHistory] = useState<{ time: number; type: 'tap' | 'long' }[]>([]);

  // Browser disguise states
  const [browserKeypadVisible, setBrowserKeypadVisible] = useState(false);
  const [browserKeyword, setBrowserKeyword] = useState('Batman');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultsVisible, setSearchResultsVisible] = useState(false);

  // PIN Recovery states
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Calculator states
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcMemory, setCalcMemory] = useState<number | null>(null);
  const [calcOperator, setCalcOperator] = useState<string | null>(null);
  const [waitingForSecond, setWaitingForSecond] = useState(false);

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
      setCalcDisplay('0');
      setCalcMemory(null);
      setCalcOperator(null);
      setWaitingForSecond(false);
      SecureStore.getItemAsync('disguise_keyword').then(kw => { if (kw) setBrowserKeyword(kw); });
      SecureStore.getItemAsync('lock_bg_uri').then(uri => { if (uri) setCustomBg(uri); });
      SecureStore.getItemAsync('lock_style').then(style => {
        setLockStyle(style === 'standard' ? 'standard' : 'geometric');
      });
      SecureStore.getItemAsync('intruder_video_duration').then(val => {
        setCameraMode(val && val !== '0' ? 'video' : 'picture');
      });
    }
  }, [visible]);

  const cameraRef = React.useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // ─── PIN Recovery ──────────────────────────────────────────────────────────
  const handleRecoverPin = async () => {
    if (!recoveryPassword) {
      Alert.alert('Erro', 'Digite a senha da sua conta para recuperar o PIN.');
      return;
    }
    setRecoveryLoading(true);
    try {
      if (!auth.currentUser?.email) throw new Error('Usuário não logado');
      await signInWithEmailAndPassword(auth, auth.currentUser.email, recoveryPassword);
      const userPin = await SecureStore.getItemAsync('user_pin');
      Alert.alert('PIN Recuperado', `Seu PIN principal é: ${userPin}`);
      setShowRecovery(false);
      setRecoveryPassword('');
    } catch {
      Alert.alert('Erro na Autenticação', 'Senha incorreta. Tente novamente.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // ─── Intruder capture ──────────────────────────────────────────────────────
  const captureIntruder = async () => {
    try {
      // ── Ler todos os modos de captura ────────────────────────────────────
      const alertsEnabled   = await SecureStore.getItemAsync('breakin_alerts');
      const videoDuration   = await SecureStore.getItemAsync('intruder_video_duration');
      const spyMicEnabled   = await SecureStore.getItemAsync('spy_mic_enabled');

      const isPhoto   = alertsEnabled !== 'false';
      const isVideo   = !!(videoDuration && videoDuration !== '0');
      const isSpyMic  = spyMicEnabled === 'true';

      // Se nenhum modo ativo, não faz nada
      if (!isPhoto && !isVideo && !isSpyMic) return;

      // Solicita permissão de câmera se necessário (primeira tentativa de invasão)
      if ((isPhoto || isVideo) && !permission?.granted) { requestPermission(); }

      // ── 1. Se microfone espião estiver ativo, configura canal de áudio para gravação ANTES de tudo
      let spyRecording: Audio.Recording | null = null;
      if (isSpyMic && !isVideo) {
        try {
          const { status } = await Audio.requestPermissionsAsync();
          if (status === 'granted') {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
            });
            const { recording } = await Audio.Recording.createAsync(
              Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            spyRecording = recording;
          }
        } catch (e) {
          console.warn('Spy mic setup failed:', e);
          spyRecording = null;
        }
      }

      // ── 2. Vibração de emergência (apenas se o spy mic NÃO estiver gravando, pois
      //       a vibração pode interferir com a qualidade do áudio no Android)
      if (!spyRecording) {
        Vibration.vibrate([500, 200, 500, 200], true);
        setTimeout(() => Vibration.cancel(), 15000);
      }

      // ── 3. Helper de upload para salvar evidência local + nuvem ──────────
      const uploadIntruderAlert = async (fileUri: string, fileType: 'photo' | 'video' | 'audio') => {
        const timestamp = new Date().toISOString();
        const alertId = Date.now().toString() + Math.random().toString(36).substring(7);
        try {
          const logsStr = await AsyncStorage.getItem('intruder_alerts');
          let logs = logsStr ? JSON.parse(logsStr) : [];
          logs.unshift({ id: alertId, timestamp, type: fileType, uri: fileUri, fromCloud: false });
          if (logs.length > 20) logs = logs.slice(0, 20);
          await AsyncStorage.setItem('intruder_alerts', JSON.stringify(logs));
        } catch {}

        try {
          const user = auth.currentUser;
          if (!user) return;
          const { uploadBytes, getDownloadURL, ref: storageRefFn } = await import('firebase/storage');
          const { ref: dbRefFn, set: dbSet } = await import('firebase/database');
          const { storage, rtdb: db } = await import('@/src/services/FirebaseConfig');
          const ext = fileType === 'video' ? 'mp4' : fileType === 'audio' ? 'm4a' : 'jpg';
          const filename = `intruder_${alertId}.${ext}`;
          const blob: Blob = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => resolve(xhr.response);
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.responseType = 'blob';
            xhr.open('GET', fileUri, true);
            xhr.send(null);
          });
          const sRef = storageRefFn(storage, `users/${user.uid}/vault/${filename}`);
          const snap = await uploadBytes(sRef, blob);
          const downloadUrl = await getDownloadURL(snap.ref);
          const safeFilename = filename.replace(/\./g, '_');
          const fileRef = dbRefFn(db, `users/${user.uid}/vault_files/${safeFilename}`);
          await dbSet(fileRef, { fileName: filename, downloadUrl, albumName: 'INTRUSOS', sizeBytes: blob.size || 0, uploadedAt: timestamp, intruder: true, mediaType: fileType });
          try {
            const logsStr2 = await AsyncStorage.getItem('intruder_alerts');
            let logs2 = logsStr2 ? JSON.parse(logsStr2) : [];
            const idx = logs2.findIndex((l: any) => l.id === alertId);
            if (idx >= 0) { logs2[idx].uri = downloadUrl; logs2[idx].fromCloud = true; await AsyncStorage.setItem('intruder_alerts', JSON.stringify(logs2)); }
          } catch {}
        } catch (e) { console.warn('Upload failed:', e); }
      };

      // ── 4. Captura via Câmera (foto ou vídeo) — independente do áudio ────
      if ((isVideo || isPhoto) && cameraRef.current) {
        try {
          if (isVideo) {
            setIsRecording(true);
            const durationMs = parseInt(videoDuration!, 10) * 1000;
            setTimeout(() => { cameraRef.current?.stopRecording(); setIsRecording(false); }, durationMs);
            cameraRef.current.recordAsync().then(video => {
              if (video?.uri) uploadIntruderAlert(video.uri, 'video');
            }).catch(() => setIsRecording(false));
          } else {
            cameraRef.current.takePictureAsync({ quality: 0.5 }).then(photo => {
              if (photo?.uri) uploadIntruderAlert(photo.uri, 'photo');
            }).catch(() => {});
          }
        } catch (e) {
          console.warn('Camera capture failed:', e);
          setIsRecording(false);
        }
      }

      // ── 5. Finaliza gravação do microfone espião após 15s ────────────────
      if (spyRecording) {
        setTimeout(async () => {
          try {
            await spyRecording!.stopAndUnloadAsync();
            const audioUri = spyRecording!.getURI();
            if (audioUri) uploadIntruderAlert(audioUri, 'audio');
            // Restaura canal de áudio para modo normal após gravar
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: false, staysActiveInBackground: false });
          } catch (e) { console.warn('Spy mic stop failed:', e); }
        }, 15000);
      }

    } catch (e) {
      console.warn('Capture intruder failed:', e);
      setIsRecording(false);
    }
  };



  // ─── PIN Validation — reads from SecureStore (synced from Firebase on login) ─
  const validatePin = async (currentPin: string) => {
    const savedPin = await SecureStore.getItemAsync('user_pin');
    const fakePin = await SecureStore.getItemAsync('fake_pin');
    const kamikazePin = await SecureStore.getItemAsync('kamikaze_pin');

    if (currentPin === savedPin) {
      setFakeVault(false);
      setErrorCount(0);
      await stopIntruderAlarm();  // Para o alarme ao desbloquear com sucesso
      await SecureStore.setItemAsync('last_login_timestamp', new Date().toISOString());
      onUnlocked();
      router.replace('/');
    } else if (fakePin && currentPin === fakePin) {
      setFakeVault(true);
      setErrorCount(0);
      await SecureStore.setItemAsync('last_login_timestamp', new Date().toISOString());
      onUnlocked();
      router.replace('/');
    } else if (kamikazePin && currentPin === kamikazePin) {
      const { nukeRealVault } = await import('@/src/services/VaultService');
      await nukeRealVault();
      setPin('');
      router.replace('/auth/login');
    } else {
      setErrorVisible(true);
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const newErrors = errorCount + 1;
      setErrorCount(newErrors);
      if (newErrors === 1 && !permission?.granted) requestPermission();
      // ── Alarme: componente independente, dispara junto com a captura ──────
      if (newErrors >= 3) {
        triggerIntruderAlarm();   // 🔔 Alarme sonoro — 100% independente
        captureIntruder();        // 📸 Captura foto/vídeo/áudio — lógica separada
      }
      setTimeout(() => { setPin(''); setErrorVisible(false); }, 600);
    }
  };

  // ─── Standard PIN keypad handlers ─────────────────────────────────────────
  const handlePress = async (num: string) => {
    if (isRecording) return;
    if (pin.length < 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newPin = pin + num;
      setPin(newPin);
      setErrorVisible(false);
      if (newPin.length === 4) validatePin(newPin);
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(pin.slice(0, -1));
  };

  // ─── Crash disguise helpers ────────────────────────────────────────────────
  const handleCrashTextPress = () => {
    const now = Date.now();
    const updated = [...tapHistory, { time: now, type: 'tap' as const }].slice(-4);
    if (updated.length === 4 && updated[3].time - updated[0].time < 2000) {
      setCrashKeypadVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTapHistory([]);
    } else {
      setTapHistory(updated);
    }
  };

  const handleCrashTextLongPress = () => {
    setCrashKeypadVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTapHistory([]);
  };

  // ─── Calculator handlers (real math + secret PIN buffer) ──────────────────
  const handleCalcPress = (key: string) => {
    if (isRecording) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Secret PIN buffer: digits accumulate in `pin`, '=' validates
    if (key === '=') {
      validatePin(pin);
      setPin('');
    } else if (key === '⌫' || key === 'AC') {
      setPin(''); // clear hidden buffer on delete/clear
    } else if (!isNaN(Number(key)) && key !== '.') {
      setPin(prev => prev + key);
    } else if (['+', '-', 'x', '/'].includes(key)) {
      setPin(''); // operator pressed → reset hidden buffer
    }

    // Real calculator display logic
    if (key === 'AC') {
      setCalcDisplay('0');
      setCalcMemory(null);
      setCalcOperator(null);
      setWaitingForSecond(false);
    } else if (key === '⌫') {
      setCalcDisplay(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (key === '+/-') {
      setCalcDisplay(prev => String(Number(prev) * -1));
    } else if (key === '%') {
      setCalcDisplay(prev => String(Number(prev) / 100));
    } else if (['+', '-', 'x', '/'].includes(key)) {
      setCalcMemory(Number(calcDisplay));
      setCalcOperator(key);
      setWaitingForSecond(true);
    } else if (key === '=') {
      if (calcOperator && calcMemory !== null) {
        const cur = Number(calcDisplay);
        let result = 0;
        if (calcOperator === '+') result = calcMemory + cur;
        if (calcOperator === '-') result = calcMemory - cur;
        if (calcOperator === 'x') result = calcMemory * cur;
        if (calcOperator === '/') result = cur !== 0 ? calcMemory / cur : 0;
        // Trim floating point noise
        const pretty = parseFloat(result.toPrecision(10)).toString();
        setCalcDisplay(pretty);
        setCalcOperator(null);
        setCalcMemory(null);
        setWaitingForSecond(false);
      }
    } else if (key === '.') {
      if (!calcDisplay.includes('.')) setCalcDisplay(calcDisplay + '.');
    } else {
      // Digit
      if (waitingForSecond) {
        setCalcDisplay(key);
        setWaitingForSecond(false);
      } else {
        setCalcDisplay(calcDisplay === '0' ? key : calcDisplay + key);
      }
    }
  };

  // ─── Recovery modal (shared) ──────────────────────────────────────────────
  const RecoveryModal = () => (
    <Modal visible={showRecovery} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Recuperar PIN</Text>
          <Text style={{ color: theme.textSecondary, marginBottom: 15, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
            Digite a senha da sua conta {auth.currentUser?.email} para ver seu PIN principal.
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="Senha da conta"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={recoveryPassword}
            onChangeText={setRecoveryPassword}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={() => setShowRecovery(false)}>
              <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.tint }]} onPress={handleRecoverPin}>
              <Text style={styles.modalBtnText}>{recoveryLoading ? 'Verificando...' : 'Recuperar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MODE: CRASH (App crash screen disguise)
  // ══════════════════════════════════════════════════════════════════════════
  if (disguiseMode === 'crash' && !crashKeypadVisible) {
    return (
      <>
        <Modal visible={visible} animationType="fade" transparent={false}>
          <View style={styles.crashContainer}>
            {permission?.granted && (
              <View style={{ position: 'absolute', width: 16, height: 16, top: 0, left: 0, overflow: 'hidden', opacity: 0.01 }}>
                <CameraView ref={cameraRef} facing="front" mode={cameraMode} style={{ width: 16, height: 16 }} />
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
              <TouchableOpacity style={styles.crashButton} onPress={() => BackHandler.exitApp()} activeOpacity={0.8}>
                <Text style={styles.crashButtonText}>Fechar app</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowRecovery(true)} style={{ marginTop: 30 }}>
              <Text style={{ color: '#555', fontFamily: 'Inter_400Regular', fontSize: 12, textDecorationLine: 'underline' }}>
                Esqueci o PIN
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
        <RecoveryModal />
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODE: BROWSER (Fake Google disguise)
  // ══════════════════════════════════════════════════════════════════════════
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
      <>
        <Modal visible={visible} animationType="fade" transparent={false}>
          <View style={[styles.browserContainer, { backgroundColor: '#121212' }]}>
            {permission?.granted && (
              <View style={{ position: 'absolute', width: 16, height: 16, top: 0, left: 0, overflow: 'hidden', opacity: 0.01 }}>
                <CameraView ref={cameraRef} facing="front" mode={cameraMode} style={{ width: 16, height: 16 }} />
              </View>
            )}
            <View style={styles.browserHeader}>
              <Text style={{ marginRight: 6 }}>🔒</Text>
              <Text style={styles.browserAddress} numberOfLines={1}>https://www.google.com</Text>
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResultsVisible(false); }}>
                <Text style={{ color: '#888', fontSize: 16 }}>↻</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.browserBody}>
              {!searchResultsVisible ? (
                <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                  <View style={{ flexDirection: 'row', marginBottom: 30 }}>
                    {['G','o','o','g','l','e'].map((l, i) => (
                      <Text key={i} style={[styles.googleLetter, { color: ['#4285F4','#EA4335','#FBBC05','#4285F4','#34A853','#EA4335'][i] }]}>{l}</Text>
                    ))}
                  </View>
                  <View style={styles.searchBarContainer}>
                    <Text style={{ color: '#9aa0a6', marginRight: 8 }}>🔍</Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Pesquisar no Google"
                      placeholderTextColor="#9aa0a6"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onSubmitEditing={handleSearchSubmit}
                      returnKeyType="search"
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.browserShortcuts}>
                    {['YouTube','Gmail','Maps','News'].map((s, i) => (
                      <View key={i} style={styles.shortcutBtn}>
                        <View style={styles.shortcutIconBox}>
                          <Text style={{ fontSize: 20 }}>{['📺','📧','🗺️','📰'][i]}</Text>
                        </View>
                        <Text style={styles.shortcutLabel}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={{ width: '100%', paddingHorizontal: 20 }}>
                  <Text style={styles.resultsHeader}>Cerca de 1.230.000.000 resultados (0,42 segundos)</Text>
                  <View style={styles.resultCard}>
                    <Text style={styles.resultTitle}>Resultado para: {searchQuery}</Text>
                    <Text style={styles.resultSnippet}>Não foram encontradas informações relevantes para sua pesquisa. Tente refinar os termos usados.</Text>
                  </View>
                  <TouchableOpacity style={styles.backSearchBtn} onPress={() => setSearchResultsVisible(false)}>
                    <Text style={styles.backSearchBtnText}>Voltar para o Buscador</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
        <RecoveryModal />
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODE: CALCULATOR (iOS-style disguise — PIN typed via number keys, = validates)
  // ══════════════════════════════════════════════════════════════════════════
  if (disguiseMode === 'calculator') {
    // Rows 1-4: normal 4-column grid
    const topRows = [
      ['AC', '⌫', '%', '/'],
      ['7',  '8', '9', 'x'],
      ['4',  '5', '6', '-'],
      ['1',  '2', '3', '+'],
    ];

    const renderCalcBtn = (key: string, ki: number, extraStyle?: any, textExtra?: any) => {
      const isOp  = ['/', 'x', '-', '+', '='].includes(key);
      const isTop = ['AC', '⌫', '%'].includes(key);
      return (
        <TouchableOpacity
          key={ki}
          onPress={() => handleCalcPress(key)}
          activeOpacity={0.7}
          style={[styles.calcBtn, isOp && styles.calcBtnOp, isTop && styles.calcBtnTop, extraStyle]}
        >
          <Text style={[styles.calcBtnText, isTop && { color: '#000' }, textExtra]}>{key}</Text>
        </TouchableOpacity>
      );
    };

    return (
      <>
        <Modal visible={visible} animationType="fade" transparent={false}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            {permission?.granted && (
              <View style={{ position: 'absolute', width: 16, height: 16, top: 0, left: 0, overflow: 'hidden', opacity: 0.01 }}>
                <CameraView ref={cameraRef} facing="front" mode={cameraMode} style={{ width: 16, height: 16 }} />
              </View>
            )}

            {/* Display */}
            <View style={styles.calcDisplay}>
              <Text style={styles.calcDisplayText} numberOfLines={1} adjustsFontSizeToFit>
                {calcDisplay}
              </Text>
            </View>

            {/* Keypad */}
            <View style={styles.calcKeypad}>
              {/* Rows 1-4 */}
              {topRows.map((row, ri) => (
                <View key={ri} style={styles.calcRow}>
                  {row.map((key, ki) => renderCalcBtn(key, ki))}
                </View>
              ))}

              {/* Row 5: [0 (wide)], [.], [=] */}
              <View style={styles.calcRow}>
                {/* Zero: pill, flex:2, text left-aligned */}
                <TouchableOpacity
                  onPress={() => handleCalcPress('0')}
                  activeOpacity={0.7}
                  style={styles.calcBtnZero}
                >
                  <Text style={[styles.calcBtnText, { paddingLeft: 28 }]}>0</Text>
                </TouchableOpacity>
                {renderCalcBtn('.', 1)}
                {renderCalcBtn('=', 2, styles.calcBtnOp)}
              </View>
            </View>
          </View>
        </Modal>
        <RecoveryModal />
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODE: STANDARD PIN / GEOMETRIC PIN (default)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <Modal visible={visible} animationType="fade" transparent={false}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {customBg && (
            <Animated.Image source={{ uri: customBg }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          )}
          {customBg && (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
          )}
          {permission?.granted && (
            <View style={{ position: 'absolute', width: 16, height: 16, top: 0, left: 0, overflow: 'hidden', opacity: 0.01 }}>
              <CameraView ref={cameraRef} facing="front" mode={cameraMode} style={{ width: 16, height: 16 }} />
            </View>
          )}

          <MaskedView
            maskElement={<Text style={[styles.title, { backgroundColor: 'transparent', textAlign: 'center' }]}>StashFlix</Text>}
          >
            <LinearGradient
              colors={['#FF0033', '#FF4500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.title, { opacity: 0, textAlign: 'center' }]}>StashFlix</Text>
            </LinearGradient>
          </MaskedView>

          <MaskedView
            maskElement={
              <Text style={[styles.subtitle, { backgroundColor: 'transparent', textAlign: 'center' }]}>
                {isRecording ? 'VERIFICANDO PIN...' : (errorVisible ? 'ACESSO NEGADO' : 'SISTEMA TRANCADO')}
              </Text>
            }
          >
            <LinearGradient
              colors={errorVisible ? ['#FF0033', '#AA0000'] : ['#FF0033', '#FF6B00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.subtitle, { opacity: 0, textAlign: 'center' }]}>
                {isRecording ? 'VERIFICANDO PIN...' : (errorVisible ? 'ACESSO NEGADO' : 'SISTEMA TRANCADO')}
              </Text>
            </LinearGradient>
          </MaskedView>

          <Animated.View style={[styles.display, animatedStyle]}>
            {[0, 1, 2, 3].map((i) => {
              const isFilled = pin.length > i;
              return (
                <View key={i} style={[
                  styles.dot,
                  { borderColor: errorVisible ? '#FF0033' : (isFilled ? '#00FF66' : '#333') },
                  isFilled && { backgroundColor: errorVisible ? '#FF0033' : '#00FF66' }
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
                  key === '<' && styles.keyDeleteWrapper,
                ]}
                onPress={() => { if (key === '<') handleDelete(); else if (key !== '') handlePress(key); }}
                disabled={key === ''}
                activeOpacity={0.6}
              >
                <View style={[
                  lockStyle === 'standard' ? styles.keyStandardInner : styles.keyGeometricInner,
                  key === '<' && styles.keyDeleteInner,
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

          <TouchableOpacity onPress={() => setShowRecovery(true)} style={{ marginTop: 30 }}>
            <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 13, textDecorationLine: 'underline' }}>
              Esqueci o PIN
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <RecoveryModal />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Standard / Geometric PIN screen
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505' },
  title: { fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, color: '#FFF' },
  subtitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 10, marginBottom: 50, letterSpacing: 2 },
  display: { flexDirection: 'row', gap: 24, marginBottom: 60 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  keypad: { width: 320, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 },
  keyGeometricWrapper: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginVertical: 5 },
  keyGeometricInner: { width: 70, height: 70, backgroundColor: '#111', borderWidth: 1, borderColor: '#333', transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  keyStandardWrapper: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginVertical: 5 },
  keyStandardInner: { width: 70, height: 70, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center', borderRadius: 35 },
  keyEmpty: { opacity: 0 },
  keyDeleteWrapper: {},
  keyDeleteInner: { backgroundColor: '#1A0A0A', borderColor: '#3A1010' },
  keyText: { fontSize: 28, fontFamily: 'SpaceGrotesk_400Regular' },
  textStraight: { transform: [{ rotate: '-45deg' }] },

  // ── Calculator (iOS style) ──────────────────────────────────────────────
  calcDisplay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 8,
    backgroundColor: '#000',
  },
  calcDisplayText: {
    fontSize: 80,
    fontWeight: '200',
    color: '#FFF',
    maxWidth: SCREEN_W - 48,
  },
  calcKeypad: {
    backgroundColor: '#000',
    paddingBottom: 20,
    paddingHorizontal: 12,
  },
  calcRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  // Each button: flex:1 + aspectRatio:1 = perfect circle that fills available space
  calcBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcBtnOp: { backgroundColor: '#FF9F0A' },
  calcBtnTop: { backgroundColor: '#A5A5A5' },
  // Zero: flex:2 + fixed height to match other buttons, pill shape, text left
  calcBtnZero: {
    flex: 2,
    height: (SCREEN_W - 24 - 3 * 12) / 4, // same height as other buttons
    borderRadius: 999,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  calcBtnText: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: '400',
  },

  // ── Crash Disguise ─────────────────────────────────────────────────────
  crashContainer: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  crashDialog: { width: 300, backgroundColor: '#1E1E1E', borderRadius: 8, padding: 24, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  crashTitle: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: '#FFF' },
  crashText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#B3B3B3', lineHeight: 20, marginBottom: 24 },
  crashButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 16 },
  crashButtonText: { fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', color: '#8AB4F8', letterSpacing: 0.5 },

  // ── Browser Disguise ───────────────────────────────────────────────────
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
  backSearchBtnText: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 },

  // ── Recovery Modal ─────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15 },
});
