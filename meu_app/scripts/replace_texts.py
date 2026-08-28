import os

def replace_in_file(filepath):
    if not os.path.exists(filepath):
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replaces according to the PDF table
    content = content.replace("Backup criptografado para o Firebase", "Backup criptografado na Nuvem")
    content = content.replace("Apaga os dados no Firebase (Compliance)", "Apaga sua conta e todos os dados armazenados na Nuvem")
    content = content.replace("Apaga os dados no Firebase", "Apaga sua conta e todos os dados armazenados na Nuvem")
    content = content.replace("Telemetria Cloud", "Status da Nuvem")
    content = content.replace("Núcleo Cloud — Serverless Active", "Status da Nuvem — Online")
    
    # Also we had "Telemetria Cloud" in settings.tsx
    # Let's verify other instances:
    # "Apagar Conta e Dados (Firebase)" -> "Apagar Conta e Dados da Nuvem"
    content = content.replace("(Firebase)", "(Nuvem)")
    content = content.replace("Firebase", "Nuvem")

    # Revert imports that might have been broken by 'Firebase' -> 'Nuvem' 
    # since we did a global replace.
    content = content.replace("NuvemConfig", "FirebaseConfig")
    content = content.replace("NuvemDB", "FirebaseDB")
    content = content.replace("import { auth } from '@/src/services/NuvemConfig';", "import { auth } from '@/src/services/FirebaseConfig';")
    content = content.replace("from 'firebase/", "from 'firebase/") # firebase package is lowercase, unaffected
    
    # Just in case, let's fix uppercase/camelcase module imports
    content = content.replace("NuvemConfig", "FirebaseConfig")
    content = content.replace("NuvemDB", "FirebaseDB")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

files_to_check = [
    "d:\\bkp\\STASHLYFLIX\\meu_app\\app\\(drawer)\\settings.tsx",
    "d:\\bkp\\STASHLYFLIX\\meu_app\\app\\cloud-backup.tsx",
    "d:\\bkp\\STASHLYFLIX\\meu_app\\app\\(drawer)\\account.tsx"
]

for f in files_to_check:
    replace_in_file(f)

print("Texts updated.")
