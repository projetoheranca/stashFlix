import * as SecureStore from '@/src/services/SecureStoreManager';
import { auth, rtdb, storage } from './FirebaseConfig';
import { ref, get, set, update, remove } from 'firebase/database';
import { ref as storageRef, deleteObject, listAll } from 'firebase/storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { uploadDirectToCloud, uploadThumbToCloud } from './ApiService';

const FREE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB
const PRO_LIMIT_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
const ULTRA_LIMIT_BYTES = 100 * 1024 * 1024 * 1024; // 100 GB
const FREE_FILE_LIMIT = 50;

export const getVaultStats = async (isDecoy = false) => {
  if (!auth.currentUser) return { bytes: 0, count: 0 };
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  const snapshot = await get(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}`));
  let totalBytes = 0;
  let count = 0;
  if (snapshot.exists()) {
    Object.values(snapshot.val()).forEach((f: any) => {
      totalBytes += f.sizeBytes || 0;
      count += 1;
    });
  }
  return { bytes: totalBytes, count };
};

export const getCloudTelemetry = async () => {
  if (!auth.currentUser) return { main: { count: 0, bytes: 0 }, decoy: { count: 0, bytes: 0 }, trash: { count: 0, bytes: 0 }, intruders: { count: 0, bytes: 0 } };
  const uid = auth.currentUser.uid;
  const mainSnap = await get(ref(rtdb, `users/${uid}/vault_files`));
  const decoySnap = await get(ref(rtdb, `users/${uid}/decoy_files`));
  
  let stats = {
    main: { count: 0, bytes: 0 },
    decoy: { count: 0, bytes: 0 },
    trash: { count: 0, bytes: 0 },
    intruders: { count: 0, bytes: 0 }
  };

  const processSnap = (snap: any, isDecoy: boolean) => {
    if (snap.exists()) {
      Object.values(snap.val()).forEach((f: any) => {
        if (f.trash) {
          stats.trash.count += 1;
          stats.trash.bytes += f.sizeBytes || 0;
        } else if (f.intruder) {
          stats.intruders.count += 1;
          stats.intruders.bytes += f.sizeBytes || 0;
        } else if (isDecoy) {
          stats.decoy.count += 1;
          stats.decoy.bytes += f.sizeBytes || 0;
        } else {
          stats.main.count += 1;
          stats.main.bytes += f.sizeBytes || 0;
        }
      });
    }
  };

  processSnap(mainSnap, false);
  processSnap(decoySnap, true);
  return stats;
};

export const checkStorageQuota = async (fileSize: number) => {
  const plan = await SecureStore.getItemAsync('user_plan') || 'FREE';
  const limitBytes = plan === 'ULTRA' ? ULTRA_LIMIT_BYTES : plan === 'PRO' ? PRO_LIMIT_BYTES : FREE_LIMIT_BYTES;
  
  const mainStats = await getVaultStats(false);
  const decoyStats = await getVaultStats(true);
  
  const usedBytes = mainStats.bytes + decoyStats.bytes;
  const usedCount = mainStats.count + decoyStats.count;
  
  if (plan === 'FREE' && (usedCount >= FREE_FILE_LIMIT)) {
    throw new Error(`Limite de ${FREE_FILE_LIMIT} arquivos atingido para o plano FREE. Assine o PRO ou ULTRA para armazenamento ilimitado.`);
  }
  
  if (usedBytes + fileSize > limitBytes) {
    const limitGB = plan === 'ULTRA' ? 100 : plan === 'PRO' ? 10 : 1;
    throw new Error(`Limite de armazenamento de ${limitGB}GB excedido. Realize um upgrade do plano.`);
  }
};

export const getAlbums = async (isDecoy = false) => {
  if (!auth.currentUser) return [];
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  const snapshot = await get(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}`));
  
  const albumsMap = new Map();
  
  if (snapshot.exists()) {
    const files = snapshot.val();
    for (const key in files) {
      const file = files[key];
      if (file.trash) continue;
      const albumName = file.albumName || 'Principal';
      if (!albumsMap.has(albumName)) {
        albumsMap.set(albumName, { id: albumName, name: albumName, previewUri: null, previewFileName: null, fileCount: 0 });
      }
      const album = albumsMap.get(albumName);
      
      // Se não for dummy, conta como arquivo real e pode ser preview
      if (!file.isDummy) {
        album.fileCount++;
        if (!album.previewUri && file.downloadUrl) {
          album.previewUri = file.downloadUrl;
          album.previewFileName = file.fileName || key;
        }
      }
    }
  }
  
  if (albumsMap.size === 0) {
    albumsMap.set('Principal', { id: 'Principal', name: 'Principal', previewUri: null, previewFileName: null, fileCount: 0 });
  }
  
  return Array.from(albumsMap.values());
};

export const createAlbum = async (albumName: string, isDecoy = false) => {
  if (!auth.currentUser) return false;
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  const dummyId = `_folder_${albumName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  
  await set(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}/${dummyId}`), {
    albumName,
    fileName: '_folder_marker',
    isDummy: true
  });
  return true; 
};

export const generateSecureFilename = async (originalUri: string) => {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, originalUri + Date.now().toString());
  return `${hash}.svault`;
};

export const importToAlbum = async (sourceUri: string, albumName = 'Principal', isDecoy = false, originalName: string | null = null) => {
  if (!auth.currentUser) return null;
  const fileInfo = await FileSystem.getInfoAsync(sourceUri);
  const fileSize = fileInfo.size || 0;
  
  await checkStorageQuota(fileSize);
  
  const secureFilename = await generateSecureFilename(sourceUri);
  let ext = '';
  if (originalName && originalName.includes('.')) {
    ext = '.' + originalName.split('.').pop()?.toLowerCase();
  } else if (sourceUri.includes('.')) {
    ext = '.' + sourceUri.split('.').pop()?.toLowerCase();
  }
  
  let thumbUrl = null;
  if (ext && ['mp4', 'mov', 'm4v', 'avi', 'mkv'].includes(ext.replace('.', ''))) {
    let tempVideoPath = '';
    try {
      const VideoThumbnails = await import('expo-video-thumbnails');
      
      // Copy to local temp file to avoid content:// URI issues
      tempVideoPath = FileSystem.cacheDirectory + 'temp_thumb_gen_' + Date.now() + ext;
      await FileSystem.copyAsync({ from: sourceUri, to: tempVideoPath });
      
      const { uri: thumbLocalUri } = await VideoThumbnails.getThumbnailAsync(tempVideoPath, { time: 1500 });
      const thumbFilename = secureFilename.replace('.svault', '_thumb.jpg');
      thumbUrl = await uploadThumbToCloud(thumbFilename, thumbLocalUri);
    } catch (e) {
      console.warn("Error generating/uploading thumbnail", e);
    } finally {
      if (tempVideoPath) {
        try { await FileSystem.deleteAsync(tempVideoPath, { idempotent: true }); } catch (err) {}
      }
    }
  }

  const success = await uploadDirectToCloud(secureFilename, sourceUri, albumName, isDecoy, fileSize, ext, thumbUrl);
  if (!success) throw new Error("Upload failed");
  
  return secureFilename;
};

export const getAlbumFiles = async (albumName = 'Principal', isDecoy = false) => {
  if (!auth.currentUser) return [];
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  const snapshot = await get(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}`));
  
  const files = [];
  if (snapshot.exists()) {
    const data = snapshot.val();
    for (const key in data) {
      if (data[key].albumName === albumName && !data[key].trash && !data[key].isDummy) {
        files.push({
          id: key,
          uri: data[key].downloadUrl,
          thumbUri: data[key].thumbUrl || data[key].downloadUrl,
          name: data[key].fileName || key,
          sizeBytes: data[key].sizeBytes,
          ext: data[key].originalExt || null,
          hasThumb: !!data[key].thumbUrl
        });
      }
    }
  }
  return files;
};

export const renameAlbum = async (oldName: string, newName: string, isDecoy = false) => {
  if (!auth.currentUser) return;
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  const snapshot = await get(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}`));
  if (snapshot.exists()) {
    const files = snapshot.val();
    const updates: any = {};
    for (const key in files) {
      const currentAlbumName = files[key].albumName || 'Principal';
      if (currentAlbumName === oldName) {
        updates[`${key}/albumName`] = newName;
      }
    }
    await update(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}`), updates);
  }
};

export const deleteAlbum = async (albumName: string, isDecoy = false) => {
  if (!auth.currentUser) return;
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  const snapshot = await get(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}`));
  if (snapshot.exists()) {
    const files = snapshot.val();
    for (const key in files) {
      const currentAlbumName = files[key].albumName || 'Principal';
      if (currentAlbumName === albumName) {
         await set(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}/${key}`), null);
         const storageRefPath = `users/${auth.currentUser.uid}/vault/${key}`;
         try { await deleteObject(storageRef(storage, storageRefPath)); } catch(e){}
      }
    }
  }
};

export const deleteFileFromCloud = async (fileId: string, isDecoy = false) => {
  if (!auth.currentUser) return;
  let fileName = fileId;
  // Se for uma URL do Firebase Storage
  if (fileId.startsWith('http')) {
    const decodedUrl = decodeURIComponent(fileId.split('?')[0]); // Remove query params e decodifica %2F
    fileName = decodedUrl.split('/').pop() || fileId;
  } else {
    fileName = fileId.split('/').pop()?.split('?')[0] || fileId;
  }
  
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  
  // Apaga do RTDB
  const dbPath = `users/${auth.currentUser.uid}/${vaultType}/${fileName.replace(/\./g, '_')}`;
  await set(ref(rtdb, dbPath), null);

  // Apaga do Storage
  const storageRefPath = `users/${auth.currentUser.uid}/vault/${fileName}`;
  try { await deleteObject(storageRef(storage, storageRefPath)); } catch(e){}
};

export const moveFileBetweenAlbums = async (fileId: string, destAlbum: string, isDecoy = false) => {
  if (!auth.currentUser) return;
  
  const fileName = fileId.split('/').pop()?.split('?')[0]; 
  if (!fileName) return;
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  await update(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}/${fileName}`), {
    albumName: destAlbum
  });
  return true;
};

export const moveToTrash = async (fileId: string, isDecoy = false) => {
  if (!auth.currentUser) return;
  const fileName = fileId.split('/').pop()?.split('?')[0];
  if (!fileName) return;
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  await update(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}/${fileName}`), {
    trash: true
  });
  return true;
};

export const getTrashFiles = async (isDecoy = false) => {
  if (!auth.currentUser) return [];
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  const snapshot = await get(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}`));
  const files = [];
  if (snapshot.exists()) {
    const data = snapshot.val();
    for (const key in data) {
      if (data[key].trash) {
        files.push({ id: key, uri: data[key].downloadUrl, name: data[key].fileName || key });
      }
    }
  }
  return files;
};

export const restoreFromTrash = async (fileId: string, isDecoy = false) => {
  if (!auth.currentUser) return;
  const fileName = fileId.split('/').pop()?.split('?')[0];
  if (!fileName) return;
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  await update(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}/${fileName}`), {
    trash: null
  });
  return true;
};

export const emptyTrash = async (isDecoy = false) => {
  if (!auth.currentUser) return;
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  const snapshot = await get(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}`));
  if (snapshot.exists()) {
    const files = snapshot.val();
    for (const key in files) {
      if (files[key].trash) {
         await set(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}/${key}`), null);
         const storageRefPath = `users/${auth.currentUser.uid}/vault/${key}`;
         try { await deleteObject(storageRef(storage, storageRefPath)); } catch(e){}
      }
    }
  }
  return true;
};

export const exportFromVault = async (fileId: string, isDecoy = false) => {
  if (!auth.currentUser) return false;
  const fileName = fileId.split('/').pop()?.split('?')[0];
  if (!fileName) return false;
  const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
  const snapshot = await get(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}/${fileName}`));
  if (!snapshot.exists()) return false;
  
  const { downloadUrl } = snapshot.val();
  const tempUri = FileSystem.cacheDirectory + 'export_' + fileName + '.jpg';
  try {
    const { uri } = await FileSystem.downloadAsync(downloadUrl, tempUri);
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
       await MediaLibrary.saveToLibraryAsync(uri);
    }
    await FileSystem.deleteAsync(uri, { idempotent: true });
    
    await set(ref(rtdb, `users/${auth.currentUser.uid}/${vaultType}/${fileName}`), null);
    const storageRefPath = `users/${auth.currentUser.uid}/vault/${fileName}`;
    try { await deleteObject(storageRef(storage, storageRefPath)); } catch(e){}
    
    return true;
  } catch (e) {
    return false;
  }
};
export const initVault = async (isDecoy = false) => {};
export const cleanCache = async () => {};

// ─── KAMIKAZE: Apaga tudo do usuário e desloga ─────────────────────────────────
// Chamado quando o Kamikaze PIN é digitado na tela de bloqueio.
// 1. Deleta TODOS os dados do RTDB (vault_files, decoy_files, preferences)
// 2. Tenta deletar arquivos do Firebase Storage (best-effort)
// 3. Limpa SecureStore local e AsyncStorage
// 4. Faz signOut() — o _layout.tsx redireciona automaticamente para /auth/login
export const nukeRealVault = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const uid = user.uid;

    // ── Deleta nós do RTDB ──────────────────────────────────────────────────
    // Tenta apagar cada sub-nó separadamente para ser mais resiliente a falhas de rede
    const nodesToDelete = ['vault_files', 'decoy_files', 'preferences'];
    for (const node of nodesToDelete) {
      try { await remove(ref(rtdb, `users/${uid}/${node}`)); } catch {}
    }
    // Apaga o nó raiz do usuário inteiro
    try { await remove(ref(rtdb, `users/${uid}`)); } catch {}

    // ── Deleta arquivos do Firebase Storage ─────────────────────────────────
    try {
      const userStorageRef = storageRef(storage, `users/${uid}/vault`);
      const res = await listAll(userStorageRef);
      // Apaga todos os arquivos encontrados na pasta do cofre
      await Promise.all(res.items.map((itemRef) => deleteObject(itemRef).catch(() => {})));
    } catch (storageErr) {
      console.log('Erro ao limpar storage (pode estar vazio ou sem permissão)', storageErr);
    }

    // ── Limpa SecureStore local (todas as chaves do app) ────────────────────
    const keysToWipe = [
      'user_pin', 'fake_pin', 'kamikaze_pin', 'has_onboarded',
      'app_theme', 'app_color_scheme', 'disguise_mode', 'breakin_alerts',
      'ghost_mode_enabled', 'spy_mic_enabled', 'wifi_only', 'block_prints_enabled',
      'auto_destruct_days', 'lock_style', 'disguise_keyword', 'user_plan',
      'cloud_sync_enabled', 'anti_invasion_activated_at', 'alarm_siren_enabled',
      'alarm_siren_sound', 'intruder_video_duration', 'last_login_timestamp',
      'lock_bg_uri',
    ];
    for (const key of keysToWipe) {
      try { await SecureStore.deleteItemAsync(key); } catch {}
    }

    // ── Limpa AsyncStorage local ─────────────────────────────────────────────
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.clear();
    } catch {}

    // ── Desloga (o _layout.tsx detecta e redireciona para /auth/login) ────────
    await auth.signOut();

  } catch (e) {
    // Mesmo em caso de erro parcial, força o logout
    try { await auth.signOut(); } catch {}
  }
};

// Alias para compatibilidade
export const nukeVault = nukeRealVault;

export const syncVaultToCloud = async (isDecoy = false) => 0;
export const isFilePasswordProtected = async (fileId: string) => false;
export const verifyFilePassword = async (fileId: string, password: string) => true;
export const encryptFileWithPassword = async (fileId: string, newPassword: string) => true;
export const decryptFile = async (vaultUri: string, customPassword: any = null) => vaultUri;
export const markFileAsSynced = async () => {};
