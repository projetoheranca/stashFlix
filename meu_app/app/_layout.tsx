import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, BackHandler, Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Purchases from 'react-native-purchases';
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

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // User is not logged in, but trying to access a secure screen
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      // User is logged in, but trying to access login/register
      router.replace('/');
    }
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
        // 👇👇👇 COLE SUA CHAVE DO REVENUECAT AQUI 👇👇👇
        const rcApiKey = process.env.EXPO_PUBLIC_RC_API_KEY || 'COLOQUE_A_CHAVE_AQUI'; 
        
        if (rcApiKey !== 'COLOQUE_A_CHAVE_AQUI') {
          Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
          if (Platform.OS === 'ios') {
            Purchases.configure({ apiKey: rcApiKey });
          } else if (Platform.OS === 'android') {
            Purchases.configure({ apiKey: rcApiKey });
          }
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

      const hasOnboarded = await SecureStore.getItemAsync('has_onboarded');
      if (hasOnboarded === 'true') {
        setIsLocked(true); // Bloqueio ativado na inicialização
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
            await SecureStore.deleteItemAsync('has_onboarded');
            try {
              const FileSystem = await import('expo-file-system/legacy');
              await FileSystem.deleteAsync(FileSystem.documentDirectory + 'SQLite', { idempotent: true });
            } catch (err) {}
          }
        }
      }
    };
    initApp();

    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/active/) &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        // App went to background
        const hasOnboarded = await SecureStore.getItemAsync('has_onboarded');
        if (hasOnboarded === 'true') {
          setIsLocked(true); // Bloqueio background ativado
        }

        const ghostMode = await SecureStore.getItemAsync('ghost_mode_enabled');
        if (ghostMode === 'true') {
          try {
            BackHandler.exitApp();
          } catch (e) {
            // ignorado
          }
        }
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
          SecureStore.getItemAsync('has_onboarded').then(onboarded => {
            if (onboarded === 'true') {
              setIsLocked(true);
            }
          });
        }
      });
    }).catch(e => {});

    return () => {
      subscription.remove();
      if (accelSubscription) {
        accelSubscription.remove();
      }
    };
  }, []);

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
        <LockScreen visible={isLocked} onUnlocked={() => setIsLocked(false)} />
        <CustomAlertModal />
      </ThemeProvider>
    </AppProvider>
  );
}
