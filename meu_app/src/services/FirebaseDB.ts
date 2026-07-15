import { ref, get, update } from 'firebase/database';
import { rtdb, auth } from './FirebaseConfig';
import * as SecureStore from '@/src/services/SecureStoreManager';

// ─── Chaves que o app usa localmente (snake_case) ────────────────────────────
const PREF_KEYS = [
  'app_theme',
  'app_color_scheme',
  'disguise_mode',
  'breakin_alerts',
  'ghost_mode_enabled',
  'spy_mic_enabled',
  'wifi_only',
  'block_prints_enabled',
  'auto_destruct_days',
  'lock_style',
  'disguise_keyword',
  'user_pin',
  'fake_pin',
  'kamikaze_pin',
  'user_plan',
  'cloud_sync_enabled',
  'anti_invasion_activated_at',
];

// Firebase às vezes tem chaves em camelCase vindas de versões antigas.
// Mapeamos para o padrão snake_case do app.
const FIREBASE_ALIAS: Record<string, string> = {
  disguiseMode: 'disguise_mode',
  userPlan: 'user_plan',
  userPin: 'user_pin',
  fakePin: 'fake_pin',
  kamikazePin: 'kamikaze_pin',
};

export const saveUserPreferences = async (userId: string, preferences: any) => {
  try {
    const userRef = ref(rtdb, `users/${userId}/preferences`);
    await update(userRef, preferences);
  } catch (error) {
    console.warn('Erro ao salvar preferências no Firebase', error);
  }
};

export const getUserData = async (userId: string) => {
  try {
    const userRef = ref(rtdb, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) return snapshot.val();
  } catch (error) {
    console.warn('Erro ao carregar dados do usuário', error);
  }
  return null;
};

// ─── Sobe o SecureStore local para o Firebase ─────────────────────────────────
export const syncSettingsToCloud = async () => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const preferences: Record<string, string | null> = {};
    for (const key of PREF_KEYS) {
      const val = await SecureStore.getItemAsync(key);
      preferences[key] = val ?? null;
    }
    const prefRef = ref(rtdb, `users/${user.uid}/preferences`);
    await update(prefRef, preferences);
  } catch (error) {
    console.warn('Erro ao sincronizar configurações com a nuvem:', error);
  }
};

// ─── Baixa o Firebase para o SecureStore local ────────────────────────────────
// REGRA: só SOBRESCREVE se o valor existir no Firebase.
// NUNCA apaga uma chave local só porque ela não está na nuvem.
// Isso evita que o user_pin seja deletado quando o campo ainda não foi sincronizado.
export const loadSettingsFromCloud = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const prefRef = ref(rtdb, `users/${user.uid}/preferences`);
    const snapshot = await get(prefRef);
    if (!snapshot.exists()) return null;

    const data = snapshot.val() as Record<string, any>;

    // Normaliza aliases camelCase para snake_case
    for (const [alias, canonical] of Object.entries(FIREBASE_ALIAS)) {
      if (data[alias] !== undefined && data[canonical] === undefined) {
        data[canonical] = data[alias];
      }
    }

    for (const key of PREF_KEYS) {
      const val = data[key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        // Só grava se o Firebase tiver um valor real
        await SecureStore.setItemAsync(key, String(val));
      }
      // Se não existir no Firebase, MANTÉM o valor local — não apaga.
    }
    return data;
  } catch (error) {
    console.warn('Erro ao carregar configurações da nuvem:', error);
  }
  return null;
};
