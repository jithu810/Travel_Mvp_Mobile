import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const canonical = require.resolve('three');
const metroPath = resolve('metro.config.js');
function configuration(expoResolver = null, assetExts = ['png', 'jpg']) {
  const base = { resolver: { resolveRequest: expoResolver, assetExts, unstable_enablePackageExports: true } };
  const fakeRequire = name => {
    assert.equal(name, 'expo/metro-config');
    return { getDefaultConfig: directory => { assert.equal(directory, dirname(metroPath)); return base; } };
  };
  fakeRequire.resolve = name => { assert.equal(name, 'three'); return canonical; };
  const module = { exports: {} };
  new Function('require', 'module', '__dirname', readFileSync(metroPath, 'utf8'))(fakeRequire, module, dirname(metroPath));
  return module.exports;
}
test('Android import and require paths share the Fiber-patched Three entry across companion and addons', () => {
  const config = configuration();
  for (const originModulePath of [
    'src/components/companion/companion-scene.native.tsx',
    'node_modules/@react-three/fiber/native/dist/react-three-fiber-native.cjs.dev.js',
    'node_modules/@react-three/fiber/dist/events-21d8cd92.cjs.dev.js',
    'node_modules/three/examples/jsm/loaders/GLTFLoader.js',
    'node_modules/three/examples/jsm/utils/BufferGeometryUtils.js',
  ]) for (const isESMImport of [true, false]) {
    const context = { originModulePath, isESMImport, resolveRequest: () => assert.fail('Canonical Android import must not split through package exports') };
    const result = config.resolver.resolveRequest(context, 'three', 'android');
    assert.deepEqual(result, { type: 'sourceFile', filePath: canonical });
    assert.equal(require(result.filePath).TextureLoader, require('three').TextureLoader);
  }
  assert.ok(canonical.endsWith('three.cjs'));
});
test('all unrelated requests, addon paths, assets and non-Android requests retain Metro delegation', () => {
  const config = configuration();
  assert.deepEqual(config.resolver.assetExts, ['png', 'jpg', 'glb']);
  assert.equal(config.resolver.unstable_enablePackageExports, true);
  for (const [request, platform] of [
    ['three', 'ios'], ['three', 'web'], ['three', null],
    ['three/examples/jsm/loaders/GLTFLoader.js', 'android'],
    ['three/addons/loaders/GLTFLoader.js', 'android'],
    ['@rnmapbox/maps', 'android'], ['expo-gl', 'android'], ['expo-asset', 'android'],
    ['./assets/companion/explorer.glb', 'android'], ['./assets/companion/explorer-texture.png', 'android'],
  ]) {
    const expected = { type: 'sourceFile', filePath: 'unchanged' };
    const context = { isESMImport: true, unstable_conditionNames: ['react-native'], resolveRequest: (received, name, target) => {
      assert.equal(received, context); assert.equal(name, request); assert.equal(target, platform); return expected;
    } };
    assert.equal(config.resolver.resolveRequest(context, request, platform), expected);
  }
});
test('an existing Expo resolver is chained unchanged and glb registration stays additive', () => {
  const expected = { type: 'assetFiles', filePaths: ['original'] };
  let calls = 0;
  const context = { resolveRequest: () => assert.fail('Must preserve Expo resolver first') };
  const config = configuration((received, name, platform) => {
    calls++; assert.equal(received, context); assert.equal(name, 'unchanged-package'); assert.equal(platform, 'android'); return expected;
  }, ['png', 'glb']);
  assert.deepEqual(config.resolver.assetExts, ['png', 'glb']);
  assert.equal(config.resolver.resolveRequest(context, 'unchanged-package', 'android'), expected);
  assert.equal(calls, 1);
  config.resolver.resolveRequest(context, 'three', 'android'); assert.equal(calls, 1);
});
test('installed native texture adapter and GLTF addon work with the canonical CommonJS classes on CPU', async () => {
  const config = require(metroPath);
  const THREE = require(canonical);
  const originalLoad = THREE.TextureLoader.prototype.load;
  const native = readFileSync('node_modules/@react-three/fiber/native/dist/react-three-fiber-native.cjs.dev.js', 'utf8');
  const start = native.indexOf('THREE__namespace.TextureLoader.prototype.load = function load');
  const end = native.indexOf('// Fetches assets via FS', start);
  assert.ok(start > 0 && end > start, 'Inspect installed adapter if Fiber changes');
  const cache = new Map();
  // Transpile installed addon ESM as Metro does, resolving each bare three through the actual config.
  function addon(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} }; cache.set(file, module.exports);
    const localRequire = createRequire(file);
    const resolveDependency = name => {
      const result = config.resolver.resolveRequest({ originModulePath: file, isESMImport: true,
        resolveRequest: (_context, request) => ({ type: 'sourceFile', filePath: localRequire.resolve(request) }) }, name, 'android');
      if (result.filePath === canonical) return THREE;
      assert.ok(['BufferGeometryUtils.js', 'SkeletonUtils.js'].some(name => result.filePath.endsWith(name)), result.filePath);
      return addon(result.filePath);
    };
    const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('require', 'module', 'exports', compiled)(resolveDependency, module, module.exports);
    return module.exports;
  }
  try {
    assert.equal(typeof document, 'undefined');
    // Only native image/asset I/O is mocked; this is Fiber's installed adapter body.
    new Function('THREE__namespace', 'getAsset', 'reactNative', native.slice(start, end))(
      THREE, async () => 'file:///bundled-palette.png', { Image: { getSize: (_uri, done) => done(1024, 1024) } });
    const texture = await new THREE.TextureLoader().loadAsync('file:///bundled-palette.png');
    assert.equal(texture.image.data.localUri, 'file:///bundled-palette.png');
    const { GLTFLoader } = addon(require.resolve('three/examples/jsm/loaders/GLTFLoader.js'));
    const loader = new GLTFLoader();
    loader.register(() => ({ name: 'JourneyBundledTexture', loadTexture: () => Promise.resolve(texture) }));
    const bytes = readFileSync('assets/companion/explorer.glb');
    const parsed = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const meshes = parsed.scene.getObjectsByProperty('isMesh', true);
    assert.ok(meshes.length > 0);
    assert.ok(meshes.every(mesh => mesh instanceof THREE.Mesh), 'Addon and renderer constructors share identity');
    assert.deepEqual(parsed.animations.map(clip => clip.name), ['Idle']);
    assert.ok(parsed.animations[0] instanceof THREE.AnimationClip);
    const mixer = new THREE.AnimationMixer(parsed.scene); mixer.clipAction(parsed.animations[0]).play(); mixer.update(0.5);
    mixer.stopAllAction(); mixer.uncacheRoot(parsed.scene);
    meshes.forEach(mesh => mesh.geometry.dispose()); texture.dispose();
  } finally { THREE.TextureLoader.prototype.load = originalLoad; }
});
