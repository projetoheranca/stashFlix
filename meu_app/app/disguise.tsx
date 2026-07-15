import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/src/contexts/AppContext';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { StatusBar } from 'expo-status-bar';
import { registerDevice } from '@/src/services/ApiService';
import { syncSettingsToCloud } from '@/src/services/FirebaseDB';
import { Ionicons } from '@expo/vector-icons';

export default function DisguiseScreen() {
  const router = useRouter();
  const { activePalette: theme, disguiseMode, setDisguiseMode, userPlan, setUserPlan } = useAppContext();
  
  const [keyword, setKeyword] = useState('Batman');
  const [originalKeyword, setOriginalKeyword] = useState('Batman');
  const [tutorialMode, setTutorialMode] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState<number>(1);

  useEffect(() => {
    registerDevice().then(user => {
      if (user) setUserPlan((user as any).plan || 'FREE');
    }).catch(() => {});
    
    SecureStore.getItemAsync('disguise_keyword').then(kw => {
      if (kw) {
        setKeyword(kw);
        setOriginalKeyword(kw);
      }
    });
  }, [setUserPlan]);

  const handleSaveKeyword = async (silent = false) => {
    if (!keyword.trim()) {
      Alert.alert('Erro', 'A palavra-chave não pode ser vazia.');
      return false;
    }
    if (keyword.trim() === originalKeyword && silent) {
      return true; // Se for a mesma, apenas ignora e continua
    }
    await SecureStore.setItemAsync('disguise_keyword', keyword.trim());
    setOriginalKeyword(keyword.trim());
    syncSettingsToCloud().catch(() => {});
    
    if (!silent) {
      Alert.alert(
        'PALAVRA-CHAVE SALVA',
        `Sua palavra-chave secreta é "${keyword.trim()}".\n\nNo disfarce de navegador, digite-a EXATAMENTE assim na barra de busca e aperte em Pesquisar no seu teclado para abrir o cofre.`
      );
    }
    return true;
  };

  const getTutorialContent = (mode: string) => {
    switch(mode) {
      case 'none':
        return {
          title: 'Cofre Padrão',
          desc: 'Neste modo, a tela de bloqueio será o teclado nativo do StashFlix.\n\nNenhuma camuflagem será aplicada. Para desbloquear, basta digitar o seu PIN.',
          icon: 'shield-checkmark-outline'
        };
      case 'calculator':
        return {
          title: 'Calculadora Falsa',
          desc: 'O aplicativo se passará por uma calculadora comum.\n\nPara acessar o seu cofre, digite o seu PIN como se fossem números da conta, e aperte o botão de Igual (=).',
          icon: 'calculator-outline'
        };
      case 'crash':
        return {
          title: 'Falsa Falha (Crash)',
          desc: 'O aplicativo simulará uma tela de erro grave (Crash) ao ser aberto.\n\nPara fazer o teclado invisível aparecer, dê 4 toques rápidos na palavra "Erro" ou pressione-a por 2 segundos.',
          icon: 'warning-outline'
        };
      case 'browser':
        return {
          title: 'Navegador Web Fake',
          desc: tutorialStep === 1 
            ? 'O aplicativo ficará idêntico a um navegador de buscas do Google.\n\nATENÇÃO:\nVocê precisará definir uma "Palavra-Chave Secreta". Para liberar a tela de senha e entrar no cofre, você deverá pesquisar por ela.\n\nVocê precisa digitar a palavra EXATAMENTE como configurou (letras maiúsculas e minúsculas) e depois clicar em PESQUISAR no teclado do seu celular. Caso contrário, não irá desbloquear!' 
            : 'Defina a palavra que você vai digitar para pesquisar:\n\n(Se já existir uma palavra salva e você digitar a mesma, ela será mantida. Se for nova, substituirá a antiga).',
          icon: 'globe-outline'
        };
      default:
        return { title: '', desc: '', icon: '' };
    }
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
          onPress={() => setTutorialMode('none')}
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
          onPress={() => setTutorialMode('calculator')}
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
            setTutorialMode('crash');
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
            setTutorialMode('browser');
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

      {/* TUTORIAL MODAL */}
      <Modal visible={!!tutorialMode} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {tutorialMode && (
              <>
                <Ionicons name={getTutorialContent(tutorialMode).icon as any} size={48} color={theme.tint} style={{ alignSelf: 'center', marginBottom: 15 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>{getTutorialContent(tutorialMode).title}</Text>
                
                <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
                  {getTutorialContent(tutorialMode).desc}
                </Text>

                {tutorialMode === 'browser' && tutorialStep === 2 && (
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, letterSpacing: 2, textAlign: 'center', paddingHorizontal: 15, marginBottom: 20 }]}
                    placeholder="Ex: Batman"
                    placeholderTextColor="#555"
                    value={keyword}
                    onChangeText={setKeyword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}

                <Pressable onPress={() => { setTutorialMode(null); setTutorialStep(1); router.push('/help'); }} style={{ marginBottom: 25, alignSelf: 'center' }}>
                  <Text style={{ color: theme.tint, fontFamily: 'Inter_600SemiBold', textDecorationLine: 'underline' }}>
                    Mais dúvidas? Acesse o módulo de ajuda
                  </Text>
                </Pressable>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 15 }}>
                  <Pressable 
                    onPress={() => { setTutorialMode(null); setTutorialStep(1); }} 
                    style={[styles.modalBtn, { backgroundColor: theme.surfaceHighlight }]}
                  >
                    <Text style={{ color: theme.text, fontFamily: 'Inter_600SemiBold' }}>Cancelar</Text>
                  </Pressable>
                  
                  {tutorialMode === 'browser' && tutorialStep === 1 ? (
                    <Pressable 
                      onPress={() => setTutorialStep(2)} 
                      style={[styles.modalBtn, { backgroundColor: theme.tint }]}
                    >
                      <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Avançar</Text>
                    </Pressable>
                  ) : (
                    <Pressable 
                      onPress={async () => {
                        if (tutorialMode === 'browser') {
                          const success = await handleSaveKeyword(true);
                          if (!success) return;
                        }
                        if (tutorialMode) setDisguiseMode(tutorialMode);
                        setTutorialMode(null);
                        setTutorialStep(1);
                      }} 
                      style={[styles.modalBtn, { backgroundColor: theme.tint }]}
                    >
                      <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>{tutorialMode === 'browser' ? 'Salvar e Concluir' : 'Ok, entendi'}</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

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
  input: { height: 50, borderWidth: 1, borderRadius: 8, marginBottom: 15, fontFamily: 'Inter_600SemiBold', fontSize: 16, textAlign: 'center' },
  saveButton: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  proBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 10 },
  proText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { borderWidth: 1, borderRadius: 16, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', marginBottom: 15 },
  modalDesc: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, textAlign: 'center', marginBottom: 25 },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 }
});
