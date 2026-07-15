import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, Alert, Modal, Platform, ActivityIndicator, ScrollView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAlbums, createAlbum, importToAlbum } from '@/src/services/VaultService';
import { useAppContext } from '@/src/contexts/AppContext';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';

export default function VaultScreen() {
  const router = useRouter();
  const { activePalette: theme, isFakeVault } = useAppContext();
  
  // Vault States
  const [albums, setAlbums] = useState<{id: string; name: string; isLocked?: boolean; previewUri?: string}[]>([]);
  const [newAlbumName, setNewAlbumName] = useState('');
  
  const [uploading, setUploading] = useState(false);

  // Custom Prompt States (Rename Album)
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptAlbum, setPromptAlbum] = useState('');
  const [promptText, setPromptText] = useState('');

  // Password Prompt States
  const [pinPromptVisible, setPinPromptVisible] = useState(false);
  const [pinAlbum, setPinAlbum] = useState('');
  const [pinText, setPinText] = useState('');

  const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9.\-_]/g, '_');

  const loadAlbums = async () => {
    const fetchedAlbums: any[] = await getAlbums(isFakeVault);
    for (let album of fetchedAlbums) {
      const hasLock = await SecureStore.getItemAsync(`pwd_false_${sanitizeKey(album.name)}`);
      album.isLocked = !!hasLock;
    }
    setAlbums(fetchedAlbums);
  };

  useFocusEffect(
    useCallback(() => {
      loadAlbums();
    }, [isFakeVault])
  );

  useEffect(() => {
    loadAlbums();
  }, [isFakeVault]);


  const handleCreateAlbum = async () => {
    try {
      const sanitizedName = newAlbumName.trim().replace(/[\/\\]/g, '-');
      if (sanitizedName === '') {
        Alert.alert("Aviso", "Escreva um nome para o diretório.");
        return;
      }
      await createAlbum(sanitizedName, isFakeVault);
      setNewAlbumName('');
      await loadAlbums();
    } catch (e: any) {
      Alert.alert("Erro ao criar diretório", e.message || String(e));
    }
  };

  const handleOpenAlbum = (albumName: string) => {
    router.push(`/album/${encodeURIComponent(albumName)}?decoy=${isFakeVault}`);
  };

  const handleAlbumLongPress = (albumName: string, isLocked: boolean) => {
    Alert.alert(
      "Opções do Álbum",
      albumName,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: isLocked ? "Remover Senha" : "Proteger com Senha", 
          onPress: async () => {
            if (isLocked) {
              await SecureStore.deleteItemAsync(`pwd_false_${sanitizeKey(albumName)}`);
              loadAlbums();
            } else {
              if (Platform.OS === 'ios') {
                Alert.prompt(
                  "Proteger Álbum",
                  "Digite um PIN numérico para este álbum:",
                  [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Salvar", onPress: async (pin?: string) => {
                        if (pin && pin.trim() !== '') {
                          await SecureStore.setItemAsync(`pwd_false_${sanitizeKey(albumName)}`, pin.trim());
                          loadAlbums();
                        }
                      }
                    }
                  ],
                  "secure-text"
                );
              } else {
                setPinAlbum(albumName);
                setPinText('');
                setPinPromptVisible(true);
              }
            }
          }
        },
        {
          text: "Renomear",
          onPress: () => {
             if (Platform.OS === 'ios') {
               Alert.prompt(
                 "Renomear Álbum",
                 "Digite o novo nome:",
                 [
                   { text: "Cancelar", style: "cancel" },
                   { text: "Salvar", onPress: async (newName?: string) => {
                       if (newName && newName.trim() !== '') {
                         const { renameAlbum } = await import('@/src/services/VaultService');
                         await renameAlbum(albumName, newName.trim(), isFakeVault);
                         loadAlbums();
                       }
                     } 
                   }
                 ],
                 "plain-text",
                 albumName
               );
             } else {
               setPromptAlbum(albumName);
               setPromptText(albumName);
               setPromptVisible(true);
             }
          }
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Excluir Álbum",
              `Apagar o álbum '${albumName}'? Arquivos dentro dele serão perdidos.`,
              [
                { text: "Cancelar", style: "cancel" },
                { 
                  text: "Excluir", 
                  style: "destructive", 
                  onPress: async () => {
                    const { deleteAlbum } = await import('@/src/services/VaultService');
                    await deleteAlbum(albumName, isFakeVault);
                    loadAlbums();
                  } 
                }
              ]
            );
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>SISTEMA DE ARQUIVOS</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Cofre seguro e explorador de mídias</Text>
      </View>

      <View style={{ flex: 1 }}>

              <View style={styles.createAlbumContainer}>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  placeholder="NOVO DIRETÓRIO..."
                  placeholderTextColor={theme.textSecondary + '80'}
                  value={newAlbumName}
                  onChangeText={setNewAlbumName}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.createButtonContainer,
                    pressed && { transform: [{ scale: 0.97 }] }
                  ]}
                  onPress={handleCreateAlbum}
                >
                  <LinearGradient
                    colors={[theme.tint, theme.tint + 'AA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.createButton}
                  >
                    <Text style={[styles.createButtonText, { color: '#FFF' }]}>CRIAR</Text>
                  </LinearGradient>
                </Pressable>
              </View>
              
              <FlatList 
                data={albums}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                  <Pressable 
                    style={({ pressed }) => [
                      styles.albumItem, 
                      { backgroundColor: theme.surface + '60', borderColor: theme.border + '50' },
                      pressed && { backgroundColor: theme.surfaceHighlight + '40', transform: [{ scale: 0.98 }] }
                    ]} 
                    onPress={() => handleOpenAlbum(item.name)}
                    onLongPress={() => handleAlbumLongPress(item.name, item.isLocked)}
                  >
                    <View style={styles.previewContainer}>
                      {item.isLocked ? (
                        <View style={[styles.iconBox, { backgroundColor: theme.surfaceHighlight }]}>
                          <Ionicons name="lock-closed-outline" size={24} color={theme.tint} />
                        </View>
                      ) : item.previewUri ? (
                        <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <Image source={{ uri: item.previewUri }} style={styles.previewImage} contentFit="cover" />
                          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                          <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="folder-open-outline" size={20} color="#FFF" />
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.iconBox, { backgroundColor: theme.surfaceHighlight }]}>
                          <Ionicons name="folder-outline" size={24} color={theme.tint} />
                        </View>
                      )}
                    </View>
                    <View style={styles.albumInfo}>
                      <Text style={[styles.albumName, { color: theme.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} style={{ marginRight: 5, opacity: 0.8 }} />
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular' }}>Nenhum diretório seguro ainda.</Text>
                  </View>
                }
              />

      </View>
      {/* Modal para Renomear Álbum (Android) */}
      <Modal visible={promptVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: theme.surface, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 8 }}>Renomear Álbum</Text>
            <Text style={{ color: theme.textSecondary, marginBottom: 16, fontFamily: 'Inter_400Regular' }}>Digite o novo nome:</Text>
            <TextInput
              style={{ backgroundColor: theme.background, color: theme.text, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginBottom: 20, fontFamily: 'SpaceGrotesk_400Regular' }}
              value={promptText}
              onChangeText={setPromptText}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <Pressable onPress={() => setPromptVisible(false)} style={{ padding: 12 }}>
                <Text style={{ color: theme.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' }}>Cancelar</Text>
              </Pressable>
              <Pressable 
                onPress={async () => {
                  if (promptText && promptText.trim() !== '') {
                    const { renameAlbum } = await import('@/src/services/VaultService');
                    await renameAlbum(promptAlbum, promptText.trim(), isFakeVault);
                    loadAlbums();
                  }
                  setPromptVisible(false);
                }} 
                style={{ backgroundColor: theme.tint, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
              >
                <Text style={{ color: '#FFF', fontFamily: 'SpaceGrotesk_700Bold' }}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Proteger Álbum com PIN (Android) */}
      <Modal visible={pinPromptVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: theme.surface, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 8 }}>Proteger Álbum</Text>
            <Text style={{ color: theme.textSecondary, marginBottom: 16, fontFamily: 'Inter_400Regular' }}>Digite uma senha para este diretório:</Text>
            <TextInput
              style={{ backgroundColor: theme.background, color: theme.text, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginBottom: 20, fontFamily: 'SpaceGrotesk_400Regular' }}
              value={pinText}
              onChangeText={setPinText}
              secureTextEntry
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <Pressable onPress={() => setPinPromptVisible(false)} style={{ padding: 12 }}>
                <Text style={{ color: theme.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' }}>Cancelar</Text>
              </Pressable>
              <Pressable 
                onPress={async () => {
                  if (pinText && pinText.trim() !== '') {
                    await SecureStore.setItemAsync(`pwd_false_${sanitizeKey(pinAlbum)}`, pinText.trim());
                    loadAlbums();
                  }
                  setPinPromptVisible(false);
                }} 
                style={{ backgroundColor: theme.tint, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
              >
                <Text style={{ color: '#FFF', fontFamily: 'SpaceGrotesk_700Bold' }}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4, letterSpacing: 0.5, opacity: 0.8 },
  
  // Segmented Tabs
  mainTabBar: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 10, borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  mainTabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  mainTabButtonActive: { borderStyle: 'solid' },
  mainTabButtonText: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },
  
  // Sub Tabs
  subTabBar: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, borderBottomWidth: 1 },
  subTabButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  subTabButtonActive: {},
  subTabButtonText: { fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },

  // Vault styles
  createAlbumContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 10, alignItems: 'center' },
  input: { flex: 1, padding: 15, borderRadius: 12, borderWidth: 1, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },
  createButtonContainer: { borderRadius: 12, overflow: 'hidden' },
  createButton: { paddingHorizontal: 24, height: 50, justifyContent: 'center', alignItems: 'center' },
  createButtonText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, letterSpacing: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  albumItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 16, 
    marginVertical: 6, 
    borderWidth: 1, 
    padding: 12, 
    overflow: 'hidden',
  },
  previewContainer: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden', marginRight: 15 },
  iconBox: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: '100%' },
  albumInfo: { flex: 1, justifyContent: 'center' },
  albumName: { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },

  // Cloud Files List
  cloudFileItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginVertical: 4 },
  cloudFileIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cloudFileName: { fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
  cloudFileDesc: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2, opacity: 0.6 },

  // Local Album Detail Screen
  localAlbumHeader: { paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, marginBottom: 15 },
  backBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  localAlbumTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
  uploadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 8, borderWidth: 1 },
  uploadBtnText: { fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  categoryTitle: { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },
  emptyCategoryText: { fontSize: 11, fontFamily: 'Inter_400Regular', paddingVertical: 10 },
  gridMedia: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 },
  gridCell: { width: '31%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  gridThumbnail: { width: '100%', height: '100%' },
  videoOverlay: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  audioList: { paddingVertical: 10, gap: 6 },
  audioRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },
});
