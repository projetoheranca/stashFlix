import re

with open('app/(drawer)/settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

func_to_insert = """
  const handleSavePin = async () => {
    if (!newPinValue || newPinValue.length < 4) {
      Alert.alert('Erro', 'O novo PIN deve ter pelo menos 4 dgitos.');
      return;
    }
    const currentStored = await SecureStore.getItemAsync(pinTypeToEdit);
    if (currentStored && currentStored !== currentPinValue) {
      Alert.alert('Erro', 'O PIN atual est incorreto.');
      return;
    }
    await SecureStore.setItemAsync(pinTypeToEdit, newPinValue);
    Alert.alert('Sucesso', 'PIN atualizado com sucesso.');
    setPinModalVisible(false);
    setCurrentPinValue('');
    setNewPinValue('');
  };

  const handleToggleGhostMode"""

content = content.replace("  const handleToggleGhostMode", func_to_insert)

with open('app/(drawer)/settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
