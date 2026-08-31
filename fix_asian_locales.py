import os
import json
import re

locales_dir = r"d:\bkp\STASHLYFLIX\meu_app\src\locales"

def process_file(possible_names, json_filename):
    json_path = os.path.join(locales_dir, json_filename)
    
    # Check all possible names the user might have saved
    content = None
    matched_path = None
    for name in possible_names:
        p = os.path.join(locales_dir, name)
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                content = f.read()
            matched_path = p
            break
            
    if not content:
        print(f"Skipping {json_filename}, file not found.")
        return
        
    # Strip markdown json block if present
    content = content.strip()
    if content.startswith('```json'):
        content = content[7:]
    elif content.startswith('```'):
        content = content[3:]
        
    if content.endswith('```'):
        content = content[:-3]
    content = content.strip()
    
    # Try parsing as JSON to ensure it is valid
    try:
        data = json.loads(content)
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Success: {json_filename} created.")
        if matched_path != json_path:
            os.remove(matched_path)
    except Exception as e:
        print(f"Error parsing {matched_path}: {e}")

process_file(['JA-.txt', 'ja-.txt', 'ja.txt', 'JA.txt', 'ja.json'], 'ja.json')
process_file(['KO-.txt', 'ko-.txt', 'ko.txt', 'KO.txt', 'ko.json'], 'ko.json')
process_file(['ZH-.txt', 'zh-.txt', 'zh.txt', 'ZH.txt', 'zh.json'], 'zh.json')

