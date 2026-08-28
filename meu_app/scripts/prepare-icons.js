/**
 * prepare-icons.js
 *
 * This script copies and resizes the disguise icon PNGs from assets/images
 * into the correct Android mipmap-* directories required by react-native-change-icon.
 *
 * Run this ONCE before each EAS build:
 *   node scripts/prepare-icons.js
 *
 * Requires: npm install sharp (already available in most environments)
 * If sharp is not available: npm install sharp --save-dev
 */

const fs = require('fs');
const path = require('path');

// Map of our icon names to source image file
const ICON_MAP = [
  { name: 'ic_launcher_default',    src: 'assets/images/app-icon.jpg' },
  { name: 'ic_launcher_calculator', src: 'assets/images/calculadora.png' },
  { name: 'ic_launcher_weather',    src: 'assets/images/clima.png' },
  { name: 'ic_launcher_browser',    src: 'assets/images/navegador.png' },
  { name: 'ic_launcher_safari',     src: 'assets/images/safari.png' },
  { name: 'ic_launcher_buscador',   src: 'assets/images/buscador.png' },
];

// Android mipmap sizes
const MIPMAP_SIZES = [
  { folder: 'mipmap-mdpi',    size: 48  },
  { folder: 'mipmap-hdpi',    size: 72  },
  { folder: 'mipmap-xhdpi',   size: 96  },
  { folder: 'mipmap-xxhdpi',  size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

const RES_BASE = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

async function run() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('❌ sharp not found. Run: npm install sharp --save-dev');
    process.exit(1);
  }

  for (const { name, src } of ICON_MAP) {
    const srcPath = path.join(__dirname, '..', src);
    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠️  Source not found, skipping: ${src}`);
      continue;
    }

    for (const { folder, size } of MIPMAP_SIZES) {
      const destDir = path.join(RES_BASE, folder);
      const destFile = path.join(destDir, `${name}.png`);

      fs.mkdirSync(destDir, { recursive: true });

      await sharp(srcPath)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .png()
        .toFile(destFile);

      console.log(`✅ Created: ${folder}/${name}.png (${size}x${size})`);
    }
  }

  console.log('\n🎉 All icons generated! You can now run: eas build -p android --profile production');
}

run().catch(console.error);
