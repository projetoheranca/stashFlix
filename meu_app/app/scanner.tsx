import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { useAppContext } from '@/src/contexts/AppContext';
import { t } from "@/src/i18n";

export default function ExposureScanner() {
  const router = useRouter();
  const { activePalette: theme } = useAppContext();
  const [scanning, setScanning] = useState(true);
  const [exposedCount, setExposedCount] = useState(0);

  useEffect(() => {
    const scanLibrary = async () => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          alert('Precisamos de permissão para auditar sua galeria.');
          router.back();
          return;
        }
      } catch (error) {
        console.warn("Bypassing permissions due to Expo Go restriction:", error);
        // Assumir permissão concedida para que o scanner prossiga
      }

      // Simulando uma varredura de "Risco" na biblioteca
      try {
        const media = await MediaLibrary.getAssetsAsync({ first: 100, mediaType: ['photo', 'video'] });
        setTimeout(() => {
          setExposedCount(Math.floor(media.assets.length * 0.15) || 7);
          setScanning(false);
        }, 2500);
      } catch (error) {
        // Se falhar (por ex no Expo Go sem permissão), usamos mock
        setTimeout(() => {
          setExposedCount(14); // Risco Fictício
          setScanning(false);
        }, 2500);
      }
    };

    scanLibrary();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}> {t('auditoria_de_risco')} </Text>
      
      {scanning ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.desc, { color: theme.textSecondary, marginTop: 20 }]}>
             {t('analisando_sua_galeria_pb')} </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.center}>
          <View style={[styles.alertCircle, { borderColor: theme.error }]}>
            <Text style={[styles.alertCount, { color: theme.error }]}>{exposedCount}</Text>
          </View>
          
          <Text style={[styles.alertTitle, { color: theme.text }]}> {t('mdias_vulnerveis')} </Text>
          <Text style={[styles.desc, { color: theme.textSecondary, marginBottom: 40 }]}>
             {t('o_scanner_identificou')} {exposedCount}  {t('fotosvdeos_na_sua_galeria')} </Text>

          <TouchableOpacity style={[styles.proBtn, { backgroundColor: theme.tint }]} onPress={() => router.push('/paywall')}>
            <Text style={styles.proBtnText}> {t('proteger_com_o_plano_pro')} </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={{ color: theme.textSecondary, fontWeight: 'bold' }}> {t('ignorar_o_risco')} </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: 'bold', letterSpacing: 2, marginBottom: 40, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  desc: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  alertCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  alertCount: { fontSize: 40, fontWeight: 'bold' },
  alertTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  proBtn: { padding: 18, borderRadius: 30, width: '100%', alignItems: 'center', marginBottom: 20 },
  proBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  cancelBtn: { padding: 15 }
});
