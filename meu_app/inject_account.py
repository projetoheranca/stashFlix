import re

with open('app/(drawer)/account.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add React Native Imports
if "Modal, TextInput" not in content and "Modal" not in content:
    content = content.replace("ScrollView, ActivityIndicator } from 'react-native';", "ScrollView, ActivityIndicator, Modal, TextInput } from 'react-native';")
elif "TextInput" not in content:
    content = content.replace("ScrollView, ActivityIndicator }", "ScrollView, ActivityIndicator, Modal, TextInput }")

# 2. Add SecureStore
if "SecureStoreManager" not in content:
    content = content.replace("import { auth } from '@/src/services/FirebaseConfig';", "import { auth } from '@/src/services/FirebaseConfig';\nimport * as SecureStore from '@/src/services/SecureStoreManager';")

# 3. Add State and Functions
state_insert = """
  // PIN Management
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [currentPinValue, setCurrentPinValue] = useState('');
  const [newPinValue, setNewPinValue] = useState('');

  const handleOpenPinModal = async () => {
    const pin = await SecureStore.getItemAsync('user_pin') || '';
    setCurrentPinValue(pin);
    setNewPinValue('');
    setPinModalVisible(true);
  };

  const handleSavePin = async () => {
    if (newPinValue.length !== 4) {
      Alert.alert("Erro", "O PIN deve ter 4 dígitos.");
      return;
    }
    await SecureStore.setItemAsync('user_pin', newPinValue);
    Alert.alert("Sucesso", "PIN alterado com sucesso!");
    setPinModalVisible(false);
  };
"""
if "const [pinModalVisible" not in content:
    content = content.replace('const [loading, setLoading] = useState(false);', state_insert + '\n  const [loading, setLoading] = useState(false);')

# 4. Inject Row
row_insert = """
        <View style={styles.divider} />

        {/* Reset Main PIN */}
        <TouchableOpacity style={styles.actionRow} onPress={handleOpenPinModal}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="keypad" size={20} color={currentColors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionText, { color: currentColors.text }]}>Redefinir PIN Principal</Text>
            <Text style={{ color: currentColors.textSecondary, fontSize: 12, marginTop: 2 }}>
              Alterar senha de acesso ao cofre
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={currentColors.textSecondary} />
        </TouchableOpacity>"""

if "Redefinir PIN Principal" not in content:
    # Find the end of Reset Password row
    reset_pass_pattern = r'(<\/TouchableOpacity>\s*<View style=\{styles\.divider\} \/>\s*\{\/\* Crypto Status \*\/})'
    content = re.sub(reset_pass_pattern, r'</TouchableOpacity>' + row_insert + r'\n\n        <View style={styles.divider} />\n\n        {/* Crypto Status */}', content, count=1)

# 5. Inject Modal at the end of return
modal_insert = """
      {/* PIN Edit Modal */}
      <Modal visible={pinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
            <Text style={[styles.modalTitle, { color: currentColors.text }]}>PIN Principal</Text>
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
          </View>
        </View>
      </Modal>
"""
if "PIN Edit Modal" not in content:
    content = content.replace('</ScrollView>', modal_insert + '\n    </ScrollView>')

# 6. Inject Styles
styles_insert = """
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderWidth: 1, borderRadius: 12, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 10, textAlign: 'center' },
  input: { width: '100%', height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, marginBottom: 20, fontFamily: 'Inter_400Regular' },
  modalButtons: { flexDirection: 'row', gap: 15, width: '100%' },
  modalBtn: { flex: 1, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: '#000' },
"""
if "modalOverlay" not in content:
    content = content.replace('const styles = StyleSheet.create({', 'const styles = StyleSheet.create({\n' + styles_insert)

with open('app/(drawer)/account.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
