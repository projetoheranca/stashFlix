import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/src/services/FirebaseConfig';
import { saveUserPreferences } from '@/src/services/FirebaseDB';
import { Colors } from '@/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const currentColors = isDark ? Colors.dark : Colors.light;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || password.length < 6) {
      Alert.alert("Erro", "O email é obrigatório e a senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem.");
      return;
    }
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await saveUserPreferences(userCredential.user.uid, { theme: 'red', disguiseMode: 'none', user_plan: 'FREE' });
    } catch (error: any) {
      Alert.alert("Falha no Registro", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <Text style={[styles.title, { color: currentColors.text }]}>NOVO AGENTE</Text>
      <Text style={styles.subtitle}>CRIAR CREDENCIAIS DE ACESSO</Text>

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
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput, { backgroundColor: currentColors.surface, borderColor: currentColors.border, color: currentColors.text }]}
            placeholder="SENHA SECRETA"
            placeholderTextColor={currentColors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color={currentColors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput, { backgroundColor: currentColors.surface, borderColor: currentColors.border, color: currentColors.text }]}
            placeholder="CONFIRMAR SENHA"
            placeholderTextColor={currentColors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color={currentColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.loginBtn} 
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.loginText}>CRIAR CONTA</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.registerLink} 
        onPress={() => router.back()}
      >
        <Text style={[styles.registerText, { color: currentColors.textSecondary }]}>
          Já possui uma conta? <Text style={{color: '#FF0033'}}>Entrar</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 36, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', letterSpacing: 2 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#FF0033', textAlign: 'center', marginBottom: 40, letterSpacing: 2 },
  inputContainer: { gap: 15, marginBottom: 30 },
  input: { borderWidth: 1, padding: 18, borderRadius: 8, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', letterSpacing: 1 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, paddingRight: 50 },
  eyeIcon: { position: 'absolute', right: 15 },
  loginBtn: { backgroundColor: '#FF0033', padding: 20, borderRadius: 8, alignItems: 'center', shadowColor: '#FF0033', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  loginText: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, letterSpacing: 1 },
  registerLink: { marginTop: 25, alignItems: 'center' },
  registerText: { fontFamily: 'Inter_400Regular', fontSize: 14 }
});
