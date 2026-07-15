import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as Linking from 'expo-linking';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, TextInput, Modal, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { importToAlbum, getAlbumFiles } from '@/src/services/VaultService';
import * as Sharing from 'expo-sharing';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from '@/src/services/SecureStoreManager';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, Audio } from 'expo-av';
import Slider from '@react-native-community/slider';

const CustomVideoPlayer = ({ uri }: { uri: string }) => {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<any>({});
  const [showControls, setShowControls] = useState(true);

  const handlePlayPause = () => {
    if (status.isPlaying) {
      videoRef.current?.pauseAsync();
    } else {
      videoRef.current?.playAsync();
    }
  };

  const handleSliderValueChange = (value: number) => {
    videoRef.current?.setPositionAsync(value);
  };

  const formatTime = (millis: number) => {
    if (isNaN(millis) || !millis) return "00:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={{ width: '100%', height: '100%', backgroundColor: '#000', justifyContent: 'center' }}>
      <TouchableOpacity activeOpacity={1} onPress={() => setShowControls(!showControls)} style={{ flex: 1, justifyContent: 'center' }}>
        <Video
          ref={videoRef}
          style={{ width: '100%', height: '100%' }}
          source={{ uri }}
          useNativeControls={false}
          resizeMode={ResizeMode.CONTAIN}
          onPlaybackStatusUpdate={status => setStatus(() => status)}
          shouldPlay
        />
      </TouchableOpacity>

      {showControls && (
        <View style={{
          position: 'absolute',
          bottom: 120,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(0,0,0,0.85)',
          padding: 15,
          borderRadius: 20,
          flexDirection: 'column',
          justifyContent: 'center',
          borderColor: '#00FFCC',
          borderWidth: 1
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={handlePlayPause} style={{ width: 40, alignItems: 'center' }}>
              <Ionicons name={status.isPlaying ? "pause" : "play"} size={28} color="#00FFCC" />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={status.durationMillis || 100}
                value={status.positionMillis || 0}
                onSlidingComplete={handleSliderValueChange}
                minimumTrackTintColor="#00FFCC"
                maximumTrackTintColor="#333"
                thumbTintColor="#00FFCC"
              />
            </View>

            <Text style={{ color: '#00FFCC', fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', width: 80, textAlign: 'right' }}>
              {formatTime(status.positionMillis)} / {formatTime(status.durationMillis)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

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

    // Obter extensão do arquivo a partir dos metadados ou banco de dados
    if (file.ext) {
      if (isMounted) setExt(file.ext.replace('.', '').toLowerCase());
    } else {
      // Tenta extrair extensão do nome do arquivo (ex: intruder_123.m4a → m4a)
      // Cobre arquivos do Firebase que não têm field 'ext' separado
      const nameForExt = file.name || file.fileName || '';
      // Remove query params de URL do Firebase antes de extrair extensão
      const cleanName = nameForExt.split('?')[0];
      const dotIdx = cleanName.lastIndexOf('.');
      if (dotIdx !== -1) {
        const parsedExt = cleanName.substring(dotIdx + 1).toLowerCase();
        if (parsedExt.length > 0 && parsedExt.length <= 5 && isMounted) {
          setExt(parsedExt);
        }
      } else {
        // Último recurso: SecureStore meta
        SecureStore.getItemAsync(`meta_${file.name}`).then(res => {
          if (isMounted && res) setExt(res.toLowerCase());
        });
      }
    }

    const loadThumb = async () => {
      try {
        const fileExt = file.ext ? file.ext.replace('.', '').toLowerCase() : null;
        const isVid = fileExt && ['mp4', 'mov', 'm4v', 'avi', 'mkv'].includes(fileExt);
        const isThumbActuallyVideoUrl = isVid && file.thumbUri === file.uri;

        if (file.thumbUri && !isThumbActuallyVideoUrl) {
          if (file.thumbUri.startsWith('http')) {
             if (isMounted) setImgUri(file.thumbUri);
          } else {
             const content = await FileSystem.readAsStringAsync(file.thumbUri, { encoding: FileSystem.EncodingType.UTF8 });
             const base64 = content.split('').reverse().join('');
             if (isMounted) setImgUri(`data:image/jpeg;base64,${base64}`);
          }
        } else if (isVid && file.uri) {
           const VideoThumbnails = await import('expo-video-thumbnails');
           const { uri } = await VideoThumbnails.getThumbnailAsync(file.uri, { time: 1000 });
           if (isMounted) setImgUri(uri);
        }
      } catch (e) {
        console.log('Error loading thumbnail:', e);
      }
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

  // Detecção de tipo — cascata de fontes do mais confiável ao menos:
  // 1) ext (state derivado do nome) 2) file.mediaType (salvo pelo Firebase upload)
  // 3) regex na URI (Firebase URLs têm ?token= mas extensão aparece antes)
  const uriOrName = file.uri || file.name || file.fileName || '';
  const isAudio = (ext && ['mp3', 'wav', 'm4a', 'caf', 'aac', '3gp'].includes(ext))
               || file.mediaType === 'audio'
               || /\.(mp3|wav|m4a|caf|aac|3gp)(\?|$)/i.test(uriOrName);
  const isVideo = !isAudio && (
                  (ext && ['mp4', 'mov', 'm4v', 'avi', 'mkv'].includes(ext))
               || file.mediaType === 'video'
               || /\.(mp4|mov|m4v|avi|mkv)(\?|$)/i.test(uriOrName));
  const isDocument = !isAudio && !isVideo && (
                     (ext && ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'rtf'].includes(ext))
                  || /\.(pdf|doc|docx|xls|xlsx|txt|csv|rtf)(\?|$)/i.test(uriOrName));

  if (isAudio) {
    return (
      <View style={[styles.image, { backgroundColor: '#1C1200', justifyContent: 'center', alignItems: 'center', borderColor: '#FFD700', borderWidth: 1 }]}>
        <Ionicons name="musical-notes" size={32} color="#FFD700" />
        <Text style={{ fontSize: 9, color: '#FFD700', marginTop: 4, fontFamily: 'SpaceGrotesk_700Bold' }}>ÁUDIO</Text>
      </View>
    );
  }

  if (isDocument) {
    return (
      <View style={[styles.image, { backgroundColor: '#001A33', justifyContent: 'center', alignItems: 'center', borderColor: '#00D0FF', borderWidth: 1 }]}>
        <Ionicons name="document-text" size={32} color="#00D0FF" />
        <Text style={{ fontSize: 9, color: '#00D0FF', marginTop: 4, fontFamily: 'SpaceGrotesk_700Bold' }}>DOC</Text>
      </View>
    );
  }

  if (!imgUri) {
    if (isVideo) {
      return (
        <View style={[styles.image, { backgroundColor: '#001A18', justifyContent: 'center', alignItems: 'center', borderColor: '#00FFCC', borderWidth: 1 }]}>
          <Ionicons name="videocam" size={32} color="#00FFCC" />
          <Text style={{ fontSize: 9, color: '#00FFCC', marginTop: 4, fontFamily: 'SpaceGrotesk_700Bold' }}>VÍDEO</Text>
        </View>
      );
    }
    return (
      <View style={[styles.image, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 10, color: '#444' }}>Criptografado</Text>
      </View>
    );
  }
  return (
    <View style={styles.image}>
      <Image source={{ uri: imgUri }} style={styles.image} />
      {isVideo && (
        <View style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 }}>
          <Ionicons name="videocam" size={14} color="#FFF" />
        </View>
      )}
    </View>
  );
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
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // File Password Validation Modal
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdTargetFile, setPwdTargetFile] = useState<any | null>(null);

  // File Password Setting Modal
  const [encryptModalVisible, setEncryptModalVisible] = useState(false);
  const [newFilePwd, setNewFilePwd] = useState('');
  const [setPwdTargetUri, setSetPwdTargetUri] = useState('');
  const [isZoomFileEncrypted, setIsZoomFileEncrypted] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    // Verifica se este arquivo já está criptografado com senha
    const encStatus = await SecureStore.getItemAsync(`file_pwd_enabled_${item.name}`);
    setIsZoomFileEncrypted(encStatus === 'true');
    try {
      const decryptedUri = item.uri;
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

  // Formata ms para mm:ss
  const formatAudioTime = (ms: number) => {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleToggleAudio = async () => {
    if (!zoomImgUri) return;
    try {
      if (sound) {
        // Toggle play/pause no som existente
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }
      // Primeira vez: cria o som e configura canal de áudio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: zoomImgUri },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      setAudioPosition(0);
      // Atualiza barra de progresso em tempo real
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded) {
          setAudioPosition(status.positionMillis || 0);
          setAudioDuration(status.durationMillis || 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setAudioPosition(0);
          }
        }
      });
    } catch (err) {
      Alert.alert('Erro', 'Falha ao reproduzir áudio.');
    }
  };

  // Mantidos por compatibilidade com código antigo
  const playAudio = handleToggleAudio;
  const pauseAudio = handleToggleAudio;

  const handleCloseZoom = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (e) {}
      setSound(null);
    }
    setIsPlaying(false);
    setAudioPosition(0);
    setAudioDuration(0);
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
    const isProtected = await SecureStore.getItemAsync(`file_pwd_enabled_${item.name}`) === 'true';
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
    const correctPwd = await SecureStore.getItemAsync(`file_pwd_${pwdTargetFile.name}`);
    const matches = correctPwd === pwdInput;
    if (matches) {
      setPwdModalVisible(false);
      loadZoomFile(pwdTargetFile, pwdInput);
    } else {
      Alert.alert("Erro", "Senha incorreta.");
      setPwdInput('');
    }
  };

  const handleOpenSetPassword = (fileName: string) => {
    setSetPwdTargetUri(fileName);
    setNewFilePwd('');
    setEncryptModalVisible(true);
  };

  const handleEncryptFileWithPassword = async () => {
    if (newFilePwd.trim() === '') {
      Alert.alert("Aviso", "Digite uma senha para proteger o arquivo.");
      return;
    }
    try {
      await SecureStore.setItemAsync(`file_pwd_enabled_${setPwdTargetUri}`, 'true');
      await SecureStore.setItemAsync(`file_pwd_${setPwdTargetUri}`, newFilePwd);
      const success = true;
      if (success) {
        Alert.alert("Sucesso", "Arquivo criptografado com senha customizada!");
        setEncryptModalVisible(false);
        setIsZoomFileEncrypted(true);
        loadFiles();
      } else {
        Alert.alert("Erro", "Falha ao criptografar arquivo.");
      }
    } catch (e) {
      Alert.alert("Erro", "Erro ao processar arquivo.");
    }
  };

  const handleDecryptFile = async () => {
    if (!zoomFile) return;
    Alert.alert(
      "Remover Criptografia",
      "Tem certeza que deseja remover a senha deste arquivo? Ele ficará acessível sem senha.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover Senha",
          style: "destructive",
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync(`file_pwd_enabled_${zoomFile.name}`);
              await SecureStore.deleteItemAsync(`file_pwd_${zoomFile.name}`);
              setIsZoomFileEncrypted(false);
              Alert.alert("Sucesso", "Senha removida! O arquivo agora está acessível normalmente.");
              loadFiles();
            } catch (e) {
              Alert.alert("Erro", "Não foi possível remover a criptografia.");
            }
          }
        }
      ]
    );
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

  const handleDeleteFileInZoom = async (fileId: string) => {
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
            await moveToTrash(fileId, isDecoy);
            setZoomModalVisible(false);
            loadFiles();
          } 
        }
      ]
    );
  };

  const handleAddMedia = () => {
    Alert.alert(
      "Adicionar Arquivos",
      "O que você deseja adicionar ao cofre?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Fotos / Vídeos", onPress: openImagePicker },
        { text: "Áudios / Documentos", onPress: openDocumentPicker }
      ]
    );
  };

  const openImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Precisamos de permissão para acessar suas fotos.');
      return;
    }

    (global as any).ignoreNextBackground = true;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 1,
    });
    setTimeout(() => { (global as any).ignoreNextBackground = false; }, 1000);

    if (!result.canceled && result.assets) {
      setUploading(true);
      const total = result.assets.length;
      for (let i = 0; i < total; i++) {
        setUploadProgress(Math.round((i / total) * 100));
        const asset = result.assets[i];
        await importToAlbum(asset.uri, albumName, isDecoy, asset.fileName || null);
      }
      setUploadProgress(100);
      loadFiles();
      setTimeout(() => { 
        setUploading(false); 
        setUploadProgress(0); 

        // Perguntar sobre exclusão
        Alert.alert(
          "Sincronização Cloud Concluída",
          "Arquivos criptografados e salvos com sucesso na nuvem.\n\nDeseja excluir os arquivos originais do seu aparelho para liberar espaço e garantir sua privacidade?",
          [
            { text: "Manter no aparelho", style: "cancel" },
            {
              text: "Excluir originais",
              style: "destructive",
              onPress: async () => {
                try {
                  const assetIds = result.assets.map(a => a.assetId).filter(Boolean) as string[];
                  if (assetIds.length > 0) {
                    await MediaLibrary.deleteAssetsAsync(assetIds);
                    Alert.alert("Sucesso", "Arquivos originais excluídos.");
                  } else {
                    Alert.alert("Aviso", "Não foi possível localizar os arquivos na galeria para exclusão automática. Você pode apagá-los manualmente.");
                  }
                } catch (e) {
                  console.warn("Erro ao deletar arquivos originais:", e);
                }
              }
            }
          ]
        );
      }, 500);
    }
  };

  const openDocumentPicker = async () => {
    try {
      (global as any).ignoreNextBackground = true;
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Permite todos os arquivos (documentos e áudios)
        multiple: true,
        copyToCacheDirectory: false
      });
      setTimeout(() => { (global as any).ignoreNextBackground = false; }, 1000);

      if (!result.canceled && result.assets) {
        setUploading(true);
        const total = result.assets.length;
        for (let i = 0; i < total; i++) {
          setUploadProgress(Math.round((i / total) * 100));
          await importToAlbum(result.assets[i].uri, albumName, isDecoy, result.assets[i].name || result.assets[i].fileName);
        }
        setUploadProgress(100);
        loadFiles();
        setTimeout(() => { setUploading(false); setUploadProgress(0); }, 500);
      }
    } catch (e) {
      console.warn("Error picking document:", e);
      setTimeout(() => { (global as any).ignoreNextBackground = false; }, 1000);
    }
  };

  const handleFileLongPress = useCallback((fileId: string) => {
    Alert.alert(
      "Opções do Arquivo",
      "O que deseja fazer com esta foto/vídeo?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Exportar para Galeria",
          onPress: async () => {
             const { exportFromVault } = await import('@/src/services/VaultService');
             (global as any).ignoreNextBackground = true;
             const success = await exportFromVault(fileId);
             setTimeout(() => { (global as any).ignoreNextBackground = false; }, 1000);
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
                         await moveFileBetweenAlbums(fileId, destAlbum.trim(), isDecoy);
                         loadFiles();
                       }
                     } 
                   }
                 ]
               );
             } else {
               setMoveTargetUri(fileId);
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
            await moveToTrash(fileId, isDecoy);
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
      onLongPress={() => handleFileLongPress(item.id)}
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
              style={[styles.modalInput, { backgroundColor: theme.surfaceHighlight || 'rgba(0,0,0,0.05)', color: theme.text, borderColor: theme.border }]}
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
              style={[styles.modalInput, { backgroundColor: theme.surfaceHighlight || 'rgba(0,0,0,0.05)', color: theme.text, borderColor: theme.border }]}
              value={newFilePwd}
              onChangeText={setNewFilePwd}
              placeholder="Nova senha"
              placeholderTextColor={theme.textSecondary || "#888"}
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
              // Detecção robusta — regex lida com Firebase URLs (?token=...)
              const uriForDetect = zoomImgUri || zoomFile?.name || '';
              const isAudio = /\.(mp3|wav|m4a|caf|aac|3gp)(\?|$)/i.test(uriForDetect)
                           || (zoomFile?.ext && ['mp3','wav','m4a','caf','aac','3gp'].includes(zoomFile.ext.replace('.','').toLowerCase()));
              const isVideo = !isAudio && (/\.(mp4|mov|m4v|avi|mkv)(\?|$)/i.test(uriForDetect)
                           || (zoomFile?.ext && ['mp4','mov','m4v','avi','mkv'].includes(zoomFile.ext.replace('.','').toLowerCase())));
              const isDocument = !isAudio && !isVideo && (/\.(pdf|doc|docx|xls|xlsx|txt|csv|rtf)(\?|$)/i.test(uriForDetect)
                           || (zoomFile?.ext && ['pdf','doc','docx','xls','xlsx','txt','csv','rtf'].includes(zoomFile.ext.replace('.','').toLowerCase())));

              if (isAudio) {
                return (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingHorizontal: 30 }}>
                    {/* Ícone animado */}
                    <View style={{ width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 32, shadowColor: '#FFD700', shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 }}>
                      <Ionicons name={isPlaying ? 'volume-high' : 'mic'} size={48} color="#FFD700" />
                    </View>

                    <Text style={{ color: '#FFF', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, marginBottom: 6, textAlign: 'center' }}>Player de Áudio Seguro</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 36, textAlign: 'center' }} numberOfLines={1}>{zoomFile?.name}</Text>

                    {/* Barra de progresso */}
                    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Inter_400Regular', width: 38 }}>{formatAudioTime(audioPosition)}</Text>
                      <View style={{ flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, marginHorizontal: 8, overflow: 'hidden' }}>
                        <View style={{ width: `${audioDuration ? (audioPosition / audioDuration) * 100 : 0}%`, height: '100%', backgroundColor: '#FFD700', borderRadius: 2 }} />
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Inter_400Regular', width: 38, textAlign: 'right' }}>{formatAudioTime(audioDuration)}</Text>
                    </View>

                    {/* Botão play/pause */}
                    <TouchableOpacity
                      onPress={handleToggleAudio}
                      style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', marginTop: 20, shadowColor: '#FFD700', shadowOpacity: 0.6, shadowRadius: 18, elevation: 8 }}
                    >
                      <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#000" style={{ marginLeft: isPlaying ? 0 : 4 }} />
                    </TouchableOpacity>
                  </View>
                );
              }

              if (isVideo) {
                return (
                  <CustomVideoPlayer uri={zoomImgUri} />
                );
              }

              if (isDocument) {
                return (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingHorizontal: 30 }}>
                    <View style={{ width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: '#00D0FF', backgroundColor: 'rgba(0, 208, 255, 0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 32, shadowColor: '#00D0FF', shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 }}>
                      <Ionicons name="document-text" size={48} color="#00D0FF" />
                    </View>
                    <Text style={{ color: '#FFF', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, marginBottom: 6, textAlign: 'center' }}>Visualizador de Documentos</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 36, textAlign: 'center' }} numberOfLines={1}>{zoomFile?.name}</Text>
                    
                    <TouchableOpacity
                      onPress={() => Linking.openURL(zoomImgUri)}
                      style={{ paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, backgroundColor: '#00D0FF', justifyContent: 'center', alignItems: 'center', shadowColor: '#00D0FF', shadowOpacity: 0.5, shadowRadius: 10, elevation: 6 }}
                    >
                      <Text style={{ color: '#000', fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>Abrir / Baixar Documento</Text>
                    </TouchableOpacity>
                  </View>
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
                onPress={isZoomFileEncrypted ? handleDecryptFile : () => handleOpenSetPassword(zoomFile.name)}
              >
                <Ionicons 
                  name={isZoomFileEncrypted ? "lock-open-outline" : "lock-closed-outline"} 
                  size={24} 
                  color={isZoomFileEncrypted ? '#FF9500' : theme.tint} 
                />
                <Text style={[styles.zoomOptionText, { color: isZoomFileEncrypted ? '#FF9500' : theme.tint }]}>
                  {isZoomFileEncrypted ? 'Descriptografar' : 'Criptografar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.zoomOptionButton} 
                onPress={() => handleDeleteFileInZoom(zoomFile.id)}
              >
                <Ionicons name="trash-outline" size={24} color="#FF4D4D" />
                <Text style={[styles.zoomOptionText, { color: '#FF4D4D' }]}>Deletar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal de Carregamento/Criptografia */}
      <Modal visible={uploading} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={{ color: theme.tint, marginTop: 20, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center' }}>
            CRIPTOGRAFANDO
          </Text>
          <Text style={{ color: '#FFF', marginTop: 10, fontSize: 16 }}>{uploadProgress}% concluído</Text>
          
          <View style={{ width: '80%', height: 6, backgroundColor: '#333', borderRadius: 3, marginTop: 20, overflow: 'hidden' }}>
            <View style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: theme.tint, borderRadius: 3 }} />
          </View>
          
          <Text style={{ color: '#888', marginTop: 15, fontSize: 12, textAlign: 'center' }}>
            Não feche o aplicativo enquanto os arquivos estão sendo salvos com segurança de nível militar no cofre.
          </Text>
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
