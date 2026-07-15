import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StatusBar } from 'expo-status-bar';
import { updatePlanInDatabase, startTrial } from '@/src/services/ApiService';
import { useAppContext } from '@/src/contexts/AppContext';
import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

export default function PaywallScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const { setUserPlan } = useAppContext();
  const [loading, setLoading] = useState(false);

  const shimmerOffset = useSharedValue(-width);
  const pulseValue = useSharedValue(0.35);

  const [packages, setPackages] = useState<any[]>([]);
  const [selectedTier, setSelectedTier] = useState<'PRO' | 'ULTRA'>('PRO');

  useEffect(() => {
    shimmerOffset.value = withRepeat(
      withTiming(width, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );
    pulseValue.value = withRepeat(
      withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Buscar pacotes do RevenueCat
    const fetchOfferings = async () => {
      try {
        if (Constants.appOwnership === 'expo') {
          console.warn("⚠️ Expo Go: Ignorando busca de produtos do RevenueCat.");
          return;
        }
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (e) {
        console.warn('Erro ao buscar produtos do RevenueCat', e);
      }
    };
    fetchOfferings();
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerOffset.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseValue.value,
  }));

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      // Por enquanto manteremos o mock no Trial até configurarmos o Trial nativo da App Store
      const result = await startTrial();
      if (result && result.user) {
        await setUserPlan(result.user.plan);
        Alert.alert('Modo de Teste', 'Período de teste de 7 dias ativado no servidor!');
        router.back();
      } else {
        await setUserPlan('TRIAL');
        Alert.alert('Modo de Demonstração', 'Período de teste ativado localmente.');
        router.back();
      }
    } catch (e) {
      Alert.alert('Erro', 'Erro ao alterar o plano.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      if (Constants.appOwnership === 'expo') {
        Alert.alert('Modo Desenvolvedor (Expo Go)', `Ativando ${selectedTier} simulado localmente.`);
        await updatePlanInDatabase(selectedTier);
        await setUserPlan(selectedTier);
        router.back();
        return;
      }

      // Procura o pacote do RevenueCat correspondente (Exige que os pacotes tenham "pro" ou "ultra" no identifier)
      const targetPkg = packages.find(p => p.identifier.toLowerCase().includes(selectedTier.toLowerCase())) || packages[0];
      
      if (targetPkg) {
        const { customerInfo } = await Purchases.purchasePackage(targetPkg);
        const isUltra = typeof customerInfo.entitlements.active['StashFlix Ultra'] !== "undefined" || typeof customerInfo.entitlements.active['ultra'] !== "undefined";
        const isPro = typeof customerInfo.entitlements.active['StashFlix Pro'] !== "undefined" || typeof customerInfo.entitlements.active['pro'] !== "undefined";
        
        if (isUltra) {
          await updatePlanInDatabase('ULTRA');
          await setUserPlan('ULTRA');
          Alert.alert('ULTRA Ativado!', 'Segurança Máxima ativada.');
          router.back();
        } else if (isPro) {
          await updatePlanInDatabase('PRO');
          await setUserPlan('PRO');
          Alert.alert('Bem-vindo ao PRO!', 'Sua assinatura foi ativada.');
          router.back();
        } else {
          Alert.alert('Aviso', 'A compra foi concluída, mas o benefício não foi ativado.');
        }
      } else {
        Alert.alert('Em Configuração', 'Nenhum pacote encontrado para ' + selectedTier);
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Erro', e.message || 'Erro na compra.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      if (Constants.appOwnership === 'expo') {
        Alert.alert('Modo Desenvolvedor (Expo Go)', 'Para restaurar compras reais, você precisa de uma build nativa.');
        return;
      }
      const customerInfo = await Purchases.restorePurchases();
      const isUltra = typeof customerInfo.entitlements.active['StashFlix Ultra'] !== "undefined" || typeof customerInfo.entitlements.active['ultra'] !== "undefined";
      const isPro = typeof customerInfo.entitlements.active['StashFlix Pro'] !== "undefined" || typeof customerInfo.entitlements.active['pro'] !== "undefined";
      
      if (isUltra) {
        await updatePlanInDatabase('ULTRA');
        await setUserPlan('ULTRA');
        Alert.alert('Sucesso!', 'Assinatura ULTRA restaurada.');
        router.back();
      } else if (isPro) {
        await updatePlanInDatabase('PRO');
        await setUserPlan('PRO');
        Alert.alert('Sucesso!', 'Assinatura PRO restaurada.');
        router.back();
      } else {
        Alert.alert('Aviso', 'Nenhuma compra ativa foi encontrada.');
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao restaurar compras.');
    } finally {
      setLoading(false);
    }
  };

  const proFeatures = [
    'Armazenamento em Nuvem (10GB)',
    'Arquivos Ilimitados',
    'Camuflagem (Calculadora e Navegador)',
    'Modo Fantasma (App Oculto)',
    'Cofre Falso (Isca com PIN Fake)',
    'Gravação de Vídeo do Intruso (5s)',
    'Proteção Anti-Print e Gravação de Tela',
    'Múltiplos Cofres (Até 3)',
    'Fundos de Bloqueio Personalizados'
  ];

  const ultraFeatures = [
    'Tudo do Plano PRO',
    'Armazenamento em Nuvem (100GB)',
    'Cofres Ilimitados',
    'Protocolo Dead Man\'s Switch (Autodestruição)',
    'Microfone Espião (Grava áudio do intruso)',
    'Câmera Espiã (Grava vídeo silencioso em 2º plano)',
    'Destruição Remota via Web',
    'Suporte Prioritário 24h'
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#050000' }]}>
      <StatusBar style="light" />
      
      {/* Radial Glow Simulation */}
      <View style={[styles.glowBackground, { backgroundColor: selectedTier === 'ULTRA' ? 'rgba(0, 255, 200, 0.15)' : 'rgba(255, 215, 0, 0.1)' }]} />

      <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
        <Text style={styles.closeText}>X</Text>
      </TouchableOpacity>

      <View style={{ alignItems: 'center', marginBottom: 20, marginTop: 40, width: '100%' }}>
        <Text style={[styles.title, selectedTier === 'ULTRA' && { color: '#00FFCC' }]}>
          UPGRADE PARA O {selectedTier}
        </Text>
        <Animated.Text style={[styles.titleGlow, pulseStyle, selectedTier === 'ULTRA' && { color: '#00FFCC', textShadowColor: 'rgba(0,255,200,0.9)' }]}>
          UPGRADE PARA O {selectedTier}
        </Animated.Text>
      </View>

      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, selectedTier === 'PRO' && styles.toggleBtnActivePRO]}
          onPress={() => setSelectedTier('PRO')}
        >
          <Text style={[styles.toggleText, selectedTier === 'PRO' && { color: '#000' }]}>PRO</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, selectedTier === 'ULTRA' && styles.toggleBtnActiveULTRA]}
          onPress={() => setSelectedTier('ULTRA')}
        >
          <Text style={[styles.toggleText, selectedTier === 'ULTRA' && { color: '#000' }]}>ULTRA</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardContainer}>
        <View style={[styles.cardGlow, selectedTier === 'ULTRA' && { backgroundColor: '#00FFCC', shadowColor: '#00FFCC' }]} />
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {selectedTier === 'ULTRA' ? 'NÍVEL DE ACESSO: EXTREMO' : 'NÍVEL DE ACESSO: AVANÇADO'}
          </Text>
          
          <View style={styles.featureList}>
            {(selectedTier === 'ULTRA' ? ultraFeatures : proFeatures).map((feat, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={[styles.check, selectedTier === 'ULTRA' && { color: '#00FFCC', textShadowColor: '#00FFCC' }]}>✓</Text>
                <Text style={styles.featureText}>{feat}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.subscribeButton, { backgroundColor: selectedTier === 'ULTRA' ? '#00FFCC' : theme.tint, shadowColor: selectedTier === 'ULTRA' ? '#00FFCC' : theme.tint }]}
        activeOpacity={0.8}
        onPress={handleUpgrade}
        disabled={loading}
      >
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
        <Text style={styles.buttonText}>ATIVAR PROTOCOLO {selectedTier}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={handleStartTrial} disabled={loading} style={{ marginTop: 25 }}>
        <Text style={styles.footerText}>Iniciar Teste Gratuito de 7 Dias</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={handleRestore} disabled={loading} style={{ marginTop: 15 }}>
        <Text style={[styles.footerText, { color: '#888', textDecorationLine: 'underline', marginTop: 0 }]}>Restaurar Compras</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 15, marginTop: 15 }}>
        <TouchableOpacity onPress={() => Linking.openURL('https://stashflix.app/terms.html')}>
          <Text style={[styles.footerText, { fontSize: 10, color: '#555', marginTop: 0 }]}>Termos de Uso</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://stashflix.app/privacy.html')}>
          <Text style={[styles.footerText, { fontSize: 10, color: '#555', marginTop: 0 }]}>Política de Privacidade</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 },
  glowBackground: { position: 'absolute', top: -200, width: 600, height: 600, borderRadius: 300, backgroundColor: 'rgba(255, 215, 0, 0.1)', opacity: 0.5 },
  closeButton: { position: 'absolute', top: 50, right: 20, padding: 15 },
  closeText: { color: '#666', fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold' },
  title: { color: '#FFD700', fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, textAlign: 'center' },
  titleGlow: { position: 'absolute', color: '#FFD700', fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, textAlign: 'center', textShadowColor: 'rgba(255, 215, 0, 0.95)', textShadowRadius: 20, textShadowOffset: { width: 0, height: 0 } },
  
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 30, padding: 5, marginBottom: 20, width: 250 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 25 },
  toggleBtnActivePRO: { backgroundColor: '#FFD700' },
  toggleBtnActiveULTRA: { backgroundColor: '#00FFCC' },
  toggleText: { color: '#FFF', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, letterSpacing: 1 },

  cardContainer: { width: '100%', alignItems: 'center', marginBottom: 30 },
  cardGlow: { position: 'absolute', width: '102%', height: '102%', backgroundColor: '#FFD700', borderRadius: 18, opacity: 0.25, shadowColor: '#FFD700', shadowOpacity: 1, shadowRadius: 20 },
  card: { width: '100%', backgroundColor: 'rgba(10,10,10,0.9)', borderRadius: 16, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  
  cardTitle: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 14, letterSpacing: 2, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 10 },
  featureList: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start' },
  check: { color: '#FFD700', fontSize: 16, marginRight: 10, textShadowColor: '#FFD700', textShadowRadius: 10 },
  featureText: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular', fontSize: 14, flexShrink: 1 },
  
  subscribeButton: { width: '100%', height: 60, borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowOpacity: 0.8, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  shimmer: { position: 'absolute', top: 0, left: 0, width: 40, height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ skewX: '-20deg' }] },
  buttonText: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, letterSpacing: 1 },
  footerText: { color: '#000', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 20 },
});
