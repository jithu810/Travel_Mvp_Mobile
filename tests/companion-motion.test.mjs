import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
function load(file, deps = {}, timers = { setTimeout, clearTimeout }) {
  const exports = {};
  const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require','exports','setTimeout','clearTimeout',output)(name=>{assert.ok(name in deps,name);return deps[name];},exports,timers.setTimeout,timers.clearTimeout);
  return exports;
}
const model=load('src/lib/companion/model.ts');
const motion=load('src/lib/companion/motion.ts',{'./model':model});
const waveModule=load('src/lib/companion/wave.ts',{'three':THREE});
const idleModule=load('src/lib/companion/idle.ts',{'three':THREE,'./wave':waveModule});
const viewport={width:360,height:700,bottomInset:260,interacting:false};
test('whole widget and greeting stay in the measured safe area at every point of the deterministic path',()=>{
  for(const width of [280,281,320,360,412])for(const height of [400,600,800])for(const bottomInset of [120,260,500])for(const occupiedHeight of [188,220,280]){
    const bounds=motion.companionFloatBounds({width,height,bottomInset,interacting:false},occupiedHeight);
    if(!bounds)continue;
    const c=motion.createCompanionMotion();c.configure(bounds);let previous=c.get();
    for(let i=0;i<1200;i++){
      const p=c.frame(i/30,true);
      assert.ok(p.x>=-18&&p.x<=0&&p.y>=0&&p.y<=12);
      assert.ok(width-12-104+p.x>=12,'Canvas left boundary');
      assert.ok(width-12-104-8-144+p.x>=12,'Greeting left boundary');
      assert.ok(60+p.y>=60,'Branding band stays clear');
      assert.ok(60+p.y+occupiedHeight+12<=height-bottomInset,'Sheet/navigation stays clear');
      const greetingHeight=motion.companionGreetingHeight({width,height,bottomInset},bounds);
      assert.ok(greetingHeight>=60&&greetingHeight<=180);
      assert.ok(60+p.y+greetingHeight+12<=height-bottomInset-84,'Greeting stays above World control');
      assert.ok(Math.abs(p.x-previous.x)<=4/30+1e-8&&Math.abs(p.y-previous.y)<=4/30+1e-8,'Restrained speed, no teleport');
      previous=p;
    }
  }
  for(const patch of [{width:279},{height:NaN},{bottomInset:-1}])assert.equal(motion.companionFloatBounds({...viewport,...patch}),null);
  assert.equal(motion.companionFloatBounds(viewport,NaN),null);
  assert.equal(motion.companionFloatBounds(viewport,500),null);
});
test('pause, reduced motion and resumed timestamps retain position without advancing through background time',()=>{
  const c=motion.createCompanionMotion();c.configure({left:18,down:12});
  for(let i=0;i<180;i++)c.frame(i/30,true);
  const point=c.get();assert.ok(point.x<-5&&point.y>1);
  c.pause();assert.equal(c.frame(10000,true),point,'First resumed frame anchors time');
  const after=c.frame(10000.03,true);assert.ok(Math.abs(after.x-point.x)<=.12+1e-8);
  assert.equal(c.frame(20000,false),after);assert.equal(c.frame(30000,false),after);
  assert.equal(c.frame(40000,true),after,'Reduce Motion/greeting resume does not jump');
  assert.equal(c.frame(NaN,true),after);assert.equal(c.frame(50000,true),after);
  assert.equal(c.frame(-1,true),after,'Backward clock reanchors safely');
});
test('layout shrink clamps immediately; layout growth approaches its new target gradually',()=>{
  const c=motion.createCompanionMotion();c.configure({left:18,down:12});for(let i=0;i<240;i++)c.frame(i/30,true);
  const clamped=c.configure({left:2,down:1});assert.ok(clamped.x>=-2&&clamped.y<=1);
  assert.equal(c.configure({left:18,down:12}),clamped);
  const next=c.frame(8,true);assert.ok(Math.abs(next.x-clamped.x)<=4/30+1e-8);
  assert.deepEqual(c.configure(null),{x:0,y:0});
  assert.deepEqual(c.configure({left:NaN,down:-1}),{x:0,y:0});
});
test('actual movement hook pauses on lifecycle stop, press/greeting and Reduce Motion, and cleans up Animated values',()=>{
  const states=[],effects=[],layoutEffects=[],values=[];let index=0,stopped=0,disposed=0;
  class ValueXY{setValue(p){values.push({...p});}stopAnimation(){disposed++;}getTranslateTransform(){return [{translateX:'native-x'},{translateY:'native-y'}];}}
  const hook=load('src/hooks/use-companion-motion.ts',{
    'react':{useState:initial=>{const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],()=>{}];},useCallback:fn=>fn,useEffect:fn=>effects.push(fn),useLayoutEffect:fn=>layoutEffects.push(fn)},
    'react-native':{Animated:{ValueXY}},'@/lib/companion/motion':motion,
  });
  const options={occupiedHeight:188,reduceMotion:false,paused:false,registerStop:fn=>()=>fn()};
  const render=patch=>{index=0;layoutEffects.length=0;const result=hook.useCompanionMotion(viewport,{...options,...patch});layoutEffects.forEach(fn=>fn());return result;};
  let current=render({});const cleanups=effects.splice(0).map(fn=>fn());
  for(let i=0;i<180;i++)current.onMotionFrame(i/30);const before=values.at(-1);assert.ok(before.x<0);
  const stop=current.registerStop(()=>stopped++);stop();assert.equal(stopped,1);current.onMotionFrame(1000);assert.deepEqual(values.at(-1),before);
  current=render({paused:true});current.onMotionFrame(2000);assert.deepEqual(values.at(-1),before);
  current=render({paused:false});current.onMotionFrame(3000);assert.deepEqual(values.at(-1),before);
  current=render({reduceMotion:true});current.onMotionFrame(4000);assert.deepEqual(values.at(-1),before);
  current=render({reduceMotion:false});current.onMotionFrame(5000);assert.deepEqual(values.at(-1),before);
  cleanups.forEach(fn=>fn());assert.equal(disposed,1);
  current.onMotionFrame(6000);assert.deepEqual(values.at(-1),before,'No late timestamp jump after cleanup');
});
async function asset(){const loader=new GLTFLoader();loader.register(()=>({name:'CPU-texture',loadTexture:()=>Promise.resolve(new THREE.Texture())}));const bytes=readFileSync('assets/companion/explorer.glb');return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
test('actual Idle has no facial morph rig; procedural upper-body motion is visible without moving the feet or accumulating',async()=>{
  const enhanced=await asset(),baseline=await asset();const idle=idleModule.createCompanionIdle(enhanced.scene,enhanced.animations);idle.reset();
  const mixer=new THREE.AnimationMixer(baseline.scene);const action=mixer.clipAction(baseline.animations[0]);action.play();action.timeScale=.4;mixer.setTime(0);
  assert.ok(!enhanced.scene.getObjectsByProperty('isMesh',true).some(m=>m.morphTargetInfluences?.length));
  let headDegrees=0,chestDegrees=0;
  for(let i=0;i<180;i++){
    idle.advance(1/30);mixer.update(1/30);enhanced.scene.updateMatrixWorld(true);baseline.scene.updateMatrixWorld(true);
    for(const name of ['foot.l','foot.r','toes.l','toes.r']){
      const a=enhanced.scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)).getWorldPosition(new THREE.Vector3());const b=baseline.scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)).getWorldPosition(new THREE.Vector3());assert.ok(a.distanceTo(b)<1e-7,name+' stays authored');
    }
    headDegrees=Math.max(headDegrees,enhanced.scene.getObjectByName('head').quaternion.angleTo(baseline.scene.getObjectByName('head').quaternion)*180/Math.PI);
    chestDegrees=Math.max(chestDegrees,enhanced.scene.getObjectByName('chest').quaternion.angleTo(baseline.scene.getObjectByName('chest').quaternion)*180/Math.PI);
  }
  assert.ok(headDegrees>3&&headDegrees<6);assert.ok(chestDegrees>1&&chestDegrees<4);
  const head=enhanced.scene.getObjectByName('head'),chest=enhanced.scene.getObjectByName('chest');const h=head.quaternion.clone(),c=chest.quaternion.clone(),p=chest.position.clone();
  for(let i=0;i<100;i++)idle.advance(0);
  assert.ok(h.angleTo(head.quaternion)<1e-7&&c.angleTo(chest.quaternion)<1e-7&&p.distanceTo(chest.position)<1e-9,'No repeated-offset accumulation');
  idle.reset();const staticHead=head.quaternion.clone();idle.reset();assert.ok(staticHead.angleTo(head.quaternion)<1e-7,'Reduced-motion reset is stable');idle.dispose();
});
test('animated body stays entirely inside the unchanged 104x140 Canvas camera across motion samples',async()=>{
  const g=await asset();const center=new THREE.Box3().setFromObject(g.scene).getCenter(new THREE.Vector3());g.scene.position.sub(center);g.scene.rotation.y=-.35;
  const idle=idleModule.createCompanionIdle(g.scene,g.animations);idle.reset();
  const camera=new THREE.OrthographicCamera(-104/96,104/96,140/96,-140/96,.1,20);camera.position.z=5;camera.updateMatrixWorld();
  for(let i=0;i<180;i++){
    idle.advance(1/30);g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
    const box=new THREE.Box3().setFromObject(g.scene);
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const p=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&Math.abs(p.z)<1,'Whole animated model fits camera');
    }
  }idle.dispose();
});
test('Reduce Motion uses only a single cancellable draw; normal floating shares the existing scene driver',async()=>{
  const g=await asset();
  for(const reduceMotion of [true,false]){
    const effects=[],frames=[],queue=new Map(),calls=[];let timerId=0,driverDraw,driverStops=0;
    const jsx=(type,props)=>({type,props});
    const timers={setTimeout:fn=>{const id=++timerId;queue.set(id,fn);return id;},clearTimeout:id=>queue.delete(id)};
    let first=true;
    const component=load('src/components/companion/companion-scene.native.tsx',{
      'react':{useEffectEvent:fn=>fn,useState:initial=>{if(first){first=false;return [g,()=>{}];}return [initial(),()=>{}];},useEffect:fn=>effects.push(fn)},
      'react-native':{StyleSheet:{create:x=>x}},'react/jsx-runtime':{jsx,jsxs:jsx},
      '@react-three/fiber/native':{Canvas:'Canvas',useFrame:fn=>frames.push(fn),useThree:selector=>selector({advance:()=>{calls.push('render');frames.forEach(fn=>fn({},1/30));}})},
      'expo-asset':{},'expo-file-system':{},'three':THREE,'three/examples/jsm/loaders/GLTFLoader.js':{GLTFLoader},
      '@/lib/companion/model':{startCompanionFrames:draw=>{driverDraw=draw;return ()=>driverStops++;}},'@/lib/companion/idle':idleModule,
    },timers);
    const props={reduceMotion,registerWave:()=>{},onWaveChange:()=>{},onPointChange:()=>{},onFailure:()=>assert.fail('render failed'),onReady:()=>calls.push('ready'),onMotionFrame:()=>calls.push('move'),registerStop:stop=>()=>stop()};
    const tree=component.CompanionScene(props);const mascot=tree.props.children.find(child=>typeof child.type==='function');mascot.type(mascot.props);
    const cleanups=effects.slice(1).map(fn=>fn()); // Asset-loading effect belongs to the parent and is tested separately.
    if(reduceMotion){assert.equal(driverDraw,undefined);assert.equal(queue.size,1);const [id,draw]=[...queue.entries()][0];queue.delete(id);draw();assert.equal(queue.size,0);}else{assert.ok(driverDraw);driverDraw(0);driverDraw(.033);}
    assert.equal(calls[0],'move');assert.equal(calls[1],'render');assert.ok(calls.includes('ready'));cleanups.forEach(fn=>fn?.());assert.equal(queue.size,0);assert.equal(driverStops,reduceMotion?0:1);
  }
});
