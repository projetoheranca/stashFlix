import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Splash from '../screens/Splash';
import RecoverySetup from '../screens/RecoverySetup';
import CreatePin from '../screens/CreatePin';
import ConfirmPin from '../screens/ConfirmPin';
import LockScreen from '../screens/LockScreen';
import Home from '../screens/Home';
import AlbumView from '../screens/AlbumView';
import Settings from '../screens/Settings';
import CalculatorScreen from '../screens/CalculatorScreen';
import AlbumPassword from '../screens/AlbumPassword';

const Stack = createNativeStackNavigator();

export const navigationRef = createNavigationContainerRef();

export default function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator 
        initialRouteName="Splash" 
        screenOptions={{ 
          headerShown: false,
          animation: 'fade',
          animationDuration: 400
        }}
      >
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="CreatePin" component={CreatePin} />
        <Stack.Screen name="ConfirmPin" component={ConfirmPin} />
        <Stack.Screen name="RecoverySetup" component={RecoverySetup} />
        <Stack.Screen name="LockScreen" component={LockScreen} />
        <Stack.Screen name="CalculatorScreen" component={CalculatorScreen} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="AlbumView" component={AlbumView} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="AlbumPassword" component={AlbumPassword} options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="Settings" component={Settings} options={{ animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
