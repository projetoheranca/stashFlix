import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { registerAlertListener, unregisterAlertListener, AlertButton } from '@/src/services/CustomAlertService';
import { useAppContext } from '@/src/contexts/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function CustomAlertModal() {
  const { activePalette: theme } = useAppContext();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState<AlertButton[]>([]);

  useEffect(() => {
    registerAlertListener((t, m, bs) => {
      setTitle(t);
      setMessage(m);
      // Fallback a um botão padrão OK se nenhum for provido
      setButtons(bs && bs.length > 0 ? bs : [{ text: 'OK' }]);
      setVisible(true);
    });
    return () => {
      unregisterAlertListener();
    };
  }, []);

  if (!visible) return null;

  // Determinar ícone com base no título do aviso para torná-lo inteligente
  const getHeaderIcon = () => {
    const t = title.toLowerCase();
    if (t.includes('erro') || t.includes('falha') || t.includes('perigo')) {
      return { name: 'alert-circle', color: '#FF0033' };
    }
    if (t.includes('sucesso') || t.includes('conclu')) {
      return { name: 'checkmark-circle', color: '#00FF66' };
    }
    if (t.includes('premium') || t.includes('pro') || t.includes('assinatura') || t.includes('restrito')) {
      return { name: 'star-circle', color: '#FFD700' };
    }
    if (t.includes('dead') || t.includes('autodestru') || t.includes('seguran')) {
      return { name: 'shield-half', color: '#FF9F0A' };
    }
    return { name: 'information-circle', color: theme.tint || '#FF0033' };
  };

  const iconInfo = getHeaderIcon();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={[styles.alertBox, { backgroundColor: '#0A0707', borderColor: iconInfo.color }]}>
          {/* Top Decorative Neon Border */}
          <LinearGradient
            colors={[iconInfo.color, 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.topGlow}
          />

          {/* Icon + Title Header */}
          <View style={styles.header}>
            <Ionicons name={iconInfo.name as any} size={40} color={iconInfo.color} style={styles.headerIcon} />
            <Text style={[styles.title, { color: '#FFF' }]}>{title.toUpperCase()}</Text>
          </View>

          {/* Subtitle / Message */}
          <Text style={[styles.message, { color: '#CCC' }]}>{message}</Text>

          {/* Buttons Row / Column Grid */}
          <View style={styles.buttonContainer}>
            {buttons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              
              // Determina as cores do botão
              let btnBorder = theme.tint;
              let btnBg = 'rgba(255,255,255,0.03)';
              let btnTextColor = '#FFF';

              if (isDestructive) {
                btnBorder = '#FF0033';
                btnBg = 'rgba(255, 0, 51, 0.08)';
                btnTextColor = '#FF0033';
              } else if (isCancel) {
                btnBorder = 'rgba(255,255,255,0.15)';
                btnBg = 'transparent';
                btnTextColor = '#888';
              } else {
                // Default ou OK
                btnBorder = '#FFD700'; // Dourado cosmic
                btnBg = 'rgba(255, 215, 0, 0.06)';
                btnTextColor = '#FFD700';
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    { 
                      borderColor: btnBorder, 
                      backgroundColor: btnBg,
                      // Se for mais de 2 botões, faz ocupar a largura total para visual em lista
                      width: buttons.length > 2 ? '100%' : '46%',
                      minWidth: buttons.length > 2 ? '100%' : 110,
                    }
                  ]}
                  onPress={() => {
                    setVisible(false);
                    if (btn.onPress) {
                      btn.onPress();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, { color: btnTextColor }]}>
                    {btn.text?.toUpperCase() || 'CONFIRMAR'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: SCREEN_WIDTH * 0.85,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    opacity: 0.15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    marginBottom: 10,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 22,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 26,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
  },
});
