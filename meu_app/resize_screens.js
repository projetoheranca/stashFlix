const fs = require('fs');
const { generateImageAsync } = require('@expo/image-utils');

async function resizeScreenshots() {
  const images = ['wall1.jpg', 'wall2.jpg'];
  const projectRoot = 'd:/bkp/STASHLYFLIX/meu_app';
  
  for (const imgName of images) {
    const srcPath = `d:/bkp/STASHLYFLIX/${imgName}`;
    const outPath = `d:/bkp/STASHLYFLIX/${imgName.replace('.jpg', '')}_playstore.png`;
    
    if (fs.existsSync(srcPath)) {
      try {
        console.log(`Resizing ${imgName}...`);
        const { source } = await generateImageAsync(
          { projectRoot, cacheType: 'screenshots' },
          { src: srcPath, width: 1080, height: 1920, resizeMode: 'cover', backgroundColor: '#000000' }
        );
        fs.writeFileSync(outPath, source);
        console.log(`Saved: ${outPath}`);
      } catch (e) {
        console.error(`Error resizing ${imgName}:`, e.message);
      }
    } else {
      console.log(`File not found: ${srcPath}`);
    }
  }
}

resizeScreenshots();
