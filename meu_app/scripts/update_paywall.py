import re

path = "d:\\bkp\\STASHLYFLIX\\meu_app\\app\\paywall.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Adicionar estado para período (Mensal ou Anual)
state_regex = r"const \[selectedTier, setSelectedTier\] = useState<'PRO' \| 'ULTRA'>\('PRO'\);"
state_replacement = """const [selectedTier, setSelectedTier] = useState<'PRO' | 'ULTRA'>('PRO');
  const [selectedPeriod, setSelectedPeriod] = useState<'MENSAL' | 'ANUAL'>('MENSAL');"""
content = re.sub(state_regex, state_replacement, content)

# Atualizar lógica de compra
purchase_regex = r"const targetPkg = packages\.find\(p => p\.identifier\.toLowerCase\(\)\.includes\(selectedTier\.toLowerCase\(\)\)\) \|\| packages\[0\];"
purchase_replacement = """
      const expectedId = `${selectedTier.toLowerCase()}_${selectedPeriod.toLowerCase()}`;
      const targetPkg = packages.find(p => p.identifier.toLowerCase() === expectedId) || packages.find(p => p.identifier.toLowerCase().includes(selectedTier.toLowerCase()));
"""
content = re.sub(purchase_regex, purchase_replacement.strip(), content)

# Atualizar UI para botões Mensal/Anual
btn_regex = r"<View style=\{\{ width: '100%', gap: 10 \}\}>.*?</View>"
btn_replacement = """
      {/* Opções de Período */}
      <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginBottom: 20 }}>
        <TouchableOpacity 
          style={[styles.toggleBtn, { borderWidth: 1, borderColor: selectedPeriod === 'MENSAL' ? theme.tint : '#333', backgroundColor: selectedPeriod === 'MENSAL' ? 'rgba(255,255,255,0.1)' : 'transparent' }]}
          onPress={() => setSelectedPeriod('MENSAL')}
        >
          <Text style={[styles.toggleText, { color: selectedPeriod === 'MENSAL' ? '#FFF' : '#888' }]}>MENSAL</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.toggleBtn, { borderWidth: 1, borderColor: selectedPeriod === 'ANUAL' ? theme.tint : '#333', backgroundColor: selectedPeriod === 'ANUAL' ? 'rgba(255,255,255,0.1)' : 'transparent' }]}
          onPress={() => setSelectedPeriod('ANUAL')}
        >
          <Text style={[styles.toggleText, { color: selectedPeriod === 'ANUAL' ? '#FFF' : '#888' }]}>ANUAL</Text>
        </TouchableOpacity>
      </View>

      <View style={{ width: '100%', gap: 10 }}>
        <TouchableOpacity 
          style={[styles.subscribeButton, { backgroundColor: selectedTier === 'ULTRA' ? '#00FFCC' : theme.tint, shadowColor: selectedTier === 'ULTRA' ? '#00FFCC' : theme.tint }]}
          activeOpacity={0.8}
          onPress={handleUpgrade}
          disabled={loading}
        >
          <Animated.View style={[styles.shimmer, shimmerStyle]} />
          <Text style={styles.buttonText}>ASSINAR {selectedTier} ({selectedPeriod})</Text>
        </TouchableOpacity>
      </View>
"""
content = re.sub(btn_regex, btn_replacement.strip(), content, flags=re.DOTALL)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("paywall modificado para Mensal e Anual")
