import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '@/src/contexts/AppContext';
import { auth, rtdb } from '@/src/services/FirebaseConfig';
import { ref, get } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import Purchases from 'react-native-purchases';
import { getCloudTelemetry } from '@/src/services/VaultService';
import { t } from "@/src/i18n";

export default function ManageSubscriptionScreen() {
  const router = useRouter();
  const { activePalette: theme, userPlan, setUserPlan } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [subDate, setSubDate] = useState<string>('N/A');
  const [usage, setUsage] = useState({ bytes: 0, count: 0 });

  useEffect(() => {
    const fetchSub = async () => {
      if (auth.currentUser) {
        try {
          const snapshot = await get(ref(rtdb, `users/${auth.currentUser.uid}`));
          if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.subscriptionDate) {
              const date = new Date(data.subscriptionDate);
              setSubDate(date.toLocaleDateString('pt-BR'));
            } else {
              setSubDate(new Date().toLocaleDateString('pt-BR'));
            }
          }
        } catch (e) {
          console.warn('Erro ao buscar data da assinatura:', e);
        }
      }
    };
    const fetchUsage = async () => {
      try {
        const stats = await getCloudTelemetry();
        if (stats) {
          const totalBytes = stats.main.bytes + stats.decoy.bytes + stats.trash.bytes + stats.intruders.bytes;
          const totalCount = stats.main.count + stats.decoy.count + stats.trash.count + stats.intruders.count;
          setUsage({ bytes: totalBytes, count: totalCount });
        }
      } catch (e) {
        console.warn('Erro ao buscar estatísticas:', e);
      }
    };
    fetchUsage();
    fetchSub();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getLimitBytes = () => {
    if (userPlan === 'ULTRA') return 100 * 1024 * 1024 * 1024;
    if (userPlan === 'PRO') return 10 * 1024 * 1024 * 1024;
    return 1 * 1024 * 1024 * 1024; // FREE
  };

  const limitBytes = getLimitBytes();
  const usagePercentage = Math.min((usage.bytes / limitBytes) * 100, 100);

  const handleCancel = async () => {
    Alert.alert(
      'Gerenciar Assinatura',
      `Deseja gerenciar ou cancelar sua assinatura ${userPlan}?`,
      [
        { text: 'Voltar', style: 'cancel' },
        { 
          text: 'Gerenciar na Loja', 
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              if (Constants.appOwnership === 'expo') {
                setUserPlan('FREE');
                Alert.alert('Simulação', 'Assinatura cancelada localmente (Modo Expo).');
                router.replace('/');
                return;
              }

              const customerInfo = await Purchases.getCustomerInfo();
              if (customerInfo.managementURL) {
                await Linking.openURL(customerInfo.managementURL);
              } else {
                Alert.alert('Aviso', 'Não foi possível encontrar a URL de gerenciamento. Cancele diretamente na App Store ou Google Play.');
              }
            } catch (e) {
              Alert.alert('Erro', 'Ocorreu um problema ao buscar os dados da assinatura.');
            } finally {
              setLoading(false);
            }
          } 
        }
      ]
    );
  };

  const isUltra = userPlan === 'ULTRA';

  return (
    <ScrollView style={[styles.container, { backgroundColor: '#050000' }]} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 10 }}>
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}> {t('painel_do_assinante')} </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Card Principal */}
      <View style={styles.card}>
        <LinearGradient
          colors={isUltra ? ['#00FFCC', '#009977'] : ['#FFD700', '#B8860B']}
          style={styles.cardHeader}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Ionicons name={isUltra ? "diamond" : "shield-checkmark"} size={40} color="#000" />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.planTitle}> {t('plano')} {userPlan}</Text>
            <Text style={styles.planStatus}> {t('status_ativo')} </Text>
          </View>
        </LinearGradient>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}> {t('membro_desde')} </Text>
            <Text style={[styles.infoValue, { color: '#FFFFFF' }]}>{subDate}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}> {t('prxima_cobrana')} </Text>
            <Text style={[styles.infoValue, { color: '#FFFFFF' }]}> {t('gerenciado_pela_loja')} </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}> {t('mtodo_de_pagamento')} </Text>
            <Text style={[styles.infoValue, { color: '#FFFFFF' }]}> {t('google_play__app_store')} </Text>
          </View>
        </View>
      </View>

      {/* Dashboard Analytics */}
      <View style={styles.dashboardContainer}>
        <Text style={styles.sectionTitle}> {t('consumo_de_dados')} </Text>
        
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="cloud-done" size={20} color={isUltra ? "#00FFCC" : "#FFD700"} />
            <Text style={styles.statLabel}> {t('armazenamento_em_nuvem')} </Text>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${usagePercentage}%`, backgroundColor: usagePercentage > 90 ? '#FF0033' : (isUltra ? '#00FFCC' : '#FFD700') }]} />
            </View>
          </View>
          
          <View style={styles.statFooter}>
            <Text style={styles.statValue}>{formatBytes(usage.bytes)}</Text>
            <Text style={styles.statLimit}>/ {formatBytes(limitBytes)}</Text>
          </View>
        </View>

        {userPlan === 'FREE' && (
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="document-text" size={20} color="#FFD700" />
              <Text style={styles.statLabel}> {t('limite_de_arquivos_free')} </Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min((usage.count / 50) * 100, 100)}%`, backgroundColor: usage.count >= 50 ? '#FF0033' : '#FFD700' }]} />
              </View>
            </View>
            <View style={styles.statFooter}>
              <Text style={[styles.statValue, { color: usage.count >= 50 ? '#FF0033' : '#FFF' }]}>{usage.count}  {t('arquivos')} </Text>
              <Text style={styles.statLimit}> {t('50_max')} </Text>
            </View>
          </View>
        )}
      </View>

      {/* Upgrade Banner (If PRO) */}
      {!isUltra && (
        <TouchableOpacity 
          style={styles.upgradeBanner}
          activeOpacity={0.8}
          onPress={() => router.push('/paywall')}
        >
          <Ionicons name="rocket" size={24} color="#00FFCC" />
          <Text style={styles.upgradeText}> {t('fazer_upgrade_para_ultra')} </Text>
        </TouchableOpacity>
      )}

      {/* Botões de Ação */}
      <View style={styles.actionsContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.error} />
        ) : (
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: theme.error }]}
            onPress={handleCancel}
          >
            <Ionicons name="close-circle-outline" size={20} color={theme.error} />
            <Text style={[styles.actionBtnText, { color: theme.error }]}> {t('gerenciar__cancelar_assin')} </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.disclaimer}>
         {t('o_stashflix_no_gerencia_c')} </Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 20 },
  headerTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, letterSpacing: 1 },
  
  card: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 30 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  planTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: '#000', letterSpacing: 2 },
  planStatus: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#333', letterSpacing: 1, marginTop: 4 },
  
  cardBody: { padding: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  infoLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#888' },
  infoValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },

  upgradeBanner: { marginHorizontal: 20, marginBottom: 30, padding: 20, borderRadius: 12, backgroundColor: 'rgba(0, 255, 204, 0.1)', borderWidth: 1, borderColor: 'rgba(0, 255, 204, 0.3)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  upgradeText: { color: '#00FFCC', fontFamily: 'SpaceGrotesk_700Bold', marginLeft: 10, letterSpacing: 1 },
  
  actionsContainer: { marginHorizontal: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,0,0,0.05)' },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginLeft: 8 },

  dashboardContainer: { marginHorizontal: 20, marginBottom: 30 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: '#888', letterSpacing: 2, marginBottom: 15 },
  statCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  statLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFF', marginLeft: 10 },
  progressContainer: { marginBottom: 10 },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  statFooter: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end' },
  statValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: '#FFF' },
  statLimit: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#888', marginLeft: 5 },

  disclaimer: { marginHorizontal: 30, marginTop: 40, fontFamily: 'Inter_400Regular', fontSize: 12, color: '#555', textAlign: 'center', lineHeight: 18 }
});
