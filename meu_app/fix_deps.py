import re

with open('app/_layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change the dependency array of the large useEffect that contains initApp and AppState listener
pattern = r'(\s+if \(accelSubscription\) \{\s*accelSubscription\.remove\(\);\s*\}\s*\};\s*\},\s*)\[\](\);)'
replacement = r'\1[user]\2'

new_content = re.sub(pattern, replacement, content)

if new_content != content:
    with open('app/_layout.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated dependency array to [user]")
else:
    print("Could not find the dependency array [] to replace.")
