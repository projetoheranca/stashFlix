import { View, Text, StyleSheet, Pressable, Alert, Switch, ScrollView, Modal, Image, ActivityIndicator, Dimensions } from 'react-native';
import { registerDevice } from '@/src/services/ApiService';
import * as SecureStore from 'expo-secure-store';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth } from '@/src/services/FirebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppContext } from '@/src/contexts/AppContext';
import * as ScreenCapture from 'expo-screen-capture';
import { syncSettingsToCloud } from '@/src/services/FirebaseDB';
import * as ImageManipulator from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

export default function SettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userPlan, setUserPlan, activePalette: theme } = useAppContext();
  
  const [cloudSync, setCloudSync] = useState(false);
  const [breakInAlerts, setBreakInAlerts] = useState(true);
  const [ghostMode, setGhostMode] = useState(false);
  const [spyMic, setSpyMic] = useState(false);
  const [decoyCount, setDecoyCount] = useState(0);
  const [mainCount, setMainCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [blockPrints, setBlockPrints] = useState(false);
  const [intruderVideoDuration, setIntruderVideoDuration] = useState<'0' | '5' | '15' | '30'>('0');

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
      const alertsPref = await SecureStore.getItemAsync('breakin_alerts');
      if (alertsPref === 'false') setBreakInAlerts(false);
      
      const ghostPref = await SecureStore.getItemAsync('ghost_mode_enabled');
      if (ghostPref === 'true') setGhostMode(true);

      const spyPref = await SecureStore.getItemAsync('spy_mic_enabled');
      if (spyPref === 'true') setSpyMic(true);

      const wifiPref = await SecureStore.getItemAsync('wifi_only');
      if (wifiPref === 'false') setWifiOnly(false);

      const blockPrintsPref = await SecureStore.getItemAsync('block_prints_enabled');
      if (blockPrintsPref === 'true') setBlockPrints(true);

      const videoPref = await SecureStore.getItemAsync('intruder_video_duration');
      if (videoPref) setIntruderVideoDuration(videoPref as any);

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
    };
    fetchSettings();
  }, []);

  const handleToggleAlerts = async (value: boolean) => {
    setBreakInAlerts(value);
    await SecureStore.setItemAsync('breakin_alerts', value ? 'true' : 'false');
    try {
      await syncSettingsToCloud();
    } catch (e) {}
  };

  const handleToggleGhostMode = async (value: boolean) => {
    if (value && userPlan === 'FREE') {
      Alert.alert(
        'Acesso Restrito', 
        'O Modo Fantasma (Ghost Mode) é um recurso exclusivo do Plano PRO.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'VER PLANOS', onPress: () => router.push('/paywall') }
        ]
      );
      return;
    }
    setGhostMode(value);
    await SecureStore.setItemAsync('ghost_mode_enabled', value ? 'true' : 'false');
    try {
      // Proteção de print (ScreenCapture) desativada completamente a pedido do usuário
      await ScreenCapture.allowScreenCaptureAsync();
      await syncSettingsToCloud();
    } catch (e) {
      console.log('Erro ao alterar permissão de captura:', e);
    }
  };

  const handleToggleBlockPrints = async (value: boolean) => {
    if (value && userPlan === 'FREE') {
      Alert.alert(
        'Acesso Restrito', 
        'A Proteção Anti-Print é um recurso exclusivo do Plano PRO.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'VER PLANOS', onPress: () => router.push('/paywall') }
        ]
      );
      return;
    }
    setBlockPrints(value);
    await SecureStore.setItemAsync('block_prints_enabled', value ? 'true' : 'false');
    try {
      if (value) {
        await ScreenCapture.preventScreenCaptureAsync();
      } else {
        await ScreenCapture.allowScreenCaptureAsync();
      }
      await syncSettingsToCloud();
    } catch (e) {
      console.log('Erro ao alterar permissão de captura:', e);
    }
  };

  const handleToggleSpyMic = async (value: boolean) => {
    if (value && userPlan === 'FREE') {
      Alert.alert(
        'Acesso Restrito', 
        'O Microfone Espião é um recurso exclusivo do Plano PRO.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'VER PLANOS', onPress: () => router.push('/paywall') }
        ]
      );
      return;
    }
    setSpyMic(value);
    await SecureStore.setItemAsync('spy_mic_enabled', value ? 'true' : 'false');
    try {
      await syncSettingsToCloud();
    } catch (e) {}
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
    
    // Executa a Sincronização Serverless
    if (value) {
      Alert.alert('Sincronização Iniciada', 'Comprimindo e enviando arquivos diretamente para a Nuvem de forma segura...');
      const { syncVaultToCloud } = await import('@/src/services/VaultService');
      const total = await syncVaultToCloud(false); // No need to pass isFakeVault here directly unless we want to, wait we can just pass false. Actually let's assume we sync the main vault.
      Alert.alert('Sucesso', `${total} arquivos sincronizados com compressão On-Device.`);
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, // Disables native editor
      quality: 0.9,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImageUri(result.assets[0].uri);
      setImageWidth(result.assets[0].width);
      setImageHeight(result.assets[0].height);
      setCropPreset('9:16');
      setRotation(0);
      setFlipX(false);
      setCropModalVisible(true);
    }
  };

  useEffect(() => {
    if (params.triggerBg === 'true') {
      router.setParams({ triggerBg: undefined });
      handleSetBackground();
    }
  }, [params.triggerBg]);

  const handleConfirmCrop = async () => {
    if (!selectedImageUri) return;
    setCropLoading(true);
    try {
      const actions: ImageManipulator.Action[] = [];
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }
      if (flipX) {
        actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      }

      let w = imageWidth || 1080;
      let h = imageHeight || 1920;
      if (rotation === 90 || rotation === 270) {
        w = imageHeight || 1920;
        h = imageWidth || 1080;
      }

      if (cropPreset === '9:16') {
        const targetRatio = 9 / 16;
        let cropW = w;
        let cropH = h;
        let originX = 0;
        let originY = 0;

        if (w / h > targetRatio) {
          cropW = h * targetRatio;
          originX = (w - cropW) / 2;
        } else {
          cropH = w / targetRatio;
          originY = (h - cropH) / 2;
        }
        actions.push({
          crop: {
            originX: Math.round(originX),
            originY: Math.round(originY),
            width: Math.round(cropW),
            height: Math.round(cropH),
          }
        });
      } else if (cropPreset === '1:1') {
        const cropSize = Math.min(w, h);
        const originX = (w - cropSize) / 2;
        const originY = (h - cropSize) / 2;
        actions.push({
          crop: {
            originX: Math.round(originX),
            originY: Math.round(originY),
            width: Math.round(cropSize),
            height: Math.round(cropSize),
          }
        });
      }

      let finalUri = selectedImageUri;
      if (actions.length > 0) {
        const manipResult = await ImageManipulator.manipulateAsync(
          selectedImageUri,
          actions,
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        finalUri = manipResult.uri;
      }

      await SecureStore.setItemAsync('lock_bg_uri', finalUri);
      
      // Envia as configurações para a nuvem em segundo plano sem bloquear a interface de usuário
      syncSettingsToCloud().catch(err => {
        console.warn("Erro ao sincronizar configurações no background:", err);
      });

      setCropModalVisible(false);
      Alert.alert("Sucesso", "Fundo de tela personalizado aplicado com sucesso!");
    } catch (error) {
      console.warn("Erro ao cortar imagem:", error);
      Alert.alert("Erro", "Não foi possível processar o corte da imagem.");
    } finally {
      setCropLoading(false);
    }
  };

  const totalCount = mainCount + decoyCount + trashCount;
  const maxCapacity = 10000;
  const totalPercent = (totalCount / maxCapacity) * 100;
  const mainPercent = (mainCount / maxCapacity) * 100;
  const decoyPercent = (decoyCount / maxCapacity) * 100;
  const trashPercent = (trashCount / maxCapacity) * 100;
  const estimatedSize = (totalCount * 142) / 1024; // in MB

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>SISTEMA</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary, opacity: 0.8 }]}>Painel de Controle e Segurança do StashFlix</Text>
      </View>

      {/* SEÇÃO 1: NUVEM E BACKUP */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{"// 01. CONEXÃO & CLOUD"}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.surface + '80', borderColor: theme.border + '33' }]}>
        
        {/* Item: Sincronização Cloud */}
        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <View style={styles.titleRow}>
                <Text style={[styles.optionText, { color: theme.text }]}>Sincronização Cloud</Text>
                <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}>PRO</Text></View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>Backup criptografado para o Firebase</Text>
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
                  <Text style={[styles.optionText, { color: theme.text }]}>Somente via Wi-Fi</Text>
                  <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>Economize seus dados móveis</Text>
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
                TELEMETRIA CLOUD
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(0, 255, 102, 0.05)', borderColor: 'rgba(0, 255, 102, 0.2)' }]}>
              <Animated.View style={[styles.statusDot, pulseStyle]} />
              <Text style={styles.statusText}>ONLINE</Text>
            </View>
          </View>

          {/* Progress Gauges Grid */}
          <View style={styles.telemetryBody}>
            {/* Left side: Outer gauge circle */}
            <View style={[styles.gaugeContainer, { borderColor: theme.border + '50' }]}>
              <View style={[styles.gaugeCircle, { backgroundColor: theme.background, borderColor: totalPercent > 0 ? theme.tint : theme.border + '33' }]}>
                <Text style={[styles.gaugeValue, { color: theme.tint }]}>
                  {totalPercent.toFixed(1)}%
                </Text>
                <Text style={[styles.gaugeLabel, { color: theme.textSecondary, opacity: 0.6 }]}>OCUPADO</Text>
              </View>
            </View>

            {/* Right side: Detailed progress values */}
            <View style={styles.channelsList}>
              {/* Channel 1: Meu Cofre */}
              <View style={styles.channelRow}>
                <View style={styles.channelInfo}>
                  <Text style={[styles.channelName, { color: theme.text }]}>Meu Cofre</Text>
                  <Text style={[styles.channelVal, { color: theme.textSecondary, opacity: 0.8 }]}>
                    {mainCount} itens ({mainPercent.toFixed(1)}%)
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
                  <Text style={[styles.channelName, { color: theme.text }]}>Cofre Falso</Text>
                  <Text style={[styles.channelVal, { color: theme.textSecondary, opacity: 0.8 }]}>
                    {decoyCount} itens ({decoyPercent.toFixed(1)}%)
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
                  <Text style={[styles.channelName, { color: theme.text }]}>Lixeira</Text>
                  <Text style={[styles.channelVal, { color: theme.textSecondary, opacity: 0.8 }]}>
                    {trashCount} itens ({trashPercent.toFixed(1)}%)
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
            </View>
          </View>

          {/* Data Telemetry Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.telemetryGridCell, { backgroundColor: theme.surfaceHighlight + '20', borderColor: theme.border + '33' }]}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary, opacity: 0.5 }]}>ALGORITMO</Text>
              <Text style={[styles.gridValue, { color: theme.text }]}>AES-GCM-256</Text>
            </View>
            <View style={[styles.telemetryGridCell, { backgroundColor: theme.surfaceHighlight + '20', borderColor: theme.border + '33' }]}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary, opacity: 0.5 }]}>ESPAÇO ESTIMADO</Text>
              <Text style={[styles.gridValue, { color: theme.text }]}>{estimatedSize.toFixed(2)} MB / 2 GB</Text>
            </View>
            <View style={[styles.telemetryGridCell, { backgroundColor: theme.surfaceHighlight + '20', borderColor: theme.border + '33' }]}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary, opacity: 0.5 }]}>MODO ATUAL</Text>
              <Text style={[styles.gridValue, { color: theme.tint }]}>
                {userPlan === 'PRO' ? 'PRO VIP' : 'FREE USER'}
              </Text>
            </View>
            <View style={[styles.telemetryGridCell, { backgroundColor: theme.surfaceHighlight + '20', borderColor: theme.border + '33' }]}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary, opacity: 0.5 }]}>NÚCLEO CLOUD</Text>
              <Text style={[styles.gridValue, { color: theme.tint }]}>SERVERLESS ACTIVE</Text>
            </View>
          </View>
        </View>
      )}

      {/* SEÇÃO 2: PRIVACIDADE E DISPOSITIVO */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{"// 02. PRIVACIDADE & PROTOCOLOS"}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.surface + '80', borderColor: theme.border + '33' }]}>
        
        {/* Alertas de Invasão */}
        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}>Alertas de Invasão</Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>Capturar foto do intruso após PIN incorreto</Text>
            </View>
          </View>
          <Switch 
            value={breakInAlerts} 
            onValueChange={handleToggleAlerts}
            trackColor={{ false: theme.surfaceHighlight, true: theme.tint }}
            thumbColor={breakInAlerts ? '#FFF' : '#888'}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

        {/* Gravação de Vídeo do Intruso */}
        <Pressable 
          style={({ pressed }) => [
            styles.optionClickableRow,
            { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }
          ]}
          onPress={() => {
            if (userPlan === 'FREE') {
              Alert.alert(
                'Acesso Restrito', 
                'Gravar vídeo do intruso é um recurso exclusivo do Plano PRO.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'VER PLANOS', onPress: () => router.push('/paywall') }
                ]
              );
              return;
            }
            Alert.alert(
              "Gravação de Intruso", 
              "Quanto tempo a câmera deve gravar o invasor em vídeo oculto? (O PIN ficará bloqueado durante a gravação)",
              [
                { text: "Apenas Foto (Padrão)", onPress: async () => {
                  setIntruderVideoDuration('0');
                  await SecureStore.setItemAsync('intruder_video_duration', '0');
                }},
                { text: "5 Segundos", onPress: async () => {
                  setIntruderVideoDuration('5');
                  await SecureStore.setItemAsync('intruder_video_duration', '5');
                }},
                { text: "15 Segundos", onPress: async () => {
                  setIntruderVideoDuration('15');
                  await SecureStore.setItemAsync('intruder_video_duration', '15');
                }},
                { text: "30 Segundos", onPress: async () => {
                  setIntruderVideoDuration('30');
                  await SecureStore.setItemAsync('intruder_video_duration', '30');
                }}
              ]
            );
          }}
        >
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <View style={styles.titleRow}>
                <Text style={[styles.optionText, { color: theme.text }]}>Gravação de Intruso</Text>
                <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}>PRO</Text></View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>
                {intruderVideoDuration === '0' ? 'Capturar apenas foto' : `Gravar vídeo oculto de ${intruderVideoDuration}s`}
              </Text>
            </View>
          </View>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

        {/* Microfone Espião */}
        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <View style={styles.titleRow}>
                <Text style={[styles.optionText, { color: theme.text }]}>Microfone Espião</Text>
                <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}>PRO</Text></View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>Grava 15s de áudio ambiente após 3 falhas de PIN</Text>
            </View>
          </View>
          <Switch 
            value={spyMic} 
            onValueChange={handleToggleSpyMic}
            trackColor={{ false: theme.surfaceHighlight, true: theme.tint }}
            thumbColor={spyMic ? '#FFF' : '#888'}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

        {/* Ghost Mode */}
        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <View style={styles.titleRow}>
                <Text style={[styles.optionText, { color: theme.text }]}>Ocultar dos Recentes</Text>
                <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}>PRO</Text></View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>Oculta o app na tela de multitarefa (recentes)</Text>
            </View>
          </View>
          <Switch 
            value={ghostMode} 
            onValueChange={handleToggleGhostMode}
            trackColor={{ false: theme.surfaceHighlight, true: theme.tint }}
            thumbColor={ghostMode ? '#FFF' : '#888'}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

        {/* Proteção Anti-Print */}
        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <View style={styles.titleRow}>
                <Text style={[styles.optionText, { color: theme.text }]}>Proteção Anti-Print</Text>
                <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}>PRO</Text></View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>Impede prints, capturas e gravações de tela</Text>
            </View>
          </View>
          <Switch 
            value={blockPrints} 
            onValueChange={handleToggleBlockPrints}
            trackColor={{ false: theme.surfaceHighlight, true: theme.tint }}
            thumbColor={blockPrints ? '#FFF' : '#888'}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />

        {/* Tempo de Autodestruição */}
        <Pressable 
          style={({ pressed }) => [
            styles.optionClickableRow,
            { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }
          ]}
          onPress={() => {
            Alert.alert(
              "Protocolo Dead Man's Switch", 
              "Quantos dias de inatividade até o cofre se autodestruir?",
              [
                { text: "Desativado", onPress: async () => {
                  await SecureStore.deleteItemAsync('auto_destruct_days');
                  try {
                    syncSettingsToCloud().catch(() => {});
                  } catch (e) {}
                }},
                { text: "7 Dias", onPress: async () => {
                  await SecureStore.setItemAsync('auto_destruct_days', '7');
                  try {
                    syncSettingsToCloud().catch(() => {});
                  } catch (e) {}
                }},
                { text: "14 Dias", onPress: async () => {
                  await SecureStore.setItemAsync('auto_destruct_days', '14');
                  try {
                    syncSettingsToCloud().catch(() => {});
                  } catch (e) {}
                }},
                { text: "30 Dias", onPress: async () => {
                  await SecureStore.setItemAsync('auto_destruct_days', '30');
                  try {
                    syncSettingsToCloud().catch(() => {});
                  } catch (e) {}
                }}
              ]
            );
          }}
        >
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}>Tempo de Autodestruição</Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>Apaga o cofre em caso de inatividade prolongada</Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* SEÇÃO 3: VISUAL E FACHADAS */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{"// 03. VISUAL & CAMUFLAGEM"}</Text>
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
                <Text style={[styles.optionText, { color: theme.text }]}>Fundo de Tela de Bloqueio</Text>
                <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}>PRO</Text></View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>Upload de imagem de bloqueio personalizada</Text>
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
              <Text style={[styles.optionText, { color: theme.text }]}>Camuflagem & Disfarce</Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>Disfarce de calculadora, navegador e faixadas</Text>
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
          onPress={() => router.push('/decoy')}
        >
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}>Cofre Falso (Isca)</Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>Gerenciar PIN e pastas do cofre fachada</Text>
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
                <Text style={[styles.optionText, { color: '#FFD700', fontSize: 18, marginBottom: 5 }]}>GERENCIAR ASSINATURA PRO</Text>
                <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.9, textAlign: 'center' }]}>Desbloqueie agora todos os benefícios VIP</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      {/* SEÇÃO 4: CONTA */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{"// 04. CONTA & SISTEMA"}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.surface + '80', borderColor: theme.border + '33' }]}>

        {/* Logout */}
        <Pressable 
          style={({ pressed }) => [
            styles.optionClickableRow,
            { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }
          ]} 
          onPress={() => auth.signOut()}
        >
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.textSecondary }]}>Logout</Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>Desconectar de {auth.currentUser?.email}</Text>
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
        <Text style={styles.panicText}>MODO PÂNICO (APAGAR TUDO)</Text>
      </Pressable>
      
      {/* MODAL DE CORTE FUTURISTA DE WALLPAPER */}
      <Modal 
        visible={cropModalVisible} 
        animationType="slide" 
        transparent={false}
        onRequestClose={() => setCropModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <Text style={[styles.modalTitle, { color: theme.tint, textShadowColor: theme.tint }]}>CROP WALLPAPER</Text>
          <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>AJUSTE O SEU FUNDO PREMIUM COSMIC</Text>

          {/* Area de Preview */}
          <View style={[styles.cropPreviewContainer, { backgroundColor: theme.background, borderColor: theme.border + '50' }]}>
            {selectedImageUri && (
              <Image 
                source={{ uri: selectedImageUri }} 
                style={{
                  width: '100%',
                  height: '100%',
                  transform: [
                    { rotate: `${rotation}deg` },
                    { scaleX: flipX ? -1 : 1 },
                  ],
                }} 
                resizeMode="contain"
              />
            )}
            {/* Grid Overlay */}
            <View style={[
              styles.cropOverlay,
              { borderColor: theme.tint, shadowColor: theme.tint },
              cropPreset === '9:16' && styles.cropOverlay916,
              cropPreset === '1:1' && styles.cropOverlay11,
              cropPreset === 'original' && styles.cropOverlayOriginal
            ]}>
              <View style={styles.gridRow}>
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
              </View>
              <View style={styles.gridRow}>
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
              </View>
              <View style={styles.gridRow}>
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
              </View>

              {/* Glowing corners */}
              <View style={[styles.corner, styles.cornerTL, { borderColor: theme.tint }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: theme.tint }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: theme.tint }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: theme.tint }]} />
            </View>
          </View>

          {/* Preset Buttons */}
          <View style={styles.presetGroup}>
            <Pressable 
              style={({ pressed }) => [
                styles.presetButton, 
                { borderColor: theme.border, backgroundColor: theme.surface },
                cropPreset === '9:16' && [styles.activePresetButton, { borderColor: theme.tint, backgroundColor: theme.tint + '1A' }],
                pressed && { transform: [{ scale: 0.95 }] }
              ]}
              onPress={() => setCropPreset('9:16')}
            >
              <Text style={[styles.presetText, { color: theme.textSecondary }, cropPreset === '9:16' && { color: theme.tint }]}>9:16 (MOBILE)</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.presetButton, 
                { borderColor: theme.border, backgroundColor: theme.surface },
                cropPreset === '1:1' && [styles.activePresetButton, { borderColor: theme.tint, backgroundColor: theme.tint + '1A' }],
                pressed && { transform: [{ scale: 0.95 }] }
              ]}
              onPress={() => setCropPreset('1:1')}
            >
              <Text style={[styles.presetText, { color: theme.textSecondary }, cropPreset === '1:1' && { color: theme.tint }]}>1:1 (SQUARE)</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.presetButton, 
                { borderColor: theme.border, backgroundColor: theme.surface },
                cropPreset === 'original' && [styles.activePresetButton, { borderColor: theme.tint, backgroundColor: theme.tint + '1A' }],
                pressed && { transform: [{ scale: 0.95 }] }
              ]}
              onPress={() => setCropPreset('original')}
            >
              <Text style={[styles.presetText, { color: theme.textSecondary }, cropPreset === 'original' && { color: theme.tint }]}>ORIGINAL</Text>
            </Pressable>
          </View>

          {/* Action buttons (Rotate / Flip) */}
          <View style={styles.actionGroup}>
            <Pressable 
              style={({ pressed }) => [
                styles.actionButton,
                { borderColor: theme.border, backgroundColor: theme.surface },
                pressed && { transform: [{ scale: 0.95 }], backgroundColor: theme.surfaceHighlight }
              ]}
              onPress={() => setRotation(prev => (prev + 90) % 360)}
            >
              <Text style={[styles.actionButtonText, { color: theme.tint }]}>GIRAR 90°</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.actionButton,
                { borderColor: theme.border, backgroundColor: theme.surface },
                pressed && { transform: [{ scale: 0.95 }], backgroundColor: theme.surfaceHighlight }
              ]}
              onPress={() => setFlipX(prev => !prev)}
            >
              <Text style={[styles.actionButtonText, { color: theme.tint }]}>ESPELHAR</Text>
            </Pressable>
          </View>

          {/* Confirm & Cancel Buttons */}
          {cropLoading ? (
            <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 40 }} />
          ) : (
            <>
              <Pressable 
                style={({ pressed }) => [
                  styles.saveCropButton,
                  { borderColor: theme.tint, backgroundColor: theme.tint + '22', shadowColor: theme.tint },
                  pressed && { transform: [{ scale: 0.97 }], backgroundColor: theme.tint + '40' }
                ]}
                onPress={handleConfirmCrop}
              >
                <Text style={[styles.saveCropText, { color: theme.tint }]}>CORTAR E SALVAR</Text>
              </Pressable>
              <Pressable 
                style={({ pressed }) => [
                  styles.cancelCropButton,
                  pressed && { opacity: 0.6 }
                ]}
                onPress={() => setCropModalVisible(false)}
              >
                <Text style={styles.cancelCropText}>CANCELAR</Text>
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_SIZE = SCREEN_WIDTH * 0.8;

const styles = StyleSheet.create({
  container: { flex: 1 },
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
