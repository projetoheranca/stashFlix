import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, useColorScheme } from 'react-native';
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
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || password.length < 6) {
      Alert.alert("Erro", "O email é obrigatório e a senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await saveUserPreferences(userCredential.user.uid, { theme: 'red', disguiseMode: 'none' });
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
        <TextInput
          style={[styles.input, { backgroundColor: currentColors.surface, borderColor: currentColors.border, color: currentColors.text }]}
          placeholder="SENHA SECRETA"
          placeholderTextColor={currentColors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
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
  loginBtn: { backgroundColor: '#FF0033', padding: 20, borderRadius: 8, alignItems: 'center', shadowColor: '#FF0033', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  loginText: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, letterSpacing: 1 },
  registerLink: { marginTop: 25, alignItems: 'center' },
  registerText: { fontFamily: 'Inter_400Regular', fontSize: 14 }
});
