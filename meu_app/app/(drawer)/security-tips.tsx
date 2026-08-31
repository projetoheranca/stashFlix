import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StatusBar } from 'expo-status-bar';
import { t } from "@/src/i18n";

export default function SecurityTipsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const TIPS = [
    {
      title: "1. Nunca Esqueça o PIN Kamikaze",
      description: "O PIN Kamikaze apaga todos os dados do cofre imediatamente quando digitado na tela de bloqueio. Use-o apenas em situações extremas de coação.",
      icon: "warning-outline",
      color: "#FF0033"
    },
    {
      title: "2. Gerencie o Cofre Falso",
      description: "Sempre que alguém pedir para ver o seu celular, entregue o PIN do Cofre Falso. Mantenha algumas fotos inofensivas lá para que pareça real e não levante suspeitas.",
      icon: "finger-print-outline",
      color: "#00FF66"
    },
    {
      title: "3. Ative o Modo Fantasma",
      description: "Se não quiser que saibam que você tem um aplicativo de segurança, mude o ícone e o nome do app para 'Calculadora' nas configurações de Disfarce.",
      icon: "eye-off-outline",
      color: "#FFD700"
    },
    {
      title: "4. Backup em Nuvem Seguro",
      description: "Seus arquivos são criptografados com criptografia militar (AES-256) antes de irem para a nuvem. Somente você, com a sua senha, pode descriptografá-los.",
      icon: "cloud-upload-outline",
      color: theme.tint
    }
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}> {t('manual_de_segurana')} </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={[styles.intro, { color: theme.textSecondary }]}>
           {t('a_privacidade__o_seu_maio')} </Text>

        <View style={styles.tipsList}>
          {TIPS.map((tip, index) => (
            <View key={index} style={[styles.tipCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: tip.color + '22' }]}>
                <Ionicons name={tip.icon as any} size={28} color={tip.color} />
              </View>
              <View style={styles.tipContent}>
                <Text style={[styles.tipTitle, { color: theme.text }]}>{tip.title}</Text>
                <Text style={[styles.tipDescription, { color: theme.textSecondary }]}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.warningBox, { borderColor: '#FF0033', backgroundColor: 'rgba(255,0,51,0.05)' }]}>
          <Ionicons name="information-circle" size={24} color="#FF0033" />
          <Text style={styles.warningText}>
             {t('lembrese_o_aplicativo__pr')} </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  intro: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 30,
  },
  tipsList: {
    gap: 15,
  },
  tipCard: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 5,
  },
  tipDescription: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    marginTop: 30,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 15,
  },
  warningText: {
    flex: 1,
    color: '#FF0033',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  }
});
