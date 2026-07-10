import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, Alert, Modal, Platform, ActivityIndicator, ScrollView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAlbums, createAlbum, importToAlbum, getCloudCatalog, uploadFileToCloud } from '@/src/services/VaultService';
import { useAppContext } from '@/src/contexts/AppContext';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';

export default function VaultScreen() {
  const router = useRouter();
  const { activePalette: theme, isFakeVault } = useAppContext();
  
  // Navigation Tabs
  const [mainTab, setMainTab] = useState<'vault' | 'device'>('vault');
  const [vaultSubTab, setVaultSubTab] = useState<'local' | 'cloud'>('local');

  // Vault States
  const [albums, setAlbums] = useState<{id: string; name: string; isLocked?: boolean; previewUri?: string}[]>([]);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [cloudFiles, setCloudFiles] = useState<any[]>([]);
  
  // Device Gallery States
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [deviceAlbums, setDeviceAlbums] = useState<MediaLibrary.Album[]>([]);
  const [selectedLocalAlbum, setSelectedLocalAlbum] = useState<MediaLibrary.Album | null>(null);
  const [localAlbumFiles, setLocalAlbumFiles] = useState<{
    images: MediaLibrary.Asset[];
    videos: MediaLibrary.Asset[];
    audios: MediaLibrary.Asset[];
  }>({ images: [], videos: [], audios: [] });

  const [uploading, setUploading] = useState(false);

  // Collapsible category states for Device detail view
  const [showImages, setShowImages] = useState(true);
  const [showVideos, setShowVideos] = useState(true);
  const [showAudios, setShowAudios] = useState(true);

  // Custom Prompt States (Rename Album)
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptAlbum, setPromptAlbum] = useState('');
  const [promptText, setPromptText] = useState('');

  const loadAlbums = async () => {
    const fetchedAlbums: any[] = await getAlbums(isFakeVault);
    for (let album of fetchedAlbums) {
      const hasLock = await SecureStore.getItemAsync(`pwd_false_${album.name}`);
      album.isLocked = !!hasLock;
    }
    setAlbums(fetchedAlbums);
    
    // Load Cloud synced files catalog
    try {
      const synced = await getCloudCatalog(isFakeVault);
      setCloudFiles(synced);
    } catch (e) {}
  };

  useFocusEffect(
    useCallback(() => {
      loadAlbums();
      if (mainTab === 'device') {
        loadDeviceAlbums();
      }
    }, [isFakeVault, mainTab])
  );

  useEffect(() => {
    loadAlbums();
  }, [isFakeVault]);

  // Request media permissions and load local albums
  const loadDeviceAlbums = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      
      if (granted) {
        const albumsList = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
        const filtered = albumsList.filter(a => a.assetCount > 0);
        setDeviceAlbums(filtered);
      } else {
        Alert.alert("Permissão Necessária", "Precisamos de permissão para acessar suas mídias.");
      }
    } catch (err) {
      console.warn("MediaLibrary permissions error:", err);
      Alert.alert(
        "Erro de Permissão",
        "Não foi possível obter permissões de mídia. Verifique as configurações de armazenamento do aplicativo nas configurações do seu celular."
      );
    }
  };

  // Load assets from a device album categorized by media type
  const handleOpenDeviceAlbum = async (album: MediaLibrary.Album) => {
    setSelectedLocalAlbum(album);
    setUploading(true);
    try {
      const assets = await MediaLibrary.getAssetsAsync({
        albumId: album.id,
        first: 300,
        mediaType: ['photo', 'video', 'audio']
      });

      const images = assets.assets.filter(a => a.mediaType === 'photo');
      const videos = assets.assets.filter(a => a.mediaType === 'video');
      const audios = assets.assets.filter(a => a.mediaType === 'audio');

      setLocalAlbumFiles({ images, videos, audios });
    } catch (error) {
      console.warn("Error fetching assets", error);
    } finally {
      setUploading(false);
    }
  };

  // Upload/import folder contents to secure local or cloud vault
  const handleUploadFolder = async (destination: 'local' | 'cloud') => {
    if (!selectedLocalAlbum) return;
    setUploading(true);
    try {
      const assets = await MediaLibrary.getAssetsAsync({
        albumId: selectedLocalAlbum.id,
        first: 300,
        mediaType: ['photo', 'video', 'audio']
      });
      
      const albumName = selectedLocalAlbum.title || 'DeviceImport';
      await createAlbum(albumName, isFakeVault);
      
      let successCount = 0;
      for (const asset of assets.assets) {
        const info = await MediaLibrary.getAssetInfoAsync(asset);
        const localUri = info.localUri || info.uri;
        
        if (localUri) {
          // Import to local secure storage
          const secureUri = await importToAlbum(localUri, albumName, isFakeVault);
          
          // Sync to Cloud if requested
          if (destination === 'cloud') {
            const fileName = secureUri.split('/').pop() || 'file';
            const cloudSuccess = await uploadFileToCloud(secureUri, fileName, albumName, isFakeVault);
            if (cloudSuccess) successCount++;
          } else {
            successCount++;
          }
        }
      }
      
      Alert.alert(
        "Importação Concluída",
        `${successCount} arquivos criptografados no cofre ${destination === 'cloud' ? 'e enviados para a Nuvem' : 'local'}.`,
        [
          {
            text: "OK",
            onPress: () => {
              Alert.alert(
                "Liberar Armazenamento",
                "Deseja excluir as mídias originais do dispositivo para liberar espaço?",
                [
                  { text: "Manter no celular", style: "cancel" },
                  {
                    text: "Sim, excluir",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        const ids = assets.assets.map(a => a.id);
                        await MediaLibrary.deleteAssetsAsync(ids);
                        Alert.alert("Sucesso", "Arquivos originais apagados com sucesso.");
                      } catch (err) {
                        console.warn("Error deleting files", err);
                      }
                      loadDeviceAlbums();
                      setSelectedLocalAlbum(null);
                    }
                  }
                ]
              );
            }
          }
        ]
      );
      loadAlbums();
    } catch (error) {
      Alert.alert("Erro de Importação", "Não foi possível criptografar os arquivos.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

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
              await SecureStore.deleteItemAsync(`pwd_false_${albumName}`);
              loadAlbums();
            } else {
              Alert.alert(
                "Proteger Álbum",
                "Digite um PIN de 4 dígitos:",
                [
                  { text: "Cancelar", style: "cancel" },
                  { text: "1234 (Teste)", onPress: async () => {
                      await SecureStore.setItemAsync(`pwd_false_${albumName}`, '1234');
                      loadAlbums();
                    }
                  }
                ]
              );
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

      {/* TABS DE SELEÇÃO PRINCIPAL */}
      <View style={[styles.mainTabBar, { backgroundColor: theme.surface + '60', borderColor: theme.border + '50' }]}>
        <Pressable
          style={({ pressed }) => [
            styles.mainTabButton,
            mainTab === 'vault' && [styles.mainTabButtonActive, { backgroundColor: theme.tint + '15', borderColor: theme.tint }],
            pressed && { transform: [{ scale: 0.98 }] }
          ]}
          onPress={() => setMainTab('vault')}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color={mainTab === 'vault' ? theme.tint : theme.textSecondary} />
          <Text style={[styles.mainTabButtonText, { color: mainTab === 'vault' ? theme.text : theme.textSecondary }]}>COFRE SEGURO</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.mainTabButton,
            mainTab === 'device' && [styles.mainTabButtonActive, { backgroundColor: theme.tint + '15', borderColor: theme.tint }],
            pressed && { transform: [{ scale: 0.98 }] }
          ]}
          onPress={() => {
            setMainTab('device');
            loadDeviceAlbums();
          }}
        >
          <Ionicons name="folder-open-outline" size={16} color={mainTab === 'device' ? theme.tint : theme.textSecondary} />
          <Text style={[styles.mainTabButtonText, { color: mainTab === 'device' ? theme.text : theme.textSecondary }]}>DISPOSITIVO</Text>
        </Pressable>
      </View>

      {/* ABA 1: COFRE SEGURO */}
      {mainTab === 'vault' && (
        <View style={{ flex: 1 }}>
          {/* Sub-abas: Celular vs Nuvem */}
          <View style={[styles.subTabBar, { borderBottomColor: theme.border + '33' }]}>
            <Pressable
              style={[
                styles.subTabButton,
                vaultSubTab === 'local' && [styles.subTabButtonActive, { borderBottomColor: theme.tint }]
              ]}
              onPress={() => setVaultSubTab('local')}
            >
              <Text style={[styles.subTabButtonText, { color: vaultSubTab === 'local' ? theme.text : theme.textSecondary + 'B0' }]}>
                NO APARELHO ({albums.length})
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.subTabButton,
                vaultSubTab === 'cloud' && [styles.subTabButtonActive, { borderBottomColor: theme.tint }]
              ]}
              onPress={() => setVaultSubTab('cloud')}
            >
              <Text style={[styles.subTabButtonText, { color: vaultSubTab === 'cloud' ? theme.text : theme.textSecondary + 'B0' }]}>
                NA NUVEM ({cloudFiles.length})
              </Text>
            </Pressable>
          </View>

          {/* Sub-aba: Local */}
          {vaultSubTab === 'local' && (
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
          )}

          {/* Sub-aba: Nuvem */}
          {vaultSubTab === 'cloud' && (
            <FlatList 
              data={cloudFiles}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={[styles.cloudFileItem, { backgroundColor: theme.surface + '60', borderColor: theme.border + '50' }]}>
                  <View style={[styles.cloudFileIcon, { backgroundColor: theme.surfaceHighlight }]}>
                    <Ionicons name="cloud-done-outline" size={20} color={theme.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cloudFileName, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.cloudFileDesc, { color: theme.textSecondary }]}>
                      Pasta: {item.album} • Synced
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={18} color="#00FF41" style={{ marginRight: 5 }} />
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="cloud-offline-outline" size={32} color={theme.textSecondary} style={{ marginBottom: 12 }} />
                  <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                    Nenhum arquivo na nuvem ainda. Realize a sincronização nas Configurações.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* ABA 2: DISPOSITIVO (EXPLORADOR LOCAL DO CELULAR) */}
      {mainTab === 'device' && (
        <View style={{ flex: 1 }}>
          {selectedLocalAlbum === null ? (
            <FlatList 
              data={deviceAlbums}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Pressable 
                  style={({ pressed }) => [
                    styles.albumItem, 
                    { backgroundColor: theme.surface + '60', borderColor: theme.border + '50' },
                    pressed && { backgroundColor: theme.surfaceHighlight + '40', transform: [{ scale: 0.98 }] }
                  ]} 
                  onPress={() => handleOpenDeviceAlbum(item)}
                >
                  <View style={styles.previewContainer}>
                    <View style={[styles.iconBox, { backgroundColor: theme.surfaceHighlight }]}>
                      <Ionicons name="phone-portrait-outline" size={24} color={theme.tint} />
                    </View>
                  </View>
                  <View style={styles.albumInfo}>
                    <Text style={[styles.albumName, { color: theme.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                      {item.assetCount} arquivos locais
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} style={{ marginRight: 5, opacity: 0.8 }} />
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular' }}>
                    Nenhuma pasta local identificada.
                  </Text>
                </View>
              }
            />
          ) : (
            // VISUALIZAÇÃO DETALHADA DA PASTA DO CELULAR
            <View style={{ flex: 1 }}>
              {/* Header do Álbum Local */}
              <View style={[styles.localAlbumHeader, { borderBottomColor: theme.border + '33' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                  <Pressable 
                    onPress={() => setSelectedLocalAlbum(null)}
                    style={({ pressed }) => [
                      styles.backBtn, 
                      { backgroundColor: theme.surface },
                      pressed && { opacity: 0.7 }
                    ]}
                  >
                    <Ionicons name="arrow-back" size={20} color={theme.text} />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.localAlbumTitle, { color: theme.text }]} numberOfLines={1}>
                      {selectedLocalAlbum.title}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                      {selectedLocalAlbum.assetCount} arquivos originais no aparelho
                    </Text>
                  </View>
                </View>

                {/* BOTÕES DE UPLOAD FUTURISTAS */}
                {uploading ? (
                  <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={theme.tint} />
                    <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 6 }}>Processando e criptografando arquivos...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.uploadBtn,
                        { borderColor: theme.tint, backgroundColor: theme.tint + '15' },
                        pressed && { transform: [{ scale: 0.97 }] }
                      ]}
                      onPress={() => handleUploadFolder('local')}
                    >
                      <Ionicons name="shield-outline" size={14} color={theme.tint} />
                      <Text style={[styles.uploadBtnText, { color: theme.tint }]}>SALVAR LOCAL</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.uploadBtn,
                        { borderColor: '#00D8FF', backgroundColor: 'rgba(0, 216, 255, 0.1)' },
                        pressed && { transform: [{ scale: 0.97 }] }
                      ]}
                      onPress={() => handleUploadFolder('cloud')}
                    >
                      <Ionicons name="cloud-upload-outline" size={14} color="#00D8FF" />
                      <Text style={[styles.uploadBtnText, { color: '#00D8FF' }]}>SALVAR NUVEM</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* LISTA DE MÍDIAS DO CELULAR CATEGORIZADA */}
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
                {/* 1. SEÇÃO DE IMAGENS */}
                <Pressable 
                  style={[styles.categoryHeader, { borderBottomColor: theme.border + '22' }]} 
                  onPress={() => setShowImages(!showImages)}
                >
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>
                    🖼️ IMAGENS ({localAlbumFiles.images.length})
                  </Text>
                  <Ionicons name={showImages ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
                </Pressable>
                
                {showImages && (
                  <View style={styles.gridMedia}>
                    {localAlbumFiles.images.length === 0 ? (
                      <Text style={[styles.emptyCategoryText, { color: theme.textSecondary }]}>Nenhuma imagem nesta pasta.</Text>
                    ) : (
                      localAlbumFiles.images.map((item) => (
                        <View key={item.id} style={[styles.gridCell, { backgroundColor: theme.surface }]}>
                          <Image source={{ uri: item.uri }} style={styles.gridThumbnail} contentFit="cover" />
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* 2. SEÇÃO DE VÍDEOS */}
                <Pressable 
                  style={[styles.categoryHeader, { borderBottomColor: theme.border + '22', marginTop: 20 }]} 
                  onPress={() => setShowVideos(!showVideos)}
                >
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>
                    🎥 VÍDEOS ({localAlbumFiles.videos.length})
                  </Text>
                  <Ionicons name={showVideos ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
                </Pressable>

                {showVideos && (
                  <View style={styles.gridMedia}>
                    {localAlbumFiles.videos.length === 0 ? (
                      <Text style={[styles.emptyCategoryText, { color: theme.textSecondary }]}>Nenhum vídeo nesta pasta.</Text>
                    ) : (
                      localAlbumFiles.videos.map((item) => (
                        <View key={item.id} style={[styles.gridCell, { backgroundColor: theme.surface }]}>
                          <Image source={{ uri: item.uri }} style={styles.gridThumbnail} contentFit="cover" />
                          <View style={styles.videoOverlay}>
                            <Ionicons name="play" size={16} color="#FFF" />
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* 3. SEÇÃO DE ÁUDIOS */}
                <Pressable 
                  style={[styles.categoryHeader, { borderBottomColor: theme.border + '22', marginTop: 20 }]} 
                  onPress={() => setShowAudios(!showAudios)}
                >
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>
                    🎵 ÁUDIOS ({localAlbumFiles.audios.length})
                  </Text>
                  <Ionicons name={showAudios ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
                </Pressable>

                {showAudios && (
                  <View style={styles.audioList}>
                    {localAlbumFiles.audios.length === 0 ? (
                      <Text style={[styles.emptyCategoryText, { color: theme.textSecondary }]}>Nenhum áudio nesta pasta.</Text>
                    ) : (
                      localAlbumFiles.audios.map((item) => (
                        <View key={item.id} style={[styles.audioRow, { backgroundColor: theme.surface }]}>
                          <Ionicons name="musical-notes-outline" size={18} color={theme.tint} />
                          <Text style={{ color: theme.text, fontSize: 12, flex: 1, marginLeft: 8 }} numberOfLines={1}>
                            {item.filename || 'Arquivo de Áudio'}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      )}

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
