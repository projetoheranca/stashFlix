import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { StatusBar } from 'expo-status-bar';

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

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

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Segurança furtiva de classe militar. Seus dados invisíveis para o sistema.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
          Ao iniciar a sequência, você concorda com nossos <Text style={{ color: '#00FF66', textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://stashflix.app/terms')}>Termos de Uso</Text>, <Text style={{ color: '#00FF66', textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://stashflix.app/privacy')}>Política de Privacidade</Text> (LGPD) e <Text style={{ color: '#00FF66', textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://stashflix.app/support')}>Suporte</Text>. Seus arquivos não saem do seu aparelho sem permissão expressa.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.tint, shadowColor: theme.tint }]}
          onPress={() => router.push('/permissions')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>INICIAR SEQUÊNCIA</Text>
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
    marginBottom: 40,
  },
  logoText: {
    fontSize: 48,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#FF0033',
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
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
