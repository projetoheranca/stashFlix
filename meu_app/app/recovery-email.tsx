import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAppContext } from '@/src/contexts/AppContext';

export default function RecoveryEmailScreen() {
  const router = useRouter();
  const { activePalette: theme } = useAppContext();
  const [email, setEmail] = useState('');

  const handleNext = async () => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erro', 'Por favor, insira um e-mail válido.');
      return;
    }

    try {
      await SecureStore.setItemAsync('recovery_email', email.trim().toLowerCase());
      await SecureStore.setItemAsync('has_onboarded', 'true');
      
      Alert.alert('Sucesso', 'E-mail de recuperação cadastrado com sucesso!', [
        { text: 'OK', onPress: () => router.replace('/(drawer)') }
      ]);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar e-mail.');
    }
  };

  const handleSkip = async () => {
    await SecureStore.setItemAsync('has_onboarded', 'true');
    router.replace('/(drawer)');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>E-MAIL DE RECUPERAÇÃO</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        CASO VOCÊ ESQUEÇA O SEU PIN
      </Text>

      <View style={[styles.inputContainer, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="seu@email.com"
          placeholderTextColor={theme.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <Text style={[styles.warning, { color: theme.error || '#FF0033' }]}>
        ⚠️ Se você esquecer seu PIN e não tiver um e-mail, perderá acesso ao cofre permanentemente.
      </Text>

      <TouchableOpacity 
        style={[styles.button, { 
          backgroundColor: email ? theme.tint : theme.surfaceHighlight,
          shadowColor: email ? theme.tint : 'transparent'
        }]} 
        onPress={handleNext}
        disabled={!email}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: email ? '#000' : theme.textSecondary }]}>
          SALVAR
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>Pular (Não Recomendado)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingTop: 60 },
  title: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1, textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginTop: 10, marginBottom: 40, letterSpacing: 2, textAlign: 'center' },
  inputContainer: { width: '100%', height: 60, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, marginBottom: 20 },
  input: { flex: 1, fontSize: 18, fontFamily: 'Inter_400Regular' },
  warning: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 40, paddingHorizontal: 10 },
  button: { width: '100%', height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 8, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10 },
  buttonText: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  skipButton: { marginTop: 30, padding: 10 },
  skipButtonText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', textDecorationLine: 'underline' }
});
