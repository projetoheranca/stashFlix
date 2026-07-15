import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { useTheme } from '../context/ThemeContext';

export default function Settings({ navigation }) {
  const { theme, themeMode, updateTheme, lockStyle, updateLockStyle, useDisguise, updateDisguise } = useTheme();

  const pickPremiumAvatar = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      await SecureStore.setItemAsync('premium_avatar', uri);
      Alert.alert('Sucesso', 'Foto de perfil Premium atualizada! Ela aparecerá na sua tela de bloqueio estilizada.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backButton, { color: theme.primary }]}>{"< Voltar"}</Text>
        </TouchableOpacity>
        <Text style={[styles.header, { color: theme.text }]}>Configurações</Text>
      </View>

      <ScrollView>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Aparência do Software</Text>
        <View style={styles.optionsRow}>
          {['light', 'dark', 'system'].map(mode => (
            <TouchableOpacity 
              key={mode} 
              style={[styles.optionButton, themeMode === mode && { borderColor: theme.primary, borderWidth: 2 }]}
              onPress={() => updateTheme(mode)}
            >
              <Text style={{ color: theme.text, textTransform: 'capitalize', fontWeight: themeMode === mode ? 'bold' : 'normal' }}>
                {mode === 'light' ? 'Claro' : mode === 'dark' ? 'Escuro' : 'Sistema'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 40 }]}>Estilo da Tela de Bloqueio</Text>
        <View style={styles.optionsRow}>
          {['default', 'styled'].map(style => (
            <TouchableOpacity 
              key={style} 
              style={[styles.optionButton, lockStyle === style && { borderColor: theme.primary, borderWidth: 2 }]}
              onPress={() => updateLockStyle(style)}
            >
              <Text style={{ color: theme.text, textTransform: 'capitalize', fontWeight: lockStyle === style ? 'bold' : 'normal' }}>
                {style === 'default' ? 'Padrão' : 'Premium'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.primary, marginTop: 40 }]}>Recursos Premium (Fase 5)</Text>
        
        <View style={[styles.premiumRow, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.text, fontSize: 16 }}>Disfarce de Calculadora</Text>
          <TouchableOpacity 
             style={[styles.toggleBtn, useDisguise ? { backgroundColor: theme.primary } : { backgroundColor: '#555' }]} 
             onPress={() => updateDisguise(!useDisguise)}
          >
             <Text style={{ color: '#FFF' }}>{useDisguise ? 'ON ' : 'OFF'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surface }]} onPress={() => navigation.navigate('CreatePin', { isDecoy: true })}>
          <Text style={[styles.actionBtnText, { color: theme.primary }]}>Configurar Cofre Falso (PIN 2)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surface, marginBottom: 40 }]} onPress={pickPremiumAvatar}>
          <Text style={[styles.actionBtnText, { color: theme.primary }]}>Alterar Foto de Bloqueio Premium</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 20, marginBottom: 20 },
  backButton: { fontSize: 18, marginRight: 20, fontWeight: 'bold' },
  header: { fontSize: 24, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 15 },
  optionsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10 },
  optionButton: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', backgroundColor: '#88888833' },
  premiumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, marginHorizontal: 20, marginBottom: 10, borderRadius: 10 },
  toggleBtn: { paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 },
  actionBtn: { padding: 20, marginHorizontal: 20, marginBottom: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { fontWeight: 'bold', fontSize: 16 }
});
