const fs = require('fs');
const path = require('path');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.js') || p.endsWith('.tsx') || p.endsWith('.ts')) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes('expo-file-system')) {
        let newContent = content.replace(/from\s+['"]expo-file-system['"]/g, "from 'expo-file-system/legacy'");
        if (content !== newContent) {
          fs.writeFileSync(p, newContent);
          console.log('Updated ' + p);
        }
      }
    }
  });
}

walk('src');
walk('app');
walk('components');
console.log('Done');
