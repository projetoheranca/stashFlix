import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '@/src/contexts/AppContext';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const DRAWER_GROUPS = [
  {
    title: 'PRINCIPAL',
    items: [
      { name: 'Meu Cofre', route: '/(drawer)', icon: 'lock-closed', level: 'FREE' },
      { name: 'Lixeira', route: '/(drawer)/trash', icon: 'trash', level: 'FREE' },
    ]
  },
  {
    title: 'RECURSOS PREMIUM',
    items: [
      { name: 'Anti-Invasão', route: '/(drawer)/anti-invasion', icon: 'shield-half', level: 'ULTRA' },
      { name: 'Backup & Nuvem', route: '/(drawer)/settings', icon: 'cloud-done', level: 'ULTRA' },
      { name: 'Cofre Falso', route: '/decoy', icon: 'folder-open', level: 'PRO' },
      { name: 'Camuflagem', route: '/disguise', icon: 'calculator', level: 'PRO' },
      { name: 'Tela Premium', route: '/(drawer)/settings', icon: 'image', level: 'PRO' },
    ]
  },
  {
    title: 'CONFIGURAÇÕES',
    items: [
      { name: 'Senhas e PIN', route: '/(drawer)/settings', icon: 'key', level: 'FREE' },
      { name: 'Aparência', route: '/(drawer)/appearance', icon: 'color-palette', level: 'FREE' },
      { name: 'Conta', route: '/(drawer)/account', icon: 'person-circle', level: 'FREE' },
      { name: 'Ajuda', route: '/(drawer)/help', icon: 'help-buoy', level: 'FREE' },
    ]
  }
];

export function CustomDrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname();
  const { activePalette: theme, isFakeVault, userPlan } = useAppContext();
  const insets = useSafeAreaInsets();

  const rotationValue = useSharedValue(0);
  const pulseValue = useSharedValue(0.4);

  React.useEffect(() => {
    rotationValue.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
    pulseValue.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationValue.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseValue.value,
  }));

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: theme.background }} contentContainerStyle={{ flexGrow: 1, paddingTop: 20, paddingBottom: insets.bottom + 40 }}>
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.tint }]}>MENU</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>SISTEMA STASHFLIX</Text>
      </View>

      <View style={{ paddingHorizontal: 15 }}>
        {DRAWER_GROUPS.map((group, groupIndex) => {
          if (isFakeVault && group.title === 'RECURSOS PREMIUM') return null;
          
          const filteredItems = group.items.filter(item => {
            if (isFakeVault) {
              return ['Meu Cofre', 'Lixeira', 'Conta', 'Ajuda'].includes(item.name);
            }
            return true;
          });

          if (filteredItems.length === 0) return null;

          return (
            <View key={groupIndex} style={{ marginBottom: 25 }}>
              <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>{group.title}</Text>
              <View style={styles.gridContainer}>
                {filteredItems.map((item, index) => {
                  const isActive = pathname === item.route || (item.route === '/(drawer)' && pathname === '/');
                  const isUltra = item.level === 'ULTRA';
                  const isPro = item.level === 'PRO';
                  
                  return (
                    <TouchableOpacity 
                      key={index}
                      style={[
                        styles.gridItem, 
                        { backgroundColor: isActive ? theme.surfaceHighlight : theme.surface },
                        isPro && { borderColor: '#FF0033', borderWidth: 1.5 },
                        isUltra && { borderColor: '#0099FF', borderWidth: 1.5 },
                        isActive && { shadowColor: theme.tint, shadowOpacity: 0.6, shadowRadius: 10, elevation: 5 }
                      ]}
                      onPress={async () => {
                        if (item.name === 'Tela Premium' || item.name === 'Senhas e PIN') {
                          props.navigation.closeDrawer();
                          router.push({ pathname: '/(drawer)/settings', params: { triggerBg: item.name === 'Tela Premium' ? 'true' : undefined, triggerPin: item.name === 'Senhas e PIN' ? 'true' : undefined } });
                          return;
                        }
                        if (item.name === 'Backup & Nuvem') {
                          props.navigation.closeDrawer();
                          router.push({ pathname: '/(drawer)/settings', params: { triggerCloud: 'true' } });
                          return;
                        }
                        router.push(item.route as any);
                        props.navigation.closeDrawer();
                      }}
                      activeOpacity={0.7}
                    >
                      {isUltra && (
                        <Animated.View style={[styles.neonBorder, pulseStyle]} pointerEvents="none" />
                      )}

                      <Ionicons 
                        name={item.icon as any} 
                        size={48} 
                        color={isActive ? theme.tint : (isUltra ? '#00CCFF' : (isPro ? '#FF3366' : theme.text))} 
                        style={{ marginBottom: 8 }}
                      />
                      <Text style={[styles.itemText, { color: isActive ? theme.tint : theme.text }]} numberOfLines={2}>
                        {item.name}
                      </Text>

                      {isUltra && (
                        <View style={styles.badgeUltra}>
                          <Text style={styles.badgeUltraText}>ULTRA</Text>
                        </View>
                      )}
                      {isPro && (
                        <View style={styles.badgePro}>
                          <Text style={styles.badgeProText}>PRO</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* Botão PREMIUM ou MINHA ASSINATURA Largo - Escondido no Cofre Falso */}
      {!isFakeVault && (
        <View style={{ marginHorizontal: 15, marginTop: 5, marginBottom: 20, borderRadius: 12, overflow: 'hidden', padding: 2, position: 'relative' }}>
          {/* Rotating Animated Gradient Border */}
          <Animated.View style={[{ position: 'absolute', width: '200%', height: '500%', top: '-200%', left: '-50%' }, rotateStyle]}>
            {userPlan === 'ULTRA' ? (
              <LinearGradient
                colors={['#00FFCC', '#009977', '#00FFCC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: '100%', height: '100%' }}
              />
            ) : userPlan === 'PRO' ? (
              <LinearGradient
                colors={['#FFD700', '#B8860B', '#FFD700']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <LinearGradient
                colors={['#FF0033', '#FFD700', '#00FF66', '#FF0033']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </Animated.View>
          <TouchableOpacity 
            style={{ backgroundColor: '#1E1600', borderRadius: 10, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
            activeOpacity={0.8}
            onPress={() => {
              if (userPlan === 'PRO' || userPlan === 'ULTRA') {
                router.push('/manage-subscription');
              } else {
                router.push('/paywall');
              }
              props.navigation.closeDrawer();
            }}
          >
            <Ionicons name={userPlan === 'ULTRA' ? "diamond" : userPlan === 'PRO' ? "shield-checkmark" : "star"} size={20} color={userPlan === 'ULTRA' ? "#00FFCC" : "#FFD700"} style={{ marginRight: 8 }} />
            <Text style={{ color: userPlan === 'ULTRA' ? '#00FFCC' : '#FFD700', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, letterSpacing: 2 }}>
              {userPlan === 'ULTRA' ? 'PAINEL ULTRA' : userPlan === 'PRO' ? 'PAINEL PRO' : 'UPGRADE PREMIUM'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 25 },
  headerTitle: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3 },
  headerSubtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', letterSpacing: 2, marginTop: 5 },
  groupTitle: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5, marginBottom: 12, marginLeft: 5 },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  gridItem: {
    width: '46%', 
    aspectRatio: 1, 
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#333', 
    padding: 10,
    position: 'relative',
  },
  neonBorder: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    left: -2,
    right: -2,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#00CCFF',
    shadowColor: '#00CCFF',
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  itemText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  badgeUltra: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#000',
    borderColor: '#00CCFF',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    shadowColor: '#00CCFF',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeUltraText: {
    color: '#00CCFF',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 8,
    letterSpacing: 1,
  },
  badgePro: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#000',
    borderColor: '#FF3366',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeProText: {
    color: '#FF3366',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 8,
    letterSpacing: 1,
  },
});
