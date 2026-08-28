import re

with open('app/_layout.tsx', 'r', encoding='utf-8') as f:
    layout = f.read()

# 1. Add hasPinRef to RootLayout
if "const hasPinRef = useRef(false);" not in layout:
    layout = layout.replace('const appState = useRef(AppState.currentState);', 'const appState = useRef(AppState.currentState);\n  const hasPinRef = useRef(false);')

# 2. Update hasPinRef in checkRouting
if "hasPinRef.current = hasPin;" not in layout:
    layout = layout.replace('const hasPin = userPin !== null && userPin !== undefined && userPin.length > 0;', 'const hasPin = userPin !== null && userPin !== undefined && userPin.length > 0;\n        hasPinRef.current = hasPin;')

# 3. Make AppState listener synchronous for locking
app_state_pattern = r'if \(user\) \{\s*const userPin = await SecureStore\.getItemAsync\(\'user_pin\'\);\s*if \(userPin !== null && userPin !== undefined && userPin\.length > 0\) \{\s*setIsLocked\(true\); \/\/ Bloqueio background ativado\s*\}\s*\}'
app_state_replace = """if (user && hasPinRef.current) {
          setIsLocked(true); // Bloqueio background ativado (Síncrono)
        }"""
layout = re.sub(app_state_pattern, app_state_replace, layout, flags=re.DOTALL)

with open('app/_layout.tsx', 'w', encoding='utf-8') as f:
    f.write(layout)
