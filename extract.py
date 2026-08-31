import re, os, json

def extract_strings(directory):
    strings = set()
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Match <Text>...</Text>
                texts = re.findall(r'<Text[^>]*>\s*([^<]+?)\s*</Text>', content)
                for t in texts:
                    if re.search(r'[a-zA-Z]', t) and not t.startswith('{'):
                        strings.add(t.strip())
                        
                # Match Alert.alert("...", "...")
                alerts = re.findall(r'Alert\.alert\(\s*["\']([^"\']+)["\']\s*,\s*["\']([^"\']+)["\']', content)
                for t1, t2 in alerts:
                    strings.add(t1.strip())
                    strings.add(t2.strip())
                    
    return list(strings)

all_strings = extract_strings('meu_app/app') + extract_strings('meu_app/components')
print(f'Found {len(all_strings)} strings.')
with open('strings_to_translate.json', 'w', encoding='utf-8') as f:
    json.dump(all_strings, f, ensure_ascii=False, indent=2)
