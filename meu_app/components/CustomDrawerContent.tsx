import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAppContext } from '@/src/contexts/AppContext';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const DRAWER_ITEMS = [
  { name: 'Meu Cofre', route: '/(drawer)', icon: 'lock-closed' },
  { name: 'Backup & Nuvem', route: '/(drawer)/settings', icon: 'cloud-done' },
  { name: 'Lixeira', route: '/(drawer)/trash', icon: 'trash' },
  { name: 'Anti-Invasão', route: '/(drawer)/anti-invasion', icon: 'shield-half' },
  { name: 'Cofre Falso', route: '/decoy', icon: 'folder-open' },
  { name: 'Tela Premium', route: '/(drawer)/settings', icon: 'image' },
  { name: 'Camuflagem (Calculadora)', route: '/disguise', icon: 'calculator' },
  { name: 'Aparência', route: '/(drawer)/appearance', icon: 'color-palette' },
  { name: 'Conta', route: '/(drawer)/account', icon: 'person-circle' },
  { name: 'Ajuda', route: '/(drawer)/help', icon: 'help-buoy' },
];

export function CustomDrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname();
  const { activePalette: theme } = useAppContext();

  const rotationValue = useSharedValue(0);

  React.useEffect(() => {
    rotationValue.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationValue.value}deg` }],
  }));

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: theme.background }} contentContainerStyle={{ flex: 1, paddingTop: 20 }}>
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.tint }]}>MENU</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>SISTEMA STASHFLIX</Text>
      </View>

      <View style={styles.gridContainer}>
        {DRAWER_ITEMS.map((item, index) => {
          const isActive = pathname === item.route || (item.route === '/(drawer)' && pathname === '/');
          const isPremium = ['Backup & Nuvem', 'Anti-Invasão', 'Tela Premium', 'Camuflagem (Calculadora)', 'Aparência'].includes(item.name);
          
          return (
            <TouchableOpacity 
              key={index}
              style={[
                styles.gridItem, 
                { 
                  backgroundColor: isPremium ? (isActive ? theme.tint : '#1E1600') : theme.surface, 
                  borderColor: isActive ? theme.tint : (isPremium ? '#FFD700' : theme.border),
                  borderWidth: isPremium ? 2 : 1
                },
                isActive && { shadowColor: theme.tint, shadowOpacity: 0.6, shadowRadius: 10, elevation: 5 }
              ]}
              onPress={async () => {
                if (item.name === 'Tela Premium') {
                  props.navigation.closeDrawer();
                  router.push({ pathname: '/(drawer)/settings', params: { triggerBg: 'true' } });
                  return;
                }
                // Navega e fecha o drawer
                router.push(item.route as any);
                props.navigation.closeDrawer();
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={item.icon as any} 
                size={36} 
                color={isActive ? (isPremium ? '#FFD700' : theme.tint) : (isPremium ? '#FFD700' : theme.text)} 
                style={{ marginBottom: 12 }}
              />
              <Text style={[styles.itemText, { color: isActive ? (isPremium ? '#FFD700' : theme.tint) : (isPremium ? '#FFD700' : theme.textSecondary) }]}>
                {item.name}
              </Text>
              {isPremium && (
                <View style={{ position: 'absolute', top: 5, right: 8 }}>
                  <Text style={{ fontSize: 18 }}>👑</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Botão PREMIUM Largo */}
      <View style={{ marginHorizontal: 15, marginTop: 15, marginBottom: 20, borderRadius: 12, overflow: 'hidden', padding: 2, position: 'relative' }}>
        {/* Rotating Animated Gradient Border */}
        <Animated.View style={[{ position: 'absolute', width: '200%', height: '500%', top: '-200%', left: '-50%' }, rotateStyle]}>
          <LinearGradient
            colors={['#FF0033', '#FFD700', '#00FF66', '#FF0033']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>
        <TouchableOpacity 
          style={{ backgroundColor: '#1E1600', borderRadius: 10, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
          activeOpacity={0.8}
          onPress={() => {
            router.push('/paywall');
            props.navigation.closeDrawer();
          }}
        >
          <Ionicons name="star" size={20} color="#FFD700" style={{ marginRight: 8 }} />
          <Text style={{ color: '#FFD700', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, letterSpacing: 2 }}>
            PREMIUM
          </Text>
        </TouchableOpacity>
      </View>

    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3 },
  headerSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', letterSpacing: 2, marginTop: 5 },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    paddingHorizontal: 10,
  },
  gridItem: {
    width: '45%', // 2 quadrados responsivos por linha
    aspectRatio: 1, // Mantém quadrado
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
  },
  itemText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    letterSpacing: 1,
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  }
});
