const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});
project.addSourceFilesAtPaths("app/**/*.tsx");
project.addSourceFilesAtPaths("components/**/*.tsx");

const ptDict = {};

function generateKey(str) {
  let clean = str.replace(/[^a-zA-Z0-9 ]/g, '').trim().toLowerCase().replace(/ /g, '_');
  if (clean.length > 25) clean = clean.substring(0, 25);
  if (!clean) clean = 'str_' + Math.floor(Math.random()*10000);
  let key = clean;
  let i = 1;
  while(ptDict[key] && ptDict[key] !== str) {
    key = clean + '_' + i;
    i++;
  }
  return key;
}

const sourceFiles = project.getSourceFiles();

for (const sourceFile of sourceFiles) {
  let modified = false;
  
  const jsxTexts = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText).reverse();
  for (const text of jsxTexts) {
    const raw = text.getLiteralText();
    const cleaned = raw.trim();
    
    if (cleaned.length > 1 && /[a-zA-Z]/.test(cleaned)) {
      const key = generateKey(cleaned);
      ptDict[key] = cleaned;
      text.replaceWithText(` {t('${key}')} `);
      modified = true;
    }
  }
  
  if (modified) {
    const imports = sourceFile.getImportDeclarations();
    const hasTImport = imports.some(i => i.getModuleSpecifierValue() === '@/src/i18n');
    if (!hasTImport) {
      sourceFile.addImportDeclaration({
        namedImports: ['t'],
        moduleSpecifier: '@/src/i18n'
      });
    }
    sourceFile.saveSync();
  }
}

fs.writeFileSync('src/locales/pt_auto.json', JSON.stringify(ptDict, null, 2), 'utf8');
console.log('Extraction complete. Keys found: ' + Object.keys(ptDict).length);
