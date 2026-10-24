import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
// Execute the actual dependency-free shared theme in the component harness.
const mobileTheme = {};
new Function('exports', ts.transpileModule(readFileSync('src/theme/mobile-theme.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mobileTheme);


const jsx = (type, props) => ({ type, props });
function harness(runEffects = true) {
  const slots = [];
  let cursor = 0, effects = [], disposed = false, lateUpdates = 0;
  const changed = (previous, deps) => !previous || deps.some((dep, i) => dep !== previous[i]);
  const memo = (factory, deps) => {
    const i = cursor++;
    if (changed(slots[i]?.deps, deps)) slots[i] = { deps, value: factory() };
    return slots[i].value;
  };
  const hooks = {
    memo: component => component, useCallback: (callback, deps) => memo(() => callback, deps), useMemo: memo,
    useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
    useSyncExternalStore: (_subscribe, get) => get(),
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { if (disposed) lateUpdates++; slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useEffect: (callback, deps) => {
      const i = cursor++;
      if (!runEffects) return;
      if (changed(slots[i]?.deps, deps)) {
        slots[i]?.cleanup?.(); slots[i] = { deps };
        effects.push(() => { slots[i].cleanup = callback(); });
      }
    },
  };
  return { hooks, lateUpdates: () => lateUpdates,
    render: (component, props) => { cursor = 0; effects = []; const tree = component(props); effects.forEach(effect => effect()); return tree; },
    dispose: () => { disposed = true; slots.forEach(slot => slot?.cleanup?.()); },
  };
}
function load(path, modules, hooks = harness(false).hooks, timers = globalThis) {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const require = name => {
    if (name === '@/theme/mobile-theme') return mobileTheme;
    if(name==='@/lib/journey/nearby')return load('src/lib/journey/nearby.ts',{}); if(name.endsWith('/nearby-locations'))return {NearbyLocations:'NearbyLocations'}; if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === './stop-card-deck') return { StopCardDeck: 'StopCardDeck' };
    if (name === 'react') return hooks;
    if (name === 'expo-router') return { useFocusEffect: fn => hooks.useEffect(fn, [fn]), ...modules[name] };
    if (name === 'react-native-safe-area-context') return { ...modules[name], useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) };
    if (name === '@/components/journey/itinerary-sheet') return { ItinerarySheet: 'ItinerarySheet' };
    if (name === '@/components/journey/maneuver-panel') return { ManeuverPanel: 'ManeuverPanel' };
    if (name === '@/components/journey/arrival-prompt') return { ArrivalPrompt: 'ArrivalPrompt' };
    if (Object.hasOwn(modules, name)) return modules[name];
    if(name==='@/components/branded-loading')return {BrandedLoading:'BrandedLoading'};
    throw new Error('Unexpected component dependency: ' + name);
  };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', source)(require, module, module.exports, timers.setTimeout, timers.clearTimeout, timers.setInterval ?? globalThis.setInterval, timers.clearInterval ?? globalThis.clearInterval);
  return module.exports;
}
function all(tree, type) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(tree.type === type ? [tree] : []), ...[tree.props?.children, tree.props?.footer].flat(Infinity).flatMap(child => all(child, type))];
}


function setup() {
 const h=harness(), pending=[], timers=new Map(), calls=[]; let background, preference, serial=0;
 class Value { constructor(v){this.value=v;} setValue(v){this.value=v;} stopAnimation(){} interpolate(){return 'interpolated';} }
 const native={View:'View',Text:'Text',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:v=>v},
 Animated:{Value,View:'AnimatedView',timing:(_value,opts)=>({start:fn=>pending.push({fn,opts})})},
 PanResponder:{create:v=>({panHandlers:v})},AppState:{currentState:'active',addEventListener:(_,fn)=>{background=fn;return {remove(){}};}},
 AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:(_,fn)=>{preference=fn;return {remove(){}};}}};
 const {SwipeJourneyStart}=load('src/components/journey/swipe-journey-start.tsx',{'react-native':native},h.hooks,{setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id)});
 const props={active:true,onStart:()=>calls.push('preview')};
 const render=()=>h.render(SwipeJourneyStart,props);
 return {h,props,pending,calls,render,background:()=>background('background'),reduce:()=>preference(true),flush:()=>{const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn());}};
}
const gesture=tree=>all(tree,'View').find(n=>n.props.onPanResponderRelease).props;
const access=tree=>all(tree,'View').find(n=>n.props.accessibilityRole==='button').props;
test('right swipe requires threshold and horizontal dominance, transitions once; ordinary tap has no handler',async()=>{
 const t=setup();t.render();await Promise.resolve();let tree=t.render();
 assert.equal(access(tree).onPress,undefined);
 assert.equal(gesture(tree).onMoveShouldSetPanResponder(null,{dx:-100,dy:0}),false);
 for(const g of [{dx:30,dy:0},{dx:-200,dy:0},{dx:180,dy:160}])gesture(tree).onPanResponderRelease(null,g);
 assert.equal(t.pending.length,0);assert.deepEqual(t.calls,[]);
 gesture(tree).onPanResponderRelease(null,{dx:200,dy:3});assert.equal(t.pending.length,1);
 access(tree).onAccessibilityTap();gesture(tree).onPanResponderRelease(null,{dx:200,dy:0});assert.equal(t.pending.length,1);
 assert.deepEqual(t.calls,[]);t.pending.pop().fn({finished:true});assert.deepEqual(t.calls,[]);t.flush();assert.deepEqual(t.calls,['preview']);t.h.dispose();
});
test('accessible activation supports reduced motion and stays single flight',()=>{
 const t=setup();const tree=t.render();access(tree).onAccessibilityAction({nativeEvent:{actionName:'activate'}});access(tree).onAccessibilityTap();
 assert.equal(t.pending.length,0);t.flush();assert.deepEqual(t.calls,['preview']);t.h.dispose();
});
test('completion and transition reject background, blur, identity changes and unmount',async()=>{
 for(const stage of ['animation','transition'])for(const cancel of ['background','blur','callback','unmount']){
 const t=setup();t.render();await Promise.resolve();let tree=t.render();access(tree).onAccessibilityTap();const finish=t.pending.pop().fn;
 if(stage==='transition')finish({finished:true});
 if(cancel==='background')t.background();
 if(cancel==='blur'){t.props.active=false;t.render();}
 if(cancel==='callback'){t.props.onStart=()=>t.calls.push('other');t.render();}
 if(cancel==='unmount')t.h.dispose();
 if(stage==='animation')finish({finished:true});t.flush();assert.deepEqual(t.calls,[],stage+cancel);if(cancel!=='unmount')t.h.dispose();assert.equal(t.h.lateUpdates(),0);
 }
});
test('termination cancels partial swipe and disabled preview refuses activation',()=>{
 const t=setup();let tree=t.render();gesture(tree).onPanResponderMove(null,{dx:100,dy:0});gesture(tree).onPanResponderTerminate();t.flush();assert.deepEqual(t.calls,[]);
 t.props.active=false;tree=t.render();access(tree).onAccessibilityTap();t.flush();assert.deepEqual(t.calls,[]);t.h.dispose();
});


test('heart retains red outline and filled selected states without text or rectangular surfaces',()=>{
 const {JourneyActionIcon}=load('src/components/journey/journey-action-icon.tsx',{'react-native':{View:'View',StyleSheet:{create:v=>v}}});
 const idle=all(JourneyActionIcon({name:'heart'}),'View');
 const selected=all(JourneyActionIcon({name:'heart',selected:true}),'View');
 assert.ok(idle.some(n=>n.props.style?.some?.(s=>s.borderColor==='#EF3340')));
 assert.ok(selected.some(n=>n.props.style?.some?.(s=>s.backgroundColor==='#EF3340')));
});


test('generalized publish labels preserve inert drag and cancel on explicit form/candidate reset identity',async()=>{
 const t=setup();delete t.props.onStart;t.props.onComplete=()=>t.calls.push('publish');t.props.label='Swipe to publish journey';t.props.accessibilityLabel='Publish Journey';t.props.openingLabel='Preparing to publish…';t.props.resetKey='form-v1';
 t.render();await Promise.resolve();let tree=t.render();assert.equal(access(tree).accessibilityLabel,'Publish Journey');
 gesture(tree).onPanResponderRelease(null,{dx:200,dy:0});const finish=t.pending.pop().fn;
 t.props.resetKey='form-v2';tree=t.render();finish({finished:true});t.flush();assert.deepEqual(t.calls,[]);
 access(tree).onAccessibilityAction({nativeEvent:{actionName:'activate'}});t.pending.pop().fn({finished:true});t.flush();assert.deepEqual(t.calls,['publish']);
 t.props.active=false;t.render();t.props.active=true;tree=t.render();access(tree).onAccessibilityTap();t.pending.pop().fn({finished:true});t.flush();assert.deepEqual(t.calls,['publish','publish']);t.h.dispose();
});
