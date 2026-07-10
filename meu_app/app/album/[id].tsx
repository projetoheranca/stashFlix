import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, TextInput, Modal, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { importToAlbum, getAlbumFiles, isFilePasswordProtected, verifyFilePassword, decryptFile, encryptFileWithPassword } from '@/src/services/VaultService';
import * as Sharing from 'expo-sharing';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, Audio } from 'expo-av';

const SecureThumbnail = React.memo(function SecureThumbnail({ file }: { file: any }) {
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [ext, setExt] = useState<string | null>(null);
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Verificar se o arquivo está protegido por senha individual
    SecureStore.getItemAsync(`file_pwd_enabled_${file.name}`).then(val => {
      if (isMounted) setIsProtected(val === 'true');
    });

    // Obter extensão do arquivo a partir dos metadados
    SecureStore.getItemAsync(`meta_${file.name}`).then(res => {
      if (isMounted && res) setExt(res.toLowerCase());
    });

    const loadThumb = async () => {
      try {
        if (file.thumbUri) {
          const content = await FileSystem.readAsStringAsync(file.thumbUri, { encoding: FileSystem.EncodingType.UTF8 });
          const base64 = content.split('').reverse().join('');
          if (isMounted) setImgUri(`data:image/jpeg;base64,${base64}`);
        }
      } catch (e) {}
    };
    loadThumb();
    return () => { isMounted = false; };
  }, [file]);

  if (isProtected) {
    return (
      <View style={[styles.image, { backgroundColor: '#100505', justifyContent: 'center', alignItems: 'center', borderColor: '#FF0033', borderWidth: 1 }]}>
        <Ionicons name="lock-closed" size={32} color="#FF0033" />
        <Text style={{ fontSize: 9, color: '#FF0033', marginTop: 4, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 }}>SENHA PROT.</Text>
      </View>
    );
  }

  const isAudio = ext && ['mp3', 'wav', 'm4a', 'caf', 'aac', '3gp'].includes(ext);
  const isVideo = ext && ['mp4', 'mov', 'm4v', 'avi', 'mkv'].includes(ext);

  if (isAudio) {
    return (
      <View style={[styles.image, { backgroundColor: '#1C1200', justifyContent: 'center', alignItems: 'center', borderColor: '#FFD700', borderWidth: 1 }]}>
        <Ionicons name="musical-notes" size={32} color="#FFD700" />
        <Text style={{ fontSize: 9, color: '#FFD700', marginTop: 4, fontFamily: 'SpaceGrotesk_700Bold' }}>ÁUDIO</Text>
      </View>
    );
  }

  if (isVideo) {
    return (
      <View style={[styles.image, { backgroundColor: '#001A18', justifyContent: 'center', alignItems: 'center', borderColor: '#00FFCC', borderWidth: 1 }]}>
        <Ionicons name="videocam" size={32} color="#00FFCC" />
        <Text style={{ fontSize: 9, color: '#00FFCC', marginTop: 4, fontFamily: 'SpaceGrotesk_700Bold' }}>VÍDEO</Text>
      </View>
    );
  }

  if (!imgUri) {
    return (
      <View style={[styles.image, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 10, color: '#444' }}>Criptografado</Text>
      </View>
    );
  }
  return <Image source={{ uri: imgUri }} style={styles.image} />;
});
SecureThumbnail.displayName = 'SecureThumbnail';

export default function AlbumScreen() {
  const { id, decoy } = useLocalSearchParams();
  const albumName = id as string;
  const isDecoy = decoy === 'true';
  const router = useRouter();

  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  
  const [files, setFiles] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [albumPin, setAlbumPin] = useState('');
  const [albumPwd, setAlbumPwd] = useState<string | null>(null);

  // Custom Prompt States for Move
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [moveTargetUri, setMoveTargetUri] = useState('');
  const [moveDestAlbum, setMoveDestAlbum] = useState('');

  // Zoom Modal States
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [zoomFile, setZoomFile] = useState<any | null>(null);
  const [zoomImgUri, setZoomImgUri] = useState<string | null>(null);
  const [zoomLoading, setZoomLoading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // File Password Validation Modal
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdTargetFile, setPwdTargetFile] = useState<any | null>(null);

  // File Password Setting Modal
  const [encryptModalVisible, setEncryptModalVisible] = useState(false);
  const [newFilePwd, setNewFilePwd] = useState('');
  const [setPwdTargetUri, setSetPwdTargetUri] = useState('');

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }]
  }));

  const loadFiles = async () => {
    const pwd = await SecureStore.getItemAsync(`pwd_false_${albumName}`);
    if (pwd && !albumPwd) {
      setIsLocked(true);
      return;
    }

    const albumFiles = await getAlbumFiles(albumName, isDecoy);
    setFiles(albumFiles);
  };

  useEffect(() => {
    loadFiles();
  }, [albumName, isDecoy, albumPwd]);

  const handleUnlock = async () => {
    const pwd = await SecureStore.getItemAsync(`pwd_false_${albumName}`);
    if (albumPin === pwd) {
      setAlbumPwd(pwd);
      setIsLocked(false);
    } else {
      Alert.alert("Erro", "Senha incorreta");
      setAlbumPin('');
    }
  };

  const loadZoomFile = useCallback(async (item: any, password?: string | null) => {
    setZoomLoading(true);
    setZoomFile(item);
    setZoomImgUri(null);
    setZoomModalVisible(true);
    try {
      const decryptedUri = await decryptFile(item.uri, password);
      if (decryptedUri) {
        setZoomImgUri(decryptedUri);
      } else {
        Alert.alert("Erro", "Falha ao descriptografar arquivo. Senha incorreta?");
        setZoomModalVisible(false);
      }
    } catch (e) {
      Alert.alert("Erro", "Erro ao carregar o arquivo.");
      setZoomModalVisible(false);
    } finally {
      setZoomLoading(false);
    }
  }, [sound, zoomImgUri]);

  const playAudio = async () => {
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
    } else if (zoomImgUri) {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: zoomImgUri },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      } catch (err) {
        Alert.alert("Erro", "Falha ao reproduzir áudio.");
      }
    }
  };

  const pauseAudio = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const handleCloseZoom = async () => {
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch (e) {}
      setSound(null);
    }
    setIsPlaying(false);
    setZoomModalVisible(false);
  };

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [sound]);

  const handleFileClick = useCallback(async (item: any) => {
    const isProtected = await isFilePasswordProtected(item.id);
    if (isProtected) {
      setPwdTargetFile(item);
      setPwdInput('');
      setPwdModalVisible(true);
    } else {
      loadZoomFile(item, null);
    }
  }, [loadZoomFile]);

  const handleVerifyFilePassword = async () => {
    if (!pwdTargetFile) return;
    const matches = await verifyFilePassword(pwdTargetFile.id, pwdInput);
    if (matches) {
      setPwdModalVisible(false);
      loadZoomFile(pwdTargetFile, pwdInput);
    } else {
      Alert.alert("Erro", "Senha incorreta.");
      setPwdInput('');
    }
  };

  const handleOpenSetPassword = (uri: string) => {
    setSetPwdTargetUri(uri);
    setNewFilePwd('');
    setEncryptModalVisible(true);
  };

  const handleEncryptFileWithPassword = async () => {
    if (newFilePwd.trim() === '') {
      Alert.alert("Aviso", "Digite uma senha para proteger o arquivo.");
      return;
    }
    try {
      const success = await encryptFileWithPassword(setPwdTargetUri, newFilePwd);
      if (success) {
        Alert.alert("Sucesso", "Arquivo criptografado com senha customizada!");
        setEncryptModalVisible(false);
        setZoomModalVisible(false);
        loadFiles();
      } else {
        Alert.alert("Erro", "Falha ao criptografar arquivo.");
      }
    } catch (e) {
      Alert.alert("Erro", "Erro ao processar arquivo.");
    }
  };

  const handleShareFile = async () => {
    if (zoomImgUri) {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(zoomImgUri);
      } else {
        Alert.alert("Erro", "Compartilhamento não disponível no dispositivo.");
      }
    } else {
      Alert.alert("Aviso", "O arquivo ainda não foi carregado.");
    }
  };

  const handleDeleteFileInZoom = async (uri: string) => {
    Alert.alert(
      "Excluir Arquivo",
      "Deseja mover este arquivo para a lixeira?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Mover para Lixeira", 
          style: "destructive", 
          onPress: async () => {
            const { moveToTrash } = await import('@/src/services/VaultService');
            await moveToTrash(uri, isDecoy);
            setZoomModalVisible(false);
            loadFiles();
          } 
        }
      ]
    );
  };

  const handleAddMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Precisamos de permissão para acessar suas fotos.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      for (const asset of result.assets) {
        await importToAlbum(asset.uri, albumName, isDecoy);
      }
      loadFiles();
    }
  };

  const handleFileLongPress = useCallback((uri: string) => {
    Alert.alert(
      "Opções do Arquivo",
      "O que deseja fazer com esta foto/vídeo?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Exportar para Galeria",
          onPress: async () => {
             const { exportFromVault } = await import('@/src/services/VaultService');
             const success = await exportFromVault(uri);
             if (success) {
               Alert.alert("Sucesso", "Arquivo exportado para a sua galeria nativa.");
               loadFiles();
             }
          }
        },
        {
          text: "Mover de Álbum",
          onPress: async () => {
             if (Platform.OS === 'ios') {
               Alert.prompt(
                 "Mover Arquivo",
                 "Digite o nome do álbum de destino:",
                 [
                   { text: "Cancelar", style: "cancel" },
                   { text: "Mover", onPress: async (destAlbum?: string) => {
                       if (destAlbum && destAlbum.trim() !== '') {
                         const { moveFileBetweenAlbums } = await import('@/src/services/VaultService');
                         await moveFileBetweenAlbums(uri, destAlbum.trim(), isDecoy);
                         loadFiles();
                       }
                     } 
                   }
                 ]
               );
             } else {
               setMoveTargetUri(uri);
               setMoveDestAlbum('');
               setMoveModalVisible(true);
             }
          }
        },
        { 
          text: "Mover para Lixeira", 
          style: "destructive", 
          onPress: async () => {
            const { moveToTrash } = await import('@/src/services/VaultService');
            await moveToTrash(uri, isDecoy);
            loadFiles();
          } 
        }
      ]
    );
  }, [isDecoy, loadFiles]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.imageContainer}
      onPress={() => handleFileClick(item)}
      onLongPress={() => handleFileLongPress(item.uri)}
      activeOpacity={0.8}
    >
      <SecureThumbnail file={item} />
    </TouchableOpacity>
  ), [handleFileClick, handleFileLongPress]);

  if (isLocked) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 40, marginBottom: 20 }}>🔒</Text>
        <Text style={[styles.title, { color: theme.text, marginBottom: 20 }]}>ÁLBUM PROTEGIDO</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, width: '80%', marginBottom: 20 }]}
          placeholder="SENHA DO ÁLBUM"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          value={albumPin}
          onChangeText={setAlbumPin}
        />
        <TouchableOpacity 
          style={[styles.createButton, { backgroundColor: theme.tint, width: '80%', padding: 15, alignItems: 'center' }]} 
          onPress={handleUnlock}
        >
          <Text style={styles.createButtonText}>DESBLOQUEAR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular' }}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={{ fontSize: 24, color: theme.tint, fontFamily: 'SpaceGrotesk_700Bold' }}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{albumName.toUpperCase()}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={3}
        contentContainerStyle={styles.list}
        removeClippedSubviews={true}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular' }}>Nenhum arquivo encontrado.</Text>
          </View>
        }
      />

      <Animated.View style={[styles.fabContainer, pulseStyle]}>
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: theme.tint, shadowColor: theme.tint }]} 
          onPress={handleAddMedia}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Modal para Mover Arquivo (Android) */}
      <Modal visible={moveModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '80%', backgroundColor: theme.surface, padding: 20, borderRadius: 12 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 10 }}>Mover Arquivo</Text>
            <Text style={{ color: theme.textSecondary, marginBottom: 15 }}>Digite o nome do álbum de destino:</Text>
            <TextInput
              style={{ backgroundColor: '#0F0F0F', color: theme.text, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#1F1F1F', marginBottom: 20 }}
              value={moveDestAlbum}
              onChangeText={setMoveDestAlbum}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setMoveModalVisible(false)} style={{ padding: 10, marginRight: 10 }}>
                <Text style={{ color: theme.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={async () => {
                  if (moveDestAlbum && moveDestAlbum.trim() !== '') {
                    const { moveFileBetweenAlbums } = await import('@/src/services/VaultService');
                    await moveFileBetweenAlbums(moveTargetUri, moveDestAlbum.trim(), isDecoy);
                    loadFiles();
                  }
                  setMoveModalVisible(false);
                }} 
                style={{ backgroundColor: theme.tint, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 6 }}
              >
                <Text style={{ color: '#000', fontFamily: 'SpaceGrotesk_700Bold' }}>Mover</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Digitar Senha do Arquivo */}
      <Modal visible={pwdModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="lock-closed" size={32} color={theme.tint} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Arquivo Protegido</Text>
            <Text style={[styles.modalSubtitle, { color: '#888' }]}>
              Este arquivo está protegido por senha. Por favor, digite a senha para visualizar.
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: '#0F0F0F', color: theme.text, borderColor: theme.border }]}
              value={pwdInput}
              onChangeText={setPwdInput}
              placeholder="Senha do arquivo"
              placeholderTextColor="#555"
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                onPress={() => setPwdModalVisible(false)} 
                style={styles.modalCancelButton}
              >
                <Text style={{ color: '#888', fontFamily: 'SpaceGrotesk_700Bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleVerifyFilePassword} 
                style={[styles.modalConfirmButton, { backgroundColor: theme.tint }]}
              >
                <Text style={{ color: '#000', fontFamily: 'SpaceGrotesk_700Bold' }}>Acessar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Definir Senha do Arquivo (Criptografar) */}
      <Modal visible={encryptModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="key" size={32} color={theme.tint} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Criptografar Arquivo</Text>
            <Text style={[styles.modalSubtitle, { color: '#888' }]}>
              Digite uma senha para este arquivo. Ele ficará vinculado a essa senha.
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: '#0F0F0F', color: theme.text, borderColor: theme.border }]}
              value={newFilePwd}
              onChangeText={setNewFilePwd}
              placeholder="Nova senha"
              placeholderTextColor="#555"
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                onPress={() => setEncryptModalVisible(false)} 
                style={styles.modalCancelButton}
              >
                <Text style={{ color: '#888', fontFamily: 'SpaceGrotesk_700Bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleEncryptFileWithPassword} 
                style={[styles.modalConfirmButton, { backgroundColor: theme.tint }]}
              >
                <Text style={{ color: '#000', fontFamily: 'SpaceGrotesk_700Bold' }}>Criptografar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Zoom da Imagem */}
      <Modal visible={zoomModalVisible} transparent={false} animationType="slide">
        <View style={styles.zoomModalContainer}>
          <TouchableOpacity 
            style={styles.zoomCloseButton} 
            onPress={handleCloseZoom}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          
          {zoomLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.tint} />
              <Text style={{ color: '#FFF', marginTop: 10, fontFamily: 'Inter_400Regular' }}>Descriptografando arquivo...</Text>
            </View>
          ) : (
            zoomImgUri && (() => {
              const extension = zoomImgUri.split('.').pop()?.toLowerCase();
              const isAudio = extension && ['mp3', 'wav', 'm4a', 'caf', 'aac', '3gp'].includes(extension);
              const isVideo = extension && ['mp4', 'mov', 'm4v', 'avi', 'mkv'].includes(extension);

              if (isAudio) {
                return (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                    <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255, 215, 0, 0.05)', borderColor: '#FFD700', borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 30, shadowColor: '#FFD700', shadowOpacity: 0.3, shadowRadius: 20 }}>
                      <Ionicons name="musical-notes" size={60} color="#FFD700" />
                    </View>
                    <Text style={{ color: '#FFF', fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', marginBottom: 10 }}>Player de Áudio Seguro</Text>
                    <Text style={{ color: '#888', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 40 }} numberOfLines={1}>
                      {zoomFile?.name}
                    </Text>
                    <TouchableOpacity 
                      style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', shadowColor: '#FFD700', shadowOpacity: 0.6, shadowRadius: 15, elevation: 8 }} 
                      onPress={isPlaying ? pauseAudio : playAudio}
                    >
                      <Ionicons name={isPlaying ? "pause" : "play"} size={36} color="#000" style={{ marginLeft: isPlaying ? 0 : 4 }} />
                    </TouchableOpacity>
                  </View>
                );
              }

              if (isVideo) {
                return (
                  <Video
                    source={{ uri: zoomImgUri }}
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                    useNativeControls
                    style={styles.zoomImage}
                  />
                );
              }

              return (
                <Image source={{ uri: zoomImgUri }} style={styles.zoomImage} resizeMode="contain" />
              );
            })()
          )}

          {!zoomLoading && zoomFile && (
            <View style={styles.zoomOptionsContainer}>
              <TouchableOpacity 
                style={styles.zoomOptionButton} 
                onPress={handleShareFile}
              >
                <Ionicons name="share-social-outline" size={24} color="#FFF" />
                <Text style={styles.zoomOptionText}>Enviar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.zoomOptionButton} 
                onPress={() => handleOpenSetPassword(zoomFile.uri)}
              >
                <Ionicons name="lock-closed-outline" size={24} color={theme.tint} />
                <Text style={[styles.zoomOptionText, { color: theme.tint }]}>Criptografar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.zoomOptionButton} 
                onPress={() => handleDeleteFileInZoom(zoomFile.uri)}
              >
                <Ionicons name="trash-outline" size={24} color="#FF4D4D" />
                <Text style={[styles.zoomOptionText, { color: '#FF4D4D' }]}>Deletar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15 },
  backButton: { padding: 10 },
  title: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
  list: { padding: 5 },
  imageContainer: { flex: 1/3, aspectRatio: 1, padding: 2 },
  image: { flex: 1, borderRadius: 4, borderWidth: 1, borderColor: '#1F1F1F' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  fabContainer: { position: 'absolute', bottom: 40, right: 30 },
  fab: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, elevation: 10 },
  fabText: { fontSize: 32, color: '#000', fontFamily: 'SpaceGrotesk_400Regular', marginTop: -4 },
  input: { padding: 15, borderRadius: 8, borderWidth: 1, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center' },
  createButton: { borderRadius: 8, justifyContent: 'center', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  createButtonText: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, letterSpacing: 1 },
  
  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A0000',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#FF0033',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  modalIconContainer: {
    marginBottom: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 0, 51, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 51, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    width: '100%',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 10,
    justifyContent: 'center',
  },
  modalConfirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Zoom Modal Styling
  zoomModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width: '100%',
    height: '75%',
  },
  zoomCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  zoomOptionsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(10, 0, 0, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A0000',
    paddingVertical: 16,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#FF0033',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  zoomOptionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  zoomOptionText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 6,
    textAlign: 'center',
    color: '#FFF',
  },
});
