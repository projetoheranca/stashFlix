import * as SecureStore from '@/src/services/SecureStoreManager';
import { Platform } from 'react-native';
import { auth, storage, rtdb } from './FirebaseConfig';
import { get, update, remove, ref as dbRef, set } from 'firebase/database';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const getOrCreateDeviceID = async () => {
  let deviceId = await SecureStore.getItemAsync('device_id');
  if (!deviceId) {
    deviceId = 'device_' + Date.now().toString() + '_' + Math.random().toString(36).substring(7);
    await SecureStore.setItemAsync('device_id', deviceId);
  }
  return deviceId;
};

export const registerDevice = async () => {
  try {
    const deviceId = await getOrCreateDeviceID();
    const user = auth.currentUser;
    
    if (user) {
      const userRef = dbRef(rtdb, `users/${user.uid}`);
      const snapshot = await get(userRef);
      let plan = 'FREE';
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.planTier === 'ultra') plan = 'ULTRA';
        else if (data.planTier === 'pro' || data.planTier === 'premium') plan = 'PRO';
        else if (data.planTier === 'trial') plan = 'TRIAL';
        // Nota: campo 'plan' legado removido — planTier é a fonte de verdade.
        // Se o usuário ainda tiver o campo antigo 'plan' no BD, removemos:
        if (data.plan !== undefined) {
          try {
            const { remove } = await import('firebase/database');
            await remove(dbRef(rtdb, `users/${user.uid}/plan`));
          } catch {}
        }
      } else {
        await update(userRef, { device_id: deviceId, planTier: 'free' });
      }
      
      await SecureStore.setItemAsync('user_plan', plan);
      return { id: deviceId, status: 'registered', plan };
    }
  } catch (error) {
    console.warn('Firebase offline or error registering device:', error);
  }
  const plan = await SecureStore.getItemAsync('user_plan') || 'FREE';
  return { id: 'device_fallback', status: 'mock_registered', plan };
};

export const startTrial = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      const userRef = dbRef(rtdb, `users/${user.uid}`);
      await update(userRef, { planTier: 'trial', trial_start: new Date().toISOString() });
      await SecureStore.setItemAsync('user_plan', 'TRIAL');
      return { success: true, plan: 'TRIAL' };
    }
  } catch (error) {
    console.warn('Firebase Error (Trial):', error);
  }
  return null;
};

export const updatePlanInDatabase = async (plan: 'FREE' | 'PRO' | 'ULTRA') => {
  try {
    const user = auth.currentUser;
    if (user) {
      const userRef = dbRef(rtdb, `users/${user.uid}`);
      await update(userRef, { planTier: plan.toLowerCase(), upgrade_date: new Date().toISOString() });
      await SecureStore.setItemAsync('user_plan', plan);
      // Garante remoção do campo legado 'plan' sempre que o plano for atualizado
      await cleanLegacyPlanField();
      return { plan };
    }
  } catch (error) {
    console.warn("Erro ao atualizar plano", error);
  }
  return null;
};

/**
 * Remove o campo legado 'plan' da raiz do usuário no Firebase RTDB.
 * Atualmente o app usa 'planTier' (raiz) + 'user_plan' (preferences).
 * O campo 'plan' era de uma versão anterior e não é mais usado.
 * Esta função é idempotente: não faz nada se o campo já não existir.
 */
export const cleanLegacyPlanField = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = dbRef(rtdb, `users/${user.uid}`);
    const snapshot = await get(userRef);
    if (snapshot.exists() && snapshot.val().plan !== undefined) {
      await remove(dbRef(rtdb, `users/${user.uid}/plan`));
      console.log('[ApiService] Campo legado "plan" removido do Firebase.');
    }
  } catch (e) {
    console.warn('[ApiService] Erro ao limpar campo plan legado:', e);
  }
};


// Faz o upload direto para o Firebase Storage e salva URL no RTDB
export const uploadDirectToCloud = async (
  filename: string, 
  fileUri: string, 
  albumName: string = 'default', 
  isDecoy: boolean = false, 
  sizeBytes: number = 0,
  originalExt: string = '',
  thumbUrl: string | null = null
) => {
  try {
    const user = auth.currentUser;
    if (!user) return false;
    
    const blob: Blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() { resolve(xhr.response); };
      xhr.onerror = function(e) { reject(new TypeError('Network request failed')); };
      xhr.responseType = 'blob';
      xhr.open('GET', fileUri, true);
      xhr.send(null);
    });
    
    const storageRef = ref(storage, `users/${user.uid}/vault/${filename}`);
    const snapshot = await uploadBytes(storageRef, blob);
    
    // Resgata o endereço URL oficial do Storage
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    const vaultType = isDecoy ? 'decoy_files' : 'vault_files';
    const safeFilename = filename.replace(/\./g, '_');
    const fileDbRef = dbRef(rtdb, `users/${user.uid}/${vaultType}/${safeFilename}`);
    
    await set(fileDbRef, {
      fileName: filename,
      downloadUrl: downloadURL,
      albumName: albumName,
      sizeBytes,
      originalExt,
      thumbUrl,
      uploadedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.warn("Erro ao subir arquivo diretamente para a nuvem", error);
    return false;
  }
};

export const uploadThumbToCloud = async (
  filename: string, 
  thumbUri: string
) => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    
    const blob: Blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() { resolve(xhr.response); };
      xhr.onerror = function(e) { reject(new TypeError('Network request failed')); };
      xhr.responseType = 'blob';
      xhr.open('GET', thumbUri, true);
      xhr.send(null);
    });
    
    const storageRef = ref(storage, `users/${user.uid}/vault/${filename}`);
    const snapshot = await uploadBytes(storageRef, blob);
    
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.warn("Erro ao subir thumbnail", error);
    return null;
  }
};

// Deletar conta e limpar dados (GDPR/Apple Guideline 5.1.1)
export const deleteUserAccount = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    // 1. Apagar documento no Realtime Database (ou marcar como deletado)
    const userRef = dbRef(rtdb, `users/${user.uid}`);
    try {
      await update(userRef, { status: 'deleted', planTier: 'free' });
    } catch(e) {}

    // 2. Apagar usuário no Auth
    await user.delete();
    return true;
  } catch (error) {
    console.error("Erro ao deletar conta", error);
    return false;
  }
};
