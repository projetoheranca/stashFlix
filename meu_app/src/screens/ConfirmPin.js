import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { useTheme } from '../context/ThemeContext';

export default function ConfirmPin({ route, navigation }) {
  const { firstPin, isDecoy } = route.params;
  const [pin, setPin] = useState('');
  const { theme } = useTheme();

  const handlePress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) verifyPin(newPin);
    }
  };

  const verifyPin = async (finalPin) => {
    if (finalPin === firstPin) {
      if (isDecoy) {
        await SecureStore.setItemAsync('decoy_pin', finalPin);
        Alert.alert('Cofre Falso Criado', 'Seu PIN falso foi configurado e já operante!');
        navigation.goBack();
      } else {
        await SecureStore.setItemAsync('user_pin', finalPin);
        Alert.alert('Sucesso!', 'PIN configurado com segurança.');
        navigation.replace('RecoverySetup');
      }
    } else {
      Alert.alert('Erro', 'Os PINs não coincidem. Tente novamente.');
      setPin('');
      navigation.goBack();
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        {isDecoy ? 'Confirme o PIN Falso' : 'Confirme seu PIN'}
      </Text>
      <Text style={[styles.subtitle, { color: theme.text, opacity: 0.6 }]}>
        Digite o PIN novamente para confirmar.
      </Text>
      
      <View style={styles.display}>
        {[1,2,3,4].map((_, i) => (
          <View key={i} style={[
            styles.dot, 
            { borderColor: theme.dotBorder }, 
            pin.length > i && { backgroundColor: theme.primary, borderColor: theme.primary }
          ]} />
        ))}
      </View>

      <View style={styles.keypad}>
        {['1','2','3','4','5','6','7','8','9','','0','<'].map((key, i) => (
          <TouchableOpacity 
            key={i} 
            style={[styles.key, key !== '' && { backgroundColor: theme.keypadBg }]} 
            onPress={() => {
              if (key === '<') handleDelete();
              else if (key !== '') handlePress(key);
            }}
            disabled={key === ''}
          >
            <Text style={[styles.keyText, { color: theme.keypadText }]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 10, marginBottom: 40 },
  display: { flexDirection: 'row', gap: 15, marginBottom: 60 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  keypad: { width: 280, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  key: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderRadius: 40 },
  keyText: { fontSize: 28 }
});
