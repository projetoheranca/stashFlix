import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

export default function Index() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const hasOnboarded = await SecureStore.getItemAsync('has_onboarded');
        // Pequeno atraso para não piscar a tela
        setTimeout(() => {
          if (hasOnboarded === 'true') {
            router.replace('/(drawer)');
          } else {
            router.replace('/onboarding');
          }
        }, 500);
      } catch (e) {
        router.replace('/onboarding');
      }
    }
    checkOnboarding();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
