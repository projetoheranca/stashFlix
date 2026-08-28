import re

with open('app/(drawer)/settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the missing functions
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

# Insert right after `const router = useRouter();`
if "handleOpenPinModal" not in content:
    content = content.replace('const router = useRouter();', 'const router = useRouter();\n' + func_insert)

with open('app/(drawer)/settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
