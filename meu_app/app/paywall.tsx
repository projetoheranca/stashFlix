import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StatusBar } from 'expo-status-bar';
import { upgradeToPro, startTrial } from '@/src/services/ApiService';
import { useAppContext } from '@/src/contexts/AppContext';
import Purchases from 'react-native-purchases';

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
      if (packages.length > 0) {
        // Tenta comprar o primeiro pacote configurado (ex: Anual)
        const { customerInfo } = await Purchases.purchasePackage(packages[0]);
        // Assume que a entitlement se chama 'pro' no dashboard do RC
        if (typeof customerInfo.entitlements.active['pro'] !== "undefined") {
          await setUserPlan('PRO');
          Alert.alert('Bem-vindo ao PRO!', 'Sua assinatura militar foi ativada com sucesso!');
          router.back();
        } else {
          Alert.alert('Aviso', 'A compra foi concluída, mas o benefício não foi ativado.');
        }
      } else {
        Alert.alert('Em Configuração', 'Nenhum pacote encontrado. Certifique-se de configurar a API Key e os produtos no RevenueCat e nas lojas (Google Play/App Store).');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Erro', e.message || 'Erro na compra.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#050000' }]}>
      <StatusBar style="light" />
      
      {/* Radial Glow Simulation */}
      <View style={styles.glowBackground} />

      <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
        <Text style={styles.closeText}>X</Text>
      </TouchableOpacity>

      <View style={{ alignItems: 'center', marginBottom: 40, position: 'relative', width: '100%' }}>
        <Text style={styles.title}>UPGRADE PARA O PRO</Text>
        <Animated.Text style={[styles.titleGlow, pulseStyle]}>
          UPGRADE PARA O PRO
        </Animated.Text>
      </View>

      <View style={styles.cardContainer}>
        {/* Animated border using pseudo-glow */}
        <View style={styles.cardGlow} />
        <View style={styles.card}>
          <Text style={styles.cardTitle}>NÍVEL DE ACESSO: MÁXIMO</Text>
          
          <View style={styles.featureList}>
            {[
              'Criptografia Militar AES-256',
              'Backup Cloud Descentralizado',
              'Alerta de Invasão Silencioso',
              'Camuflagem (Calculadora Falsa)',
              'Modo Fantasma (App Oculto)',
              'Cofre Falso (Isca)',
              'Protocolo Dead Man\'s Switch (Kamikaze)',
              'Gravação de Vídeo do Intruso (30s)',
              'Alarme de Pânico (Sirene Policial)',
              'Microfone Espião de Ambiente',
              'Proteção Anti-Print e Gravação de Tela',
              'Fundos de Bloqueio Personalizados'
            ].map((feat, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.check}>✓</Text>
                <Text style={styles.featureText}>{feat}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.subscribeButton, { backgroundColor: theme.tint, shadowColor: theme.tint }]}
        activeOpacity={0.8}
        onPress={handleUpgrade}
        disabled={loading}
      >
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
        <Text style={styles.buttonText}>ATIVAR PROTOCOLO PRO</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={handleStartTrial} disabled={loading}>
        <Text style={styles.footerText}>Iniciar Teste Gratuito de 7 Dias</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 },
  glowBackground: { position: 'absolute', top: -200, width: 600, height: 600, borderRadius: 300, backgroundColor: 'rgba(255, 215, 0, 0.1)', opacity: 0.5 },
  closeButton: { position: 'absolute', top: 50, right: 20, padding: 15 },
  closeText: { color: '#666', fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold' },
  title: { color: '#FFD700', fontSize: 26, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, textAlign: 'center' },
  titleGlow: { position: 'absolute', color: '#FFD700', fontSize: 26, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, textAlign: 'center', textShadowColor: 'rgba(255, 215, 0, 0.95)', textShadowRadius: 20, textShadowOffset: { width: 0, height: 0 } },
  
  cardContainer: { width: '100%', alignItems: 'center', marginBottom: 40 },
  cardGlow: { position: 'absolute', width: '102%', height: '102%', backgroundColor: '#FFD700', borderRadius: 18, opacity: 0.25, shadowColor: '#FFD700', shadowOpacity: 1, shadowRadius: 20 },
  card: { width: '100%', backgroundColor: 'rgba(10,10,10,0.9)', borderRadius: 16, padding: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  
  cardTitle: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 14, letterSpacing: 2, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 10 },
  featureList: { gap: 15 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  check: { color: '#FFD700', fontSize: 18, marginRight: 10, textShadowColor: '#FFD700', textShadowRadius: 10 },
  featureText: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular', fontSize: 15 },
  
  subscribeButton: { width: '100%', height: 60, borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowOpacity: 0.8, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  shimmer: { position: 'absolute', top: 0, left: 0, width: 40, height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ skewX: '-20deg' }] },
  buttonText: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, letterSpacing: 1 },
  footerText: { color: '#000', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 20 },
});
