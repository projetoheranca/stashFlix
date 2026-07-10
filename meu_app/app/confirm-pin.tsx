import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAppContext } from '@/src/contexts/AppContext';

export default function ConfirmPinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const firstPin = params.firstPin as string;
  
  const { activePalette: theme } = useAppContext();
  const [pin, setPin] = useState('');

  const handlePress = (num: string) => {
    if (pin.length < 4) setPin(pin + num);
  };

  const handleNext = async () => {
    if (pin.length === 4) {
      if (pin === firstPin) {
        // Salva o PIN de forma segura
        await SecureStore.setItemAsync('user_pin', pin);
        // Envia para a nuvem em segundo plano
        import('@/src/services/FirebaseDB').then(({ syncSettingsToCloud }) => {
          syncSettingsToCloud().catch(() => {});
        }).catch(() => {});
        // A flag has_onboarded será salva na próxima tela
        
        Alert.alert(
          'EVENTO DE CRIAÇÃO: PIN DE ACESSO PRINCIPAL',
          'O seu código PIN de acesso principal foi registrado com sucesso no sistema local encriptado!',
          [
            { text: 'PROSSEGUIR', onPress: () => router.push('/recovery-email') }
          ]
        );
      } else {
        Alert.alert('Erro', 'Os PINs não coincidem. Tente novamente.');
        setPin('');
      }
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>CONFIRMAR PIN</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        DIGITE O PIN NOVAMENTE PARA CONFIRMAR
      </Text>
      
      <View style={styles.display}>
        {[0, 1, 2, 3].map((i) => {
          const isFilled = pin.length > i;
          return (
            <View key={i} style={[
              styles.dot, 
              { borderColor: isFilled ? theme.tint : theme.border }, 
              isFilled && { 
                backgroundColor: theme.tint,
                shadowColor: theme.tint,
                shadowOpacity: 0.8,
                shadowRadius: 8,
                elevation: 5
              }
            ]} />
          );
        })}
      </View>

      <View style={styles.keypad}>
        {['1','2','3','4','5','6','7','8','9','','0','<'].map((key, i) => (
          <TouchableOpacity 
            key={i} 
            style={[
              styles.keyGeometricWrapper, 
              key === '' && styles.keyEmpty,
              key === '<' && styles.keyDeleteWrapper
            ]} 
            onPress={() => {
              if (key === '<') handleDelete();
              else if (key !== '') handlePress(key);
            }}
            disabled={key === ''}
            activeOpacity={0.6}
          >
            <View style={[
              styles.keyGeometricInner,
              { borderColor: theme.border, backgroundColor: theme.surface },
              key === '<' && { backgroundColor: theme.surfaceHighlight }
            ]}>
              <Text style={[styles.keyText, styles.textStraight, { color: key === '<' ? theme.error || '#FF0033' : theme.text }]}>
                {key === '<' ? '⌫' : key}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.button, { 
          backgroundColor: pin.length === 4 ? theme.tint : theme.surfaceHighlight,
          shadowColor: pin.length === 4 ? theme.tint : 'transparent'
        }]} 
        onPress={handleNext}
        disabled={pin.length < 4}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: pin.length === 4 ? '#000' : theme.textSecondary }]}>
          CONFIRMAR
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  title: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginTop: 10, marginBottom: 50, letterSpacing: 2, textAlign: 'center', paddingHorizontal: 40 },
  display: { flexDirection: 'row', gap: 20, marginBottom: 60 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  keypad: { width: 320, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 },
  keyGeometricWrapper: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginVertical: 5 },
  keyGeometricInner: { width: 70, height: 70, borderWidth: 1, transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  keyEmpty: { opacity: 0 },
  keyDeleteWrapper: { },
  keyText: { fontSize: 28, fontFamily: 'SpaceGrotesk_400Regular' },
  textStraight: { transform: [{ rotate: '-45deg' }] },
  button: { marginTop: 30, width: 200, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 8, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10 },
  buttonText: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 }
});
