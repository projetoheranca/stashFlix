import re

with open('app/_layout.tsx', 'r', encoding='utf-8') as f:
    layout = f.read()

app_state_pattern = r'const subscription = AppState\.addEventListener\(\'change\', async \(nextAppState: AppStateStatus\) => \{.*?\}\);\n'

app_state_replace = """const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Quando o app VOLTA para o primeiro plano (active)
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (user) {
          SecureStore.getItemAsync('user_pin').then(userPin => {
            if (userPin !== null && userPin !== undefined && userPin.length > 0) {
              setIsLocked(true); // Trava a tela ao voltar pro app
            }
          });
        }
      }

      // Quando o app VAI para segundo plano (background)
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        if ((global as any).ignoreNextBackground) {
          (global as any).ignoreNextBackground = false;
        } else {
          // Podemos travar síncronamente aqui tbm, mas como o hasPinRef pode estar desatualizado,
          // preferimos garantir o bloqueio no retorno pro app (código acima).
        }
      }

      appState.current = nextAppState;
    });\n"""

layout = re.sub(app_state_pattern, app_state_replace, layout, flags=re.DOTALL)

with open('app/_layout.tsx', 'w', encoding='utf-8') as f:
    f.write(layout)
