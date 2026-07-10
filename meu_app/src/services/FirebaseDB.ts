import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from './FirebaseConfig';
import * as SecureStore from 'expo-secure-store';

export const saveUserPreferences = async (userId: string, preferences: any) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { preferences }, { merge: true });
  } catch (error) {
    console.warn("Erro ao salvar preferências no Firebase", error);
  }
};

export const getUserData = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.warn("Erro ao carregar dados do usuário", error);
  }
  return null;
};

export const syncSettingsToCloud = async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const keys = [
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
      'user_plan'
    ];

    const preferences: any = {};
    for (const key of keys) {
      const val = await SecureStore.getItemAsync(key);
      if (val !== null) {
        preferences[key] = val;
      }
    }

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { preferences }, { merge: true });
  } catch (error) {
    console.warn("Erro ao sincronizar configurações com a nuvem:", error);
  }
};

export const loadSettingsFromCloud = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.preferences) {
        for (const [key, val] of Object.entries(data.preferences)) {
          if (val !== null && typeof val === 'string') {
            await SecureStore.setItemAsync(key, val);
          }
        }
        return data.preferences;
      }
    }
  } catch (error) {
    console.warn("Erro ao carregar configurações da nuvem:", error);
  }
  return null;
};
