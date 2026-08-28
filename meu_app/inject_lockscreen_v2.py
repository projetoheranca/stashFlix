import re

with open('components/LockScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
if "signInWithEmailAndPassword" not in content:
    content = content.replace("import AsyncStorage from '@react-native-async-storage/async-storage';", "import AsyncStorage from '@react-native-async-storage/async-storage';\nimport { auth } from '@/src/services/FirebaseConfig';\nimport { signInWithEmailAndPassword } from 'firebase/auth';")

# 2. State and Function
state_insert = """
  // PIN Recovery
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleRecoverPin = async () => {
    if (!recoveryPassword) {
      Alert.alert('Erro', 'Digite a senha da sua conta para recuperar o PIN.');
      return;
    }
    setRecoveryLoading(true);
    try {
      if (!auth.currentUser?.email) throw new Error("Usuário não logado");
      await signInWithEmailAndPassword(auth, auth.currentUser.email, recoveryPassword);
      const userPin = await SecureStore.getItemAsync('user_pin');
      Alert.alert('PIN Recuperado', `Seu PIN principal é: ${userPin}`);
      setShowRecovery(false);
      setRecoveryPassword('');
    } catch (e: any) {
      Alert.alert('Erro na Autenticação', 'Senha incorreta. Tente novamente.');
    } finally {
      setRecoveryLoading(false);
    }
  };
"""
if "const [showRecovery" not in content:
    content = content.replace('const [customBg, setCustomBg] = useState<string | null>(null);', 'const [customBg, setCustomBg] = useState<string | null>(null);\n' + state_insert)

# 3. Main Return wrapping and Modal insertion
# The main return starts near the end. Let's find: `return (\n    <Modal visible={visible}` or `return (\r\n    <Modal visible={visible}`
content = re.sub(r'return\s*\(\s*<Modal visible=\{visible\} animationType="fade" transparent=\{false\}>', r'return (\n    <>\n      <Modal visible={visible} animationType="fade" transparent={false}>', content, count=1)

# Now find the end of the main return
end_pattern = r'(\s*<\/View>\s*<\/Modal>\s*\);\s*\})'

end_replace = """
        <TouchableOpacity onPress={() => setShowRecovery(true)} style={{ marginTop: 30 }}>
          <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular', textDecorationLine: 'underline' }}>Esqueci o PIN</Text>
        </TouchableOpacity>
      </View>
    </Modal>

      {/* PIN Recovery Modal */}
      <Modal visible={showRecovery} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Recuperar PIN</Text>
            <Text style={{ color: theme.textSecondary, marginBottom: 15, textAlign: 'center' }}>
              Digite a senha da sua conta STASHFLIX ({auth.currentUser?.email}) para visualizar seu PIN principal.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Senha da conta"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              value={recoveryPassword}
              onChangeText={setRecoveryPassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={() => setShowRecovery(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.tint }]} onPress={handleRecoverPin}>
                <Text style={styles.modalBtnText}>{recoveryLoading ? 'Verificando...' : 'Recuperar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
"""
if "{/* PIN Recovery Modal */}" not in content:
    content = re.sub(end_pattern, end_replace, content, count=1)

with open('components/LockScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
