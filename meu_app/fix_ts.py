import os

def replace_in_file(path, old_text, new_text):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(old_text, new_text)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# VaultService.ts
vs_path = "d:/bkp/STASHLYFLIX/meu_app/src/services/VaultService.ts"
replace_in_file(vs_path, "export const getCloudCatalog = async () => [];", "export const getCloudCatalog = async (isDecoy = false) => [];")
replace_in_file(vs_path, "export const syncVaultToCloud = async () => 0;", "export const syncVaultToCloud = async (isDecoy = false) => 0;")
replace_in_file(vs_path, "import * as FileSystem from 'expo-file-system';", "import * as FileSystem from 'expo-file-system';")

# index.tsx
idx_path = "d:/bkp/STASHLYFLIX/meu_app/app/(drawer)/index.tsx"
replace_in_file(idx_path, "albumId: selectedLocalAlbum.id,", "album: selectedLocalAlbum.id,")

# settings.tsx
set_path = "d:/bkp/STASHLYFLIX/meu_app/app/(drawer)/settings.tsx"
replace_in_file(set_path, "syncVaultToCloud(false)", "syncVaultToCloud()")

# album/[id].tsx
alb_path = "d:/bkp/STASHLYFLIX/meu_app/app/album/[id].tsx"
replace_in_file(alb_path, "name: asset.fileName || 'unknown',", "name: asset.name || 'unknown',")
replace_in_file(alb_path, "name: asset.fileName ||", "name: asset.name ||")

# decoy.tsx
dec_path = "d:/bkp/STASHLYFLIX/meu_app/app/decoy.tsx"
replace_in_file(dec_path, "albumId: selectedLocalAlbum.id,", "album: selectedLocalAlbum.id,")

# LockScreen.tsx
lock_path = "d:/bkp/STASHLYFLIX/meu_app/components/LockScreen.tsx"
replace_in_file(lock_path, "setItemAsync('user_pin', pin);", "setItemAsync('user_pin', pin || '');")
replace_in_file(lock_path, "setItemAsync('decoy_pin', pin);", "setItemAsync('decoy_pin', pin || '');")

print("Fixed!")
