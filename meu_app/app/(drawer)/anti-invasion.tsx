import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Switch, Modal, ScrollView, TextInput } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '@/src/contexts/AppContext';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

export default function AntiInvasionScreen() {
  const router = useRouter();
  const { activePalette: theme, userPlan } = useAppContext();
  
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  
  // Settings States
  const [intruderVideoDuration, setIntruderVideoDuration] = useState<'0' | '5' | '15' | '30'>('0');
  const [spyMic, setSpyMic] = useState(false);
  const [alarmSiren, setAlarmSiren] = useState(false);
  const [alarmSirenSound, setAlarmSirenSound] = useState('digital_watch_alarm_long.ogg');
  
  // Kamikaze States
  const [kamikazePin, setKamikazePin] = useState<string | null>(null);
  const [kamikazeModalVisible, setKamikazeModalVisible] = useState(false);
  const [newKamikazePin, setNewKamikazePin] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    // Load Alerts
    const dataStr = await SecureStore.getItemAsync('intruder_alerts');
    if (dataStr) {
      setAlerts(JSON.parse(dataStr));
    }
    
    // Load Settings
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
  };

  const deleteAlert = async (id: string) => {
    const updated = alerts.filter(a => a.id !== id);
    setAlerts(updated);
    await SecureStore.setItemAsync('intruder_alerts', JSON.stringify(updated));
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
    Alert.alert("Som do Alarme", "Escolha o tipo de sirene para o intruso:", [
      { text: "Relógio Digital (Padrão)", onPress: async () => { setAlarmSirenSound('digital_watch_alarm_long.ogg'); await SecureStore.setItemAsync('alarm_siren_sound', 'digital_watch_alarm_long.ogg'); } },
      { text: "Alarme Espacial", onPress: async () => { setAlarmSirenSound('spaceship_alarm.ogg'); await SecureStore.setItemAsync('alarm_siren_sound', 'spaceship_alarm.ogg'); } },
      { text: "Despertador Antigo", onPress: async () => { setAlarmSirenSound('alarm_clock.ogg'); await SecureStore.setItemAsync('alarm_siren_sound', 'alarm_clock.ogg'); } },
      { text: "Sirene de Dosímetro", onPress: async () => { setAlarmSirenSound('dosimeter_alarm.ogg'); await SecureStore.setItemAsync('alarm_siren_sound', 'dosimeter_alarm.ogg'); } },
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
          <Ionicons name="shield-half" size={48} color={theme.error || '#FF0033'} style={{ marginBottom: 10 }} />
          <Text style={[styles.title, { color: theme.text }]}>QUARTEL-GENERAL</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Sistemas de Defesa Ativos</Text>
        </LinearGradient>

        {/* Arsenal de Defesa */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{"// ARSENAL DE DEFESA"}</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.surface + '80', borderColor: theme.border + '33' }]}>
          
          {/* Alarme Sonoro */}
          <View style={styles.optionRow}>
            <TouchableOpacity style={styles.optionLeft} onPress={handleChangeAlarmSound}>
              <View style={styles.textWrapper}>
                <View style={styles.titleRow}>
                  <Text style={[styles.optionText, { color: theme.text }]}>Alarme de Pânico</Text>
                  <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}>PRO</Text></View>
                </View>
                <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>
                  {alarmSirenSound === 'spaceship_alarm.ogg' ? 'Alarme Espacial selecionado' : 
                   alarmSirenSound === 'alarm_clock.ogg' ? 'Despertador Antigo selecionado' : 
                   alarmSirenSound === 'dosimeter_alarm.ogg' ? 'Sirene de Dosímetro selecionada' : 
                   'Relógio Digital selecionado'}
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
              if (userPlan === 'FREE') return Alert.alert('Acesso Restrito', 'Recurso PRO.', [{ text: 'VER PLANOS', onPress: () => router.push('/paywall') }, { text: 'Cancelar' }]);
              Alert.alert("Gravação de Intruso", "Gravar o invasor ocultamente por:", [
                { text: "Apenas Foto", onPress: async () => { setIntruderVideoDuration('0'); await SecureStore.setItemAsync('intruder_video_duration', '0'); } },
                { text: "5 Segundos", onPress: async () => { setIntruderVideoDuration('5'); await SecureStore.setItemAsync('intruder_video_duration', '5'); } },
                { text: "15 Segundos", onPress: async () => { setIntruderVideoDuration('15'); await SecureStore.setItemAsync('intruder_video_duration', '15'); } },
                { text: "30 Segundos", onPress: async () => { setIntruderVideoDuration('30'); await SecureStore.setItemAsync('intruder_video_duration', '30'); } }
              ]);
            }}
          >
            <View style={styles.optionLeft}>
              <View style={styles.textWrapper}>
                <View style={styles.titleRow}>
                  <Text style={[styles.optionText, { color: theme.text }]}>Gravação em Vídeo</Text>
                  <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}>PRO</Text></View>
                </View>
                <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>
                  {intruderVideoDuration === '0' ? 'Capturar apenas foto' : `Gravar vídeo oculto de ${intruderVideoDuration}s`}
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
        
        {alerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={60} color={theme.tint} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nenhum intruso detectado.</Text>
          </View>
        ) : (
          alerts.map(item => {
            const isAudio = item.uri && (item.uri.endsWith('.m4a') || item.uri.endsWith('.caf') || item.uri.endsWith('.wav'));
            const isVideo = item.type === 'video';
            return (
              <TouchableOpacity 
                key={item.id}
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => setSelectedAlert(item)}
                onLongPress={() => {
                  Alert.alert('Apagar', 'Deseja remover este registro?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Apagar', style: 'destructive', onPress: () => deleteAlert(item.id) }
                  ]);
                }}
              >
                <View style={styles.imageContainer}>
                  {isVideo ? <Ionicons name="videocam" size={24} color={theme.textSecondary} /> 
                   : isAudio ? <Ionicons name="mic" size={24} color={theme.textSecondary} /> 
                   : item.uri ? <Image source={{ uri: item.uri }} style={styles.image} /> 
                   : <Ionicons name="person" size={24} color={theme.textSecondary} />}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Intruso Bloqueado</Text>
                  <Text style={[styles.cardDate, { color: theme.textSecondary }]}>{formatDate(item.timestamp)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal Visualizador de Invasores */}
      {selectedAlert && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 1001, padding: 10 }}
            onPress={() => setSelectedAlert(null)}
          >
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>

          <View style={{ width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center' }}>
            {selectedAlert.type === 'video' || (selectedAlert.uri && selectedAlert.uri.match(/\.(m4a|caf|wav|3gp)$/i)) ? (
              <Video
                source={{ uri: selectedAlert.uri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay
              />
            ) : selectedAlert.uri ? (
              <Image source={{ uri: selectedAlert.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            ) : (
              <Text style={{ color: '#FFF' }}>Mídia não encontrada</Text>
            )}
          </View>
        </View>
      )}

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
