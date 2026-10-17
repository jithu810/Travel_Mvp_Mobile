/* Three.js intrinsic elements are rendered by Fiber, not native View props. */
/* eslint-disable react/no-unknown-property */
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { useEffect, useEffectEvent, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Box3, Mesh, Texture, Vector3, type Group, TextureLoader, type Material } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createCompanionIdle } from '@/lib/companion/idle';
import { startCompanionFrames } from '@/lib/companion/model';

export type CompanionSceneProps = {
  reduceMotion: boolean;
  registerWave: (play: (() => void) | null) => void;
  onWaveChange: (active: boolean) => void;
  onPointChange: (active: boolean) => void;
  registerStop: (stop: () => void) => () => void;
  onFailure: () => void;
  onReady: () => void;
  onMotionFrame: (seconds: number) => void;
};
function disposeModel(scene: Group) {
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    if ('skeleton' in object) (object as Mesh & { skeleton: { dispose: () => void } }).skeleton.dispose();
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    material.dispose();
  }
  textures.forEach(texture => texture.dispose());
}
export function CompanionScene(props: CompanionSceneProps) {
  const { onFailure } = props;
  const [model, setModel] = useState<GLTF | null>(null);
  useEffect(() => {
    let mounted = true;
    let owned: GLTF | null = null;
    let texture: Texture | null = null;
    const timeout = setTimeout(() => { if (mounted) onFailure(); }, 15000);
    (async () => {
      // Static require is required by Metro for packaged binary assets.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const asset = await Asset.fromModule(require('../../../assets/companion/explorer.glb')).downloadAsync();
      if (!mounted) return;
      if (!asset.localUri) throw Error('Bundled model unavailable');
      const bytes = await new File(asset.localUri).arrayBuffer();
      if (!mounted) return;
      // Self-contained GLB: no remote models, textures or decoder downloads.
      // Use a stable bundled PNG instead of the native Blob polyfill's per-load temporary file.
      const image = await Asset.fromModule(require('../../../assets/companion/explorer-texture.png')).downloadAsync();
      if (!mounted) return;
      if (!image.localUri) throw Error('Bundled texture unavailable');
      texture = await new TextureLoader().loadAsync(image.localUri);
      texture.flipY = false;
      if (!mounted) { texture.dispose(); return; }
      const localTexture = texture;
      const loader = new GLTFLoader();
      loader.register(() => ({ name: 'JourneyBundledTexture', loadTexture: () => Promise.resolve(localTexture) }));
      const parsed = await loader.parseAsync(bytes, '');
      if (!mounted) { disposeModel(parsed.scene); return; }
      owned = parsed;
      const bounds = new Box3().setFromObject(parsed.scene);
      const center = bounds.getCenter(new Vector3());
      const height = bounds.getSize(new Vector3()).y;
      if (!Number.isFinite(height) || height <= 0) throw Error('Invalid model bounds');
      parsed.scene.position.sub(center);
      parsed.scene.rotation.y = -0.35;
      setModel(parsed);
      clearTimeout(timeout);
    })().catch(() => { if (mounted) onFailure(); });
    return () => { mounted = false; clearTimeout(timeout); if (owned) disposeModel(owned.scene); else texture?.dispose(); };
  }, [onFailure]);
  if (!model) return null;
  return <Canvas style={styles.canvas} pointerEvents="none" frameloop="never" orthographic
    camera={{ position: [0, 0, 5], zoom: 48, near: 0.1, far: 20 }}
    gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
    onCreated={({ gl, scene, events }) => { scene.background = null; gl.setClearColor(0x000000, 0); events.disconnect?.(); }}>
    <ambientLight intensity={1.5} />
    <directionalLight position={[3, 4, 5]} intensity={2} />
    <Mascot model={model} {...props} />
  </Canvas>;
}
function Mascot({ model, reduceMotion, registerStop, onFailure, onReady, onMotionFrame, registerWave, onWaveChange, onPointChange }: CompanionSceneProps & { model: GLTF }) {
  const motionFrame = useEffectEvent(onMotionFrame);
  const advance = useThree(state => state.advance);
  const [idle] = useState(() => createCompanionIdle(model.scene, model.animations));
  useEffect(() => { idle.reset(); }, [idle, reduceMotion]);
  useEffect(() => () => idle.dispose(), [idle]);
  useEffect(() => {
    registerWave(() => { if (idle.startGreeting(reduceMotion)) onWaveChange(true); });
    return () => { registerWave(null); idle.cancelWave(); onPointChange(false); onWaveChange(false); };
  }, [idle, reduceMotion, registerWave, onWaveChange, onPointChange]);
  useFrame((_, delta) => {
    if (reduceMotion) return;
    const wasWaving = idle.isWaving();
    const wasPointing = idle.isPointing();
    idle.advance(delta);
    if (wasPointing !== idle.isPointing()) onPointChange(idle.isPointing());
    if (wasWaving && !idle.isWaving()) onWaveChange(false);
  });
  useEffect(() => {
    if (reduceMotion) {
      // Draw once after the primitive commits, then keep no animation timer.
      const timer = setTimeout(() => { try { const time = performance.now() / 1000; motionFrame(time); advance(time, false); onReady(); } catch { onFailure(); } }, 0);
      return registerStop(() => clearTimeout(timer));
    }
    let firstFrame = true;
    const stop = startCompanionFrames(time => {
      motionFrame(time);
      advance(time, false);
      if (firstFrame) { firstFrame = false; onReady(); }
    }, onFailure);
    return registerStop(() => { stop(); registerWave(null); idle.cancelWave(); onPointChange(false); onWaveChange(false); });
  }, [advance, idle, reduceMotion, registerStop, onFailure, onReady, onWaveChange, onPointChange, registerWave]);
  return <primitive object={model.scene} dispose={null} />;
}
const styles = StyleSheet.create({ canvas: { flex: 1, backgroundColor: 'transparent' } });
