import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { useTheme } from '../context/ThemeContext';

export default function AlbumPassword({ route, navigation }) {
  const { albumName, isDecoy, action } = route.params; // action: 'set', 'unlock', ou 'remove'
  const [password, setPassword] = useState('');
  const { theme } = useTheme();

  const handleAction = async () => {
    const key = `pwd_${isDecoy}_${albumName}`;

    if (action === 'set') {
      if (password.length < 3) {
        Alert.alert('Atenção', 'A senha deve ter pelo menos 3 caracteres.');
        return;
      }
      await SecureStore.setItemAsync(key, password);
      Alert.alert('Sucesso', `Álbum '${albumName}' trancado com senha!`);
      navigation.goBack();
    } else if (action === 'unlock') {
      const saved = await SecureStore.getItemAsync(key);
      if (saved === password) {
        navigation.replace('AlbumView', { albumName, isDecoy });
      } else {
        Alert.alert('Erro', 'Senha incorreta.');
        setPassword('');
      }
    } else if (action === 'remove') {
      const saved = await SecureStore.getItemAsync(key);
      if (saved === password) {
        await SecureStore.deleteItemAsync(key);
        Alert.alert('Sucesso', `A senha do álbum '${albumName}' foi removida.`);
        navigation.goBack();
      } else {
        Alert.alert('Erro', 'A senha de remoção está incorreta.');
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        {action === 'set' ? `Trancar '${albumName}'` : action === 'remove' ? `Remover Senha de '${albumName}'` : `Desbloquear '${albumName}'`}
      </Text>
      <Text style={[styles.subtitle, { color: theme.text, opacity: 0.6 }]}>
        {action === 'set' ? 'Crie uma senha exclusiva para este álbum.' : action === 'remove' ? 'Confirme a senha antes da remoção.' : 'Este álbum exige uma senha extra.'}
      </Text>

      <TextInput
        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
        placeholder="Senha do Álbum"
        placeholderTextColor={theme.isDark ? '#666' : '#AAA'}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleAction}>
        <Text style={styles.buttonText}>{action === 'set' ? 'Salvar Senha' : action === 'remove' ? 'Remover' : 'Acessar'}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={[styles.cancelText, { color: theme.text }]}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: 40, textAlign: 'center' },
  input: { padding: 15, borderRadius: 10, borderWidth: 1, marginBottom: 20, fontSize: 18, textAlign: 'center' },
  button: { padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelText: { opacity: 0.6, fontSize: 16 }
});
