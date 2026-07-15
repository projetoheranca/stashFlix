import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { Palettes, ThemePalette } from '@/constants/theme';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/src/services/FirebaseConfig';

type ColorSchemeType = 'light' | 'dark' | 'system';

export interface CustomThemeColors {
  text: string;
  background: string;
  surface: string;
  tint: string;
}

interface AppContextProps {
  themeColor: string;
  setThemeColor: (color: string) => void;
  colorSchemeMode: ColorSchemeType;
  setColorSchemeMode: (mode: ColorSchemeType) => void;
  activePalette: ThemePalette;
  isFakeVault: boolean;
  setFakeVault: (isFake: boolean) => void;
  disguiseMode: 'none' | 'calculator' | 'crash' | 'browser';
  setDisguiseMode: (mode: 'none' | 'calculator' | 'crash' | 'browser') => void;
  customThemeColors: CustomThemeColors | null;
  setCustomThemeColors: (colors: CustomThemeColors) => void;
  userPlan: string;
  setUserPlan: (plan: string) => void;
}

const AppContext = createContext<AppContextProps>({
  themeColor: 'red',
  setThemeColor: () => {},
  colorSchemeMode: 'system',
  setColorSchemeMode: () => {},
  activePalette: Palettes.dark.red,
  isFakeVault: false,
  setFakeVault: () => {},
  disguiseMode: 'none',
  setDisguiseMode: () => {},
  customThemeColors: null,
  setCustomThemeColors: () => {},
  userPlan: 'FREE',
  setUserPlan: () => {},
});

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeColor, setThemeState] = useState<string>('red');
  const [colorSchemeMode, setColorSchemeState] = useState<ColorSchemeType>('system');
  const [isFakeVault, setFakeVault] = useState(false);
  const [disguiseMode, setDisguiseModeState] = useState<'none' | 'calculator' | 'crash' | 'browser'>('none');
  const [userPlan, setUserPlanState] = useState<string>('FREE');
  
  // Custom theme colors for each theme mode
  const [customColorsSystem, setCustomColorsSystem] = useState<CustomThemeColors>({
    text: '#FFFFFF',
    background: '#030000',
    surface: '#0A0000',
    tint: '#FF0033'
  });
  const [customColorsDark, setCustomColorsDark] = useState<CustomThemeColors>({
    text: '#FFFFFF',
    background: '#030000',
    surface: '#0A0000',
    tint: '#FF0033'
  });
  const [customColorsLight, setCustomColorsLight] = useState<CustomThemeColors>({
    text: '#111827',
    background: '#FFFFFF',
    surface: '#F3F4F6',
    tint: '#FF0033'
  });

  const systemColorScheme = useSystemColorScheme() ?? 'dark';

  useEffect(() => {
    const loadSettings = async () => {
      const savedTheme = await SecureStore.getItemAsync('app_theme');
      if (savedTheme) setThemeState(savedTheme);

      const savedScheme = await SecureStore.getItemAsync('app_color_scheme');
      if (savedScheme === 'light' || savedScheme === 'dark' || savedScheme === 'system') {
        setColorSchemeState(savedScheme as ColorSchemeType);
      }

      const savedDisguise = await SecureStore.getItemAsync('disguise_mode');
      if (savedDisguise === 'calculator' || savedDisguise === 'crash' || savedDisguise === 'browser') {
        setDisguiseModeState(savedDisguise);
      }

      const savedPlan = await SecureStore.getItemAsync('user_plan');
      if (savedPlan) setUserPlanState(savedPlan);

      // Sincroniza silenciosamente o status com o backend
      import('@/src/services/ApiService').then(async ({ registerDevice, cleanLegacyPlanField }) => {
        const user = await registerDevice();
        if (user && user.plan) {
          setUserPlanState(user.plan);
        }
        // Remove o campo 'plan' legado do Firebase (campo antigo, não mais usado)
        await cleanLegacyPlanField();
      }).catch(() => {});

      // Load custom colors for system theme mode
      const savedSystem = await SecureStore.getItemAsync('custom_theme_colors_system');
      if (savedSystem) {
        try { setCustomColorsSystem(JSON.parse(savedSystem)); } catch (e) {}
      }

      // Load custom colors for dark theme mode
      const savedDark = await SecureStore.getItemAsync('custom_theme_colors_dark');
      if (savedDark) {
        try { setCustomColorsDark(JSON.parse(savedDark)); } catch (e) {}
      }

      // Load custom colors for light theme mode
      const savedLight = await SecureStore.getItemAsync('custom_theme_colors_light');
      if (savedLight) {
        try { setCustomColorsLight(JSON.parse(savedLight)); } catch (e) {}
      }

      // Fallback/backwards compatibility for the old single storage key
      if (!savedSystem && !savedDark && !savedLight) {
        const savedCustomOld = await SecureStore.getItemAsync('custom_theme_colors');
        if (savedCustomOld) {
          try {
            const parsedOld = JSON.parse(savedCustomOld);
            setCustomColorsSystem(parsedOld);
            setCustomColorsDark(parsedOld);
            setCustomColorsLight(parsedOld);
            await SecureStore.setItemAsync('custom_theme_colors_system', savedCustomOld);
            await SecureStore.setItemAsync('custom_theme_colors_dark', savedCustomOld);
            await SecureStore.setItemAsync('custom_theme_colors_light', savedCustomOld);
          } catch (e) {}
        }
      }
    };
    loadSettings();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const { loadSettingsFromCloud } = await import('@/src/services/FirebaseDB');
          const prefs = await loadSettingsFromCloud();
          if (prefs) {
            if (prefs.app_theme) setThemeState(prefs.app_theme);
            if (prefs.app_color_scheme) setColorSchemeState(prefs.app_color_scheme);
            if (prefs.disguise_mode) setDisguiseModeState(prefs.disguise_mode);
            
            let finalPlan = prefs.user_plan || 'FREE';

            // ── Validação Real de Assinatura com RevenueCat ──
            try {
              const Constants = (await import('expo-constants')).default;
              const isExpoGo = Constants.appOwnership === 'expo';
              
              if (!isExpoGo) {
                const Purchases = (await import('react-native-purchases')).default;
                // Vincula o RevenueCat ao UID do Firebase (cross-device sync)
                await Purchases.logIn(user.uid);
                const customerInfo = await Purchases.getCustomerInfo();
                
                // Verifica se a assinatura está ativa na Apple/Google (ULTRA > PRO > FREE)
                const isUltra = typeof customerInfo.entitlements.active['StashFlix Ultra'] !== "undefined" || 
                              typeof customerInfo.entitlements.active['ultra'] !== "undefined";
                              
                const isPro = typeof customerInfo.entitlements.active['StashFlix Pro'] !== "undefined" || 
                              typeof customerInfo.entitlements.active['pro'] !== "undefined";
                              
                finalPlan = isUltra ? 'ULTRA' : isPro ? 'PRO' : 'FREE';
                
                // Se a nuvem estiver desatualizada em relação à loja, forçamos a sincronização imediata
                if (finalPlan !== prefs.user_plan) {
                  await SecureStore.setItemAsync('user_plan', finalPlan);
                  const { syncSettingsToCloud } = await import('@/src/services/FirebaseDB');
                  await syncSettingsToCloud();
                }
              }
            } catch (rcError) {
              console.warn("Erro ao validar assinatura real no RevenueCat:", rcError);
            }

            setUserPlanState(finalPlan);
          }
        } catch (e) {
          console.warn("Erro ao carregar dados do usuário no AppContext", e);
        }
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const setThemeColor = async (color: string) => {
    setThemeState(color);
    await SecureStore.setItemAsync('app_theme', color);
    try {
      const { syncSettingsToCloud } = await import('@/src/services/FirebaseDB');
      await syncSettingsToCloud();
    } catch (e) {}
  };

  const setColorSchemeMode = async (mode: ColorSchemeType) => {
    setColorSchemeState(mode);
    await SecureStore.setItemAsync('app_color_scheme', mode);
    try {
      const { syncSettingsToCloud } = await import('@/src/services/FirebaseDB');
      await syncSettingsToCloud();
    } catch (e) {}
  };

  const setDisguiseMode = async (mode: 'none' | 'calculator' | 'crash' | 'browser') => {
    setDisguiseModeState(mode);
    await SecureStore.setItemAsync('disguise_mode', mode);
    try {
      const { syncSettingsToCloud } = await import('@/src/services/FirebaseDB');
      await syncSettingsToCloud();
    } catch (e) {}
  };

  const setUserPlan = async (plan: string) => {
    setUserPlanState(plan);
    await SecureStore.setItemAsync('user_plan', plan);
    try {
      const { syncSettingsToCloud } = await import('@/src/services/FirebaseDB');
      await syncSettingsToCloud();
    } catch (e) {}
  };

  const setCustomThemeColors = async (colors: CustomThemeColors) => {
    if (colorSchemeMode === 'system') {
      setCustomColorsSystem(colors);
      await SecureStore.setItemAsync('custom_theme_colors_system', JSON.stringify(colors));
    } else if (colorSchemeMode === 'dark') {
      setCustomColorsDark(colors);
      await SecureStore.setItemAsync('custom_theme_colors_dark', JSON.stringify(colors));
    } else {
      setCustomColorsLight(colors);
      await SecureStore.setItemAsync('custom_theme_colors_light', JSON.stringify(colors));
    }
  };

  const customThemeColors = 
    colorSchemeMode === 'system' ? customColorsSystem :
    colorSchemeMode === 'dark' ? customColorsDark :
    customColorsLight;

  const activeScheme = colorSchemeMode === 'system' ? systemColorScheme : colorSchemeMode;
  const modePalettes = Palettes[activeScheme as keyof typeof Palettes] || Palettes.dark;
  
  let currentPalette = modePalettes[themeColor as keyof typeof modePalettes] || modePalettes.red;
  
  if (themeColor === 'custom' && customThemeColors) {
    currentPalette = {
      ...currentPalette,
      background: customThemeColors.background,
      surface: customThemeColors.surface,
      surfaceHighlight: customThemeColors.surface, // fallback
      text: customThemeColors.text,
      textSecondary: customThemeColors.text, // fallback
      tint: customThemeColors.tint,
      gradientStart: customThemeColors.tint,
      gradientEnd: customThemeColors.background,
      border: customThemeColors.surface,
    };
  }

  return (
    <AppContext.Provider value={{
      themeColor,
      setThemeColor,
      colorSchemeMode,
      setColorSchemeMode,
      activePalette: currentPalette,
      isFakeVault,
      setFakeVault,
      disguiseMode,
      setDisguiseMode,
      customThemeColors,
      setCustomThemeColors,
      userPlan,
      setUserPlan
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
