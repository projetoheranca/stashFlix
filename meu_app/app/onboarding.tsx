import { View, Text, StyleSheet, TouchableOpacity, Linking, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    title: "SEGURANÇA FURTIVA",
    subtitle: "Criptografia de classe militar. Seus arquivos ficam invisíveis e inacessíveis para o sistema e invasores.",
    icon: "shield-checkmark"
  },
  {
    title: "COFRE FALSO (ISCA)",
    subtitle: "Alguém exigiu sua senha? Entregue o PIN Falso e mostre uma galeria vazia e inofensiva.",
    icon: "finger-print"
  },
  {
    title: "MODO FANTASMA",
    subtitle: "Esconda o ícone do aplicativo ou disfarce-o como uma Calculadora. Você no controle total.",
    icon: "eye-off"
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push('/permissions');
    }
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <View style={styles.content}>
        
        <View style={styles.logoContainer}>
          <Text style={[
            styles.logoText,
            { color: theme.error, textShadowColor: theme.error, textShadowRadius: 15 }
          ]}>
            STASHFLIX
          </Text>
        </View>

        <View style={styles.cardContainer}>
          <Ionicons name={step.icon as any} size={80} color={theme.tint} style={{ marginBottom: 20 }} />
          <Text style={[styles.stepTitle, { color: theme.text }]}>{step.title}</Text>
          <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>{step.subtitle}</Text>
        </View>

        <View style={styles.pagination}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.dot, 
                { backgroundColor: index === currentStep ? theme.tint : theme.border },
                index === currentStep && { width: 24 }
              ]} 
            />
          ))}
        </View>

      </View>

      <View style={styles.footer}>
        <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
          Ao iniciar a sequência, você concorda com nossos <Text style={{ color: '#00FF66', textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://stashflix.app/terms')}>Termos de Uso</Text>, <Text style={{ color: '#00FF66', textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://stashflix.app/privacy')}>Política de Privacidade</Text> (LGPD) e <Text style={{ color: '#00FF66', textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://stashflix.app/support')}>Suporte</Text>.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.tint, shadowColor: theme.tint }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'INICIAR SEQUÊNCIA' : 'PRÓXIMO'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    position: 'absolute',
    top: 80,
  },
  logoText: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  cardContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  stepSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  pagination: {
    flexDirection: 'row',
    marginTop: 50,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    padding: 30,
    paddingBottom: 50,
  },
  button: {
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  buttonText: {
    color: '#000000',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  privacyText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 14,
  }
});
