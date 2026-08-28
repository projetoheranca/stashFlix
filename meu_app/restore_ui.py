import os

filepath = 'app/album/[id].tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith('// '):
        new_lines.append(line[3:])
    else:
        new_lines.append(line)
        
with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Restored.")
