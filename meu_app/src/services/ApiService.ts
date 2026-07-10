import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL = 'http://192.168.0.5:8080/api'; // IP local da sua máquina para o Expo Go

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
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.user && data.user.plan) {
        await SecureStore.setItemAsync('user_plan', data.user.plan);
      }
      return { id: deviceId, status: 'registered', plan: data.user?.plan || 'FREE' };
    }
  } catch (error) {
    console.warn('Backend offline or error registering device:', error);
  }
  const plan = await SecureStore.getItemAsync('user_plan') || 'FREE';
  return { id: 'device_fallback', status: 'mock_registered', plan };
};

export const startTrial = async () => {
  try {
    const deviceId = await getOrCreateDeviceID();
    const response = await fetch(`${API_BASE_URL}/subscriptions/trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('API Error (Trial):', error);
    return null;
  }
};

export const upgradeToPro = async () => {
  try {
    const deviceId = await getOrCreateDeviceID();
    const response = await fetch(`${API_BASE_URL}/subscriptions/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.user && data.user.plan) {
        await SecureStore.setItemAsync('user_plan', data.user.plan);
      }
      return data.user;
    }
  } catch (error) {
    console.warn("Erro ao fazer upgrade", error);
  }
  return null;
};

// --- ENGENHARIA DE CUSTOS (FASE 8) ---
// Obtém a URL gerada pelo Go para fazer upload direto no S3/Cloudflare R2
export const getPresignedUrl = async (filename: string) => {
  try {
    const deviceId = await SecureStore.getItemAsync('device_id');
    const response = await fetch(`${API_BASE_URL}/storage/presigned-url?device_id=${deviceId}&filename=${filename}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn("Erro ao pedir Pre-Signed URL", error);
  }
  return null;
};

// Faz o bypass do servidor Go e joga a foto comprimida direto no balde da Nuvem
export const uploadDirectToCloud = async (uploadUrl: string, fileUri: string) => {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    // PUT HTTP Direto para Amazon / Cloudflare R2
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
    });
    
    return uploadRes.ok;
  } catch (error) {
    console.warn("Erro ao subir arquivo diretamente para a nuvem", error);
    return false;
  }
};
