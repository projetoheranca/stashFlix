import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/src/contexts/AppContext';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { registerDevice } from '@/src/services/ApiService';
import { syncSettingsToCloud } from '@/src/services/FirebaseDB';
import { Ionicons } from '@expo/vector-icons';

export default function DisguiseScreen() {
  const router = useRouter();
  const { activePalette: theme, disguiseMode, setDisguiseMode, userPlan, setUserPlan } = useAppContext();
  
  const [keyword, setKeyword] = useState('Batman');

  useEffect(() => {
    registerDevice().then(user => {
      if (user) setUserPlan((user as any).plan || 'FREE');
    }).catch(() => {});
    
    SecureStore.getItemAsync('disguise_keyword').then(kw => {
      if (kw) setKeyword(kw);
    });
  }, [setUserPlan]);

  const handleSaveKeyword = async () => {
    if (!keyword.trim()) {
      Alert.alert('Erro', 'A palavra-chave não pode ser vazia.');
      return;
    }
    await SecureStore.setItemAsync('disguise_keyword', keyword.trim());
    syncSettingsToCloud().catch(() => {});
    Alert.alert(
      'EVENTO DE CRIAÇÃO: PALAVRA-CHAVE SALVA',
      `A palavra-chave secreta "${keyword.trim()}" foi registrada. Digite-a no buscador do disfarce de navegador para abrir o teclado invisível.`
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()} 
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.7 }
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.tint} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>CAMUFLAGEM & DISFARCE</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MODO DE FACHADA (LOCK SCREEN)</Text>
      <View style={[styles.card, { backgroundColor: theme.surface + '80', borderColor: theme.border + '50' }]}>
        <Pressable 
          style={({ pressed }) => [
            styles.option, 
            disguiseMode === 'none' && { backgroundColor: theme.surfaceHighlight },
            pressed && { backgroundColor: theme.surfaceHighlight + '40', transform: [{ scale: 0.98 }] }
          ]} 
          onPress={() => setDisguiseMode('none')}
        >
          <Text style={[styles.optionText, { color: theme.text }]}>Padrão (Cofre Cyberpunk)</Text>
        </Pressable>
        
        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />
        
        <Pressable 
          style={({ pressed }) => [
            styles.option, 
            disguiseMode === 'calculator' && { backgroundColor: theme.surfaceHighlight },
            pressed && { backgroundColor: theme.surfaceHighlight + '40', transform: [{ scale: 0.98 }] }
          ]} 
          onPress={() => setDisguiseMode('calculator')}
        >
          <Text style={[styles.optionText, { color: theme.text }]}>Calculadora Falsa</Text>
        </Pressable>
        
        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />
        
        {/* Premium Option: Crash */}
        <Pressable 
          style={({ pressed }) => [
            styles.option, 
            { 
              backgroundColor: disguiseMode === 'crash' ? theme.tint + '20' : theme.surface + '30',
              borderColor: disguiseMode === 'crash' ? theme.tint : theme.border,
              borderWidth: 1,
              margin: 4,
              borderRadius: 8
            },
            pressed && { transform: [{ scale: 0.98 }] }
          ]} 
          onPress={() => {
            if (userPlan === 'FREE') {
              Alert.alert(
                'Recurso Premium [PRO]',
                'A Falsa Falha no Sistema (Crash Disguise) é um recurso exclusivo do Plano PRO.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'VER PLANOS', onPress: () => router.push('/paywall') }
                ]
              );
              return;
            }
            setDisguiseMode('crash');
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Text style={[styles.optionText, { color: theme.text }]}>Falsa Falha no Sistema (Crash)</Text>
            <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}>PRO</Text></View>
          </View>
        </Pressable>
        
        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />
        
        {/* Premium Option: Browser */}
        <Pressable 
          style={({ pressed }) => [
            styles.option, 
            { 
              backgroundColor: disguiseMode === 'browser' ? theme.tint + '20' : theme.surface + '30',
              borderColor: disguiseMode === 'browser' ? theme.tint : theme.border,
              borderWidth: 1,
              margin: 4,
              borderRadius: 8
            },
            pressed && { transform: [{ scale: 0.98 }] }
          ]} 
          onPress={() => {
            if (userPlan === 'FREE') {
              Alert.alert(
                'Recurso Premium [PRO]',
                'O Disfarce de Navegador Web é um recurso exclusivo do Plano PRO.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'VER PLANOS', onPress: () => router.push('/paywall') }
                ]
              );
              return;
            }
            setDisguiseMode('browser');
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Text style={[styles.optionText, { color: theme.text }]}>Disfarce de Navegador Web</Text>
            <View style={[styles.proBadge, { backgroundColor: theme.tint }]}><Text style={styles.proText}>PRO</Text></View>
          </View>
        </Pressable>
      </View>

      {disguiseMode === 'browser' && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 30 }]}>{"PALAVRA-CHAVE SECRETA (NAVEGADOR) [PRO]"}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface + '80', borderColor: theme.tint, borderWidth: 1.5, padding: 20 }]}>
            <Text style={{ color: theme.text, fontFamily: 'Inter_400Regular', marginBottom: 15, opacity: 0.8 }}>
              Pesquise por esta palavra no buscador fictício para revelar o teclado de desbloqueio:
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, letterSpacing: 2, textAlign: 'center', paddingHorizontal: 15 }]}
              placeholder="Ex: Batman"
              placeholderTextColor="#555"
              value={keyword}
              onChangeText={setKeyword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable 
              style={({ pressed }) => [
                styles.saveButton, 
                { backgroundColor: theme.tint },
                pressed && { transform: [{ scale: 0.97 }] }
              ]} 
              onPress={handleSaveKeyword}
            >
              <Text style={[styles.saveButtonText, { color: '#FFF' }]}>SALVAR PALAVRA-CHAVE</Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backButton: { padding: 10 },
  title: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
  sectionTitle: { paddingHorizontal: 20, marginBottom: 10, fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  card: { marginHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: '#1F1F1F', overflow: 'hidden' },
  option: { padding: 20 },
  optionText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  divider: { height: 1, width: '100%' },
  input: { padding: 15, borderRadius: 8, borderWidth: 1, fontSize: 18, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', letterSpacing: 10, marginBottom: 15 },
  saveButton: { padding: 15, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, letterSpacing: 1 },
  proBadge: { backgroundColor: '#FFD700', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, justifyContent: 'center', alignItems: 'center' },
  proText: { color: '#000', fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold' },
});
