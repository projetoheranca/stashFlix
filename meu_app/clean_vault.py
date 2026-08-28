import re

with open('src/services/VaultService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remover funcoes
funcs_to_remove = [
    'isFilePasswordProtected',
    'verifyFilePassword',
    'encryptFileWithPassword',
    'decryptFile',
    'markFileAsSynced',
    'initVault',
    'cleanCache',
    'nukeRealVault',
    'nukeVault',
    'syncVaultToCloud'
]

for func in funcs_to_remove:
    # regex to remove export const func = async (...) => { ... };
    pattern = r'export const ' + func + r'\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*\};'
    content = re.sub(pattern, '', content)

    # Some might not have async, or might return simple values
    pattern2 = r'export const ' + func + r'\s*=\s*async\s*\([^)]*\)\s*=>\s*[^;]+;'
    content = re.sub(pattern2, '', content)

with open('src/services/VaultService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
