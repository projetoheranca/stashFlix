import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal, Image } from 'react-native';
import { useAppContext, CustomThemeColors } from '@/src/contexts/AppContext';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { syncSettingsToCloud } from '@/src/services/FirebaseDB';
import { showRewardedAd } from '@/src/services/AdService';
import { useRouter } from 'expo-router';
import { changeIcon, resetIcon } from 'react-native-change-icon';

export default function AppearanceScreen() {
  const router = useRouter();
  const { 
    activePalette: theme, 
    colorSchemeMode, 
    setColorSchemeMode,
    themeColor,
    setThemeColor,
    customThemeColors,
    setCustomThemeColors,
    userPlan,
    setUserPlan
  } = useAppContext();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [currentEditingColor, setCurrentEditingColor] = useState<keyof CustomThemeColors | null>(null);

  const handleOpenPicker = (colorType: keyof CustomThemeColors) => {
    setCurrentEditingColor(colorType);
    setThemeColor('custom');
    if (!customThemeColors) {
      setCustomThemeColors({
        text: '#FFFFFF',
        background: '#050000',
        surface: '#111111',
        tint: '#FF0033'
      });
    }
    setPickerVisible(true);
  };

  const SWATCHES = [
    '#FF0033', '#FF4D4D', '#FF8C00', '#FFD700', '#00FF41', 
    '#00D8FF', '#0088FF', '#8A2BE2', '#FF00FF', '#FFFFFF',
    '#AAAAAA', '#333333', '#111111', '#050000', '#000000'
  ];

  const [lockStyle, setLockStyle] = useState<'geometric' | 'standard'>('geometric');

  const [selectedIcon, setSelectedIcon] = useState('default');

  useEffect(() => {
    SecureStore.getItemAsync('lock_style').then(style => {
      if (style === 'standard') setLockStyle('standard');
      else setLockStyle('geometric');
    });
    SecureStore.getItemAsync('app_icon_disguise').then(icon => {
      if (icon) setSelectedIcon(icon);
    });
  }, []);

  const handleLockStyle = async (style: 'geometric' | 'standard') => {
    setLockStyle(style);
    await SecureStore.setItemAsync('lock_style', style);
    try {
      await syncSettingsToCloud();
    } catch (e) {}
  };

  const handleIconChange = async (iconName: string) => {
    try {
      // Map our internal name to the activity-alias name registered in AndroidManifest
      // (matches what we set in plugins/withDynamicIcon.js)
      const aliasMap: Record<string, string> = {
        'default':         'MainActivityIcon_default',
        'calculator':      'MainActivityIcon_calculator',
        'weather':         'MainActivityIcon_weather',
        'browser_generic': 'MainActivityIcon_browser_generic',
        'safari':          'MainActivityIcon_safari',
        'browser_search':  'MainActivityIcon_browser_search',
      };

      const aliasName = aliasMap[iconName];
      if (!aliasName) throw new Error('Unknown icon');

      const applyIcon = async () => {
        try {
          if (iconName === 'default') {
            await resetIcon();
          } else {
            await changeIcon(aliasName);
          }
          setSelectedIcon(iconName);
          await SecureStore.setItemAsync('app_icon_disguise', iconName);
          try { await syncSettingsToCloud(); } catch (e) {}
          Alert.alert("Sucesso", "O ícone do app foi alterado (pode demorar alguns segundos na tela inicial).");
        } catch (e) {
          Alert.alert("Erro", "Não foi possível mudar o ícone do aplicativo.");
        }
      };

      if (iconName !== 'default' && userPlan === 'FREE') {
        Alert.alert(
          "Recurso Premium",
          "Esta é uma função PRO. Você pode se tornar assinante ou assistir a um vídeo rápido para usar agora!",
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Assinar PRO", onPress: () => router.push('/paywall') },
            { text: "Assistir Vídeo", onPress: () => {
                showRewardedAd(async () => {
                  await applyIcon();
                }, () => {
                  // Ad closed
                });
            }}
          ]
        );
        return;
      }

      await applyIcon();
    } catch (error: any) {
      Alert.alert(
        "Erro ao Trocar Ícone",
        "Isso pode acontecer em modo de desenvolvimento. Teste na versão compilada do app (.apk)."
      );
    }
  };



  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* TEMA CLARO/ESCURO */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>TEMA DO SISTEMA</Text>
        <View style={styles.rowGroup}>
          {(['system', 'dark', 'light'] as const).map(mode => (
            <TouchableOpacity 
              key={mode}
              style={[
                styles.segmentBtn, 
                { borderColor: theme.border },
                colorSchemeMode === mode && { backgroundColor: theme.tint, borderColor: theme.tint }
              ]}
              onPress={() => setColorSchemeMode(mode)}
            >
              <Text style={[
                styles.segmentText, 
                { color: colorSchemeMode === mode ? '#000' : theme.textSecondary }
              ]}>
                {mode.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* TEMA CUSTOMIZADO (MODO CRIADOR) */}
      <View style={[styles.section, { backgroundColor: theme.tint + '1E', borderColor: '#FFD700', borderWidth: 1.5, borderRadius: 12, padding: 16, marginBottom: 30 }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>TEMA CUSTOMIZADO (CRIADOR) 👑</Text>
        
        <View style={styles.rowGroup}>
          <TouchableOpacity 
            style={[styles.segmentBtn, { borderColor: theme.border, height: 100, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]} 
            onPress={() => handleOpenPicker('tint')}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.tint, marginBottom: 10 }} />
            <Text style={[styles.segmentText, { color: theme.textSecondary }]}>DESTAQUE</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.segmentBtn, { borderColor: theme.border, height: 100, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]} 
            onPress={() => handleOpenPicker('background')}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.background, marginBottom: 10, borderWidth: 1, borderColor: theme.border }} />
            <Text style={[styles.segmentText, { color: theme.textSecondary }]}>FUNDO</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.rowGroup, { marginTop: 10 }]}>
          <TouchableOpacity 
            style={[styles.segmentBtn, { borderColor: theme.border, height: 100, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]} 
            onPress={() => handleOpenPicker('surface')}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.surface, marginBottom: 10, borderWidth: 1, borderColor: theme.border }} />
            <Text style={[styles.segmentText, { color: theme.textSecondary }]}>CARTÕES</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.segmentBtn, { borderColor: theme.border, height: 100, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]} 
            onPress={() => handleOpenPicker('text')}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.text, marginBottom: 10, borderWidth: 1, borderColor: theme.border }} />
            <Text style={[styles.segmentText, { color: theme.textSecondary }]}>TEXTO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ESTILO DA TELA DE BLOQUEIO */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>TECLADO DE BLOQUEIO</Text>
        <View style={styles.rowGroup}>
          <TouchableOpacity 
            style={[
              styles.segmentBtn, 
              { borderColor: theme.border, flex: 1 },
              lockStyle === 'geometric' && { backgroundColor: theme.tint, borderColor: theme.tint }
            ]}
            onPress={() => handleLockStyle('geometric')}
          >
            <Text style={[
              styles.segmentText, 
              { color: lockStyle === 'geometric' ? '#000' : theme.textSecondary }
            ]}>
              GEOMÉTRICO (DIAMANTE)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.segmentBtn, 
              { borderColor: theme.border, flex: 1 },
              lockStyle === 'standard' && { backgroundColor: theme.tint, borderColor: theme.tint }
            ]}
            onPress={() => handleLockStyle('standard')}
          >
            <Text style={[
              styles.segmentText, 
              { color: lockStyle === 'standard' ? '#000' : theme.textSecondary }
            ]}>
              PADRÃO (CÍRCULOS)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ÍCONE DO APLICATIVO */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>ÍCONE DO APLICATIVO</Text>
        <Text style={{ color: theme.textSecondary, marginBottom: 15, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
          Escolha um ícone para disfarçar o app na tela inicial. StashFlix é gratuito. Os disfarces requerem o Plano PRO.
        </Text>
        <View style={styles.iconRow}>
          {[
            { name: 'default',         label: 'StashFlix',   src: require('@/assets/images/app-icon.jpg'),     isFree: true  },
            { name: 'calculator',      label: 'Calculadora',  src: require('@/assets/images/calculadora.png'),  isFree: false },
            { name: 'weather',         label: 'Clima',        src: require('@/assets/images/clima.png'),        isFree: false },
            { name: 'browser_generic', label: 'Navegador',    src: require('@/assets/images/navegador.png'),    isFree: false },
            { name: 'safari',          label: 'Safari',       src: require('@/assets/images/safari.png'),       isFree: false },
            { name: 'browser_search',  label: 'Buscador',     src: require('@/assets/images/buscador.png'),     isFree: false },
          ].map((item) => {
            const isSelected = selectedIcon === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                style={styles.iconBox}
                onPress={() => handleIconChange(item.name)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.fakeIcon,
                  {
                    borderColor: isSelected ? theme.tint : theme.border,
                    borderWidth: isSelected ? 3 : 1,
                    overflow: 'hidden',
                    backgroundColor: '#000',
                    shadowColor: isSelected ? theme.tint : 'transparent',
                    shadowOpacity: 0.6,
                    shadowRadius: 8,
                    elevation: isSelected ? 6 : 0,
                  }
                ]}>
                  <Image source={item.src} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />

                  {/* Premium badge */}
                  {!item.isFree && (
                    <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#000', borderRadius: 8, padding: 1, borderWidth: 0.5, borderColor: '#FFD700' }}>
                      <Text style={{ fontSize: 9 }}>👑</Text>
                    </View>
                  )}

                  {/* Selected checkmark */}
                  {isSelected && (
                    <View style={{ position: 'absolute', bottom: 2, left: 0, right: 0, alignItems: 'center' }}>
                      <View style={{ backgroundColor: theme.tint, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 7, color: '#000', fontFamily: 'SpaceGrotesk_700Bold' }}>ATIVO</Text>
                      </View>
                    </View>
                  )}
                </View>
                <Text style={{ color: isSelected ? theme.tint : theme.text, marginTop: 6, fontSize: 10, fontFamily: isSelected ? 'SpaceGrotesk_700Bold' : 'Inter_400Regular' }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>


      <Modal visible={pickerVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#111', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#333' }}>
            <Text style={{ color: '#FFF', fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 20, textAlign: 'center' }}>
              AJUSTE DE COR ({currentEditingColor?.toUpperCase()})
            </Text>
            
            <View style={{ width: '100%', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {SWATCHES.map((color) => {
                  const isSelected = currentEditingColor && customThemeColors && customThemeColors[currentEditingColor] === color;
                  return (
                    <TouchableOpacity 
                      key={color} 
                      style={{ 
                        width: 45, height: 45, borderRadius: 25, backgroundColor: color, 
                        borderWidth: isSelected ? 3 : 1, borderColor: isSelected ? '#FFF' : '#444' 
                      }}
                      onPress={() => {
                        if (currentEditingColor) {
                          setCustomThemeColors({
                            ...(customThemeColors || { text: '#FFF', background: '#000', surface: '#111', tint: '#FF0033' }),
                            [currentEditingColor]: color
                          });
                          setPickerVisible(false);
                        }
                      }}
                    />
                  );
                })}
              </View>
            </View>

            <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 15 }}>
              Toque em uma cor para aplicar instantaneamente.
            </Text>

            <TouchableOpacity 
              style={{ backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center' }}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={{ color: '#FFF', fontFamily: 'SpaceGrotesk_700Bold' }}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  section: { marginBottom: 40 },
  sectionTitle: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 15 },
  rowGroup: { flexDirection: 'row', gap: 10 },
  segmentBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, letterSpacing: 1, textAlign: 'center' },
  colorRow: { flexDirection: 'row', gap: 15, paddingVertical: 10 },
  colorCircle: { width: 40, height: 40, borderRadius: 20 },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'flex-start', marginTop: 10 },
  iconBox: { alignItems: 'center' },
  fakeIcon: { width: 60, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }
});
