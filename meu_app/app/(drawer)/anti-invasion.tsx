import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Switch, Modal, ScrollView, TextInput } from 'react-native';
import * as SecureStore from '@/src/services/SecureStoreManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '@/src/contexts/AppContext';
import { Video, ResizeMode, Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { auth, rtdb } from '@/src/services/FirebaseConfig';
import { ref, get } from 'firebase/database';
import { triggerIntruderAlarm, stopIntruderAlarm } from '@/src/services/IntruderAlarm';

export default function AntiInvasionScreen() {
  const router = useRouter();
  const { activePalette: theme, userPlan } = useAppContext();
  
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [activationDate, setActivationDate] = useState<string | null>(null);
  // Media Player States
  const [mediaPlayerSound, setMediaPlayerSound] = useState<Audio.Sound | null>(null);
  const [mediaPlayerPlaying, setMediaPlayerPlaying] = useState(false);
  const [mediaPlayerPosition, setMediaPlayerPosition] = useState(0);
  const [mediaPlayerDuration, setMediaPlayerDuration] = useState(0);
  const [videoStatus, setVideoStatus] = useState<any>({});
  
  // Settings States
  const [intruderVideoDuration, setIntruderVideoDuration] = useState<'0' | '5' | '15' | '30'>('0');
  const [spyMic, setSpyMic] = useState(false);
  const [alarmSiren, setAlarmSiren] = useState(false);
  const [alarmSirenSound, setAlarmSirenSound] = useState('digital_watch_alarm_long.ogg');
  
  // Kamikaze States
  const [kamikazePin, setKamikazePin] = useState<string | null>(null);
  const [kamikazeModalVisible, setKamikazeModalVisible] = useState(false);
  const [newKamikazePin, setNewKamikazePin] = useState('');

  // Neon River Animation State
  const riverTranslateX = useSharedValue(-100);

  // Intruder List Modal
  const [intruderListModalVisible, setIntruderListModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
      riverTranslateX.value = withRepeat(
        withTiming(100, { duration: 2500, easing: Easing.linear }),
        -1, // Infinito
        false // Sem reverso, fluxo contínuo
      );
    }, [])
  );

  const neonRiverStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: riverTranslateX.value }],
    };
  });

  const loadData = async () => {
    // ── 1. Alertas locais (AsyncStorage, salvo pelo LockScreen offline) ────
    let localAlerts: any[] = [];
    try {
      const dataStr = await AsyncStorage.getItem('intruder_alerts');
      if (dataStr) localAlerts = JSON.parse(dataStr);
    } catch {}

    // ── 2. Alertas da nuvem (Firebase RTDB — vault_files com intruder:true) ─
    let cloudAlerts: any[] = [];
    try {
      const user = auth.currentUser;
      if (user) {
        const snap = await get(ref(rtdb, `users/${user.uid}/vault_files`));
        if (snap.exists()) {
          const data = snap.val();
          for (const key in data) {
            const f = data[key];
            if (f.intruder === true) {
              // Evita duplicatas com o log local (mesma URL)
              const alreadyInLocal = localAlerts.some(a => a.uri === f.downloadUrl);
              if (!alreadyInLocal) {
                cloudAlerts.push({
                  id: key,
                  timestamp: f.uploadedAt || '',
                  type: f.mediaType || 'photo',
                  uri: f.downloadUrl,
                  fromCloud: true,
                });
              }
            }
          }
        }
      }
    } catch {}

    // Mescla: cloud + local, ordena do mais recente para mais antigo
    const merged = [...cloudAlerts, ...localAlerts].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setAlerts(merged);

    // ── 3. Configurações via SecureStore ──────────────────────────────────
    const videoPref = await SecureStore.getItemAsync('intruder_video_duration');
    if (videoPref) setIntruderVideoDuration(videoPref as any);

    const spyPref = await SecureStore.getItemAsync('spy_mic_enabled');
    if (spyPref === 'true') setSpyMic(true);

    const alarmPref = await SecureStore.getItemAsync('alarm_siren_enabled');
    if (alarmPref === 'true') setAlarmSiren(true);

    const alarmSoundPref = await SecureStore.getItemAsync('alarm_siren_sound');
    if (alarmSoundPref) setAlarmSirenSound(alarmSoundPref);

    const kamikazePref = await SecureStore.getItemAsync('kamikaze_pin');
    if (kamikazePref) setKamikazePin(kamikazePref);

    const activationPref = await SecureStore.getItemAsync('anti_invasion_activated_at');
    if (activationPref) setActivationDate(activationPref);
    else setActivationDate(null);
  };

  const deleteAlert = async (id: string, fromCloud?: boolean, fileUri?: string) => {
    const updated = alerts.filter(a => a.id !== id);
    setAlerts(updated);
    
    // Atualiza o local storage logo após remover da lista visual
    const localOnly = updated.filter(a => !a.fromCloud);
    try { await AsyncStorage.setItem('intruder_alerts', JSON.stringify(localOnly)); } catch {}

    if (fromCloud && fileUri) {
      try {
        const { deleteFileFromCloud } = await import('@/src/services/VaultService');
        // Passa a URI inteira (que possui a extensão/id correto) para exclusão do Cloud
        await deleteFileFromCloud(fileUri, false);
      } catch (e) {
        console.warn('Erro ao deletar da nuvem:', e);
      }
    }
  };

  const handleCloseMediaPlayer = async () => {
    if (mediaPlayerSound) {
      try { await mediaPlayerSound.unloadAsync(); } catch {}
      setMediaPlayerSound(null);
    }
    setMediaPlayerPlaying(false);
    setMediaPlayerPosition(0);
    setMediaPlayerDuration(0);
    setVideoStatus({});
    setSelectedAlert(null);
  };

  const handlePlayAudio = async (uri: string) => {
    if (mediaPlayerSound) {
      const status = await mediaPlayerSound.getStatusAsync();
      if (status.isLoaded) {
        if (mediaPlayerPlaying) {
          await mediaPlayerSound.pauseAsync();
          setMediaPlayerPlaying(false);
        } else {
          await mediaPlayerSound.playAsync();
          setMediaPlayerPlaying(true);
        }
        return;
      }
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setMediaPlayerPosition(status.positionMillis || 0);
            setMediaPlayerDuration(status.durationMillis || 0);
            if (status.didJustFinish) { setMediaPlayerPlaying(false); setMediaPlayerPosition(0); }
          }
        }
      );
      setMediaPlayerSound(sound);
      setMediaPlayerPlaying(true);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível reproduzir o áudio.');
    }
  };

  const handleShareAlert = async (uri: string) => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) await Sharing.shareAsync(uri);
      else Alert.alert('Indisponível', 'Compartilhamento não disponível neste dispositivo.');
    } catch {}
  };

  const formatMillis = (ms: number) => {
    if (!ms || isNaN(ms)) return '0:00';
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleToggleSpyMic = async (value: boolean) => {
    if (value && userPlan === 'FREE') {
      Alert.alert('Acesso Restrito', 'Recurso PRO.', [{ text: 'VER PLANOS', onPress: () => router.push('/paywall') }, { text: 'Cancelar' }]);
      return;
    }
    setSpyMic(value);
    await SecureStore.setItemAsync('spy_mic_enabled', value ? 'true' : 'false');
    if (value) {
      // Se ligar o microfone, desliga o vídeo
      setIntruderVideoDuration('0');
      await SecureStore.setItemAsync('intruder_video_duration', '0');
    }
  };

  const handleToggleAlarmSiren = async (value: boolean) => {
    if (value && userPlan === 'FREE') {
      Alert.alert('Acesso Restrito', 'Recurso PRO.', [{ text: 'VER PLANOS', onPress: () => router.push('/paywall') }, { text: 'Cancelar' }]);
      return;
    }
    setAlarmSiren(value);
    await SecureStore.setItemAsync('alarm_siren_enabled', value ? 'true' : 'false');
  };

  const handleChangeAlarmSound = () => {
    if (userPlan === 'FREE') return Alert.alert('Acesso Restrito', 'Recurso PRO.', [{ text: 'VER PLANOS', onPress: () => router.push('/paywall') }, { text: 'Cancelar' }]);
    Alert.alert("Tipo de Alerta Sonoro", "Escolha o som de aviso. Toque em 'Testar' para ouvir primeiro:", [
      { text: "🚨 Sirene Policial — Extremo", onPress: async () => { setAlarmSirenSound('sirene_policial'); await SecureStore.setItemAsync('alarm_siren_sound', 'sirene_policial'); triggerIntruderAlarm(3000); } },
      { text: "⏰ Despertador Digital — Padrão", onPress: async () => { setAlarmSirenSound('digital_watch_alarm_long.ogg'); await SecureStore.setItemAsync('alarm_siren_sound', 'digital_watch_alarm_long.ogg'); triggerIntruderAlarm(3000); } },
      { text: "🛸 Alarme Espacial — Futurista", onPress: async () => { setAlarmSirenSound('spaceship_alarm.ogg'); await SecureStore.setItemAsync('alarm_siren_sound', 'spaceship_alarm.ogg'); triggerIntruderAlarm(3000); } },
      { text: "📻 Despertador Antigo — Clássico", onPress: async () => { setAlarmSirenSound('alarm_clock.ogg'); await SecureStore.setItemAsync('alarm_siren_sound', 'alarm_clock.ogg'); triggerIntruderAlarm(3000); } },
      { text: "☢️ Sirene de Dosímetro — Industrial", onPress: async () => { setAlarmSirenSound('dosimeter_alarm.ogg'); await SecureStore.setItemAsync('alarm_siren_sound', 'dosimeter_alarm.ogg'); triggerIntruderAlarm(3000); } },
      { text: "⏹ Parar teste de som", onPress: () => stopIntruderAlarm() },
      { text: "Cancelar", style: "cancel" }
    ]);
  };

  const handleSetKamikazePin = async () => {
    if (newKamikazePin.length < 4) {
      Alert.alert('Erro', 'O PIN deve ter pelo menos 4 dígitos.');
      return;
    }
    await SecureStore.setItemAsync('kamikaze_pin', newKamikazePin);
    setKamikazePin(newKamikazePin);
    setKamikazeModalVisible(false);
    setNewKamikazePin('');
    Alert.alert('Sucesso', 'PIN Kamikaze configurado. Use-o apenas em emergências extremas.');
  };

  const handleRemoveKamikazePin = async () => {
    Alert.alert('Remover PIN', 'Deseja remover o PIN Kamikaze?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
          await SecureStore.deleteItemAsync('kamikaze_pin');
          setKamikazePin(null);
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Dashboard */}
        <LinearGradient colors={['#FF003322', 'transparent']} style={styles.dashboardHeader}>
          <View style={{ marginBottom: 10, width: 64, height: 64, shadowColor: '#FF0033', shadowOpacity: 0.9, shadowRadius: 15, shadowOffset: { width: 0, height: 0 }, elevation: 10 }}>
            <MaskedView
              style={{ flex: 1 }}
              maskElement={
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="shield-half" size={64} color="white" />
                </View>
              }
            >
              <View style={{ flex: 1, backgroundColor: '#800000' }}>
                <Animated.View style={[{ width: '300%', height: '100%', position: 'absolute', left: '-100%' }, neonRiverStyle]}>
                  <LinearGradient
                    colors={['#800000', '#FF0033', '#FF8080', '#FF0033', '#800000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1 }}
                  />
                </Animated.View>
              </View>
            </MaskedView>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>QUARTEL-GENERAL</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Sistemas de Defesa Ativos</Text>
        </LinearGradient>

        {/* Arsenal de Defesa */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{"// ARSENAL DE DEFESA"}</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.surface + '80', borderColor: theme.border + '33' }]}>
          
          {/* Aviso de Invasão */}
          <View style={styles.optionRow}>
            <TouchableOpacity style={styles.optionLeft} onPress={handleChangeAlarmSound}>
              <View style={styles.textWrapper}>
                <View style={styles.titleRow}>
                  <Text style={[styles.optionText, { color: theme.text }]}>Aviso de Invasão</Text>
                  <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}>PRO</Text></View>
                </View>
                <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>
                  {alarmSirenSound === 'sirene_policial' ? '🚨 Sirene Policial selecionada' :
                   alarmSirenSound === 'spaceship_alarm.ogg' ? '🛸 Alarme Espacial selecionado' :
                   alarmSirenSound === 'alarm_clock.ogg' ? '📻 Despertador Antigo selecionado' :
                   alarmSirenSound === 'dosimeter_alarm.ogg' ? '☢️ Sirene de Dosímetro selecionada' :
                   '⏰ Despertador Digital selecionado'} — toque para trocar
                </Text>
              </View>
            </TouchableOpacity>
            <Switch value={alarmSiren} onValueChange={handleToggleAlarmSiren} trackColor={{ false: theme.surfaceHighlight, true: theme.error || '#FF0033' }} thumbColor={alarmSiren ? '#FFF' : '#888'} />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

          {/* Gravação de Intruso */}
          <TouchableOpacity 
            style={styles.optionClickableRow}
            onPress={() => {
              if (userPlan !== 'ULTRA') return Alert.alert('Acesso Restrito', 'Recurso ULTRA.', [{ text: 'VER PLANOS', onPress: () => router.push('/paywall') }, { text: 'Cancelar' }]);
              Alert.alert("Gravação de Intruso", "Gravar o invasor ocultamente por:", [
                { text: "Desativar Vídeo", onPress: async () => { setIntruderVideoDuration('0'); await SecureStore.setItemAsync('intruder_video_duration', '0'); } },
                { text: "5 Segundos", onPress: async () => { 
                  setIntruderVideoDuration('5'); await SecureStore.setItemAsync('intruder_video_duration', '5'); 
                  await SecureStore.setItemAsync('breakin_alerts', 'false');
                  setSpyMic(false); await SecureStore.setItemAsync('spy_mic_enabled', 'false');
                } },
                { text: "15 Segundos", onPress: async () => { 
                  setIntruderVideoDuration('15'); await SecureStore.setItemAsync('intruder_video_duration', '15'); 
                  await SecureStore.setItemAsync('breakin_alerts', 'false');
                  setSpyMic(false); await SecureStore.setItemAsync('spy_mic_enabled', 'false');
                } },
                { text: "30 Segundos", onPress: async () => { 
                  setIntruderVideoDuration('30'); await SecureStore.setItemAsync('intruder_video_duration', '30'); 
                  await SecureStore.setItemAsync('breakin_alerts', 'false');
                  setSpyMic(false); await SecureStore.setItemAsync('spy_mic_enabled', 'false');
                } }
              ]);
            }}
          >
            <View style={styles.optionLeft}>
              <View style={styles.textWrapper}>
                <View style={styles.titleRow}>
                  <Text style={[styles.optionText, { color: theme.text }]}>Gravação em Vídeo</Text>
                  <View style={[styles.proBadge, { backgroundColor: '#00FFCC' }]}><Text style={[styles.proText, { color: '#000' }]}>ULTRA</Text></View>
                </View>
                <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>
                  {intruderVideoDuration === '0' ? 'Gravação desativada' : `Gravar vídeo oculto de ${intruderVideoDuration}s`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

          {/* Microfone Espião */}
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <View style={styles.textWrapper}>
                <View style={styles.titleRow}>
                  <Text style={[styles.optionText, { color: theme.text }]}>Microfone Espião</Text>
                  <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}>PRO</Text></View>
                </View>
                <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>Grava 15s de áudio ambiente secretamente</Text>
              </View>
            </View>
            <Switch value={spyMic} onValueChange={handleToggleSpyMic} trackColor={{ false: theme.surfaceHighlight, true: theme.tint }} thumbColor={spyMic ? '#FFF' : '#888'} />
          </View>
        </View>

        {/* PIN Kamikaze */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary, marginTop: 10 }]}>{"// DEAD MAN'S SWITCH"}</Text>
        <TouchableOpacity 
          style={[styles.kamikazeCard, { borderColor: theme.error || '#FF0033' }]}
          onPress={() => kamikazePin ? handleRemoveKamikazePin() : setKamikazeModalVisible(true)}
        >
          <Ionicons name="skull" size={24} color={kamikazePin ? (theme.error || '#FF0033') : theme.textSecondary} style={{ marginRight: 15 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionText, { color: kamikazePin ? (theme.error || '#FF0033') : theme.text }]}>
              {kamikazePin ? 'PIN Kamikaze Ativo' : 'Configurar PIN Kamikaze'}
            </Text>
            <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.8, marginTop: 4 }]}>
              {kamikazePin ? `Seu PIN letal está configurado.` : 'Apaga o cofre real se você for forçado a abri-lo.'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Relatório de Alertas */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary, marginTop: 10 }]}>{"// RELATÓRIOS E EVIDÊNCIAS"}</Text>
        
        <TouchableOpacity 
          style={[styles.kamikazeCard, { borderColor: theme.border, marginTop: 10, backgroundColor: theme.surfaceHighlight + '20' }]}
          onPress={() => setIntruderListModalVisible(true)}
        >
          <Ionicons name="eye" size={24} color={theme.tint} style={{ marginRight: 15 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionText, { color: theme.text }]}>Visualizar todos os intrusos</Text>
            <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.8, marginTop: 4 }]}>
              {alerts.length} registros de invasores detectados.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </ScrollView>

      {/* === MEDIA PLAYER MODAL PROFISSIONAL === */}
      <Modal visible={!!selectedAlert} transparent={false} animationType="slide" onRequestClose={handleCloseMediaPlayer}>
        {selectedAlert && (() => {
          const isAudio = selectedAlert.type === 'audio' || (selectedAlert.uri && selectedAlert.uri.match(/\.(m4a|caf|wav|3gp|aac)$/i));
          const isVideo = selectedAlert.type === 'video' || (selectedAlert.uri && selectedAlert.uri.match(/\.(mp4|mov|m4v|avi|mkv)$/i));
          const isImage = !isAudio && !isVideo;
          const typeLabel = isVideo ? 'VÍDEO' : isAudio ? 'ÁUDIO' : 'FOTO';
          const typeColor = isVideo ? '#00FFCC' : isAudio ? '#FFD700' : '#FF6B9D';
          const typeIcon  = isVideo ? 'videocam' : isAudio ? 'mic' : 'camera';

          return (
            <View style={{ flex: 1, backgroundColor: '#000' }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 55, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ backgroundColor: typeColor + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: typeColor + '55' }}>
                    <Ionicons name={typeIcon as any} size={12} color={typeColor} />
                    <Text style={{ color: typeColor, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 }}>{typeLabel}</Text>
                  </View>
                  <View>
                    <Text style={{ color: '#FFF', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15 }}>Intruso Bloqueado</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter_400Regular', fontSize: 11 }}>{formatDate(selectedAlert.timestamp)}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleCloseMediaPlayer} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="close" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Media Content */}
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>

                {/* === IMAGE VIEWER === */}
                {isImage && selectedAlert.uri && (
                  <Image source={{ uri: selectedAlert.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                )}

                {/* === VIDEO PLAYER === */}
                {isVideo && selectedAlert.uri && (
                  <View style={{ width: '100%', height: '100%' }}>
                    <Video
                      source={{ uri: selectedAlert.uri }}
                      style={{ flex: 1, width: '100%' }}
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay
                      isLooping={false}
                      onPlaybackStatusUpdate={s => setVideoStatus(() => s)}
                    />
                    {/* Video Controls overlay */}
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12, backgroundColor: 'rgba(0,0,0,0.7)', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular', fontSize: 11 }}>{formatMillis(videoStatus.positionMillis)}</Text>
                        <View style={{ flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginHorizontal: 10, overflow: 'hidden' }}>
                          <View style={{ width: `${videoStatus.durationMillis ? (videoStatus.positionMillis / videoStatus.durationMillis) * 100 : 0}%`, height: '100%', backgroundColor: '#00FFCC', borderRadius: 2 }} />
                        </View>
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular', fontSize: 11 }}>{formatMillis(videoStatus.durationMillis)}</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center' }}>Toque no vídeo para pausar</Text>
                    </View>
                  </View>
                )}

                {/* === AUDIO PLAYER === */}
                {isAudio && selectedAlert.uri && (
                  <View style={{ width: '100%', paddingHorizontal: 30, alignItems: 'center' }}>
                    {/* Animated waveform icon */}
                    <View style={{ width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 32, shadowColor: '#FFD700', shadowOpacity: 0.4, shadowRadius: 20 }}>
                      <Ionicons name={mediaPlayerPlaying ? 'volume-high' : 'mic'} size={48} color="#FFD700" />
                    </View>
                    <Text style={{ color: '#FFF', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, marginBottom: 6 }}>Intruso Bloqueado</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 36 }}>{formatDate(selectedAlert.timestamp)}</Text>

                    {/* Progress bar */}
                    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Inter_400Regular', width: 38 }}>{formatMillis(mediaPlayerPosition)}</Text>
                      <View style={{ flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, marginHorizontal: 8, overflow: 'hidden' }}>
                        <View style={{ width: `${mediaPlayerDuration ? (mediaPlayerPosition / mediaPlayerDuration) * 100 : 0}%`, height: '100%', backgroundColor: '#FFD700', borderRadius: 2 }} />
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Inter_400Regular', width: 38, textAlign: 'right' }}>{formatMillis(mediaPlayerDuration)}</Text>
                    </View>

                    {/* Play/Pause button */}
                    <TouchableOpacity
                      onPress={() => handlePlayAudio(selectedAlert.uri)}
                      style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', marginTop: 20, shadowColor: '#FFD700', shadowOpacity: 0.6, shadowRadius: 18, elevation: 8 }}
                    >
                      <Ionicons name={mediaPlayerPlaying ? 'pause' : 'play'} size={32} color="#000" style={{ marginLeft: mediaPlayerPlaying ? 0 : 4 }} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Sem mídia */}
                {!selectedAlert.uri && (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="cloud-offline-outline" size={64} color="rgba(255,255,255,0.2)" />
                    <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 16, fontFamily: 'Inter_400Regular' }}>Mídia não disponível</Text>
                  </View>
                )}
              </View>

              {/* Bottom Actions */}
              <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.08)', paddingBottom: 30 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                  onPress={() => selectedAlert.uri && handleShareAlert(selectedAlert.uri)}
                >
                  <Ionicons name="share-social-outline" size={20} color="rgba(255,255,255,0.7)" />
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13 }}>Compartilhar</Text>
                </TouchableOpacity>
                <View style={{ width: 0.5, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 12 }} />
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                  onPress={() => {
                    Alert.alert('Apagar Evidência', 'Deseja apagar este registro permanentemente?', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Apagar', style: 'destructive', onPress: () => { deleteAlert(selectedAlert.id, selectedAlert.fromCloud, selectedAlert.uri); handleCloseMediaPlayer(); } }
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  <Text style={{ color: '#FF3B30', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13 }}>Apagar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </Modal>

      {/* Modal PIN Kamikaze */}
      <Modal visible={kamikazeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.error || '#FF0033', borderWidth: 1 }]}>
            <Ionicons name="warning" size={40} color={theme.error || '#FF0033'} style={{ alignSelf: 'center', marginBottom: 10 }} />
            <Text style={[styles.modalTitle, { color: theme.error || '#FF0033' }]}>PIN KAMIKAZE</Text>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Se você for coagido a abrir o cofre, digite este PIN. Ele vai apagar permanentemente seus dados do cofre real e abrir o cofre falso em seguida.
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Digite o PIN Kamikaze"
              placeholderTextColor="#888"
              keyboardType="number-pad"
              maxLength={8}
              secureTextEntry
              value={newKamikazePin}
              onChangeText={setNewKamikazePin}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setKamikazeModalVisible(false); setNewKamikazePin(''); }}>
                <Text style={{ color: '#FFF', fontFamily: 'Inter_600SemiBold' }}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSave, { backgroundColor: theme.error || '#FF0033' }]} onPress={handleSetKamikazePin}>
                <Text style={{ color: '#FFF', fontFamily: 'Inter_600SemiBold' }}>SALVAR PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Lista de Intrusos */}
      <Modal visible={intruderListModalVisible} animationType="slide">
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <TouchableOpacity onPress={() => setIntruderListModalVisible(false)} style={{ padding: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: theme.text, marginLeft: 10 }}>
              INTRUSOS CAPTURADOS
            </Text>
          </View>

          <FlatList
            data={alerts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { marginTop: 100 }]}>
                <Ionicons name="shield-checkmark" size={60} color={theme.tint} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyText, { color: theme.textSecondary, marginTop: 20 }]}>Nenhum registro encontrado.</Text>
                {activationDate && (
                  <Text style={{ marginTop: 15, fontSize: 13, color: theme.tint, opacity: 0.8, fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>
                    Sistema de defesa online desde:{'\n'}
                    <Text style={{ color: theme.text, fontFamily: 'SpaceGrotesk_400Regular' }}>{formatDate(activationDate)}</Text>
                  </Text>
                )}
              </View>
            }
            renderItem={({ item }) => {
              // ── Detecção de tipo: usa item.type (confiável) e
              //    regex na URL como fallback (Firebase URLs têm ?token= no final)
              const isAudio = item.type === 'audio' || /\.(m4a|caf|wav|3gp|aac)(\?|$)/i.test(item.uri || '');
              const isVideo = item.type === 'video' || /\.(mp4|mov|m4v|avi|mkv)(\?|$)/i.test(item.uri || '');
              const isPhoto = !isAudio && !isVideo;

              const typeColor  = isVideo ? '#00FFCC' : isAudio ? '#FFD700' : '#FF6B9D';
              const typeIcon   = isVideo ? 'videocam' : isAudio ? 'mic' : 'camera';
              const typeLabel  = isVideo ? 'VÍDEO' : isAudio ? 'ÁUDIO' : 'FOTO';

              return (
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 12 }]}>
                  <TouchableOpacity 
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => setSelectedAlert(item)}
                  >
                    {/* Thumbnail / Ícone */}
                    <View style={[styles.imageContainer, { width: 56, height: 56, backgroundColor: typeColor + '18', borderWidth: 1, borderColor: typeColor + '44' }]}>
                      {isPhoto && item.uri
                        ? <Image source={{ uri: item.uri }} style={styles.image} />
                        : <Ionicons name={typeIcon as any} size={24} color={typeColor} />
                      }
                    </View>

                    <View style={styles.cardInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <View style={{ backgroundColor: typeColor + '22', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                          <Text style={{ color: typeColor, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 }}>{typeLabel}</Text>
                        </View>
                        <Text style={[styles.cardTitle, { color: theme.text, fontSize: 13 }]}>Intruso Bloqueado</Text>
                      </View>
                      <Text style={[styles.cardDate, { color: theme.textSecondary }]}>{formatDate(item.timestamp)}</Text>
                      <Text style={{ fontSize: 10, color: item.fromCloud ? theme.tint : theme.textSecondary, marginTop: 3, opacity: 0.8 }}>
                        {item.fromCloud ? '☁ Nuvem' : '📱 Local'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={{ padding: 12 }}
                    onPress={() => {
                      Alert.alert('Apagar Evidência', 'Deseja apagar este registro permanentemente?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Apagar', style: 'destructive', onPress: () => deleteAlert(item.id, item.fromCloud, item.uri) }
                      ]);
                    }}
                  >
                    <Ionicons name="trash-outline" size={22} color={theme.error || '#FF3B30'} />
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dashboardHeader: { padding: 30, paddingTop: 60, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  title: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 5 },
  
  sectionHeader: { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', marginLeft: 20, marginTop: 25, marginBottom: 10, letterSpacing: 1 },
  sectionCard: { marginHorizontal: 15, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  optionClickableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 15 },
  textWrapper: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  optionText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  optionDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4, lineHeight: 18 },
  proBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  proText: { color: '#FFF', fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold' },
  divider: { height: 1, width: '100%' },

  kamikazeCard: { marginHorizontal: 15, borderRadius: 16, borderWidth: 1, padding: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 0, 51, 0.05)' },

  emptyContainer: { alignItems: 'center', padding: 30 },
  emptyText: { fontFamily: 'Inter_400Regular', marginTop: 10 },

  card: { flexDirection: 'row', padding: 12, marginHorizontal: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10, alignItems: 'center' },
  imageContainer: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 15 },
  image: { width: '100%', height: '100%' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  cardDate: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 16, padding: 25 },
  modalTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', marginBottom: 10 },
  modalDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  input: { height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, fontSize: 16, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center' },
  btnCancel: { flex: 1, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: '#333', marginRight: 10 },
  btnSave: { flex: 1, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 8 }
});
