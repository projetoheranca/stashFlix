import re

path = "d:\\bkp\\STASHLYFLIX\\meu_app\\app\\paywall.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the single subscribe button with two clear buttons
btn_regex = r"<TouchableOpacity\s*style=\{\[styles\.subscribeButton.*?ATIVAR PROTOCOLO \{selectedTier\}</Text>\s*</TouchableOpacity>"
btn_new = """
      <View style={{ width: '100%', gap: 10 }}>
        {selectedTier === 'PRO' && (
          <TouchableOpacity 
            style={[styles.subscribeButton, { backgroundColor: theme.tint, shadowColor: theme.tint }]}
            activeOpacity={0.8}
            onPress={handleUpgrade}
            disabled={loading}
          >
            <Animated.View style={[styles.shimmer, shimmerStyle]} />
            <Text style={styles.buttonText}>ASSINAR PRO</Text>
          </TouchableOpacity>
        )}
        
        {selectedTier === 'ULTRA' && (
          <TouchableOpacity 
            style={[styles.subscribeButton, { backgroundColor: '#00FFCC', shadowColor: '#00FFCC' }]}
            activeOpacity={0.8}
            onPress={handleUpgrade}
            disabled={loading}
          >
            <Animated.View style={[styles.shimmer, shimmerStyle]} />
            <Text style={styles.buttonText}>ASSINAR ULTRA</Text>
          </TouchableOpacity>
        )}
      </View>
"""
content = re.sub(btn_regex, btn_new.strip(), content, flags=re.DOTALL)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("paywall buttons updated")
