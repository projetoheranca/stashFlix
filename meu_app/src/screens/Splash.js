import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { useTheme } from '../context/ThemeContext';

export default function Splash({ navigation }) {
  const { theme } = useTheme();

  useEffect(() => {
    async function checkState() {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const hasPin = await SecureStore.getItemAsync('user_pin');
      const disguise = await SecureStore.getItemAsync('use_disguise');
      
      if (hasPin) {
        if (disguise === 'true') {
          navigation.replace('CalculatorScreen');
        } else {
          navigation.replace('LockScreen');
        }
      } else {
        navigation.replace('CreatePin');
      }
    }
    checkState();
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Cofre Seguro</Text>
      <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold' },
});
