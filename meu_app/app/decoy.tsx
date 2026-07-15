import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/src/contexts/AppContext';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { StatusBar } from 'expo-status-bar';
import { syncSettingsToCloud } from '@/src/services/FirebaseDB';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { getAlbums, createAlbum, importToAlbum, deleteAlbum } from '@/src/services/VaultService';

export default function DecoyScreen() {
  const router = useRouter();
  const { activePalette: theme, userPlan } = useAppContext();
  
  const [fakePin, setFakePin] = useState('');
  const [fakePinVisible, setFakePinVisible] = useState(true);
  const [kamikazePin, setKamikazePin] = useState('');
  const [kamikazePinVisible, setKamikazePinVisible] = useState(true);

  // Decoy Manager States
  const [decoyAlbums, setDecoyAlbums] = useState<any[]>([]);
  const [deviceAlbums, setDeviceAlbums] = useState<MediaLibrary.Album[]>([]);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert("Erro", "Digite um nome para a pasta");
      return;
    }
    await createAlbum(newFolderName.trim(), true); // true = decoy
    setNewFolderName('');
    setIsCreatingFolder(false);
    loadDecoyAlbums();
  };

  useEffect(() => {
    SecureStore.getItemAsync('fake_pin').then(pin => {
      if (pin) setFakePin(pin);
    });
    SecureStore.getItemAsync('kamikaze_pin').then(pin => {
      if (pin) setKamikazePin(pin);
    });
    loadDecoyAlbums();
  }, []);

  const loadDecoyAlbums = async () => {
    try {
      const fetched = await getAlbums(true); // true = decoy
      setDecoyAlbums(fetched);
    } catch (e) {
      console.warn("Error loading decoy albums:", e);
    }
  };

  const loadDeviceAlbums = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (status === 'granted') {
        const list = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
        setDeviceAlbums(list.filter(a => a.assetCount > 0));
        setShowDevicePicker(true);
      } else {
        Alert.alert("Permissão Necessária", "Precisamos de acesso às mídias para importar arquivos.");
      }
    } catch (err) {
      console.warn("MediaLibrary permissions error:", err);
      Alert.alert(
        "Erro de Permissão",
        "Não foi possível obter permissões de mídia. Verifique as configurações do seu celular."
      );
    }
  };

  const handleImportToDecoy = async (deviceAlbum: MediaLibrary.Album) => {
    setImporting(true);
    try {
      const assets = await MediaLibrary.getAssetsAsync({
        albumId: deviceAlbum.id,
        first: 100,
        mediaType: ['photo', 'video']
      });

      const albumName = deviceAlbum.title || 'DecoyImport';
      await createAlbum(albumName, true); // true = decoy

      let count = 0;
      for (const asset of assets.assets) {
        const info = await MediaLibrary.getAssetInfoAsync(asset);
        const localUri = info.localUri || info.uri;
        if (localUri) {
          await importToAlbum(localUri, albumName, true); // true = decoy
          count++;
        }
      }

      Alert.alert(
        "Importação de Isca",
        `${count} arquivos carregados no cofre falso com sucesso.`,
        [
          {
            text: "OK",
            onPress: () => {
              Alert.alert(
                "Liberar Espaço",
                "Deseja excluir as mídias originais do dispositivo?",
                [
                  { text: "Manter", style: "cancel" },
                  {
                    text: "Excluir",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        const ids = assets.assets.map(a => a.id);
                        await MediaLibrary.deleteAssetsAsync(ids);
                        Alert.alert("Sucesso", "Arquivos originais apagados.");
                      } catch (err) {}
                      setShowDevicePicker(false);
                      loadDecoyAlbums();
                    }
                  }
                ]
              );
            }
          }
        ]
      );
      loadDecoyAlbums();
      setShowDevicePicker(false);
    } catch (error) {
      Alert.alert("Erro", "Erro ao importar mídias para o cofre falso.");
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteDecoyAlbum = async (name: string) => {
    Alert.alert(
      "Excluir Pasta Falsa",
      `Apagar a pasta isca '${name}'?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteAlbum(name, true); // true = decoy
            loadDecoyAlbums();
          }
        }
      ]
    );
  };

  const handleSaveFakePin = async () => {
    if (fakePin.length !== 4) {
      Alert.alert('Erro', 'A Senha Falsa deve ter exatamente 4 dígitos numéricos.');
      return;
    }
    const userPin = await SecureStore.getItemAsync('user_pin');
    const kamikazePinStr = await SecureStore.getItemAsync('kamikaze_pin');
    
    if (fakePin === userPin) {
      Alert.alert('Erro', 'O PIN Falso não pode ser igual ao PIN Real do aplicativo.');
      return;
    }
    if (kamikazePinStr && fakePin === kamikazePinStr) {
      Alert.alert('Erro', 'O PIN Falso não pode ser igual ao PIN Kamikaze.');
      return;
    }
    await SecureStore.setItemAsync('fake_pin', fakePin);
    syncSettingsToCloud().catch(() => {});
    Alert.alert(
      'SUCESSO: PIN DE ISCA CRIADO',
      'Se este PIN for digitado na tela de bloqueio, o aplicativo abrirá a galeria de isca configurada abaixo para sua segurança.'
    );
  };

  const handleSaveKamikazePin = async () => {
    if (kamikazePin.length !== 4) {
      Alert.alert('Erro', 'O PIN Kamikaze deve ter exatamente 4 dígitos numéricos.');
      return;
    }
    const userPin = await SecureStore.getItemAsync('user_pin');
    const fakePinStr = await SecureStore.getItemAsync('fake_pin');
    
    if (kamikazePin === userPin) {
      Alert.alert('Erro', 'O PIN Kamikaze não pode ser igual ao PIN Real do aplicativo.');
      return;
    }
    if (fakePinStr && kamikazePin === fakePinStr) {
      Alert.alert('Erro', 'O PIN Kamikaze não pode ser igual ao PIN Falso.');
      return;
    }
    await SecureStore.setItemAsync('kamikaze_pin', kamikazePin);
    syncSettingsToCloud().catch(() => {});
    Alert.alert(
      'SUCESSO: PROTOCOLO KAMIKAZE ATIVADO',
      'Ao inserir este PIN na tela de bloqueio, o sistema apagará de forma permanente todos os arquivos do cofre principal e abrirá o cofre isca como fachada.'
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 60 }}>
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
        <Text style={[styles.title, { color: theme.text }]}>COFRE FALSO (ISCA)</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{"// 01. CONFIGURAÇÃO DO PIN FALSO"}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface + '80', borderColor: theme.border + '33' }]}>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Defina a senha de 4 dígitos para abrir o cofre falso em caso de coação.
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.tint, borderColor: theme.border + '50', flex: 1, marginBottom: 0, marginRight: 10 }]}
            placeholder="0000"
            placeholderTextColor="#555"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry={!fakePinVisible}
            value={fakePin}
            onChangeText={setFakePin}
          />
          <Pressable 
            onPress={() => setFakePinVisible(!fakePinVisible)}
            style={styles.eyeBtn}
          >
            <Ionicons name={fakePinVisible ? "eye-outline" : "eye-off-outline"} size={24} color={theme.textSecondary} />
          </Pressable>
        </View>
        <Pressable 
          style={({ pressed }) => [
            styles.saveButton, 
            { backgroundColor: theme.tint + '15', borderColor: theme.tint, borderWidth: 1 },
            pressed && { backgroundColor: theme.tint + '30', transform: [{ scale: 0.98 }] }
          ]} 
          onPress={handleSaveFakePin}
        >
          <Text style={[styles.saveButtonText, { color: theme.tint }]}>SALVAR PIN FALSO</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 30 }]}>{"// 02. EXPLORADOR DE ARQUIVOS ISCA"}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface + '80', borderColor: theme.border + '33' }]}>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Estas são as pastas que aparecerão ao digitar o PIN Falso.
        </Text>
        
        {decoyAlbums.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="folder-open-outline" size={32} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 10 }} />
            <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center', opacity: 0.7 }}>
              O cofre isca está vazio. Importe pastas fictícias para enganar invasores.
            </Text>
          </View>
        ) : (
          decoyAlbums.map((album) => (
            <View key={album.id} style={[styles.decoyAlbumRow, { borderBottomColor: theme.border + '22' }]}>
              <Pressable 
                style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(`/album/${encodeURIComponent(album.name)}?decoy=true`)}
              >
                <View style={[styles.iconBox, { backgroundColor: theme.surfaceHighlight + '40' }]}>
                  <Ionicons name="folder-open" size={18} color={theme.text} />
                </View>
                <Text style={{ color: theme.text, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 }} numberOfLines={1}>
                  {album.name}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.deleteDecoyBtn,
                  pressed && { opacity: 0.6 }
                ]}
                onPress={() => handleDeleteDecoyAlbum(album.name)}
              >
                <Ionicons name="trash-outline" size={18} color="#FF0033" />
              </Pressable>
            </View>
          ))
        )}

        {/* BOTOES DE ADICIONAR */}
        <View style={{ flexDirection: 'column', gap: 10, marginTop: 15 }}>
          {!isCreatingFolder ? (
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: 'rgba(0, 255, 102, 0.1)', borderColor: '#00FF66', borderWidth: 1 },
                pressed && { transform: [{ scale: 0.98 }], backgroundColor: 'rgba(0, 255, 102, 0.2)' }
              ]}
              onPress={() => setIsCreatingFolder(true)}
            >
              <Ionicons name="add-circle-outline" size={16} color="#00FF66" style={{ marginRight: 8 }} />
              <Text style={[styles.saveButtonText, { color: '#00FF66' }]}>CRIAR PASTA VAZIA</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput
                style={[styles.input, { flex: 1, height: 50, fontSize: 14, letterSpacing: 0, padding: 10, backgroundColor: theme.background, color: theme.text, borderColor: theme.border + '50' }]}
                placeholder="Nome da Pasta..."
                placeholderTextColor={theme.textSecondary}
                value={newFolderName}
                onChangeText={setNewFolderName}
                autoFocus
              />
              <Pressable style={{ padding: 5 }} onPress={handleCreateFolder}>
                <Ionicons name="checkmark-circle" size={32} color="#00FF66" />
              </Pressable>
              <Pressable style={{ padding: 5 }} onPress={() => setIsCreatingFolder(false)}>
                <Ionicons name="close-circle" size={32} color="#FF0033" />
              </Pressable>
            </View>
          )}


        </View>
      </View>



      <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 30 }]}>{"// 03. PROTOCOLO KAMIKAZE [PRO]"}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface + '80', borderColor: '#FF0033' + '50', borderWidth: 1.5 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.infoText, { color: theme.textSecondary, flex: 1, marginBottom: 0 }]}>
            PIN fatal de ameaça. Ele abrirá as pastas de isca, porém apagará permanentemente todo o cofre original de forma silenciosa.
          </Text>
          <View style={[styles.proBadge, { backgroundColor: theme.tint, marginLeft: 10 }]}><Text style={styles.proText}>PRO</Text></View>
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: '#FF0033', borderColor: '#FF0033' + '40', flex: 1, marginBottom: 0, marginRight: 10 }]}
            placeholder="0000"
            placeholderTextColor="#555"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry={!kamikazePinVisible}
            value={kamikazePin}
            onChangeText={setKamikazePin}
          />
          <Pressable 
            onPress={() => setKamikazePinVisible(!kamikazePinVisible)}
            style={styles.eyeBtn}
          >
            <Ionicons name={kamikazePinVisible ? "eye-outline" : "eye-off-outline"} size={24} color={theme.textSecondary} />
          </Pressable>
        </View>
        <Pressable 
          style={({ pressed }) => [
            styles.saveButton, 
            { backgroundColor: 'rgba(255, 0, 51, 0.1)', borderColor: '#FF0033', borderWidth: 1 },
            pressed && { backgroundColor: 'rgba(255, 0, 51, 0.25)', transform: [{ scale: 0.98 }] }
          ]} 
          onPress={() => {
            if (userPlan === 'FREE') {
              Alert.alert(
                'Recurso Premium [PRO]',
                'O Protocolo Kamikaze é exclusivo do Plano PRO.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'VER PLANOS', onPress: () => router.push('/paywall') }
                ]
              );
              return;
            }
            handleSaveKamikazePin();
          }}
        >
          <Ionicons name="skull-outline" size={16} color="#FF0033" style={{ marginRight: 8 }} />
          <Text style={[styles.saveButtonText, { color: '#FF0033' }]}>SALVAR PIN KAMIKAZE</Text>
        </Pressable>
      </View>
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backButton: { padding: 10, marginLeft: -10 },
  title: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
  sectionTitle: { paddingHorizontal: 20, marginBottom: 10, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5, textTransform: 'uppercase' },
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 20, overflow: 'hidden' },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 15, opacity: 0.8, lineHeight: 18 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  input: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', letterSpacing: 12 },
  eyeBtn: { padding: 10, justifyContent: 'center', alignItems: 'center' },
  saveButton: { padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, letterSpacing: 1 },
  
  proBadge: { backgroundColor: '#FFD700', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, justifyContent: 'center', alignItems: 'center' },
  proText: { color: '#000', fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold' },

  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  decoyAlbumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  deleteDecoyBtn: { padding: 10 },
  
  deviceAlbumSelectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, paddingHorizontal: 8, borderRadius: 8 }
});
