import * as ExpoSecureStore from 'expo-secure-store';
import { auth } from './FirebaseConfig';

const getPrefix = () => {
  return auth.currentUser ? `${auth.currentUser.uid}_` : 'guest_';
};

export const setItemAsync = async (key: string, value: string) => {
  // Ignora o prefixo para chaves globais (se houver no futuro)
  if (key === 'device_id') {
    return ExpoSecureStore.setItemAsync(key, value);
  }
  return ExpoSecureStore.setItemAsync(getPrefix() + key, value);
};

export const getItemAsync = async (key: string) => {
  if (key === 'device_id') {
    return ExpoSecureStore.getItemAsync(key);
  }
  
  const prefixedKey = getPrefix() + key;
  let val = await ExpoSecureStore.getItemAsync(prefixedKey);
  
  // Migration Fallback: Se não achou com prefixo, tenta achar o antigo global
  if (val === null) {
    val = await ExpoSecureStore.getItemAsync(key);
    if (val !== null) {
      // Salva no novo formato para as próximas vezes
      await ExpoSecureStore.setItemAsync(prefixedKey, val);
    }
  }
  
  return val;
};

export const deleteItemAsync = async (key: string) => {
  if (key === 'device_id') {
    return ExpoSecureStore.deleteItemAsync(key);
  }
  return ExpoSecureStore.deleteItemAsync(getPrefix() + key);
};
