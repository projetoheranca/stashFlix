import re

with open('components/LockScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove all injected Modals
modal_pattern = r'\{\/\*\s*PIN Recovery Modal\s*\*\/\}.*?<\/Modal>'
content = re.sub(modal_pattern, '', content, flags=re.DOTALL)

# 2. Remove all injected Esqueci o PIN touchables
btn_pattern = r'<TouchableOpacity onPress=\{.*?setShowRecovery\(true\).*?<\/TouchableOpacity>'
content = re.sub(btn_pattern, '', content, flags=re.DOTALL)

# 3. We have "signInWithEmailAndPassword" and the state variables in there, let's keep them if they are correct.
# Let's verify the file doesn't have multiple state declarations.
# It should be fine if they were only injected once.

# 4. Now, let's insert the Modal ONLY ONCE.
# The component ends before `const styles = StyleSheet.create({`.
# So we can find `  );\n}\n\nconst styles = StyleSheet.create({`
# But wait, it might end with `  );\n}\n\nconst styles = StyleSheet.create({`.
# Let's just insert it right before `}\n\nconst styles = StyleSheet.create({`
# But wait, it's inside the return? 
# No, `LockScreen` returns a JSX element. If we want to add another `<Modal>`, it has to be inside the parent fragment or view, OR we wrap the return in `<> ... </>`.
# But wait, `LockScreen.tsx` returns a `<Modal visible={visible}>`.
# We CANNOT have a sibling `<Modal>` returned without a fragment.
# Let's change the `return (` to `return (\n    <>` and the `  );\n}` to `    </>\n  );\n}`.

if "return (\n    <>" not in content:
    content = content.replace('return (\n    <Modal', 'return (\n    <>\n    <Modal')
    # Find the last `</Modal>` before `const styles`
    last_modal_index = content.rfind('</Modal>')
    if last_modal_index != -1:
        # We need to insert the new Modal after this `</Modal>` but before `</>`
        # Wait, if we haven't added `</>` yet, let's add it.
        # Actually, let's just insert the Modal and `</>` right after the last `</Modal>` of the main return.
        
        modal_insert = """
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
"""
        content = content[:last_modal_index + 8] + "\n" + modal_insert + content[last_modal_index + 8:]

with open('components/LockScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
