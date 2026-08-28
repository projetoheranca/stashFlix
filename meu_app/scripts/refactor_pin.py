import re

def fix_settings():
    path = "d:\\bkp\\STASHLYFLIX\\meu_app\\app\\(drawer)\\settings.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. State variables
    content = content.replace("const [currentPinValue, setCurrentPinValue] = useState<string | null>(null);", "const [currentPinInput, setCurrentPinInput] = useState('');\n  const [confirmPinInput, setConfirmPinInput] = useState('');")
    
    # 2. handleOpenPinModal
    handle_open = """
  const handleOpenPinModal = async (type: 'user_pin' | 'fake_pin' | 'kamikaze_pin') => {
    setPinTypeToEdit(type);
    setCurrentPinInput('');
    setNewPinValue('');
    setConfirmPinInput('');
    setPinModalVisible(true);
  };
"""
    content = re.sub(r"const handleOpenPinModal = async.*?setPinModalVisible\(true\);\s*\};", handle_open.strip(), content, flags=re.DOTALL)
    
    # 3. handleSavePin
    handle_save = """
  const handleSavePin = async () => {
    if (newPinValue.length !== 4 || confirmPinInput.length !== 4) {
      Alert.alert("Erro", "O novo PIN deve ter 4 dígitos.");
      return;
    }
    if (newPinValue !== confirmPinInput) {
      Alert.alert("Erro", "Os novos PINs não coincidem.");
      return;
    }
    const currentStored = await SecureStore.getItemAsync(pinTypeToEdit);
    if (currentStored && currentStored !== currentPinInput) {
      Alert.alert('Erro', 'O PIN atual está incorreto.');
      return;
    }

    const userPin = pinTypeToEdit === 'user_pin' ? newPinValue : await SecureStore.getItemAsync('user_pin');
    const fakePin = pinTypeToEdit === 'fake_pin' ? newPinValue : await SecureStore.getItemAsync('fake_pin');
    const kamikazePin = pinTypeToEdit === 'kamikaze_pin' ? newPinValue : await SecureStore.getItemAsync('kamikaze_pin');
    
    if (userPin && fakePin && userPin === fakePin) {
      Alert.alert('Erro', 'O PIN de Fachada não pode ser igual ao PIN Principal.');
      return;
    }
    if (userPin && kamikazePin && userPin === kamikazePin) {
      Alert.alert('Erro', 'O PIN de Emergência não pode ser igual ao PIN Principal.');
      return;
    }
    if (fakePin && kamikazePin && fakePin === kamikazePin) {
      Alert.alert('Erro', 'O PIN de Emergência não pode ser igual ao PIN de Fachada.');
      return;
    }

    await SecureStore.setItemAsync(pinTypeToEdit, newPinValue);
    Alert.alert("Sucesso", "PIN atualizado com sucesso.");
    setPinModalVisible(false);
    setCurrentPinInput('');
    setNewPinValue('');
    setConfirmPinInput('');
  };
"""
    content = re.sub(r"const handleSavePin = async.*?setNewPinValue\(''\);\s*\};", handle_save.strip(), content, flags=re.DOTALL)
    
    # 4. Modal UI
    modal_ui = """
      {/* PIN Edit Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {pinTypeToEdit === 'user_pin' ? 'Alterar PIN Principal' : pinTypeToEdit === 'fake_pin' ? 'Alterar PIN de Fachada' : 'Alterar PIN Kamikaze'}
            </Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Digite o PIN Atual"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={currentPinInput}
              onChangeText={setCurrentPinInput}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Digite o Novo PIN (4 dígitos)"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={newPinValue}
              onChangeText={setNewPinValue}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Confirme o Novo PIN"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={confirmPinInput}
              onChangeText={setConfirmPinInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={() => setPinModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#ef4444', opacity: (newPinValue.length===4 && confirmPinInput.length===4 && currentPinInput.length===4) ? 1 : 0.5 }]} 
                onPress={handleSavePin}
                disabled={newPinValue.length!==4 || confirmPinInput.length!==4 || currentPinInput.length!==4}
              >
                <Text style={[styles.modalBtnText, { color: '#ffffff' }]}>Salvar Novo PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
"""
    content = re.sub(r"\{\/\* PIN Edit Modal \*\/\}.*?<\/Modal>", modal_ui.strip(), content, flags=re.DOTALL)
    
    if "KeyboardAvoidingView" not in content:
        content = content.replace("from 'react-native';", ", KeyboardAvoidingView, Platform } from 'react-native';")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
        
def fix_account():
    path = "d:\\bkp\\STASHLYFLIX\\meu_app\\app\\(drawer)\\account.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
        
    content = content.replace("const [currentPinValue, setCurrentPinValue] = useState<string | null>(null);", "const [confirmPinInput, setConfirmPinInput] = useState('');")
    
    handle_open = """
  const handleOpenPinModal = async () => {
    setNewPinValue('');
    setConfirmPinInput('');
    setPinAuthPassword('');
    setPinAuthenticated(false);
    setPinModalVisible(true);
  };
"""
    content = re.sub(r"const handleOpenPinModal = async.*?setPinModalVisible\(true\);\s*\};", handle_open.strip(), content, flags=re.DOTALL)
    
    handle_save = """
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
"""
    content = re.sub(r"const handleSavePin = async.*?setPinModalVisible\(false\);\s*\};", handle_save.strip(), content, flags=re.DOTALL)
    
    modal_ui = """
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
            <Text style={[styles.modalTitle, { color: currentColors.text }]}>Redefinir PIN Esquecido</Text>
            
            {!pinAuthenticated ? (
              <>
                <Text style={{ color: currentColors.textSecondary, marginBottom: 15 }}>
                  Para redefinir o PIN, digite a senha da sua conta para confirmar sua identidade.
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
                  Conta autenticada. Você pode criar um novo PIN Principal agora.
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
                    <Text style={[styles.modalBtnText, { color: currentColors.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, { backgroundColor: '#ef4444', opacity: (newPinValue.length===4 && confirmPinInput.length===4) ? 1 : 0.5 }]} 
                    onPress={handleSavePin}
                    disabled={newPinValue.length!==4 || confirmPinInput.length!==4}
                  >
                    <Text style={[styles.modalBtnText, { color: '#ffffff' }]}>Salvar Novo PIN</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
"""
    content = re.sub(r"<Modal visible=\{pinModalVisible\}.*?<\/Modal>", modal_ui.strip(), content, flags=re.DOTALL)
    
    if "KeyboardAvoidingView" not in content:
        content = content.replace("from 'react-native';", ", KeyboardAvoidingView, Platform } from 'react-native';")
        
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

try:
    fix_settings()
    fix_account()
    print("PIN UI and logic refactored successfully!")
except Exception as e:
    print(f"Error: {e}")
