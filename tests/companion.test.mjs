import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import ts from 'typescript';
import { AnimationMixer, Box3, Texture, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function load(file, deps = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', source)(name => { assert.ok(name in deps, name); return deps[name]; }, exports);
  return exports;
}
const model = load('src/lib/companion/model.ts');
test('companion flag fails closed; platform/focus/background/failure gates are independent', () => {
  for (const value of [undefined, '', 'false', 'TRUE', '1', ' true']) assert.equal(model.companionEnabled(value), false);
  assert.equal(model.companionEnabled('true'), true);
  assert.equal(model.companionVisible(true, true, true, true, false), true);
  for (let i = 0; i < 4; i++) { const args = [true,true,true,true,false]; args[i] = false; assert.equal(model.companionVisible(...args), false); }
  assert.equal(model.companionVisible(true,true,true,true,true), false);
});
test('fixed overlay clears branding/header band and measured sheet/navigation; hides during sheet motion or insufficient space', () => {
  for (const width of [280,320,360,412]) for (const height of [420,640,800]) for (const bottomInset of [120,260,500]) {
    const fits = model.companionFits({width,height,bottomInset,interacting:false});
    assert.equal(fits,height-bottomInset >= 260);
    if (fits) {
      assert.ok(model.COMPANION.top >= 60);
      assert.ok(model.COMPANION.top + model.COMPANION.height + 12 <= height-bottomInset);
      assert.ok(width - (12 + 104 + 8 + 144) >= 12, 'Greeting also fits');
    }
  }
  for (const patch of [{width:279},{height:NaN},{bottomInset:-1},{bottomInset:Infinity},{interacting:true}]) {
    assert.equal(model.companionFits({width:360,height:700,bottomInset:260,interacting:false,...patch}),false);
  }
});
test('30 Hz driver stops synchronously, rejects queued ticks and contains render failure', () => {
  const queue = new Map(); let id = 0, draws = 0, errors = 0;
  const schedule = (fn,delay) => { const key=++id;queue.set(key,{fn,delay});return key; };
  const cancel = key => queue.delete(key);
  const stop = model.startCompanionFrames(seconds=>{ assert.equal(seconds,2);draws++; },()=>errors++,schedule,cancel,()=>2000);
  let tick=queue.get(1).fn;queue.delete(1);tick();
  assert.equal(draws,1);assert.equal(queue.get(2).delay,1000/30);
  tick=queue.get(2).fn;stop();stop();tick();assert.equal(draws,1);assert.equal(queue.size,0);
  model.startCompanionFrames(()=>{throw Error('context lost');},()=>errors++,schedule,cancel,()=>0);
  tick=queue.get(3).fn;queue.delete(3);tick();assert.equal(errors,1);assert.equal(queue.size,0);
});
test('hook stops registered renderer on blur/background, removes listeners, ignores late accessibility result', async () => {
  const effects=[], listeners={}, states=[]; let focus,resolveMotion;
  const lifecycle=load('src/hooks/use-companion-lifecycle.ts',{
    'react': { useState: value=>[value,next=>states.push(next)],useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn) },
    'expo-router':{useFocusEffect:fn=>{focus=fn;}},
    'react-native':{AppState:{currentState:'active',addEventListener:(name,fn)=>{listeners.app=fn;return {remove:()=>delete listeners.app};}},
      AccessibilityInfo:{isReduceMotionEnabled:()=>new Promise(resolve=>{resolveMotion=resolve;}),addEventListener:(name,fn)=>{listeners.motion=fn;return {remove:()=>delete listeners.motion};}}},
  }).useCompanionLifecycle();
  assert.equal(lifecycle.reduceMotion,true);assert.equal(lifecycle.focused,false);
  const blur=focus();const cleanups=effects.map(fn=>fn());let stopped=0;
  const remove=lifecycle.registerStop(()=>stopped++);listeners.app('background');assert.equal(stopped,1);assert.equal(states.at(-1),false);
  remove();lifecycle.registerStop(()=>stopped++);const before=stopped;blur();assert.equal(stopped,before+1);
  lifecycle.registerStop(()=>stopped++);cleanups.forEach(fn=>fn());assert.deepEqual(listeners,{});
  const count=states.length;resolveMotion(false);await Promise.resolve();assert.equal(states.length,count);
});
function nativeFixture({flag,enabled=flag==='true',registerDisable,platform='android',focused=true,active=true,failed=false,minimized=false,greeting=false,waving=false,reduceMotion=false,sceneReady=false,pointing=false,onGuideChange}={}) {
  const jsx=(type,props)=>({type,props});let hookCalls=0,states=[],stops=0;const effects=[];
  const initial=[failed,minimized,greeting,waving,false,pointing,188];if(sceneReady)initial[7]=function TestScene(){};let index=0,motionOptions;
  const previous=process.env.EXPO_PUBLIC_TRAVEL_COMPANION;
  if(flag===undefined)delete process.env.EXPO_PUBLIC_TRAVEL_COMPANION;else process.env.EXPO_PUBLIC_TRAVEL_COMPANION=flag;
  const component=load('src/components/companion/travel-companion.native.tsx',{
    'expo':{requireOptionalNativeModule:()=>null},
    'react':{Component:class {},useState:value=>[initial[index++]??value,next=>states.push(next)],useEffect:fn=>effects.push(fn),useCallback:fn=>fn,useRef:value=>({current:value})},
    'react/jsx-runtime':{jsx,jsxs:jsx},
    'react-native':{Animated:{View:'AnimatedView'},Platform:{OS:platform},Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',View:'View',StyleSheet:{absoluteFill:{position:'absolute'},create:x=>x}},
    '@/hooks/use-companion-motion':{useCompanionMotion:(_viewport, options)=>{motionOptions=options;return {fits:true,style:{transform:[]},onMotionFrame:()=>{},registerStop:options.registerStop};}},
    '@/hooks/use-companion-lifecycle':{useCompanionLifecycle:()=>{hookCalls++;return {focused,active,reduceMotion,registerStop:()=>()=>{},stopAll:()=>stops++};}},
    '@/lib/companion/model':model,
  });
  const props={width:360,height:700,bottomInset:260,interacting:false,onGuideChange,enabled,registerDisable};
  const entry=component.TravelCompanion(props);const tree=entry?entry.type(entry.props):null;
  if(previous===undefined)delete process.env.EXPO_PUBLIC_TRAVEL_COMPANION;else process.env.EXPO_PUBLIC_TRAVEL_COMPANION=previous;
  return {entry,tree,hookCalls,states,effects,motionOptions,stops:()=>stops};
}
function nodes(tree) {return !tree||typeof tree!=='object'?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)];}
test('disabled/unsupported creates no lifecycle or renderer; enabled background/blur/failure has no overlay', () => {
  for(const options of [{},{flag:'false'},{flag:'true',platform:'ios'}]){const f=nativeFixture(options);assert.equal(f.entry,null);assert.equal(f.hookCalls,0);}
  for(const options of [{focused:false},{active:false},{failed:true}])assert.equal(nativeFixture({flag:'true',...options}).tree,null);
  const fallback=load('src/components/companion/travel-companion.tsx');assert.equal(fallback.TravelCompanion({}),null);
});
test('only explicit controls capture touch; minimizing removes scene; greeting and failure are contained', () => {
  const f=nativeFixture({flag:'true',greeting:true});const all=nodes(f.tree);
  assert.equal(all.find(n=>n.type==='View').props.pointerEvents,'box-none');
  const expanded=all.find(n=>n.type?.name==='ExpandedCompanion');const body=expanded.type(expanded.props);
  const controls=nodes(body);const mascot=controls.find(n=>n.props?.accessibilityLabel==='Greet travel companion');
  assert.equal(mascot.props.children.props.pointerEvents,'none');
  assert.equal(typeof mascot.props.onPressIn,'function');
  assert.equal(typeof mascot.props.onPressOut,'function');
  assert.equal(mascot.props.style.width,104);assert.equal(mascot.props.style.height,140);
  controls.find(n=>n.props?.accessibilityLabel==='Minimize travel companion').props.onPress();assert.equal(f.stops(),1);assert.ok(f.states.includes(true));
  assert.ok(all.some(n=>n.props?.accessibilityLabel==='Close companion greeting'));
  const minimized=nativeFixture({flag:'true',minimized:true});assert.ok(nodes(minimized.tree).some(n=>n.props?.accessibilityLabel==='Restore travel companion'));
  assert.ok(!nodes(minimized.tree).some(n=>n.type?.name==='ExpandedCompanion'),'No expanded renderer when minimized');
  assert.deepEqual(f.tree.type.getDerivedStateFromError(),{failed:true});
});
test('bundled explorer is self-contained, licensed-source-derived, small and has a working idle skeleton', async () => {
  const bytes=readFileSync('assets/companion/explorer.glb');assert.ok(bytes.length<500000);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'2ad8ccb870a7c227604d1582e52b16e797b7bd07a4d713ef659a54502ffb96f7');
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
  assert.deepEqual(doc.animations.map(a=>a.name),['Idle']);assert.equal(doc.skins[0].joints.length,41);
  assert.ok(doc.images.every(i=>i.bufferView!==undefined&&!i.uri));assert.ok(doc.buffers.every(b=>!b.uri));assert.ok(!doc.extensionsRequired?.length);
  const triangleCount=doc.meshes.reduce((n,m)=>n+m.primitives.reduce((t,p)=>t+doc.accessors[p.indices].count/3,0),0);assert.equal(triangleCount,4323);
  assert.ok(doc.nodes.some(n=>n.name==='Explorer backpack'&&n.mesh!==undefined));
  assert.ok(!doc.nodes.some(n=>/Knife|Crossbow|Cape|Throwable/.test(n.name)&&n.mesh!==undefined));
  const license=readFileSync('assets/companion/KayKit-LICENSE.txt','utf8');assert.match(license,/Creative Commons Zero, CC0/);assert.match(license,/commercial projects/);
  // CPU loader test; native image upload/GPU transparency are explicitly NOT verified here.
  const loader=new GLTFLoader();loader.register(()=>({name:'test-native-texture',loadTexture:()=>Promise.resolve(new Texture())}));
  const parsed=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const mixer=new AnimationMixer(parsed.scene);mixer.clipAction(parsed.animations[0]).play();mixer.update(0.5);
  const size=new Box3().setFromObject(parsed.scene).getSize(new Vector3());assert.ok(size.y>1&&size.y<3);assert.ok(Number.isFinite(size.x));
  assert.ok(parsed.animations[0].duration>0);mixer.stopAllAction();mixer.uncacheRoot(parsed.scene);
});

test('missing native GL fails without evaluating the heavy renderer import', () => {
  const f=nativeFixture({flag:'true'});
  const expanded=nodes(f.tree).find(n=>n.type?.name==='ExpandedCompanion');expanded.type(expanded.props);
  // The last effect guards ExpoGL before its dynamic import branch.
  f.effects.at(-1)();assert.ok(f.states.includes(true));
});
test('scene loader failure is recoverable; late parsed resources are disposed after unmount', async () => {
  const three=await import('three');
  const assetBytes=readFileSync('assets/companion/explorer.glb');
  for(const mode of ['asset-error','late-parse','success']) {
    const effects=[],updates=[];let errors=0,resolveParsed,parseStarted=false;
    const texture=new Texture();let textureDisposals=0;texture.addEventListener('dispose',()=>textureDisposals++);
    const material=new three.MeshStandardMaterial({map:texture});let materialDisposals=0;material.addEventListener('dispose',()=>materialDisposals++);
    const geometry=new three.BoxGeometry();let geometryDisposals=0;geometry.addEventListener('dispose',()=>geometryDisposals++);
    const scene=new three.Group();scene.add(new three.Mesh(geometry,material));
    class Loader { register(){return this;} parseAsync(){parseStarted=true;return new Promise(resolve=>{resolveParsed=resolve;});} }
    const component=load('src/components/companion/companion-scene.native.tsx',{
      '@react-three/fiber/native':{Canvas:'Canvas',useFrame:()=>{},useThree:()=>{}},
      'expo-asset':{Asset:{fromModule:()=>({downloadAsync:async()=>{if(mode==='asset-error')throw Error('missing model');return {localUri:'file:///bundled'};}})}},
      'expo-file-system':{File:class {async arrayBuffer(){return assetBytes.buffer.slice(assetBytes.byteOffset,assetBytes.byteOffset+assetBytes.byteLength);}}},
      'react':{useState:value=>[value,next=>updates.push(next)],useEffect:fn=>effects.push(fn)},
      'react-native':{StyleSheet:{create:value=>value}},
      'react/jsx-runtime':{jsx:()=>null,jsxs:()=>null},
      'three':{...three,TextureLoader:class {async loadAsync(){return texture;}}},
      'three/examples/jsm/loaders/GLTFLoader.js':{GLTFLoader:Loader},
      '@/lib/companion/idle':{createCompanionIdle:()=>({reset(){},advance(){},dispose(){}})},
      '@/lib/companion/model':model,
      '../../../assets/companion/explorer.glb':1,'../../../assets/companion/explorer-texture.png':2,
    });
    component.CompanionScene({onFailure:()=>errors++,onReady:()=>{},registerStop:()=>()=>{},reduceMotion:false});
    const cleanup=effects[0]();
    for(let i=0;i<12;i++)await Promise.resolve();
    if(mode==='asset-error'){assert.equal(errors,1);cleanup();continue;}
    assert.equal(parseStarted,true);
    if(mode==='late-parse')cleanup();
    resolveParsed({scene,animations:[]});for(let i=0;i<6;i++)await Promise.resolve();
    if(mode==='success'){assert.equal(updates.length,1);cleanup();}else assert.equal(updates.length,0);
    assert.equal(errors,0);assert.equal(geometryDisposals,1);assert.equal(materialDisposals,1);assert.ok(textureDisposals>=1);
  }
});

test('tap requests a wave and retains greeting toggle/Close; waving pauses floating independently of greeting', () => {
  const f=nativeFixture({flag:'true',sceneReady:true,greeting:true});
  const expanded=nodes(f.tree).find(n=>n.type?.name==='ExpandedCompanion');
  const body=expanded.type(expanded.props);const all=nodes(body);
  const scene=all.find(n=>n.type?.name==='TestScene');let requests=0;
  scene.props.registerWave(()=>requests++);
  all.find(n=>n.props?.accessibilityLabel==='Greet travel companion').props.onPress();
  assert.equal(requests,1);assert.ok(f.states.some(value=>typeof value==='function'&&value(false)===true));
  scene.props.registerWave(null);
  all.find(n=>n.props?.accessibilityLabel==='Greet travel companion').props.onPress();
  assert.equal(requests,1,'No stale request after scene unregisters');
  nodes(f.tree).find(n=>n.props?.accessibilityLabel==='Close companion greeting').props.onPress();
  assert.equal(f.states.at(-1),false);
  assert.equal(nativeFixture({flag:'true',waving:true}).motionOptions.paused,true);
  assert.equal(nativeFixture({flag:'true',waving:false}).motionOptions.paused,false);
  assert.equal(nativeFixture({flag:'true',reduceMotion:true}).motionOptions.reduceMotion,true);
});

test('point-stage bubble and actual-button guide clear on dismissal, Hide, blur, background, failure, Reduce Motion and cleanup', () => {
  for(const patch of [{},{greeting:false},{minimized:true},{focused:false},{active:false},{failed:true},{reduceMotion:true},{pointing:false}]) {
    const guides=[];const f=nativeFixture({flag:'true',pointing:true,greeting:true,onGuideChange:active=>guides.push(active),...patch});
    const cleanup=f.effects[1]();
    assert.equal(guides.at(-1),Object.keys(patch).length===0);
    cleanup();assert.equal(guides.at(-1),false);
    if(Object.keys(patch).length===0) {
      assert.ok(nodes(f.tree).some(n=>n.type==='Text'&&n.props.children==='Ready for your next adventure? Tap Create Journey below.'));
      assert.ok(nodes(f.tree).some(n=>n.props?.accessibilityLabel==='Close companion greeting'));
    }
  }
});

test('saved enablement overrides the old runtime flag; OFF mounts no lifecycle and exposes synchronous disable cleanup when ON', () => {
  assert.ok(nativeFixture({flag:'false',enabled:true}).entry);
  assert.ok(nativeFixture({enabled:true}).entry);
  assert.equal(nativeFixture({flag:'true',enabled:false}).entry,null);
  let stop;
  const f=nativeFixture({enabled:true,registerDisable:callback=>{stop=callback;}});
  const cleanup=f.effects[0]();assert.equal(typeof stop,'function');stop();assert.equal(f.stops(),1);
  cleanup();assert.equal(stop,null);
});
