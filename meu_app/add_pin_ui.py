import re

with open('app/(drawer)/settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

state_insert = """
  // Pin Management
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinTypeToEdit, setPinTypeToEdit] = useState<'user_pin'|'fake_pin'|'kamikaze_pin'>('user_pin');
  const [currentPinValue, setCurrentPinValue] = useState('');
  const [newPinValue, setNewPinValue] = useState('');
"""
# Insert state
if "const [pinModalVisible" not in content:
    content = content.replace('const [deadManSwitch, setDeadManSwitch] = useState<string>(\'Desativado\');', 'const [deadManSwitch, setDeadManSwitch] = useState<string>(\'Desativado\');' + state_insert)

# Function to fetch PIN
func_insert = """
  const handleOpenPinModal = async (type: 'user_pin'|'fake_pin'|'kamikaze_pin') => {
    setPinTypeToEdit(type);
    const pin = await SecureStore.getItemAsync(type) || '';
    setCurrentPinValue(pin);
    setNewPinValue('');
    setPinModalVisible(true);
  };

  const handleSavePin = async () => {
    if (newPinValue.length !== 4) {
      Alert.alert("Erro", "O PIN deve ter 4 dígitos.");
      return;
    }
    await SecureStore.setItemAsync(pinTypeToEdit, newPinValue);
    Alert.alert("Sucesso", "PIN alterado com sucesso!");
    setPinModalVisible(false);
  };
"""
if "const handleOpenPinModal" not in content:
    content = content.replace('const handleToggleBlockPrints = async () => {', func_insert + '\n  const handleToggleBlockPrints = async () => {')

ui_insert = """
      {/* SEÇÃO SEGURANÇA PIN */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{"// GERENCIAMENTO DE PIN"}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.surface + '80', borderColor: theme.border + '33' }]}>
        <Pressable style={({ pressed }) => [styles.optionClickableRow, { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }]} onPress={() => handleOpenPinModal('user_pin')}>
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}>Ver/Editar PIN Principal</Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>O PIN principal da sua conta.</Text>
            </View>
          </View>
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />
        <Pressable style={({ pressed }) => [styles.optionClickableRow, { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }]} onPress={() => handleOpenPinModal('fake_pin')}>
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}>Ver/Editar PIN de Fachada</Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>PIN para acessar o cofre falso.</Text>
            </View>
          </View>
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border + '33' }]} />
        <Pressable style={({ pressed }) => [styles.optionClickableRow, { backgroundColor: pressed ? theme.surfaceHighlight + '40' : 'transparent' }]} onPress={() => handleOpenPinModal('kamikaze_pin')}>
          <View style={styles.optionLeft}>
            <View style={styles.textWrapper}>
              <Text style={[styles.optionText, { color: theme.text }]}>Ver/Editar PIN Kamikaze</Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary, opacity: 0.6 }]}>O PIN que apaga tudo se digitado.</Text>
            </View>
          </View>
        </Pressable>
      </View>
"""
if "GERENCIAMENTO DE PIN" not in content:
    content = content.replace('{/* SEÇÃO 4: CONTA */}', ui_insert + '\n      {/* SEÇÃO 4: CONTA */}')

modal_insert = """
      {/* PIN Edit Modal */}
      <Modal visible={pinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {pinTypeToEdit === 'user_pin' ? 'PIN Principal' : pinTypeToEdit === 'fake_pin' ? 'PIN de Fachada' : 'PIN Kamikaze'}
            </Text>
            <Text style={{ color: theme.textSecondary, marginBottom: 15 }}>
              PIN Atual (cadastrado na sua conta): {currentPinValue || 'Nenhum'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Digite o novo PIN (4 dígitos)"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={newPinValue}
              onChangeText={setNewPinValue}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={() => setPinModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.tint }]} onPress={handleSavePin}>
                <Text style={styles.modalBtnText}>Salvar Novo PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
"""
if "PIN Edit Modal" not in content:
    content = content.replace('</ScrollView>', modal_insert + '\n    </ScrollView>')

with open('app/(drawer)/settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
