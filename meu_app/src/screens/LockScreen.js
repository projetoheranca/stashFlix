import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function LockScreen({ navigation }) {
  const [pin, setPin] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  const { theme, lockStyle } = useTheme();

  useEffect(() => {
    SecureStore.getItemAsync('premium_avatar').then(uri => {
      if (uri) setAvatarUri(uri);
    });
  }, []);

  const handlePress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) verifyPin(newPin);
    }
  };

  const verifyPin = async (enteredPin) => {
    const savedPin = await SecureStore.getItemAsync('user_pin');
    if (enteredPin === savedPin) {
      setPin(''); 
      navigation.replace('Home');
    } else {
      Alert.alert('Erro', 'PIN incorreto.');
      setPin(''); 
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  const isPremium = lockStyle === 'styled';

  const Key = ({ value, onPress, disabled }) => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }]
    }));

    const onPressIn = () => { scale.value = withSpring(0.9); };
    const onPressOut = () => { scale.value = withSpring(1); };

    return (
      <AnimatedTouchable 
        style={[styles.key, isPremium && { backgroundColor: theme.keypadBg, elevation: value !== '' ? 2 : 0, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 }, animatedStyle]} 
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.keyText, { color: theme.text }, isPremium && { color: theme.keypadText, fontWeight: '600' }]}>{value}</Text>
      </AnimatedTouchable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View entering={FadeInDown.duration(800).delay(200)}>
        {isPremium ? (
          <View style={styles.premiumHeader}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarPlaceholder} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}><Text style={styles.initials}>PR</Text></View>
            )}
            <Text style={[styles.title, { color: theme.text, marginTop: 15 }]}>Bem-vindo de volta!</Text>
          </View>
        ) : (
          <View style={styles.defaultHeader}>
            <Text style={[styles.title, { color: theme.text }]}>Bloqueado</Text>
            <Text style={[styles.subtitle, { color: theme.text, opacity: 0.6 }]}>Digite o PIN para acessar o Cofre.</Text>
          </View>
        )}
      </Animated.View>
      
      <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.display}>
        {[1,2,3,4].map((_, i) => (
          <View key={i} style={[
            styles.dot, 
            { borderColor: isPremium ? theme.border : theme.dotBorder },
            pin.length > i && { backgroundColor: theme.primary, borderColor: theme.primary }
          ]} />
        ))}
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(800).delay(500)} style={styles.keypad}>
        {['1','2','3','4','5','6','7','8','9','','0','<'].map((key, i) => (
          <Key 
            key={i} 
            value={key}
            onPress={() => {
              if (key === '<') handleDelete();
              else if (key !== '') handlePress(key);
            }}
            disabled={key === ''}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  defaultHeader: { alignItems: 'center' },
  premiumHeader: { alignItems: 'center', marginBottom: 20 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  title: { fontSize: 26, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 10, marginBottom: 40 },
  display: { flexDirection: 'row', gap: 15, marginBottom: 60 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  keypad: { width: 280, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  key: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderRadius: 40 },
  keyText: { fontSize: 28 }
});
