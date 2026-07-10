import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function CreatePin({ route, navigation }) {
  const isDecoy = route.params?.isDecoy;
  const [pin, setPin] = useState('');
  const { theme } = useTheme();

  const handlePress = (num) => {
    if (pin.length < 4) setPin(pin + num);
  };

  const handleNext = () => {
    if (pin.length === 4) {
      navigation.navigate('ConfirmPin', { firstPin: pin, isDecoy });
    } else {
      Alert.alert('Atenção', 'O PIN deve ter 4 dígitos.');
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        {isDecoy ? 'Crie seu PIN Falso' : 'Crie seu PIN'}
      </Text>
      <Text style={[styles.subtitle, { color: theme.text, opacity: 0.6 }]}>
        {isDecoy ? 'Este PIN abrirá um Cofre Vazio para despistar.' : 'Este PIN será usado para acessar o cofre.'}
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

      <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleNext}>
        <Text style={styles.buttonText}>Próximo</Text>
      </TouchableOpacity>
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
  keyText: { fontSize: 28 },
  button: { marginTop: 20, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 25 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
