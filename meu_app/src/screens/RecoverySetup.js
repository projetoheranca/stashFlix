import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { useTheme } from '../context/ThemeContext';

export default function RecoverySetup({ navigation }) {
  const [email, setEmail] = useState('');
  const { theme } = useTheme();

  const handleSkip = () => {
    navigation.replace('Home');
  };

  const handleSave = async () => {
    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Erro', 'Por favor, insira um e-mail válido.');
      return;
    }
    await SecureStore.setItemAsync('recovery_email', email);
    Alert.alert('Sucesso', 'E-mail de recuperação salvo com sucesso!');
    navigation.replace('Home');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Recuperação de Conta</Text>
      <Text style={[styles.subtitle, { color: theme.text, opacity: 0.6 }]}>Cadastre um e-mail para recuperar o acesso caso esqueça o seu PIN principal.</Text>
      
      <TextInput 
        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
        placeholder="exemplo@email.com"
        placeholderTextColor={theme.isDark ? '#666' : '#AAA'}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleSave}>
        <Text style={styles.buttonText}>Salvar e Continuar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={[styles.skipButtonText, { color: theme.text }]}>Mais tarde</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: 40, textAlign: 'center', lineHeight: 22 },
  input: {
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  button: { padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  skipButton: { alignItems: 'center', padding: 10 },
  skipButtonText: { fontSize: 16, textDecorationLine: 'underline', opacity: 0.6 }
});
