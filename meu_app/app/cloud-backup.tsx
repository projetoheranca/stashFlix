import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Alert, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { useAppContext } from '@/src/contexts/AppContext';
import { syncSettingsToCloud } from '@/src/services/FirebaseDB';
import { getCloudTelemetry } from '@/src/services/VaultService';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { t } from "@/src/i18n";

export default function CloudBackupScreen() {
  const router = useRouter();
  const { userPlan, activePalette: theme } = useAppContext();
  
  const [cloudSync, setCloudSync] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [decoyCount, setDecoyCount] = useState(0);
  const [mainCount, setMainCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [cloudStats, setCloudStats] = useState({ main: { count: 0, bytes: 0 }, decoy: { count: 0, bytes: 0 }, trash: { count: 0, bytes: 0 }, intruders: { count: 0, bytes: 0 } });
  const [loading, setLoading] = useState(true);

  // Pulse animation states for telemetry
  const pulseValue = useSharedValue(0.4);

  useEffect(() => {
    pulseValue.value = withRepeat(
      withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseValue.value,
  }));

  useEffect(() => {
    const fetchSettings = async () => {
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
      
      setDecoyCount(await countFilesInDir(FileSystem.documentDirectory + 'DecoyVault/'));
      setMainCount(await countFilesInDir(FileSystem.documentDirectory + 'SecureVault/'));
      
      try {
         const trashFiles = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory + 'SecureVault/Trash/');
         setTrashCount(trashFiles.length);
      } catch (e) {}

      try {
        const stats = await getCloudTelemetry();
        if (stats) setCloudStats(stats);
      } catch (e) {}
      
      setLoading(false);
    };
    fetchSettings();
  }, []);

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
    
    if (value) {
      Alert.alert('Sincronização', 'Sincronização em tempo real ativada com a Nuvem!');
    }
  };

  const maxCapacityBytes = userPlan === 'ULTRA' ? 100 * 1024 * 1024 * 1024 : (userPlan === 'PRO' ? 10 * 1024 * 1024 * 1024 : 1 * 1024 * 1024 * 1024);
  const totalCloudBytes = cloudStats.main.bytes + cloudStats.decoy.bytes + cloudStats.trash.bytes + cloudStats.intruders.bytes;
  
  const totalPercent = Math.min((totalCloudBytes / maxCapacityBytes) * 100, 100);
  const mainPercent = totalCloudBytes === 0 ? 0 : (cloudStats.main.bytes / totalCloudBytes) * 100;
  const decoyPercent = totalCloudBytes === 0 ? 0 : (cloudStats.decoy.bytes / totalCloudBytes) * 100;
  const trashPercent = totalCloudBytes === 0 ? 0 : (cloudStats.trash.bytes / totalCloudBytes) * 100;
  const intruderPercent = totalCloudBytes === 0 ? 0 : (cloudStats.intruders.bytes / totalCloudBytes) * 100;
  
  const estimatedSizeMB = totalCloudBytes / (1024 * 1024);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="cloud-done" size={32} color={theme.tint} />
          <View style={{ marginLeft: 15 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}> {t('backup__nuvem')} </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}> {t('sincronizao_e_telemetria')} </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 50 }} />
        ) : (
          <>
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: 20, 
    paddingTop: 50, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.05)' 
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
  headerSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, opacity: 0.7 },
  closeButton: { padding: 5 },

  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  textWrapper: { flex: 1, marginRight: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionText: { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },
  optionDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3, opacity: 0.7 },
  proBadge: { backgroundColor: '#FFD700', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, justifyContent: 'center', alignItems: 'center' },
  proText: { color: '#FFF', fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold' },
  divider: { height: 1, width: '100%' },

  // Telemetry Dashboard Styles
  telemetryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
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
});
