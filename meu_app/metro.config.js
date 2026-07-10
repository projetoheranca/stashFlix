const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
// Firebase v10+ tem problemas de compatibilidade com a exportação de pacotes do Metro no Expo.
// Desativar "packageExports" força o Metro a resolver os arquivos corretamente para o React Native.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
