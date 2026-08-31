import { View, Text, StyleSheet, Pressable, Alert, Switch, ScrollView, Modal, Image, ActivityIndicator, Dimensions, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { t } from '../../src/i18n';
import { registerDevice, deleteUserAccount } from '@/src/services/ApiService';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth } from '@/src/services/FirebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as StoreReview from 'expo-store-review';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppContext } from '@/src/contexts/AppContext';
import * as ScreenCapture from 'expo-screen-capture';
import { syncSettingsToCloud } from '@/src/services/FirebaseDB';
import { getCloudTelemetry } from '@/src/services/VaultService';
import * as ImageManipulator from 'expo-image-manipulator';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { showInterstitialAd } from '@/src/services/AdService';


export default function SettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const { userPlan, setUserPlan, activePalette: theme } = useAppContext();
  
  const [cloudSync, setCloudSync] = useState(false);
  const [decoyCount, setDecoyCount] = useState(0);
  const [mainCount, setMainCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [cloudStats, setCloudStats] = useState({ main: { count: 0, bytes: 0 }, decoy: { count: 0, bytes: 0 }, trash: { count: 0, bytes: 0 }, intruders: { count: 0, bytes: 0 } });
  const [wifiOnly, setWifiOnly] = useState(true);
  
  // Pin Management
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinTypeToEdit, setPinTypeToEdit] = useState<'user_pin'|'fake_pin'|'kamikaze_pin'>('user_pin');
  const [currentPinValue, setCurrentPinValue] = useState('');
  const [newPinValue, setNewPinValue] = useState('');


  // Custom Premium Wallpaper Crop Modal states
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [cropPreset, setCropPreset] = useState<'9:16' | '1:1' | 'original'>('9:16');
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [cropLoading, setCropLoading] = useState(false);

  // Pulse animation states for telemetry
  const pulseValue = useSharedValue(0.4);
  const rotationValue = useSharedValue(0);

  useEffect(() => {
    pulseValue.value = withRepeat(
      withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    rotationValue.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationValue.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseValue.value,
  }));

  useEffect(() => {
    const fetchSettings = async () => {
      const user = await registerDevice();
      if (user) setUserPlan((user as any).plan || 'FREE');
      const syncPref = await SecureStore.getItemAsync('cloud_sync_enabled');
      if (syncPref === 'true') setCloudSync(true);

      const wifiPref = await SecureStore.getItemAsync('wifi_only');
      if (wifiPref === 'false') setWifiOnly(false);

      // Função utilitária para contar arquivos
      const countFilesInDir = async (dirPath: string) => {
        let count = 0;
        try {
          const info = await FileSystem.getInfoAsync(dirPath);
          if (info.exists) {
            const contents = await FileSystem.readDirectoryAsync(dirPath);
            for (const item of contents) {
              const itemPath = dirPath + item + '/';
              const itemInfo = await FileSystem.getInfoAsync(itemPath);
              if (itemInfo.exists && itemInfo.isDirectory) {
                const files = await FileSystem.readDirectoryAsync(itemPath);
                count += files.length;
              }
            }
          }
        } catch (e) {}
        return count;
      };
      // Conta arquivos do Cofre Falso
      setDecoyCount(await countFilesInDir(FileSystem.documentDirectory + 'DecoyVault/'));
      // Conta arquivos do Cofre Principal
      setMainCount(await countFilesInDir(FileSystem.documentDirectory + 'SecureVault/'));
      // Lixeira
      try {
         const trashFiles = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory + 'SecureVault/Trash/');
         setTrashCount(trashFiles.length);
      } catch (e) {}

      // Busca Telemetria Real do Cloud
      try {
        const stats = await getCloudTelemetry();
        if (stats) setCloudStats(stats);
      } catch (e) {}
    };
    fetchSettings();
  }, []);

  const handleSavePin = async () => {
    if (newPinValue.length !== 4 || confirmPinInput.length !== 4) {
      Alert.alert("Erro", "O novo PIN deve ter 4 dígitos.");
      return;
    }
    if (newPinValue !== confirmPinInput) {
      Alert.alert("Erro", "Os novos PINs não coincidem.");
      return;
    }
    const currentStored = await SecureStore.getItemAsync(pinTypeToEdit);
    if (currentStored && currentStored !== currentPinInput) {
      Alert.alert('Erro', 'O PIN atual está incorreto.');
      return;
    }

    const userPin = pinTypeToEdit === 'user_pin' ? newPinValue : await SecureStore.getItemAsync('user_pin');
    const fakePin = pinTypeToEdit === 'fake_pin' ? newPinValue : await SecureStore.getItemAsync('fake_pin');
    const kamikazePin = pinTypeToEdit === 'kamikaze_pin' ? newPinValue : await SecureStore.getItemAsync('kamikaze_pin');
    
    if (userPin && fakePin && userPin === fakePin) {
      Alert.alert('Erro', 'O PIN de Fachada não pode ser igual ao PIN Principal.');
      return;
    }
    if (userPin && kamikazePin && userPin === kamikazePin) {
      Alert.alert('Erro', 'O PIN de Emergência não pode ser igual ao PIN Principal.');
      return;
    }
    if (fakePin && kamikazePin && fakePin === kamikazePin) {
      Alert.alert('Erro', 'O PIN de Emergência não pode ser igual ao PIN de Fachada.');
      return;
    }

    await SecureStore.setItemAsync(pinTypeToEdit, newPinValue);
    Alert.alert("Sucesso", "PIN atualizado com sucesso.", [
      { text: "OK", onPress: () => {
          showInterstitialAd(() => {
            setPinModalVisible(false);
            setCurrentPinInput('');
            setNewPinValue('');
            setConfirmPinInput('');
          });
      }}
    ]);
  };

  const handleOpenPinModal = async (type: 'user_pin' | 'fake_pin' | 'kamikaze_pin') => {
    setPinTypeToEdit(type);
    setCurrentPinInput('');
    setNewPinValue('');
    setConfirmPinInput('');
    setPinModalVisible(true);
  };

  const handleToggleSync = async (value: boolean) => {
    if (value && userPlan === 'FREE') {
      Alert.alert(
        'Acesso Restrito', 
        'O Backup Descentralizado é um recurso exclusivo do Plano PRO.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'VER PLANOS', onPress: () => router.push('/paywall') }
        ]
      );
      return;
    }
    setCloudSync(value);
    await SecureStore.setItemAsync('cloud_sync_enabled', value ? 'true' : 'false');
    try {
      await syncSettingsToCloud();
    } catch (e) {}
    
    // Executa a Sincronização Serverless
    if (value) {
      Alert.alert('Sincronização', 'Sincronização em tempo real ativada com a Nuvem!');
    }
  };

  const handleReset = async () => {
    Alert.alert(
      "Alerta de Segurança",
      "Isso destruirá todos os dados do cofre. Esta ação é irreversível.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "DESTRUIR", 
          style: "destructive",
          onPress: async () => {
            const { nukeVault } = await import('@/src/services/VaultService');
            await nukeVault();
            await SecureStore.deleteItemAsync('user_pin');
            Alert.alert("Sucesso", "Cofre e dados resetados com sucesso.");
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Excluir Conta Permanentemente",
      "Isso apagará seus dados de backup na nuvem e destruirá sua conta. O cofre local também será apagado. Esta ação é irreversível.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "EXCLUIR TUDO", 
          style: "destructive",
          onPress: async () => {
            await deleteUserAccount();
            const { nukeVault } = await import('@/src/services/VaultService');
            await nukeVault();
            await SecureStore.deleteItemAsync('user_pin');
            Alert.alert("Adeus", "Conta e arquivos destruídos.");
            auth.signOut();
          }
        }
      ]
    );
  };

  const handleSetBackground = async () => {
    if (userPlan === 'FREE') {
      Alert.alert(
        'Acesso Premium', 
        'Personalizar a tela de bloqueio é um recurso do Plano PRO.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'VER PLANOS', onPress: () => router.push('/paywall') }
        ]
      );
      return;
    }
    (global as any).ignoreNextBackground = true;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // Usa o editor nativo super estável
      aspect: [9, 16],
      quality: 0.8,
    });
    setTimeout(() => { (global as any).ignoreNextBackground = false; }, 1000);
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      await SecureStore.setItemAsync('lock_bg_uri', result.assets[0].uri);
      Alert.alert("Sucesso", "Plano de fundo premium atualizado!");
    }
  };

  useEffect(() => {
    if (params.triggerBg === 'true') {
      router.setParams({ triggerBg: undefined });
      handleSetBackground();
    }
  }, [params.triggerBg]);

  useEffect(() => {
    if (params.triggerPin === 'true') {
      router.setParams({ triggerPin: undefined });
      setTimeout(() => {
        // Rola até o final da tela (onde as configurações de PIN estão localizadas)
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 500);
    }
  }, [params.triggerPin]);


  const maxCapacityBytes = userPlan === 'ULTRA' ? 100 * 1024 * 1024 * 1024 : (userPlan === 'PRO' ? 10 * 1024 * 1024 * 1024 : 1 * 1024 * 1024 * 1024);
  const totalCloudBytes = cloudStats.main.bytes + cloudStats.decoy.bytes + cloudStats.trash.bytes + cloudStats.intruders.bytes;
  
  const totalPercent = Math.min((totalCloudBytes / maxCapacityBytes) * 100, 100);
  const mainPercent = totalCloudBytes === 0 ? 0 : (cloudStats.main.bytes / totalCloudBytes) * 100;
  const decoyPercent = totalCloudBytes === 0 ? 0 : (cloudStats.decoy.bytes / totalCloudBytes) * 100;
  const trashPercent = totalCloudBytes === 0 ? 0 : (cloudStats.trash.bytes / totalCloudBytes) * 100;
  const intruderPercent = totalCloudBytes === 0 ? 0 : (cloudStats.intruders.bytes / totalCloudBytes) * 100;
  
  const estimatedSizeMB = totalCloudBytes / (1024 * 1024); // in MB

  return (
    <ScrollView ref={scrollViewRef} style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('settings')}</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
           {t('gerencie_preferncias_e_se')} </Text>
      </View>

      {/* SEÇÃO 1: NUVEM E BACKUP */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{"// 01. CONEXÃO & CLOUD"}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.surface + '80', borderColor: theme.border + '33' }]}>
        
        {/* Item: Sincronização Cloud */}
        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <View style={styles.titleRow}>
                <Text style={[styles.optionText, { color: theme.text }]}> {t('sincronizao_cloud')} </Text>
                <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}> {t('pro')} </Text></View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('backup_criptografado_na_n')} </Text>
            </View>
          </View>
          <Switch 
            value={cloudSync} 
            onValueChange={handleToggleSync}
            trackColor={{ false: theme.surfaceHighlight, true: theme.tint }}
            thumbColor={cloudSync ? '#FFF' : '#888'}
          />
        </View>

        {cloudSync && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />
            {/* Item: Somente via Wi-Fi */}
            <View style={styles.optionRow}>
              <View style={styles.optionLeft}>
                <View style={styles.textWrapper}>
                  <Text style={[styles.optionText, { color: theme.text }]}> {t('somente_via_wifi')} </Text>
                  <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('economize_seus_dados_mvei')} </Text>
                </View>
              </View>
              <Switch 
                value={wifiOnly} 
                onValueChange={async (value) => {
                  setWifiOnly(value);
                  await SecureStore.setItemAsync('wifi_only', value ? 'true' : 'false');
                  try {
                    syncSettingsToCloud().catch(() => {});
                  } catch (e) {}
                }}
                trackColor={{ false: theme.surfaceHighlight, true: theme.tint }}
                thumbColor={wifiOnly ? '#FFF' : '#888'}
              />
            </View>
          </>
        )}
      </View>

      {cloudSync && (
        <View style={[styles.telemetryCard, { backgroundColor: theme.surface + 'C0', borderColor: theme.border + '50' }]}>
          {/* Telemetry Header */}
          <View style={[styles.telemetryHeader, { borderBottomColor: theme.border + '33' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 10 }}>
              <Text style={[styles.telemetryTitle, { color: theme.text }]} numberOfLines={1}>
                 {t('telemetria_cloud')} </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(0, 255, 102, 0.05)', borderColor: 'rgba(0, 255, 102, 0.2)' }]}>
              <Animated.View style={[styles.statusDot, pulseStyle]} />
              <Text style={styles.statusText}> {t('online')} </Text>
            </View>
          </View>
          {/* Progress Gauges Grid */}
          <View style={styles.telemetryBody}>
            {/* Left side: Outer gauge circle */}
            <View style={[styles.gaugeContainer, { borderColor: theme.border + '50' }]}>
              <View style={[styles.gaugeCircle, { backgroundColor: theme.background, borderColor: totalPercent > 0 ? theme.tint : theme.border + '33' }]}>
                <Text style={[styles.gaugeValue, { color: theme.tint }]}>
                  {totalPercent > 0 && totalPercent < 0.1 ? '< 0.1' : totalPercent.toFixed(1)}%
                </Text>
                <Text style={[styles.gaugeLabel, { color: theme.textSecondary, opacity: 0.6 }]}> {t('ocupado')} </Text>
              </View>
            </View>

            {/* Right side: Detailed progress values */}
            <View style={styles.channelsList}>
              {/* Channel 1: Meu Cofre */}
              <View style={styles.channelRow}>
                <View style={styles.channelInfo}>
                  <Text style={[styles.channelName, { color: theme.text }]}> {t('meu_cofre')} </Text>
                  <Text style={[styles.channelVal, { color: theme.textSecondary, opacity: 0.8 }]}>
                    {cloudStats.main.count}  {t('itens')} {mainPercent.toFixed(1)}%)
                  </Text>
                </View>
                <View style={[styles.trackContainer, { backgroundColor: theme.surfaceHighlight + '40' }]}>
                  <LinearGradient
                    colors={[theme.tint, theme.tint + '22']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.gradientBar, { width: `${Math.max(2, mainPercent)}%` }]}
                  />
                </View>
              </View>

              {/* Channel 2: Cofre Falso */}
              <View style={styles.channelRow}>
                <View style={styles.channelInfo}>
                  <Text style={[styles.channelName, { color: theme.text }]}> {t('cofre_falso')} </Text>
                  <Text style={[styles.channelVal, { color: theme.textSecondary, opacity: 0.8 }]}>
                    {cloudStats.decoy.count}  {t('itens')} {decoyPercent.toFixed(1)}%)
                  </Text>
                </View>
                <View style={[styles.trackContainer, { backgroundColor: theme.surfaceHighlight + '40' }]}>
                  <LinearGradient
                    colors={['#00FF66', 'rgba(0, 255, 102, 0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.gradientBar, { width: `${Math.max(2, decoyPercent)}%` }]}
                  />
                </View>
              </View>

              {/* Channel 3: Lixeira */}
              <View style={styles.channelRow}>
                <View style={styles.channelInfo}>
                  <Text style={[styles.channelName, { color: theme.text }]}> {t('lixeira')} </Text>
                  <Text style={[styles.channelVal, { color: theme.textSecondary, opacity: 0.8 }]}>
                    {cloudStats.trash.count}  {t('itens')} {trashPercent.toFixed(1)}%)
                  </Text>
                </View>
                <View style={[styles.trackContainer, { backgroundColor: theme.surfaceHighlight + '40' }]}>
                  <LinearGradient
                    colors={['#FF9F0A', 'rgba(255, 159, 10, 0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.gradientBar, { width: `${Math.max(2, trashPercent)}%` }]}
                  />
                </View>
              </View>

              {/* Channel 4: Evidências */}
              <View style={styles.channelRow}>
                <View style={styles.channelInfo}>
                  <Text style={[styles.channelName, { color: theme.text }]}> {t('evidncias')} </Text>
                  <Text style={[styles.channelVal, { color: theme.textSecondary, opacity: 0.8 }]}>
                    {cloudStats.intruders.count}  {t('itens')} {intruderPercent.toFixed(1)}%)
                  </Text>
                </View>
                <View style={[styles.trackContainer, { backgroundColor: theme.surfaceHighlight + '40' }]}>
                  <LinearGradient
                    colors={['#FF3B30', 'rgba(255, 59, 48, 0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.gradientBar, { width: `${Math.max(2, intruderPercent)}%` }]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Data Telemetry Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.telemetryGridCell, { backgroundColor: theme.surfaceHighlight + '20', borderColor: theme.border + '33' }]}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary, opacity: 0.5 }]}> {t('algoritmo')} </Text>
              <Text style={[styles.gridValue, { color: theme.text }]}> {t('aesgcm256')} </Text>
            </View>
            <View style={[styles.telemetryGridCell, { backgroundColor: theme.surfaceHighlight + '20', borderColor: theme.border + '33' }]}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary, opacity: 0.5 }]}> {t('espao_utilizado')} </Text>
              <Text style={[styles.gridValue, { color: theme.text }]}>
                {estimatedSizeMB > 1024 ? (estimatedSizeMB / 1024).toFixed(2) + ' GB' : estimatedSizeMB.toFixed(2) + ' MB'} / {userPlan === 'ULTRA' ? '100 GB' : (userPlan === 'PRO' ? '10 GB' : '1 GB')}
              </Text>
            </View>
            <View style={[styles.telemetryGridCell, { backgroundColor: theme.surfaceHighlight + '20', borderColor: theme.border + '33' }]}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary, opacity: 0.5 }]}> {t('modo_atual')} </Text>
              <Text style={[styles.gridValue, { color: theme.tint }]}>
                {userPlan === 'ULTRA' ? 'ULTRA' : (userPlan === 'PRO' ? 'PRO VIP' : 'FREE USER')}
              </Text>
            </View>
            <View style={[styles.telemetryGridCell, { backgroundColor: theme.surfaceHighlight + '20', borderColor: theme.border + '33' }]}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary, opacity: 0.5 }]}> {t('ncleo_cloud')} </Text>
              <Text style={[styles.gridValue, { color: theme.tint }]}> {t('serverless_active')} </Text>
            </View>
          </View>
        </View>
      )}

      {/* SEÇÃO 2: VISUAL E FACHADAS */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{"// 02. VISUAL & CAMUFLAGEM"}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.surface + '80', borderColor: theme.border + '33' }]}>
        
        {/* Fundo de Tela de Bloqueio */}
        <Pressable 
          style={({ pressed }) => [
            styles.optionClickableRow,
            { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }
          ]} 
          onPress={handleSetBackground}
        >
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <View style={styles.titleRow}>
                <Text style={[styles.optionText, { color: theme.text }]}> {t('fundo_de_tela_de_bloqueio')} </Text>
                <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}> {t('pro')} </Text></View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('upload_de_imagem_de_bloqu')} </Text>
            </View>
          </View>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

        {/* Camuflagem & Disfarce */}
        <Pressable 
          style={({ pressed }) => [
            styles.optionClickableRow,
            { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }
          ]} 
          onPress={() => router.push('/disguise')}
        >
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}> {t('camuflagem__disfarce_1')} </Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('disfarce_de_calculadora_n')} </Text>
            </View>
          </View>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

        {/* Cofre Falso */}
        <Pressable 
          style={({ pressed }) => [
            styles.optionClickableRow,
            { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }
          ]} 
          onPress={() => router.push('/(drawer)/decoy')}
        >
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}> {t('cofre_falso_isca')} </Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('gerenciar_pin_e_pastas_do')} </Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* SEÇÃO EXCLUSIVA PRO */}
      <Text style={[styles.sectionHeader, { color: '#FFD700', marginTop: 30, textAlign: 'center', fontSize: 14 }]}>{"// PROTOCOLO MILITAR PRO VIP"}</Text>
      
      <View style={{ marginHorizontal: 15, borderRadius: 16, overflow: 'hidden', padding: 2, position: 'relative', marginBottom: 20 }}>
        {/* Rotating Animated Gradient Border */}
        <Animated.View style={[{ position: 'absolute', width: '200%', height: '300%', top: '-100%', left: '-50%' }, rotateStyle]}>
          <LinearGradient
            colors={['#FF0033', '#FFD700', '#00FF66', '#FF0033']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>
        <View style={{ backgroundColor: theme.surface, borderRadius: 14, padding: 5 }}>
          <Pressable 
            style={({ pressed }) => [
              styles.optionClickableRow,
              { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent', borderRadius: 12, justifyContent: 'center' }
            ]} 
            onPress={() => router.push('/paywall')}
          >
            <View style={[styles.optionLeft, { justifyContent: 'center' }]}>
              <View style={[styles.textWrapper, { alignItems: 'center' }]}>
                <Text style={[styles.optionText, { color: '#FFD700', fontSize: 18, marginBottom: 5 }]}> {t('gerenciar_assinatura_pro')} </Text>
                <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.9, textAlign: 'center' }]}> {t('desbloqueie_agora_todos_o')} </Text>
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      
      {/* SEÇÃO SEGURANÇA PIN */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{"// GERENCIAMENTO DE PIN"}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.surface + '80', borderColor: theme.border + '33' }]}>
        <Pressable style={({ pressed }) => [styles.optionClickableRow, { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }]} onPress={() => handleOpenPinModal('user_pin')}>
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}> {t('vereditar_pin_principal')} </Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('o_pin_principal_da_sua_co')} </Text>
            </View>
          </View>
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />
        <Pressable style={({ pressed }) => [styles.optionClickableRow, { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }]} onPress={() => handleOpenPinModal('fake_pin')}>
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}> {t('vereditar_pin_de_fachada')} </Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('pin_para_acessar_o_cofre_')} </Text>
            </View>
          </View>
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />
        <Pressable style={({ pressed }) => [styles.optionClickableRow, { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }]} onPress={() => handleOpenPinModal('kamikaze_pin')}>
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}> {t('vereditar_pin_kamikaze')} </Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('o_pin_que_apaga_tudo_se_d')} </Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* SEÇÃO 3: CONTA */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{"// 03. CONTA & SISTEMA"}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.surface + '80', borderColor: theme.border + '33' }]}>

        {/* Avalie o App */}
        <Pressable 
          style={({ pressed }) => [
            styles.optionClickableRow,
            { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }
          ]} 
          onPress={async () => {
            if (await StoreReview.hasAction()) {
              StoreReview.requestReview();
            } else {
              Alert.alert('Avaliação', 'A avaliação na loja não está disponível neste dispositivo.');
            }
          }}
        >
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}> {t('avalie_o_stashflix')} </Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('sua_opinio_nos_ajuda_a_me')} </Text>
            </View>
          </View>
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

        {/* Manual de Segurança */}
        <Pressable 
          style={({ pressed }) => [
            styles.optionClickableRow,
            { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }
          ]} 
          onPress={() => router.push('/(drawer)/security-tips')}
        >
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}> {t('manual_de_segurana')} </Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('dicas_e_boas_prticas_de_p')} </Text>
            </View>
          </View>
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

        {/* Suporte e Sugestões */}
        <Pressable 
          style={({ pressed }) => [
            styles.optionClickableRow,
            { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }
          ]} 
          onPress={() => Linking.openURL('mailto:suporte@stashflix.com?subject=Feedback%20sobre%20o%20StashFlix')}
        >
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}> {t('suporte_e_sugestes')} </Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('fale_conosco_ou_reporte_u')} </Text>
            </View>
          </View>
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

        {/* Logout */}
        <Pressable 
          style={({ pressed }) => [
            styles.optionClickableRow,
            { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }
          ]} 
          onPress={async () => {
            await SecureStore.deleteItemAsync('has_onboarded');
            await SecureStore.deleteItemAsync('user_pin');
            await SecureStore.deleteItemAsync('fake_pin');
            await SecureStore.deleteItemAsync('kamikaze_pin');
            auth.signOut();
          }}
        >
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.textSecondary }]}> {t('logout')} </Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('desconectar_de')} {auth.currentUser?.email}</Text>
            </View>
          </View>
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

        {/* Excluir Conta */}
        <Pressable 
          style={({ pressed }) => [
            styles.optionClickableRow,
            { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }
          ]} 
          onPress={handleDeleteAccount}
        >
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: '#FF0033' }]}> {t('excluir_conta_e_dados_da_')} </Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}> {t('apaga_sua_conta_e_todos_o')} </Text>
            </View>
          </View>
        </Pressable>
      </View>

      <Pressable 
        style={({ pressed }) => [
          styles.panicButton,
          {
            backgroundColor: pressed ? 'rgba(255, 0, 51, 0.25)' : 'rgba(255, 0, 51, 0.1)',
            borderColor: '#FF0033',
            transform: [{ scale: pressed ? 0.97 : 1 }],
            shadowOpacity: pressed ? 0.8 : 0.3,
            shadowRadius: pressed ? 12 : 5
          }
        ]} 
        onPress={handleReset}
      >
        <Text style={styles.panicText}> {t('modo_pnico_apagar_tudo')} </Text>
      </Pressable>
      

    
      {/* PIN Edit Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {pinTypeToEdit === 'user_pin' ? 'Alterar PIN Principal' : pinTypeToEdit === 'fake_pin' ? 'Alterar PIN de Fachada' : 'Alterar PIN Kamikaze'}
            </Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Digite o PIN Atual"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={currentPinInput}
              onChangeText={setCurrentPinInput}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Digite o Novo PIN (4 dígitos)"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={newPinValue}
              onChangeText={setNewPinValue}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Confirme o Novo PIN"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={confirmPinInput}
              onChangeText={setConfirmPinInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={() => setPinModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text }]}> {t('cancelar')} </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#ef4444', opacity: (newPinValue.length===4 && confirmPinInput.length===4 && currentPinInput.length===4) ? 1 : 0.5 }]} 
                onPress={handleSavePin}
                disabled={newPinValue.length!==4 || confirmPinInput.length!==4 || currentPinInput.length!==4}
              >
                <Text style={[styles.modalBtnText, { color: '#ffffff' }]}> {t('salvar_novo_pin')} </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_SIZE = SCREEN_WIDTH * 0.8;

const styles = StyleSheet.create({
  container: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', padding: 24, borderRadius: 16, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 15 },
  input: { padding: 15, borderRadius: 8, borderWidth: 1, marginBottom: 20, fontFamily: 'SpaceGrotesk_400Regular' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  modalBtnText: { fontFamily: 'SpaceGrotesk_700Bold' },
  header: { padding: 20, paddingTop: 60, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 4 },
  headerSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', opacity: 0.8 },
  sectionHeader: { paddingHorizontal: 20, marginTop: 25, marginBottom: 10, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  optionClickableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  textWrapper: { flex: 1, marginRight: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionText: { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },
  optionDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3, opacity: 0.7 },
  proBadge: { backgroundColor: '#FFD700', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, justifyContent: 'center', alignItems: 'center' },
  proText: { color: '#FFF', fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold' },
  divider: { height: 1, width: '100%' },
  glowSwitch: { shadowColor: '#FF0033', shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 },
  panicButton: { marginTop: 40, marginHorizontal: 20, borderWidth: 1.5, padding: 18, borderRadius: 12, alignItems: 'center', shadowColor: '#FF0033', shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  panicText: { color: '#FF0033', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, letterSpacing: 2.5, textTransform: 'uppercase' },

  // Telemetry Dashboard Styles
  telemetryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 15,
    marginVertical: 10,
    backgroundColor: 'rgba(5, 5, 5, 0.95)',
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 8,
  },
  telemetryTitle: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 255, 102, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF66',
    marginRight: 6,
  },
  statusText: {
    color: '#00FF66',
    fontSize: 8,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  telemetryBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  gaugeContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  gaugeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  gaugeValue: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  gaugeLabel: {
    color: '#666',
    fontSize: 7,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    marginTop: 2,
  },
  channelsList: {
    flex: 1,
    gap: 8,
  },
  channelRow: {
    width: '100%',
  },
  channelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  channelName: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  channelVal: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  trackContainer: {
    width: '100%',
    height: 5,
    backgroundColor: '#1E1E1E',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  gradientBar: {
    height: '100%',
    borderRadius: 2.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  telemetryGridCell: {
    width: '48%',
    borderRadius: 6,
    padding: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridLabel: {
    color: '#555',
    fontSize: 7,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 2,
  },

  // Custom Crop Modal Styles (Futuristic Cyberpunk)
  modalContainer: { flex: 1, backgroundColor: '#030000', padding: 20, paddingTop: 50, alignItems: 'center' },
  modalTitle: { color: '#FFD700', fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, textShadowColor: '#FFD700', textShadowRadius: 10 },
  modalSubtitle: { color: '#888', fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 2, marginTop: 4, textTransform: 'uppercase', marginBottom: 15 },
  
  cropPreviewContainer: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 12,
    shadowColor: '#FF0033',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 5,
    marginVertical: 15,
  },
  cropOverlay: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#FFD700',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#FFD700',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  cropOverlay916: {
    width: PREVIEW_SIZE * 0.56,
    height: PREVIEW_SIZE * 0.99,
  },
  cropOverlay11: {
    width: PREVIEW_SIZE * 0.9,
    height: PREVIEW_SIZE * 0.9,
  },
  cropOverlayOriginal: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderColor: '#00D8FF',
  },
  gridRow: { flex: 1, flexDirection: 'row' },
  gridCell: { flex: 1, borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.1)', borderStyle: 'dashed' },
  corner: { position: 'absolute', width: 14, height: 14, borderColor: '#FF0033' },
  cornerTL: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },

  presetGroup: { flexDirection: 'row', gap: 10, width: '100%', justifyContent: 'center', marginVertical: 10 },
  presetButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#222', backgroundColor: '#111' },
  activePresetButton: { borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.1)' },
  presetText: { color: '#888', fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  activePresetText: { color: '#FFD700' },

  actionGroup: { flexDirection: 'row', gap: 15, width: '100%', justifyContent: 'center', marginVertical: 10 },
  actionButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0, 216, 255, 0.3)', backgroundColor: '#050505', flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionButtonText: { color: '#00D8FF', fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

  saveCropButton: {
    width: '90%',
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveCropText: { color: '#FFD700', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, letterSpacing: 2 },
  cancelCropButton: { padding: 15, marginTop: 10 },
  cancelCropText: { color: '#666', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, letterSpacing: 1 }
});
