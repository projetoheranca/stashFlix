import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, BackHandler, Alert, Platform } from 'react-native';
import * as SecureStore from '@/src/services/SecureStoreManager';
import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';
import { useFonts, SpaceGrotesk_700Bold, SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenCapture from 'expo-screen-capture';
import 'react-native-reanimated';
import { triggerCustomAlert } from '@/src/services/CustomAlertService';
import { CustomAlertModal } from '@/components/CustomAlertModal';

// Patch global Alert.alert
Alert.alert = (title, message, buttons) => {
  triggerCustomAlert(title || '', message || '', buttons);
};

import { useColorScheme } from '@/hooks/use-color-scheme';
import LockScreen from '@/components/LockScreen';

SplashScreen.preventAutoHideAsync();
// Proteção Anti-Print configurável
(async () => {
  try {
    const blockPrints = await SecureStore.getItemAsync('block_prints_enabled');
    if (blockPrints === 'true') {
      await ScreenCapture.preventScreenCaptureAsync();
    } else {
      await ScreenCapture.allowScreenCaptureAsync();
    }
  } catch (e) {
  }
})();

import { AppProvider } from '@/src/contexts/AppContext';
import { useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/src/services/FirebaseConfig';

export const unstable_settings = {
  anchor: '(drawer)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const appState = useRef(AppState.currentState);
  const hasPinRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setAuthInitialized(true);
    });
    return subscriber; // unsubscribe on unmount
  }, []);

  useEffect(() => {
    if (!authInitialized) return;

    const checkRouting = async () => {
      const inAuthGroup = segments[0] === 'auth';
      
      if (!user) {
        if (!inAuthGroup) {
          router.replace('/auth/login');
        }
      } else {
        // 🔑 Sincronização bidirecional de PIN/configs com o Firebase
        // 1) Baixa do Firebase (pode preencher user_pin se ainda não está local)
        // 2) Sobe o que está local e não está na nuvem (resolve a primeira vez)
        try {
          const { loadSettingsFromCloud, syncSettingsToCloud } = await import('@/src/services/FirebaseDB');
          await loadSettingsFromCloud();
          // Aguarda um tick para o SecureStore salvar, depois sobe o que está local
          await syncSettingsToCloud();
        } catch {}

        const userPin = await SecureStore.getItemAsync('user_pin');
        const hasPin = userPin !== null && userPin !== undefined && userPin.length > 0;
        hasPinRef.current = hasPin;

        if (!hasPin) {
          if (segments[0] !== 'onboarding' && segments[0] !== 'permissions' && segments[0] !== 'setup-pin' && segments[0] !== 'confirm-pin') {
            router.replace('/onboarding');
          }
        } else {
          if (inAuthGroup || segments[0] === 'onboarding' || segments[0] === 'permissions' || segments[0] === 'setup-pin' || segments[0] === 'confirm-pin') {
            router.replace('/(drawer)');
          }
        }
      }
    };
    checkRouting();
  }, [user, authInitialized, segments]);

  useEffect(() => {
    if (fontsLoaded && authInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authInitialized]);

  useEffect(() => {
    // Check initial lock state and register device
    const initApp = async () => {
      // Registrar no backend silently
      import('@/src/services/ApiService').then(({ registerDevice }) => {
        registerDevice();
      });

      // INICIALIZAÇÃO REVENUECAT (PAGAMENTOS IAP)
      try {
        const rcApiKey = process.env.EXPO_PUBLIC_RC_API_KEY || 'test_YoCvUoOzlomcOLuoCPqTvMCQWbV'; 
        
        // Verifica se estamos no Expo Go. O RevenueCat precisa de código nativo para rodar.
        const isExpoGo = Constants.appOwnership === 'expo';
        
        if (rcApiKey !== 'COLOQUE_A_CHAVE_AQUI' && !isExpoGo) {
          Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
          if (Platform.OS === 'ios') {
            Purchases.configure({ apiKey: rcApiKey });
          } else if (Platform.OS === 'android') {
            Purchases.configure({ apiKey: rcApiKey });
          }
        } else if (isExpoGo) {
          console.warn("⚠️ Rodando no Expo Go: RevenueCat nativo desativado para evitar crash.");
        }
      } catch (e) {
        console.warn('RevenueCat init error', e);
      }

      // Configura a proteção de print (ScreenCapture) conforme a escolha do usuário
      const blockPrints = await SecureStore.getItemAsync('block_prints_enabled');
      try {
        if (blockPrints === 'true') {
          await ScreenCapture.preventScreenCaptureAsync();
        } else {
          await ScreenCapture.allowScreenCaptureAsync();
        }
      } catch (e) {}

      // Só trava na inicialização SE tiver usuário logado E tiver PIN
      if (user) {
        const userPin = await SecureStore.getItemAsync('user_pin');
        if (userPin !== null && userPin !== undefined && userPin.length > 0) {
          setIsLocked(true); // Bloqueio ativado na inicialização
        }
      }

      // 🚨 Protocolo Dead Man's Switch (Autodestruição)
      const destructDays = await SecureStore.getItemAsync('auto_destruct_days');
      if (destructDays) {
        const lastLoginStr = await SecureStore.getItemAsync('last_login_timestamp');
        if (lastLoginStr) {
          const lastLogin = new Date(lastLoginStr).getTime();
          const now = Date.now();
          const daysPassed = (now - lastLogin) / (1000 * 60 * 60 * 24);
          
          if (daysPassed > parseInt(destructDays)) {
            await SecureStore.deleteItemAsync('user_pin');
            try {
              const FileSystem = await import('expo-file-system/legacy');
              await FileSystem.deleteAsync(FileSystem.documentDirectory + 'SQLite', { idempotent: true });
            } catch (err) {}
          }
        }
      }
    };
    initApp();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Quando o app VOLTA para o primeiro plano (active)
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if ((global as any).ignoreNextBackground) {
          (global as any).ignoreNextBackground = false;
        } else {
          if (user) {
            SecureStore.getItemAsync('user_pin').then(userPin => {
              if (userPin !== null && userPin !== undefined && userPin.length > 0) {
                setIsLocked(true); // Trava a tela ao voltar pro app
              }
            });
          }
        }
      }

      // Quando o app VAI para segundo plano (background)
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // Nada a fazer aqui no momento
      }

      appState.current = nextAppState;
    });

    // 🚨 Shake-to-Lock (Sensor de Pânico)
    let accelSubscription: any;
    import('expo-sensors').then(({ Accelerometer }) => {
      Accelerometer.setUpdateInterval(400);
      accelSubscription = Accelerometer.addListener(accelerometerData => {
        const { x, y, z } = accelerometerData;
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        if (acceleration > 2.5) { // Limiar de força g
          if (user) {
            SecureStore.getItemAsync('user_pin').then(userPin => {
              if (userPin !== null && userPin !== undefined && userPin.length > 0) {
                setIsLocked(true);
              }
            });
          }
        }
      });
    }).catch(e => {});

    return () => {
      subscription.remove();
      if (accelSubscription) {
        accelSubscription.remove();
      }
    };
  }, [user]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          <Stack.Screen name="album/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="permissions" />
          <Stack.Screen name="setup-pin" />
          <Stack.Screen name="confirm-pin" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="disguise" options={{ presentation: 'modal' }} />
          <Stack.Screen name="decoy" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="auto" />
        <LockScreen visible={isLocked && user !== null} onUnlocked={() => setIsLocked(false)} />
        <CustomAlertModal />
      </ThemeProvider>
    </AppProvider>
  );
}
