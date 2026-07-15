import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from '@/src/services/SecureStoreManager';

export const ThemeContext = createContext();

export const lightTheme = {
  background: '#FFFFFF',
  text: '#000000',
  surface: '#F5F5F5',
  border: '#E0E0E0',
  primary: '#007BFF',
  keypadBg: '#F0F0F0',
  keypadText: '#333',
  dotBorder: '#CCC',
  isDark: false,
};

export const darkTheme = {
  background: '#121212',
  text: '#FFFFFF',
  surface: '#1E1E1E',
  border: '#333333',
  primary: '#007BFF',
  keypadBg: '#222',
  keypadText: '#FFF',
  dotBorder: '#555',
  isDark: true,
};

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
  const [lockStyle, setLockStyle] = useState('default'); // 'default', 'styled'
  const [useDisguise, setUseDisguise] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const savedTheme = await SecureStore.getItemAsync('theme_mode');
    if (savedTheme) setThemeMode(savedTheme);
    const savedLock = await SecureStore.getItemAsync('lock_style');
    if (savedLock) setLockStyle(savedLock);
    const savedDisguise = await SecureStore.getItemAsync('use_disguise');
    if (savedDisguise === 'true') setUseDisguise(true);
    setIsLoaded(true);
  };

  const updateTheme = async (mode) => {
    setThemeMode(mode);
    await SecureStore.setItemAsync('theme_mode', mode);
  };

  const updateLockStyle = async (style) => {
    setLockStyle(style);
    await SecureStore.setItemAsync('lock_style', style);
  };

  const updateDisguise = async (val) => {
    setUseDisguise(val);
    await SecureStore.setItemAsync('use_disguise', val ? 'true' : 'false');
  };

  const currentTheme = themeMode === 'system' 
    ? (systemScheme === 'dark' ? darkTheme : lightTheme)
    : (themeMode === 'dark' ? darkTheme : lightTheme);

  if (!isLoaded) return null; // Previne renderização antes das escolhas entrarem

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, themeMode, updateTheme, lockStyle, updateLockStyle, useDisguise, updateDisguise }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
