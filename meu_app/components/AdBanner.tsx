import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppContext } from '@/src/contexts/AppContext';
import { t } from "@/src/i18n";

export default function AdBanner() {
  const { userPlan } = useAppContext();

  // Apenas exibe anúncios no plano FREE
  if (userPlan !== 'FREE') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}> {t('anncio_admob_placeholder')} </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 50,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  text: {
    color: '#888',
    fontSize: 12,
  }
});
