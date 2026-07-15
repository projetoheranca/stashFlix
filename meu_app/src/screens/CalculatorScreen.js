import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function CalculatorScreen({ navigation }) {
  const [display, setDisplay] = useState('');
  const { theme } = useTheme();

  const handlePress = async (value) => {
    if (value === 'C') {
      setDisplay('');
      return;
    }
    
    if (value === '=') {
      const savedPin = await SecureStore.getItemAsync('user_pin');
      const decoyPin = await SecureStore.getItemAsync('decoy_pin');
      
      if (display === savedPin) {
        setDisplay('');
        navigation.replace('Home');
        return;
      } else if (decoyPin && display === decoyPin) {
        setDisplay('');
        navigation.replace('Home', { isDecoy: true });
        return;
      }

      try {
        const result = eval(display); 
        setDisplay(String(result));
      } catch (e) {
        setDisplay('Error');
      }
      return;
    }

    if (display === 'Error') {
      setDisplay(value);
    } else {
      setDisplay(display + value);
    }
  };

  const buttons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    'C', '0', '=', '+'
  ];

  const CalcButton = ({ btn }) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }]
    }));

    const onPressIn = () => { scale.value = withSpring(0.9); };
    const onPressOut = () => { scale.value = withSpring(1); };

    const isOperator = ['/','*','-','+','='].includes(btn);

    return (
      <AnimatedTouchable 
        style={[
          styles.button, 
          { backgroundColor: isOperator ? theme.primary : theme.keypadBg },
          animatedStyle
        ]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => handlePress(btn)}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: isOperator ? '#FFF' : theme.keypadText }]}>
          {btn}
        </Text>
      </AnimatedTouchable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View entering={FadeInDown.duration(600)} style={[styles.displayContainer, { backgroundColor: theme.surface }]}>
        <Text style={[styles.displayText, { color: theme.text }]} numberOfLines={1}>
          {display || '0'}
        </Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(800).delay(200)} style={styles.keypad}>
        {buttons.map((btn) => (
          <CalcButton key={btn} btn={btn} />
        ))}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  displayContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', padding: 20 },
  displayText: { fontSize: 60, fontWeight: '300' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, justifyContent: 'space-between' },
  button: { width: '22%', aspectRatio: 1, margin: '1.5%', borderRadius: 40, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
  buttonText: { fontSize: 28, fontWeight: '500' }
});
