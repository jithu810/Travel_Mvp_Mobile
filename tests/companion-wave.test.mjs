import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function load(file, deps) {
  const exports = {};
  const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  new Function('require', 'exports', output)(name => { assert.ok(name in deps, name); return deps[name]; }, exports);
  return exports;
}
const wave = load('src/lib/companion/wave.ts', { three: THREE });
const { createCompanionIdle } = load('src/lib/companion/idle.ts', { three: THREE, './wave': wave });
async function asset() {
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'CPU-texture', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
  const bytes = readFileSync('assets/companion/explorer.glb');
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
const names = ['upperarmr', 'lowerarmr', 'wristr'];
test('real rig wave-to-point-to-idle sequence stays smooth, anchored and fully framed with authored feet', async () => {
  const enhanced = await asset(), original = await asset();
  for (const g of [enhanced, original]) {
    const center = new THREE.Box3().setFromObject(g.scene).getCenter(new THREE.Vector3());
    g.scene.position.sub(center); g.scene.rotation.y = -.35;
  }
  const idle = createCompanionIdle(enhanced.scene, enhanced.animations);
  const baseline = createCompanionIdle(original.scene, original.animations);
  idle.reset(); baseline.reset(); assert.equal(idle.startGreeting(), true);
  const camera = new THREE.OrthographicCamera(-104/96, 104/96, 140/96, -140/96, .1, 20);
  camera.position.z = 5; camera.updateMatrixWorld();
  let raised = false, pointed = false; const phases = []; let lastPhase;
  let previous = names.map(n => enhanced.scene.getObjectByName(n).quaternion.clone());
  for (let i = 0; i < 180; i++) {
    idle.advance(1/30); baseline.advance(1/30);
    const phase = idle.isPointing() ? 'point' : idle.isWaving() ? 'wave' : 'idle';
    if (phase !== lastPhase) { phases.push(phase); lastPhase = phase; }
    if (phase !== 'idle') assert.equal(idle.startGreeting(), false, 'No sequence restart in either gesture');
    enhanced.scene.updateMatrixWorld(true); original.scene.updateMatrixWorld(true);
    for (const n of ['footl', 'footr', 'toesl', 'toesr']) {
      assert.ok(enhanced.scene.getObjectByName(n).getWorldPosition(new THREE.Vector3())
        .distanceTo(original.scene.getObjectByName(n).getWorldPosition(new THREE.Vector3())) < 1e-7);
    }
    for (let j = 0; j < names.length; j++) {
      const joint = enhanced.scene.getObjectByName(names[j]);
      assert.ok(joint.quaternion.angleTo(previous[j]) < .25, 'Smooth joint transition');
      previous[j].copy(joint.quaternion);
      const authored = original.scene.getObjectByName(names[j]);
      assert.ok(joint.position.distanceTo(authored.position) < 1e-9);
      assert.ok(joint.scale.distanceTo(authored.scale) < 1e-9);
    }
    const hand = enhanced.scene.getObjectByName('handr').getWorldPosition(new THREE.Vector3());
    const shoulder = enhanced.scene.getObjectByName('upperarmr').getWorldPosition(new THREE.Vector3());
    raised ||= hand.y > shoulder.y + .12;
    if (idle.isPointing()) {
      const elbow = enhanced.scene.getObjectByName('lowerarmr').getWorldPosition(new THREE.Vector3());
      const wrist = enhanced.scene.getObjectByName('wristr').getWorldPosition(new THREE.Vector3());
      pointed ||= wrist.clone().sub(elbow).normalize().y < -.85;
    }
    assert.ok(enhanced.scene.position.distanceTo(original.scene.position) < 1e-9, 'No character travel');
    assert.ok(enhanced.scene.quaternion.angleTo(original.scene.quaternion) < 1e-7, 'No whole-model rotation');
    enhanced.scene.traverse(o => { if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); } });
    const box = new THREE.Box3().setFromObject(enhanced.scene);
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = new THREE.Vector3(x, y, z).project(camera);
      assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1, 'Entire wave fits camera');
    }
  }
  assert.ok(raised); assert.ok(pointed); assert.deepEqual(phases,['wave','point','idle']); assert.equal(idle.isWaving(), false);
  for (const n of names) assert.ok(enhanced.scene.getObjectByName(n).quaternion.angleTo(original.scene.getObjectByName(n).quaternion) < 1e-7);
  idle.dispose(); baseline.dispose();
});
test('repeated taps never restart or stack; cancellation restores authored arm and reset can replay safely', async () => {
  const g = await asset(); const idle = createCompanionIdle(g.scene, g.animations); idle.reset();
  assert.ok(idle.startWave());
  for (let i = 0; i < 20; i++) { idle.advance(1/30); assert.equal(idle.startWave(), false); }
  const pose = names.map(n => g.scene.getObjectByName(n).quaternion.clone());
  for (let i = 0; i < 100; i++) idle.advance(0);
  names.forEach((n, i) => assert.ok(pose[i].angleTo(g.scene.getObjectByName(n).quaternion) < 1e-7, 'No accumulated offsets'));
  for (let i = 0; i < 60; i++) { idle.advance(1/30); if (i < 57) assert.equal(idle.startWave(), false); }
  assert.equal(idle.isWaving(), false);
  assert.ok(idle.startWave()); idle.advance(.1); idle.cancelWave(); assert.equal(idle.isWaving(), false);
  const arm = g.scene.getObjectByName('upperarmr').quaternion.clone(); idle.advance(0);
  assert.ok(arm.angleTo(g.scene.getObjectByName('upperarmr').quaternion) < 1e-7);
  idle.dispose(); assert.equal(idle.startWave(), false);
  idle.reset(); assert.ok(idle.startWave(), 'Effect cleanup/setup replay remains usable'); idle.dispose();
});
test('Reduce Motion and unsupported/missing arm hierarchy fail safely without mutating the model', async () => {
  const g = await asset(); const idle = createCompanionIdle(g.scene, g.animations); idle.reset();
  const arm = g.scene.getObjectByName('upperarmr').quaternion.clone();
  assert.equal(idle.startWave(true), false); assert.equal(idle.isWaving(), false);
  assert.ok(arm.angleTo(g.scene.getObjectByName('upperarmr').quaternion) < 1e-7);
  idle.startWave(); idle.advance(.1); idle.reset(); assert.equal(idle.isWaving(), false);
  idle.dispose();
  for (const scene of [new THREE.Group(), g.scene]) {
    if (scene === g.scene) scene.getObjectByName('wristr').removeFromParent();
    const controller = wave.createCompanionWave(scene);
    assert.equal(controller.start(), false); assert.equal(controller.apply(.1), 0);
    controller.cancel(); controller.dispose(); assert.equal(controller.active(), false);
  }
});
test('actual scene survives floating callback updates; completion, synchronous lifecycle interruption and Reduce Motion clear playback', async () => {
  const g = await asset();
  const hooks = [], pending = [], stops = new Set(), changes = [], pointChanges = [], timers = new Set();
  let parent = true, index = 0, frame, draw, request, driverStops = 0, moves = 0, latestMoves = 0;
  const same = (a, b) => a && a.length === b.length && a.every((x, i) => x === b[i]);
  const react = {
    useState(initial) { if (parent) return [g, () => {}]; const i = index++; hooks[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [hooks[i].value, () => {}]; },
    useEffect(fn, deps) { if (parent) return; const i = index++; const old = hooks[i]; if (!same(old?.deps, deps)) pending.push({ i, fn, deps, cleanup: old?.cleanup }); },
    useEffectEvent(fn) { const i = index++; hooks[i] ??= { fn, value: (...args) => hooks[i].fn(...args) }; hooks[i].fn = fn; return hooks[i].value; },
  };
  const advance = () => frame({}, 1/30);
  const jsx = (type, props) => ({ type, props });
  const scene = load('src/components/companion/companion-scene.native.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { StyleSheet: { create: x => x } },
    '@react-three/fiber/native': { Canvas: 'Canvas', useFrame: fn => { frame = fn; }, useThree: selector => selector({ advance }) },
    'expo-asset': {}, 'expo-file-system': {}, three: THREE, 'three/examples/jsm/loaders/GLTFLoader.js': { GLTFLoader },
    '@/lib/companion/idle': { createCompanionIdle },
    '@/lib/companion/model': { startCompanionFrames: fn => { draw = fn; let stopped = false; return () => { if (!stopped) driverStops++; stopped = true; }; } },
  });
  const oldSet = globalThis.setTimeout, oldClear = globalThis.clearTimeout;
  globalThis.setTimeout = fn => { timers.add(fn); return fn; };
  globalThis.clearTimeout = fn => timers.delete(fn);
  try {
    const props = {
      onPointChange: active => pointChanges.push(active),
      model: g, reduceMotion: false, onFailure: () => assert.fail('Failure'),
      onReady: () => {}, onMotionFrame: () => moves++,
      registerWave: fn => { request = fn; }, onWaveChange: active => changes.push(active),
      registerStop: stop => { stops.add(stop); return () => { stop(); stops.delete(stop); }; },
    };
    const tree = scene.CompanionScene(props); const mascot = tree.props.children.find(x => typeof x.type === 'function'); parent = false;
    const render = patch => {
      Object.assign(props, patch); index = 0; mascot.type(props);
      pending.forEach(p => p.cleanup?.());
      for (const p of pending) hooks[p.i] = { deps: p.deps, cleanup: p.fn() };
      pending.length = 0;
    };
    render({}); assert.equal(driverStops, 0); request(); request(); assert.deepEqual(changes, [true]);
    draw(0); render({ onMotionFrame: () => latestMoves++ }); assert.equal(driverStops, 0, 'Floating pause callback does not cancel wave');
    draw(.033); assert.equal(latestMoves, 1); assert.equal(moves, 1);
    for (let i = 0; i < 155; i++) draw(i/30);
    assert.deepEqual(changes, [true, false]); assert.deepEqual(pointChanges,[true,false]); request(); for(let i=0;i<100;i++)draw(6+i/30); assert.equal(changes.at(-1), true); assert.equal(pointChanges.at(-1),true);
    stops.forEach(stop => stop()); assert.equal(request, null); assert.equal(changes.at(-1), false); assert.equal(pointChanges.at(-1),false);
    // Home is unmounted on Hide/blur/background/sheet gates; simulate effect cleanup.
    hooks.forEach(h => h.cleanup?.()); hooks.length = 0; changes.length = 0;
    render({ reduceMotion: true }); assert.equal(typeof request, 'function'); request();
    assert.ok(!changes.includes(true)); assert.equal(timers.size, 1);
    render({ reduceMotion: false }); assert.equal(timers.size, 0); request(); assert.equal(changes.at(-1), true);
    hooks.forEach(h => h.cleanup?.()); assert.equal(request, null); assert.equal(changes.at(-1), false); assert.equal(timers.size, 0);
  } finally { globalThis.setTimeout = oldSet; globalThis.clearTimeout = oldClear; }
});

test('interruption during wave, pointing transition, hold or return restores arm; Restore starts idle; Reduce Motion rejects the sequence', async () => {
  for(const time of [.3,2.8,3.7,4.8]) {
    const g=await asset(), reference=await asset();
    const idle=createCompanionIdle(g.scene,g.animations);
    const baseline=createCompanionIdle(reference.scene,reference.animations);
    idle.reset();baseline.reset();assert.equal(idle.startGreeting(true),false);assert.equal(idle.isPointing(),false);
    assert.ok(idle.startGreeting());
    for(let i=0;i<Math.round(time*30);i++){idle.advance(1/30);baseline.advance(1/30);}
    assert.equal(idle.isPointing(),time>2.6);
    idle.cancelWave();assert.equal(idle.isWaving(),false);assert.equal(idle.isPointing(),false);
    for(const n of names)assert.ok(g.scene.getObjectByName(n).quaternion.angleTo(reference.scene.getObjectByName(n).quaternion)<1e-7);
    idle.reset();assert.equal(idle.isWaving(),false);assert.equal(idle.isPointing(),false);
    assert.equal(idle.startGreeting(true),false);
    idle.startGreeting();idle.advance(.1);idle.dispose();
    assert.equal(idle.startGreeting(),false);assert.equal(idle.isPointing(),false);
    baseline.dispose();
  }
});
