import os
import json
import re

locales_dir = r"d:\bkp\STASHLYFLIX\meu_app\src\locales"

def process_file(txt_filename, json_filename):
    txt_path = os.path.join(locales_dir, txt_filename)
    json_path = os.path.join(locales_dir, json_filename)
    
    if not os.path.exists(txt_path):
        return
        
    with open(txt_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Strip markdown json block if present
    content = content.strip()
    if content.startswith('```json'):
        content = content[7:]
    if content.endswith('```'):
        content = content[:-3]
    content = content.strip()
    
    # Try parsing as JSON to ensure it is valid
    try:
        data = json.loads(content)
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Success: {json_filename} created.")
        os.remove(txt_path)
    except Exception as e:
        print(f"Error parsing {txt_filename}: {e}")

process_file('EN-.txt', 'en.json')
process_file('ES-.txt', 'es.json')
process_file('FR-.txt', 'fr.json')
process_file('DE-.txt', 'de.json')

# Copy pt_auto.json to pt.json
import shutil
pt_auto = os.path.join(locales_dir, 'pt_auto.json')
pt = os.path.join(locales_dir, 'pt.json')
if os.path.exists(pt_auto):
    shutil.copy(pt_auto, pt)
    print("Success: pt.json updated.")

