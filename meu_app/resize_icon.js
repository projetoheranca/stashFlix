const fs = require('fs');
const path = require('path');

async function resize() {
  try {
    const { generateImageAsync } = require('@expo/image-utils');
    const sourcePath = 'd:/bkp/STASHLYFLIX/meu_app/assets/images/icon.png';
    const outPath = 'd:/bkp/STASHLYFLIX/icone_512x512_playstore.png';
    
    await generateImageAsync(
      { projectRoot: 'd:/bkp/STASHLYFLIX/meu_app', cacheType: 'icon' },
      { src: sourcePath, width: 512, height: 512, resizeMode: 'cover', backgroundColor: '#000000' }
    ).then(({ source }) => {
      fs.writeFileSync(outPath, source);
      console.log('Success! Saved to ' + outPath);
    });
  } catch (e) {
    console.error(e);
  }
}
resize();
