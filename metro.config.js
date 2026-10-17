const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes('glb')) config.resolver.assetExts.push('glb');
// Fiber native patches the CommonJS TextureLoader. Metro otherwise selects a
// separate ESM Three runtime for ES imports, leaving those loaders DOM-based.
const androidThree = require.resolve('three');
const expoResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'android' && moduleName === 'three') {
    return { type: 'sourceFile', filePath: androidThree };
  }
  return expoResolveRequest
    ? expoResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
