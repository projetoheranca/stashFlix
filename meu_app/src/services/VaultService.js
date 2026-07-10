/* eslint-disable import/namespace */
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as MediaLibrary from 'expo-media-library';

const VAULT_DIR = FileSystem.documentDirectory + 'SecureVault/';
const DECOY_DIR = FileSystem.documentDirectory + 'DecoyVault/';

const getBaseDir = (isDecoy) => (isDecoy ? DECOY_DIR : VAULT_DIR);

export const initVault = async (isDecoy = false) => {
  const dir = getBaseDir(isDecoy);
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  // Garantir que o diretório principal de mídia exista
  const mainInfo = await FileSystem.getInfoAsync(dir + 'Main/');
  if (!mainInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir + 'Main/', { intermediates: true });
  }

  // Garantir que a lixeira exista
  const trashInfo = await FileSystem.getInfoAsync(dir + 'Trash/');
  if (!trashInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir + 'Trash/', { intermediates: true });
  }
};

export const getAlbums = async (isDecoy = false) => {
  await initVault(isDecoy);
  const dir = getBaseDir(isDecoy);
  const items = await FileSystem.readDirectoryAsync(dir);
  
  const albums = [];
  for (const item of items) {
    if (item === 'Trash') continue; // Esconde a lixeira da galeria principal
    const info = await FileSystem.getInfoAsync(dir + item);
    if (info.isDirectory) {
      // Find the first _thumb file for preview
      let previewUri = null;
      try {
        const files = await FileSystem.readDirectoryAsync(dir + item);
        const thumbFile = files.find(f => f.endsWith('_thumb'));
        
        if (thumbFile) {
          const fileContent = await FileSystem.readAsStringAsync(dir + item + '/' + thumbFile, { encoding: FileSystem.EncodingType.UTF8 });
          const decryptedBase64 = fileContent.split('').reverse().join('');
          previewUri = `data:image/jpeg;base64,${decryptedBase64}`;
        }
      } catch (e) {
      }
      
      albums.push({ id: item, name: item, previewUri });
    }
  }
  return albums;
};

export const createAlbum = async (albumName, isDecoy = false) => {
  await initVault(isDecoy);
  const dir = getBaseDir(isDecoy);
  const albumPath = dir + albumName + '/';
  const info = await FileSystem.getInfoAsync(albumPath);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(albumPath, { intermediates: true });
  }
};

const generateSecureFilename = async (originalUri) => {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    originalUri + Date.now().toString()
  );
  // Transformando a extensão em .svault para ocultar do sistema operacional e visualizadores padrão
  return `${hash}.svault`;
};

export const importToAlbum = async (sourceUri, albumName = 'Main', isDecoy = false) => {
  await initVault(isDecoy);
  const dir = getBaseDir(isDecoy);
  
  // Garantir que a pasta do álbum existe antes de mover/gravar arquivos
  const albumDir = dir + albumName + '/';
  try {
    const albumDirInfo = await FileSystem.getInfoAsync(albumDir);
    if (!albumDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(albumDir, { intermediates: true });
    }
  } catch (err) {
    console.warn("Folder check/creation failed, forcing directory creation:", err);
    await FileSystem.makeDirectoryAsync(albumDir, { intermediates: true });
  }
  
  const secureFilename = await generateSecureFilename(sourceUri);
  const destUri = albumDir + secureFilename;
  
  // VERIFICAÇÃO DE PESO PARA EVITAR OOM (Out of Memory)
  const fileInfo = await FileSystem.getInfoAsync(sourceUri);
  const isHeavy = fileInfo.size > 10 * 1024 * 1024; // > 10MB
  
  // Geração da miniatura super leve (_thumb)
  let thumbBase64 = "";
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const manipResult = await ImageManipulator.manipulateAsync(sourceUri, [{ resize: { width: 150 } }], { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG });
    thumbBase64 = await FileSystem.readAsStringAsync(manipResult.uri, { encoding: FileSystem.EncodingType.Base64 });
  } catch (e) {
    // Falhou ao gerar miniatura (provavelmente vídeo longo ou não suportado), vamos criar um pequeno thumb vazio
    thumbBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; // pixel transparente fallback
  }
  
  // Salva o _thumb ofuscado
  const obfuscatedThumb = thumbBase64.split('').reverse().join('');
  await FileSystem.writeAsStringAsync(destUri + '_thumb', obfuscatedThumb, { encoding: FileSystem.EncodingType.UTF8 });

  if (isHeavy) {
    throw new Error("Arquivos maiores que 10MB não são suportados com criptografia segura na versão atual para evitar estouro de memória.");
  } else {
    // FASE 9: Criptografia AES-256 Real para arquivos leves
    try {
      const QuickCrypto = await import('react-native-quick-crypto');
      const userPin = await SecureStore.getItemAsync('user_pin') || 'default';
      
      const fileBase64 = await FileSystem.readAsStringAsync(sourceUri, { encoding: FileSystem.EncodingType.Base64 });
      const key = QuickCrypto.createHash('sha256').update(String(userPin)).digest();
      const iv = QuickCrypto.randomBytes(16);
      
      const cipher = QuickCrypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(fileBase64, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const finalPayload = iv.toString('hex') + ':' + encrypted;
      await FileSystem.writeAsStringAsync(destUri, finalPayload, { encoding: FileSystem.EncodingType.UTF8 });
    } catch (err) {
      throw new Error("Módulo de criptografia indisponível. Salvamento abortado por segurança.");
    }
  }
  
  // Salvar a extensão original em metadados (para recuperar depois)
  const extension = sourceUri.split('.').pop();
  await SecureStore.setItemAsync(`meta_${secureFilename}`, extension || 'jpg');
  
  return destUri;
};

export const getAlbumFiles = async (albumName = 'Main', isDecoy = false) => {
  const dir = getBaseDir(isDecoy);
  const albumPath = dir + albumName + '/';
  const info = await FileSystem.getInfoAsync(albumPath);
  if (!info.exists) return [];

  const files = await FileSystem.readDirectoryAsync(albumPath);
  
  // Retorna apenas os arquivos principais, com suas respectivas miniaturas
  const mainFiles = files.filter(f => !f.endsWith('_thumb'));
  
  return mainFiles.map(file => ({
    id: file,
    uri: albumPath + file,
    thumbUri: files.includes(file + '_thumb') ? albumPath + file + '_thumb' : null,
    name: file
  }));
};

export const exportFromVault = async (vaultUri) => {
  try {
    const fileName = vaultUri.split('/').pop();
    const isHeavy = await SecureStore.getItemAsync(`is_heavy_${fileName}`);
    const tempUri = FileSystem.cacheDirectory + 'temp_export.jpg';
    
    if (isHeavy === 'true') {
      // É um arquivo pesado movido em bypass, então não descriptografamos
      await FileSystem.copyAsync({ from: vaultUri, to: tempUri });
    } else {
      const fileContent = await FileSystem.readAsStringAsync(vaultUri, { encoding: FileSystem.EncodingType.UTF8 });
      let decryptedBase64 = '';
      
      if (fileContent.includes(':')) {
         const parts = fileContent.split(':');
         const ivHex = parts[0];
         const encrypted = parts[1];
         const QuickCrypto = await import('react-native-quick-crypto');
         const userPin = await SecureStore.getItemAsync('user_pin') || 'default';
         const key = QuickCrypto.createHash('sha256').update(String(userPin)).digest();
         const iv = QuickCrypto.Buffer.from(ivHex, 'hex');
         const decipher = QuickCrypto.createDecipheriv('aes-256-cbc', key, iv);
         decryptedBase64 = decipher.update(encrypted, 'base64', 'utf8');
         decryptedBase64 += decipher.final('utf8');
      } else {
         decryptedBase64 = fileContent.split('').reverse().join('');
      }

      await FileSystem.writeAsStringAsync(tempUri, decryptedBase64, { encoding: FileSystem.EncodingType.Base64 });
    }
    
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
       await MediaLibrary.saveToLibraryAsync(tempUri);
    }
    
    await FileSystem.deleteAsync(tempUri);
    await FileSystem.deleteAsync(vaultUri);
    await FileSystem.deleteAsync(vaultUri + '_thumb', { idempotent: true });
    return true;
  } catch(e) {
    return false;
  }
};

export const renameAlbum = async (oldName, newName, isDecoy = false) => {
  const dir = getBaseDir(isDecoy);
  const oldPath = dir + oldName + '/';
  const newPath = dir + newName + '/';
  await FileSystem.moveAsync({ from: oldPath, to: newPath });
  
  const pwd = await SecureStore.getItemAsync(`pwd_false_${oldName}`);
  if (pwd) {
     await SecureStore.setItemAsync(`pwd_false_${newName}`, pwd);
     await SecureStore.deleteItemAsync(`pwd_false_${oldName}`);
  }
};

export const deleteAlbum = async (albumName, isDecoy = false) => {
  const dir = getBaseDir(isDecoy);
  const albumPath = dir + albumName + '/';
  await FileSystem.deleteAsync(albumPath, { idempotent: true });
  await SecureStore.deleteItemAsync(`pwd_false_${albumName}`);
};

export const moveFileBetweenAlbums = async (fileUri, destAlbum, isDecoy = false) => {
  const dir = getBaseDir(isDecoy);
  const fileName = fileUri.split('/').pop();
  const destUri = dir + destAlbum + '/' + fileName;
  await FileSystem.moveAsync({ from: fileUri, to: destUri });
  return destUri;
};

// --- FASE 3: LIXEIRA INTELIGENTE ---
export const moveToTrash = async (vaultUri, isDecoy = false) => {
  await initVault(isDecoy);
  const dir = getBaseDir(isDecoy);
  const fileName = vaultUri.split('/').pop();
  const trashUri = dir + 'Trash/' + fileName;
  
  // Salvar a localização original para restauração
  await SecureStore.setItemAsync(`trash_origin_${fileName}`, vaultUri);
  await FileSystem.moveAsync({ from: vaultUri, to: trashUri });
  return true;
};

export const getTrashFiles = async (isDecoy = false) => {
  const dir = getBaseDir(isDecoy);
  const trashPath = dir + 'Trash/';
  const info = await FileSystem.getInfoAsync(trashPath);
  if (!info.exists) return [];

  const files = await FileSystem.readDirectoryAsync(trashPath);
  return files.map(file => ({
    id: file,
    uri: trashPath + file,
    name: file
  }));
};

export const restoreFromTrash = async (trashUri, isDecoy = false) => {
  const fileName = trashUri.split('/').pop();
  const originUri = await SecureStore.getItemAsync(`trash_origin_${fileName}`);
  
  if (originUri) {
    await FileSystem.moveAsync({ from: trashUri, to: originUri });
    await SecureStore.deleteItemAsync(`trash_origin_${fileName}`);
    return true;
  }
  return false;
};

export const emptyTrash = async (isDecoy = false) => {
  const dir = getBaseDir(isDecoy);
  const trashPath = dir + 'Trash/';
  await FileSystem.deleteAsync(trashPath);
  await initVault(isDecoy); // Recria a pasta Trash vazia
  return true;
};

// --- CATALOG DE NUVEM & ENGENHARIA DE CUSTOS ---
import * as ImageManipulator from 'expo-image-manipulator';
import { getPresignedUrl, uploadDirectToCloud } from './ApiService';

export const getCloudCatalog = async (isDecoy = false) => {
  const dir = getBaseDir(isDecoy);
  const catalogPath = dir + 'cloud_catalog.json';
  try {
    const info = await FileSystem.getInfoAsync(catalogPath);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(catalogPath);
      return JSON.parse(content);
    }
  } catch (e) {
  }
  return [];
};

export const markFileAsSynced = async (fileName, albumName, extension, isDecoy = false) => {
  const dir = getBaseDir(isDecoy);
  const catalogPath = dir + 'cloud_catalog.json';
  let catalog = [];
  try {
    catalog = await getCloudCatalog(isDecoy);
  } catch (e) {}
  
  if (!catalog.some(item => item.name === fileName)) {
    catalog.push({
      id: fileName,
      name: fileName,
      album: albumName,
      extension: extension,
      syncedAt: new Date().toISOString()
    });
    try {
      await FileSystem.writeAsStringAsync(catalogPath, JSON.stringify(catalog), { encoding: FileSystem.EncodingType.UTF8 });
    } catch (e) {
    }
  }
};

export const uploadFileToCloud = async (fileUri, fileName, albumName, isDecoy = false) => {
  try {
    const ext = fileUri.split('.').pop() || 'jpg';
    let manipUri = fileUri;
    
    if (['jpg', 'jpeg', 'png'].includes(ext.toLowerCase())) {
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          fileUri,
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        manipUri = manipResult.uri;
      } catch (e) {}
    }
    
    const authData = await getPresignedUrl(fileName + '.' + ext);
    if (authData && authData.presigned_url) {
      const success = await uploadDirectToCloud(authData.presigned_url, manipUri);
      if (success) {
        await markFileAsSynced(fileName, albumName, ext, isDecoy);
        return true;
      }
    }
  } catch (error) {
  }
  return false;
};

export const syncVaultToCloud = async (isDecoy = false) => {
  const albums = await getAlbums(isDecoy);
  let totalUploaded = 0;

  for (const album of albums) {
    const files = await getAlbumFiles(album.name, isDecoy);
    
    for (const file of files) {
      try {
        const success = await uploadFileToCloud(file.uri, file.name, album.name, isDecoy);
        if (success) {
          totalUploaded++;
        }
      } catch (error) {
      }
    }
  }
  return totalUploaded;
};

// --- FASE 6: PERFORMANCE E SEGURANÇA ---
export const cleanCache = async () => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const files = await FileSystem.readDirectoryAsync(cacheDir);
    for (const file of files) {
      const filePath = cacheDir + file;
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.isDirectory) {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }
    }
  } catch (error) {
  }
};

export const nukeRealVault = async () => {
  try {
    await FileSystem.deleteAsync(VAULT_DIR, { idempotent: true });
    await cleanCache();
  } catch (error) {
  }
};

export const nukeVault = async () => {
  try {
    await FileSystem.deleteAsync(VAULT_DIR, { idempotent: true });
    await FileSystem.deleteAsync(DECOY_DIR, { idempotent: true });
    await cleanCache();
  } catch (error) {
  }
};

// --- ARQUIVOS PROTEGIDOS POR SENHA ---
export const isFilePasswordProtected = async (fileName) => {
  try {
    const val = await SecureStore.getItemAsync(`file_pwd_enabled_${fileName}`);
    return val === 'true';
  } catch (e) {
    return false;
  }
};

export const verifyFilePassword = async (fileName, password) => {
  try {
    const isProtected = await SecureStore.getItemAsync(`file_pwd_enabled_${fileName}`);
    if (isProtected !== 'true') return true;
    
    let passwordHash;
    try {
      const QuickCrypto = await import('react-native-quick-crypto');
      passwordHash = QuickCrypto.createHash('sha256').update(String(password)).digest('hex');
    } catch (e) {
      // Fallback usando expo-crypto
      passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        String(password)
      );
    }
    
    const savedHash = await SecureStore.getItemAsync(`file_pwd_hash_${fileName}`);
    return passwordHash === savedHash;
  } catch (e) {
    return false;
  }
};

export const decryptFile = async (vaultUri, customPassword = null) => {
  try {
    const fileName = vaultUri.split('/').pop();
    const isHeavy = await SecureStore.getItemAsync(`is_heavy_${fileName}`);
    const tempUri = FileSystem.cacheDirectory + 'view_temp_' + fileName;
    
    const extension = await SecureStore.getItemAsync(`meta_${fileName}`) || 'jpg';
    const tempFileUri = tempUri + '.' + extension;
    
    if (isHeavy === 'true') {
      await FileSystem.copyAsync({ from: vaultUri, to: tempFileUri });
      return tempFileUri;
    }
    
    const fileContent = await FileSystem.readAsStringAsync(vaultUri, { encoding: FileSystem.EncodingType.UTF8 });
    let decryptedBase64 = '';
    
    if (fileContent.startsWith('fallback_pwd_enc:')) {
      const payload = fileContent.substring('fallback_pwd_enc:'.length);
      decryptedBase64 = payload.split('').reverse().join('');
    } else if (fileContent.includes(':')) {
      const parts = fileContent.split(':');
      const ivHex = parts[0];
      const encrypted = parts[1];
      
      try {
        const QuickCrypto = await import('react-native-quick-crypto');
        let decryptionKey = customPassword;
        if (!decryptionKey) {
          decryptionKey = await SecureStore.getItemAsync('user_pin') || 'default';
        }
        
        const key = QuickCrypto.createHash('sha256').update(String(decryptionKey)).digest();
        const iv = QuickCrypto.Buffer.from(ivHex, 'hex');
        const decipher = QuickCrypto.createDecipheriv('aes-256-cbc', key, iv);
        decryptedBase64 = decipher.update(encrypted, 'base64', 'utf8');
        decryptedBase64 += decipher.final('utf8');
      } catch (cryptoErr) {
        decryptedBase64 = fileContent.split('').reverse().join('');
      }
    } else {
      decryptedBase64 = fileContent.split('').reverse().join('');
    }
    
    await FileSystem.writeAsStringAsync(tempFileUri, decryptedBase64, { encoding: FileSystem.EncodingType.Base64 });
    return tempFileUri;
  } catch (e) {
    return null;
  }
};

export const encryptFileWithPassword = async (vaultUri, newPassword) => {
  try {
    const fileName = vaultUri.split('/').pop();
    const fileContent = await FileSystem.readAsStringAsync(vaultUri, { encoding: FileSystem.EncodingType.UTF8 });
    let rawBase64 = '';
    
    // 1. Decodificar o estado atual do arquivo
    if (fileContent.startsWith('fallback_pwd_enc:')) {
      const payload = fileContent.substring('fallback_pwd_enc:'.length);
      rawBase64 = payload.split('').reverse().join('');
    } else if (fileContent.includes(':')) {
      const parts = fileContent.split(':');
      const ivHex = parts[0];
      const encrypted = parts[1];
      
      try {
        const QuickCrypto = await import('react-native-quick-crypto');
        const userPin = await SecureStore.getItemAsync('user_pin') || 'default';
        const key = QuickCrypto.createHash('sha256').update(String(userPin)).digest();
        const iv = QuickCrypto.Buffer.from(ivHex, 'hex');
        const decipher = QuickCrypto.createDecipheriv('aes-256-cbc', key, iv);
        rawBase64 = decipher.update(encrypted, 'base64', 'utf8');
        rawBase64 += decipher.final('utf8');
      } catch (cryptoErr) {
        rawBase64 = fileContent.split('').reverse().join('');
      }
    } else {
      rawBase64 = fileContent.split('').reverse().join('');
    }
    
    // 2. Criptografar o arquivo com a nova senha
    let finalPayload = '';
    let passwordHash = '';
    
    try {
      const QuickCrypto = await import('react-native-quick-crypto');
      const key = QuickCrypto.createHash('sha256').update(String(newPassword)).digest();
      const iv = QuickCrypto.randomBytes(16);
      const cipher = QuickCrypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(rawBase64, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      finalPayload = iv.toString('hex') + ':' + encrypted;
      passwordHash = QuickCrypto.createHash('sha256').update(String(newPassword)).digest('hex');
    } catch (cryptoErr) {
      throw new Error("Módulo nativo indisponível para alterar senha. Ação abortada.");
    }
    
    // 3. Salvar payload e metadados no SecureStore
    await FileSystem.writeAsStringAsync(vaultUri, finalPayload, { encoding: FileSystem.EncodingType.UTF8 });
    await SecureStore.setItemAsync(`file_pwd_enabled_${fileName}`, 'true');
    await SecureStore.setItemAsync(`file_pwd_hash_${fileName}`, passwordHash);
    return true;
  } catch (e) {
    return false;
  }
};
