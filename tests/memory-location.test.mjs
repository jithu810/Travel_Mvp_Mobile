import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
function load(file, modules) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', code)(name => { if (!(name in modules)) throw Error(name); return modules[name]; }, exports);
  return exports;
}
const model = load('src/lib/create/model.ts', { '../discovery/model': { isJourneyId: value => /^[0-9a-f-]{36}$/i.test(value) } });
const domain = load('src/lib/create/current-location.ts', { './model': model });
const tick = () => new Promise(setImmediate);
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
const point = { latitude: 0, longitude: 0, accuracy: 50, timestamp: 100000 };
function setup(overrides = {}) {
  const events=[], patches=[], calls=[]; let expiry;
  const port={ permission:async()=>{calls.push('permission');return {granted:true,canAskAgain:true};},services:async()=>{calls.push('services');return true;},position:async()=>{calls.push('position');return point;},...overrides };
  const capture=domain.createMemoryLocationCapture(port,s=>events.push(s),p=>patches.push(p),{set:(fn,ms)=>{assert.equal(ms,15000);expiry=fn;return 1;},clear:()=>{expiry=null;}},()=>100000);
  return {capture,events,patches,calls,expire:()=>expiry?.(),timer:()=>expiry};
}
test('one-shot capture accepts zero coordinates and only returns the three location fields',async()=>{
  const h=setup();assert.equal(h.capture.start(),true);assert.equal(h.capture.start(),false);await tick();
  assert.deepEqual(h.calls,['permission','services','position']);assert.deepEqual(h.patches,[{latitude:0,longitude:0,mapboxId:null}]);
  assert.deepEqual(h.events.at(-1),{busy:false,error:null});assert.equal(h.timer(),null);
});
test('quality rules reject invalid, stale, future, missing and inaccurate positions; boundaries remain valid',()=>{
  for(const patch of [{latitude:NaN},{longitude:181},{accuracy:null},{accuracy:NaN},{accuracy:-1},{accuracy:50.01},{timestamp:84999},{timestamp:115001},{timestamp:NaN}])assert.throws(()=>domain.locationPatch({...point,...patch},100000),/fresh, accurate/);
  assert.deepEqual(domain.locationPatch({...point,timestamp:85000},100000),{latitude:0,longitude:0,mapboxId:null});
});
test('denied and permanently denied permission never acquire a fix and give recoverable messages',async()=>{
  for(const canAskAgain of [true,false]){
    const h=setup({permission:async()=>({granted:false,canAskAgain})});h.capture.start();await tick();
    assert.equal(h.patches.length,0);assert.equal(h.calls.length,0);assert.match(h.events.at(-1).error,canAskAgain?/permission denied/:/Settings/);assert.equal(h.capture.isBusy(),false);
  }
});
test('disabled services and acquisition errors restore controls without modifying a memory',async()=>{
  const off=setup({services:async()=>false});off.capture.start();await tick();assert.match(off.events.at(-1).error,/services are off/);assert.equal(off.patches.length,0);assert.ok(!off.calls.includes('position'));
  const bad=setup({position:async()=>{throw Error('Try search instead.');}});bad.capture.start();await tick();assert.match(bad.events.at(-1).error,/search/);assert.equal(bad.capture.isBusy(),false);
});
test('deadline covers permission as well as acquisition, and suppresses late successes and rejections',async()=>{
  for(const phase of ['permission','position']){
    const pending=deferred(),h=setup({[phase]:()=>pending.promise});h.capture.start();await tick();h.expire();assert.match(h.events.at(-1).error,/timed out/);
    pending.resolve(phase==='permission'?{granted:true,canAskAgain:true}:point);await tick();assert.equal(h.patches.length,0);assert.equal(h.events.length,2);
  }
  const pending=deferred(),h=setup({position:()=>pending.promise});h.capture.start();await tick();h.expire();pending.reject(Error('late'));await tick();assert.equal(h.events.length,2);
});
test('cancellation permits explicit retry while old results cannot replace the newer capture',async()=>{
  const first=deferred();let n=0;const h=setup({position:()=>++n===1?first.promise:Promise.resolve({...point,latitude:12})});
  h.capture.start();await tick();h.capture.cancel();assert.equal(h.timer(),null);h.capture.start();await tick();first.resolve(point);await tick();
  assert.deepEqual(h.patches,[{latitude:12,longitude:0,mapboxId:null}]);
});
test('elapsed deadline rejects a fresh late fix even when the JS timer callback has not run',async()=>{
  let now=100000;const pending=deferred(),events=[],patches=[];
  const capture=domain.createMemoryLocationCapture({permission:async()=>({granted:true,canAskAgain:true}),services:async()=>true,position:()=>pending.promise},s=>events.push(s),p=>patches.push(p),{set:()=>1,clear:()=>{}},()=>now);
  capture.start();await tick();now+=15001;pending.resolve({...point,timestamp:now});await tick();assert.equal(patches.length,0);assert.match(events.at(-1).error,/timed out/);
});
test('native adapter requests foreground only when needed and uses High one-shot API with no timeout assumption',async()=>{
  for(const permission of [{granted:true,canAskAgain:true},{granted:false,canAskAgain:true},{granted:false,canAskAgain:false}]){
    const calls=[],location={Accuracy:{High:4},getForegroundPermissionsAsync:async()=>permission,requestForegroundPermissionsAsync:async()=>{calls.push('request');return {granted:true,canAskAgain:true};},hasServicesEnabledAsync:async()=>true,getCurrentPositionAsync:async options=>{calls.push(options);return {coords:point,timestamp:point.timestamp};}};
    const {memoryLocationPort:port}=load('src/lib/create/current-location-port.native.ts',{'expo-location':location});
    await port.permission();assert.equal(calls.length,!permission.granted&&permission.canAskAgain?1:0);assert.equal(await port.services(),true);assert.deepEqual(await port.position(),point);assert.deepEqual(calls.at(-1),{accuracy:4});
  }
});

function hookHarness() {
  const slots=[];let cursor=0,effects=[];const listeners=new Set();let focusCleanup;
  const memo=(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j]))slots[i]={deps,value:fn()};return slots[i].value;};
  const hooks={useMemo:memo,useCallback:(fn,deps)=>memo(()=>fn,deps),useRef:value=>{const i=cursor++;return slots[i]??={current:value};},useState:value=>{const i=cursor++;if(!(i in slots))slots[i]=value;return [slots[i],value=>{slots[i]=value;}];},useEffect:(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j])){const old=slots[i];slots[i]={deps};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}}};
  hooks.useLayoutEffect = hooks.useEffect;
  const pending=deferred();let timer;const patches=[];let revealed=0;
  const AppState={currentState:'active',addEventListener:(_,fn)=>{listeners.add(fn);return {remove:()=>listeners.delete(fn)};}};
  const actualDomain={...domain,createMemoryLocationCapture:(port,notify,accept)=>domain.createMemoryLocationCapture(port,notify,accept,{set:fn=>{timer=fn;return 1;},clear:()=>{timer=null;}},()=>100000)};
  const {useMemoryLocation}=load('src/hooks/use-memory-location.ts',{'react':hooks,'react-native':{AppState},'expo-router':{useFocusEffect:fn=>hooks.useEffect(()=>{focusCleanup=fn();return focusCleanup;},[fn])},'@/lib/create/current-location':actualDomain,'@/lib/create/current-location-port':{memoryLocationPort:{permission:async()=>({granted:true,canAskAgain:true}),services:async()=>true,position:()=>pending.promise}}});
  const value={id:'stop',name:'My place',description:'Keep note',day:'2',rating:'0',photoPath:'journey-media/raw',latitude:1,longitude:2,mapboxId:'old'};
  let props={value,disabled:false};
  const renderHook = useMemoryLocation;
  return {patches,pending,render:patch=>{props={...props,...patch};cursor=0;effects=[];const result=renderHook(props.value,props.disabled,p=>patches.push(p),()=>revealed++);effects.forEach(fn=>fn());return result;},value,revealed:()=>revealed,background:()=>{AppState.currentState='background';listeners.forEach(fn=>fn('background'));},blur:()=>focusCleanup(),unmount:()=>slots.forEach(s=>s?.cleanup?.()),timer:()=>timer};
}
test('actual hook patches only buffered coordinates and reveals name without saving or changing existing fields',async()=>{
  const h=hookHarness();h.render().start();await tick();h.pending.resolve(point);await tick();assert.deepEqual(h.patches,[{latitude:0,longitude:0,mapboxId:null}]);assert.equal(h.revealed(),1);
  assert.deepEqual({...h.value,...h.patches[0]},{...h.value,latitude:0,longitude:0,mapboxId:null});
});
test('actual hook invalidates on close/unmount, blur, background, disabled state, another memory and newer coordinates',async()=>{
  for(const cancel of [h=>h.render().cancel(),h=>h.unmount(),h=>h.blur(),h=>h.background(),h=>h.render({disabled:true}),h=>h.render({value:{...h.value,id:'another'}}),h=>h.render({value:{...h.value,latitude:7}})]){
    const h=hookHarness();h.render().start();await tick();cancel(h);h.pending.resolve(point);await tick();assert.equal(h.patches.length,0);assert.equal(h.timer(),null);
  }
});
