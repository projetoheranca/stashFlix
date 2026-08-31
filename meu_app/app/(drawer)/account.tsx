import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth } from '@/src/services/FirebaseConfig';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { registerDevice } from '@/src/services/ApiService';
import { useAppContext } from '@/src/contexts/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { t } from "@/src/i18n";

export default function AccountScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const { activePalette: currentColors, userPlan, setUserPlan } = useAppContext();
  const router = useRouter();

  
  // PIN Management
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [currentPinValue, setCurrentPinValue] = useState('');
  const [newPinValue, setNewPinValue] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  
  // Auth for PIN Reset
  const [pinAuthPassword, setPinAuthPassword] = useState('');
  const [pinAuthenticated, setPinAuthenticated] = useState(false);
  const [pinAuthLoading, setPinAuthLoading] = useState(false);

  const handleAuthenticateForPin = async () => {
    if (!pinAuthPassword) {
      Alert.alert('Erro', 'Digite sua senha da conta.');
      return;
    }
    setPinAuthLoading(true);
    try {
      if (!auth.currentUser?.email) throw new Error("Usuário não logado");
      await signInWithEmailAndPassword(auth, auth.currentUser.email, pinAuthPassword);
      setPinAuthenticated(true);
      setPinAuthPassword('');
    } catch (e: any) {
      Alert.alert('Erro', 'Senha incorreta. Tente novamente.');
    } finally {
      setPinAuthLoading(false);
    }
  };

  const handleOpenPinModal = async () => {
    setNewPinValue('');
    setConfirmPinInput('');
    setPinAuthPassword('');
    setPinAuthenticated(false);
    setPinModalVisible(true);
  };

  const handleSavePin = async () => {
    if (newPinValue.length !== 4) {
      Alert.alert("Erro", "O PIN deve ter 4 dígitos.");
      return;
    }
    if (newPinValue !== confirmPinInput) {
      Alert.alert("Erro", "Os PINs não coincidem.");
      return;
    }
    
    const fakePin = await SecureStore.getItemAsync('fake_pin');
    const kamikazePin = await SecureStore.getItemAsync('kamikaze_pin');
    if (fakePin && newPinValue === fakePin) {
      Alert.alert('Erro', 'O PIN não pode ser igual ao PIN de Fachada.');
      return;
    }
    if (kamikazePin && newPinValue === kamikazePin) {
      Alert.alert('Erro', 'O PIN não pode ser igual ao PIN de Emergência.');
      return;
    }
    
    await SecureStore.setItemAsync('user_pin', newPinValue);
    Alert.alert("Sucesso", "PIN redefinido com sucesso!");
    setPinModalVisible(false);
  };

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<string>('Dispositivo Atual');

  const fetchAccountData = async () => {
    setLoading(true);
    try {
      const user = await registerDevice();
      if (user) {
        const plan = (user as any).plan || 'FREE';
        setUserPlan(plan);
        setDeviceDetails((user as any).device_id || 'Dispositivo Atual');

        // Cálculo de expiração para TRIAL ou PRO
        if (plan === 'TRIAL' && (user as any).trial_ends_at) {
          const endsAt = new Date((user as any).trial_ends_at);
          const now = new Date();
          const diffTime = endsAt.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(diffDays > 0 ? diffDays : 0);
        } else if (plan === 'PRO') {
          // Se for PRO, calculamos com base em 30 dias a partir da última atualização/criação ou simulamos 30 dias
          const updatedAt = (user as any).UpdatedAt ? new Date((user as any).UpdatedAt) : new Date();
          const endsAt = new Date(updatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
          const now = new Date();
          const diffTime = endsAt.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(diffDays > 0 ? diffDays : 29); // Fallback para 29 se expirar logo
        } else {
          setDaysRemaining(null);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados da conta:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, []);

  const handleResetPassword = async () => {
    const email = auth.currentUser?.email;
    if (!email) {
      Alert.alert('Erro', 'E-mail do usuário não encontrado.');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'E-mail Enviado',
        `Um link para redefinir sua senha foi enviado para ${email}. Verifique sua caixa de entrada e spam.`
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Ocorreu um erro ao enviar e-mail de redefinição.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleNukeAccount = () => {
    Alert.alert(
      '🚨 PROTOCOLO DE EXCLUSÃO',
      'Isso apagará permanentemente sua conta do servidor e destruirá todas as chaves criptográficas locais. Esta operação é irreversível.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'DESTRUIR CONTA',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { nukeVault } = await import('@/src/services/VaultService');
              await nukeVault();
              // Desconecta o usuário
              await auth.signOut();
              Alert.alert('Protocolo Concluído', 'Sua conta e dados foram apagados permanentemente.');
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao deletar conta.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getPlanBadgeStyle = () => {
    if (userPlan === 'PRO') {
      return { backgroundColor: '#FFD700', color: '#000' };
    }
    if (userPlan === 'TRIAL') {
      return { backgroundColor: '#FF9F0A', color: '#FFF' };
    }
    return { backgroundColor: '#333', color: '#FFF' };
  };

  if (loading && !userPlan) {
    return (
      <View style={[styles.centered, { backgroundColor: currentColors.background }]}>
        <ActivityIndicator size="large" color={currentColors.tint} />
      </View>
    );
  }

  const currentUserEmail = auth.currentUser?.email || 'usuario@stashflix.com';

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentColors.text }]}> {t('gerenciar_conta')} </Text>
        <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}> {t('configuraes_de_perfil_e_s')} </Text>
      </View>

      {/* Info Card */}
      <View style={[styles.card, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
        <View style={styles.profileHeader}>
          <View style={[styles.avatarGlow, { backgroundColor: userPlan === 'PRO' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 0, 51, 0.2)' }]}>
            <Ionicons name="person" size={40} color={userPlan === 'PRO' ? '#FFD700' : currentColors.tint} />
          </View>
          <View style={styles.profileDetails}>
            <Text style={[styles.emailText, { color: currentColors.text }]} numberOfLines={1}>{currentUserEmail}</Text>
            <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center' }}>
              <View style={[styles.badge, getPlanBadgeStyle()]}>
                <Text style={[styles.badgeText, { color: getPlanBadgeStyle().color }]}>
                  {userPlan === 'PRO' ? '👑 PRO VIP' : userPlan === 'TRIAL' ? '⏰ TESTE' : 'BÁSICO'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Plan Details Section */}
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}> {t('plano_atual')} </Text>
          <Text style={[styles.infoValue, { color: currentColors.text }]}>
            {userPlan === 'PRO' ? 'Acesso Total Militar' : userPlan === 'TRIAL' ? 'Período de Experiência' : 'Gratuito (Limitado)'}
          </Text>
        </View>

        {daysRemaining !== null && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}> {t('tempo_restante')} </Text>
            <Text style={[styles.infoValue, { color: userPlan === 'PRO' ? '#FFD700' : '#FF9F0A', fontFamily: 'SpaceGrotesk_700Bold' }]}>
              {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
            </Text>
          </View>
        )}

        {userPlan === 'FREE' && (
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: currentColors.tint }]}
            onPress={() => router.push('/paywall')}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={16} color="#000" style={{ marginRight: 6 }} />
            <Text style={styles.upgradeButtonText}> {t('fazer_upgrade_para_pro')} </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Security Actions Card */}
      <Text style={styles.sectionHeader}> {t('aes_e_segurana')} </Text>
      <View style={[styles.card, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
        
        {/* Reset Password */}
        <TouchableOpacity style={styles.actionRow} onPress={handleResetPassword} disabled={resetLoading}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="key-sharp" size={20} color={currentColors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionText, { color: currentColors.text }]}> {t('redefinir_senha')} </Text>
            <Text style={{ color: currentColors.textSecondary, fontSize: 12, marginTop: 2 }}>
               {t('enviar_email_para_atualiz')} </Text>
          </View>
          {resetLoading ? (
            <ActivityIndicator size="small" color={currentColors.tint} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={currentColors.textSecondary} />
          )}
        </TouchableOpacity>
        <View style={styles.divider} />

        {/* Reset Main PIN */}
        <TouchableOpacity style={styles.actionRow} onPress={handleOpenPinModal}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="keypad" size={20} color={currentColors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionText, { color: currentColors.text }]}> {t('redefinir_pin_principal')} </Text>
            <Text style={{ color: currentColors.textSecondary, fontSize: 12, marginTop: 2 }}>
               {t('alterar_senha_de_acesso_a')} </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={currentColors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Crypto Status */}
        <View style={styles.actionRow}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="shield-checkmark" size={20} color="#00FF66" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionText, { color: currentColors.text }]}> {t('criptografia_ondevice')} </Text>
            <Text style={{ color: currentColors.textSecondary, fontSize: 12, marginTop: 2 }}>
               {t('aes256_bits_ativo_e_prote')} </Text>
          </View>
          <Text style={{ color: '#00FF66', fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' }}> {t('ativo')} </Text>
        </View>

        <View style={styles.divider} />

        {/* Session ID */}
        <View style={styles.actionRow}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="phone-portrait-outline" size={20} color={currentColors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionText, { color: currentColors.text }]}> {t('id_do_dispositivo')} </Text>
            <Text style={{ color: currentColors.textSecondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
              {deviceDetails}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Logout */}
        <TouchableOpacity style={styles.actionRow} onPress={async () => {
          try {
            await auth.signOut();
            router.replace('/auth/login');
          } catch (e) {
            Alert.alert('Erro', 'Não foi possível sair da conta.');
          }
        }}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="log-out-outline" size={20} color={currentColors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionText, { color: currentColors.text }]}> {t('sair_da_conta')} </Text>
            <Text style={{ color: currentColors.textSecondary, fontSize: 12, marginTop: 2 }}>
               {t('encerrar_sesso_no_disposi')} </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={currentColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <Text style={[styles.sectionHeader, { color: '#FF0033' }]}> {t('zona_de_perigo')} </Text>
      <TouchableOpacity
        style={styles.nukeButton}
        onPress={handleNukeAccount}
        activeOpacity={0.8}
      >
        <Ionicons name="trash-bin-outline" size={20} color="#FF0033" style={{ marginRight: 10 }} />
        <Text style={styles.nukeText}> {t('apagar_tudo_e_excluir_con')} </Text>
      </TouchableOpacity>
    
      {/* PIN Edit Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
            <Text style={[styles.modalTitle, { color: currentColors.text }]}> {t('redefinir_pin_esquecido')} </Text>
            
            {!pinAuthenticated ? (
              <>
                <Text style={{ color: currentColors.textSecondary, marginBottom: 15 }}>
                   {t('para_redefinir_o_pin_digi')} </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: currentColors.background, color: currentColors.text, borderColor: currentColors.border }]}
                  placeholder="Senha da conta"
                  placeholderTextColor={currentColors.textSecondary}
                  secureTextEntry
                  value={pinAuthPassword}
                  onChangeText={setPinAuthPassword}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: currentColors.surfaceHighlight }]} onPress={() => setPinModalVisible(false)}>
                    <Text style={[styles.modalBtnText, { color: currentColors.text }]}> {t('cancelar')} </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: currentColors.tint }]} onPress={handleAuthenticateForPin}>
                    <Text style={styles.modalBtnText}>{pinAuthLoading ? 'Verificando...' : 'Autenticar'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={{ color: currentColors.textSecondary, marginBottom: 15 }}>
                   {t('conta_autenticada_voc_pod')} </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: currentColors.background, color: currentColors.text, borderColor: currentColors.border }]}
                  placeholder="Digite o novo PIN (4 dígitos)"
                  placeholderTextColor={currentColors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  value={newPinValue}
                  onChangeText={setNewPinValue}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: currentColors.background, color: currentColors.text, borderColor: currentColors.border }]}
                  placeholder="Confirme o novo PIN"
                  placeholderTextColor={currentColors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  value={confirmPinInput}
                  onChangeText={setConfirmPinInput}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: currentColors.surfaceHighlight }]} onPress={() => setPinModalVisible(false)}>
                    <Text style={[styles.modalBtnText, { color: currentColors.text }]}> {t('cancelar')} </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, { backgroundColor: '#ef4444', opacity: (newPinValue.length===4 && confirmPinInput.length===4) ? 1 : 0.5 }]} 
                    onPress={handleSavePin}
                    disabled={newPinValue.length!==4 || confirmPinInput.length!==4}
                  >
                    <Text style={[styles.modalBtnText, { color: '#ffffff' }]}> {t('salvar_novo_pin')} </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: 25 },
  title: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 5, letterSpacing: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 25 },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarGlow: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  profileDetails: { flex: 1, marginLeft: 15 },
  emailText: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: '#1F1F1F', marginVertical: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  infoLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  infoValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  upgradeButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15, padding: 14, borderRadius: 8 },
  upgradeButtonText: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, letterSpacing: 1 },
  sectionHeader: { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 12, marginLeft: 5, color: '#666' },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  actionIconContainer: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#141414', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  nukeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', borderWidth: 2, borderColor: '#FF0033', padding: 20, borderRadius: 8, borderStyle: 'dashed', marginTop: 10 },
  nukeText: { color: '#FF0033', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, letterSpacing: 1.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderWidth: 1, borderRadius: 12, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 10, textAlign: 'center' },
  input: { width: '100%', height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, marginBottom: 20, fontFamily: 'Inter_400Regular' },
  modalButtons: { flexDirection: 'row', gap: 15, width: '100%' },
  modalBtn: { flex: 1, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: '#000' }
});
