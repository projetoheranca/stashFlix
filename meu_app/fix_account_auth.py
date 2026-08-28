import re

with open('app/(drawer)/account.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
if "signInWithEmailAndPassword" not in content:
    content = content.replace("import { sendPasswordResetEmail } from 'firebase/auth';", "import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';")

# 2. State updates
state_search = """  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [currentPinValue, setCurrentPinValue] = useState('');
  const [newPinValue, setNewPinValue] = useState('');"""

state_replace = """  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [currentPinValue, setCurrentPinValue] = useState('');
  const [newPinValue, setNewPinValue] = useState('');
  
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
  };"""
if "setPinAuthenticated" not in content:
    content = content.replace(state_search, state_replace)

# 3. reset pin modal state when opening
open_modal_search = """  const handleOpenPinModal = async () => {
    const pin = await SecureStore.getItemAsync('user_pin') || '';
    setCurrentPinValue(pin);
    setNewPinValue('');
    setPinModalVisible(true);
  };"""

open_modal_replace = """  const handleOpenPinModal = async () => {
    const pin = await SecureStore.getItemAsync('user_pin') || '';
    setCurrentPinValue(pin);
    setNewPinValue('');
    setPinAuthPassword('');
    setPinAuthenticated(false);
    setPinModalVisible(true);
  };"""
content = content.replace(open_modal_search, open_modal_replace)

# 4. Modal UI update
modal_search = r'\{\/\*\s*PIN Edit Modal\s*\*\/\}.*?<\/Modal>'

modal_replace = """{/* PIN Edit Modal */}
      <Modal visible={pinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
            <Text style={[styles.modalTitle, { color: currentColors.text }]}>Redefinir PIN Principal</Text>
            
            {!pinAuthenticated ? (
              <>
                <Text style={{ color: currentColors.textSecondary, marginBottom: 15, textAlign: 'center' }}>
                  Por segurança, digite a senha da sua conta STASHFLIX ({auth.currentUser?.email}) para continuar.
                </Text>
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
                    <Text style={[styles.modalBtnText, { color: currentColors.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: currentColors.tint }]} onPress={handleAuthenticateForPin}>
                    <Text style={styles.modalBtnText}>{pinAuthLoading ? 'Verificando...' : 'Autenticar'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={{ color: currentColors.textSecondary, marginBottom: 15 }}>
                  PIN Atual: {currentPinValue || 'Nenhum'}
                </Text>
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
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: currentColors.surfaceHighlight }]} onPress={() => setPinModalVisible(false)}>
                    <Text style={[styles.modalBtnText, { color: currentColors.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: currentColors.tint }]} onPress={handleSavePin}>
                    <Text style={styles.modalBtnText}>Salvar Novo PIN</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>"""

if "pinAuthenticated ?" not in content:
    content = re.sub(modal_search, modal_replace, content, flags=re.DOTALL)

with open('app/(drawer)/account.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
