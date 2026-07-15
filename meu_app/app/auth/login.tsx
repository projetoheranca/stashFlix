import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/src/services/FirebaseConfig';
import { useAppContext } from '@/src/contexts/AppContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const { activePalette: currentColors, colorSchemeMode, setColorSchemeMode } = useAppContext();
  const isDark = currentColors.background !== '#FFFFFF';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // 🔑 Baixa do Firebase todos os dados (user_pin, fake_pin, kamikaze_pin, configs)
      // para que o SecureStore local esteja atualizado ANTES do LockScreen validar o PIN.
      try {
        const { loadSettingsFromCloud } = await import('@/src/services/FirebaseDB');
        await loadSettingsFromCloud();
      } catch {}
      // O _layout.tsx detecta onAuthStateChanged e redireciona automaticamente
    } catch (error: any) {
      Alert.alert("Acesso Negado", error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    if (colorSchemeMode === 'dark') setColorSchemeMode('light');
    else if (colorSchemeMode === 'light') setColorSchemeMode('system');
    else setColorSchemeMode('dark');
  };

  const getThemeIcon = () => {
    if (colorSchemeMode === 'dark') return 'moon';
    if (colorSchemeMode === 'light') return 'sunny';
    return 'phone-portrait-outline';
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme} activeOpacity={0.7}>
        <Ionicons name={getThemeIcon()} size={24} color={currentColors.text} />
      </TouchableOpacity>

      <Image
        source={isDark ? require('@/assets/images/logo-dark.png') : require('@/assets/images/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.subtitle}>AUTENTICAÇÃO NECESSÁRIA</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: currentColors.surface, borderColor: currentColors.border, color: currentColors.text }]}
          placeholder="EMAIL"
          placeholderTextColor={currentColors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { backgroundColor: currentColors.surface, borderColor: currentColors.border, color: currentColors.text }]}
          placeholder="SENHA"
          placeholderTextColor={currentColors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={styles.loginBtn}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.loginText}>INICIAR SESSÃO</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.registerLink}
        onPress={() => router.push('/auth/register')}
        activeOpacity={0.6}
      >
        <Text style={[styles.registerText, { color: currentColors.textSecondary }]}>
          Não possui credenciais? <Text style={{ color: '#FF0033' }}>Registre-se</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  themeToggle: { position: 'absolute', top: 50, right: 20, padding: 10, zIndex: 10 },
  logo: { width: 300, height: 100, alignSelf: 'center', resizeMode: 'contain', marginBottom: 10 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#FF0033', textAlign: 'center', marginBottom: 40, letterSpacing: 2 },
  inputContainer: { gap: 15, marginBottom: 30 },
  input: { borderWidth: 1, padding: 18, borderRadius: 8, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', letterSpacing: 1 },
  loginBtn: { backgroundColor: '#FF0033', padding: 20, borderRadius: 8, alignItems: 'center', shadowColor: '#FF0033', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  loginText: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, letterSpacing: 1 },
  registerLink: { marginTop: 25, alignItems: 'center' },
  registerText: { fontFamily: 'Inter_400Regular', fontSize: 14 }
});
