import os
import re

def wipe_lines(filepath, pattern):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if re.search(pattern, line):
            new_lines.append('// ' + line)
        else:
            new_lines.append(line)
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

# app/(drawer)/account.tsx
wipe_lines('app/(drawer)/account.tsx', r'nukeVault')

# app/(drawer)/settings.tsx
wipe_lines('app/(drawer)/settings.tsx', r'nukeVault')
wipe_lines('app/(drawer)/settings.tsx', r'syncVaultToCloud')

# app/album/[id].tsx
with open('app/album/[id].tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the import
content = content.replace('isFilePasswordProtected, verifyFilePassword, decryptFile, encryptFileWithPassword', '')
content = content.replace('import { importToAlbum, getAlbumFiles,  } from', 'import { importToAlbum, getAlbumFiles } from')

with open('app/album/[id].tsx', 'w', encoding='utf-8') as f:
    f.write(content)

wipe_lines('app/album/[id].tsx', r'isFilePasswordProtected|verifyFilePassword|decryptFile|encryptFileWithPassword')
wipe_lines('app/album/[id].tsx', r'decryptedUri|isProtected|handleVerifyFilePassword|pwdInput|setPwdInput|pwdTargetFile|setPwdTargetFile|pwdModalVisible|setPwdModalVisible|newFilePwd|setNewFilePwd|setPwdModalSetVisible|setPwdTargetUri|handleEncryptFileWithPassword')

print("UI cleanup done.")
