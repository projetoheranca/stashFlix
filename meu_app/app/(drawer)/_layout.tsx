import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { Colors } from '@/constants/theme';
import { useAppContext } from '@/src/contexts/AppContext';
import { CustomDrawerContent } from '@/components/CustomDrawerContent';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity } from 'react-native';
import { DrawerToggleButton } from '@react-navigation/drawer';

export default function DrawerLayout() {
  const { activePalette: theme } = useAppContext();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.tint,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
        headerShadowVisible: false,
        drawerStyle: { width: '80%' }, // Drawer ocupa 80%, deixando espaço lateral para fechar
        drawerType: 'front',
        swipeEnabled: true,
        swipeEdgeWidth: 100, // Maior área lateral para puxar o menu
        headerLeft: () => <DrawerToggleButton tintColor={theme.tint} />
      }}>
      
      <Drawer.Screen
        name="index"
        options={{
          title: 'STASHFLIX',
          drawerLabel: 'Cofre',
        }}
      />
      <Drawer.Screen
        name="anti-invasion"
        options={{
          title: 'CENTRAL ANTI-INVASÃO',
          drawerLabel: 'Anti-Invasão',
          drawerIcon: ({ color, size }) => <Ionicons name="shield-half" size={size} color={color} />
        }}
      />
      <Drawer.Screen
        name="trash"
        options={{
          title: 'LIXEIRA',
          drawerLabel: 'Lixeira',
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: 'AJUSTES',
          drawerLabel: 'Ajustes',
        }}
      />
      <Drawer.Screen
        name="appearance"
        options={{
          title: 'APARÊNCIA',
          drawerLabel: 'Aparência',
        }}
      />
      <Drawer.Screen
        name="account"
        options={{
          title: 'CONTA',
          drawerLabel: 'Conta',
        }}
      />

      <Drawer.Screen
        name="help"
        options={{
          title: 'AJUDA & TUTORIAL',
          drawerLabel: 'Ajuda',
        }}
      />
    </Drawer>
  );
}
