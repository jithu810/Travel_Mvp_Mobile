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




function setup(){
 const h=harness(),selected=[],pending=[];let app,motion;
 class Value { constructor(value){this.value=value;} setValue(value){this.value=value;} stopAnimation(){} interpolate(options){return options;} }
 const native={View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:v=>v},PanResponder:{create:v=>({panHandlers:v})},Animated:{Value,View:'AnimatedView',timing:(value,options)=>({start:fn=>pending.push({fn,options,value})})},AppState:{currentState:'active',addEventListener:(_,fn)=>{app=fn;return {remove(){}};}},AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:(_,fn)=>{motion=fn;return {remove(){}};}}};
 const {MemoryDeck}=load('src/components/create/memory-deck.tsx',{'react-native':native},h.hooks);
 const stops=['a','b','c'].map(id=>({id,name:id,photoPath:'raw/'+id}));const props={stops,selectedId:'a',onSelect:id=>selected.push(id),renderMemory:(s,i,w,swipe)=>({type:'Memory',props:{s,i,w,swipe}}),actions:{type:'Actions',props:{}},active:true};
 const render=()=>h.render(MemoryDeck,props);let tree=render();tree.props.onLayout({nativeEvent:{layout:{width:350}}});render();
 return {h,props,selected,pending,render,native,background:()=>app('background'),reduce:()=>motion(true)};
}
const button=(tree,label)=>all(tree,'Pressable').find(n=>n.props.accessibilityLabel===label);
const front=tree=>all(all(tree,'AnimatedView')[0],'Memory')[0];
const gesture=tree=>front(tree).props.swipe.handlers;
test('private stack renders actual upcoming photo cards hidden from interaction and accessibility',()=>{
 const t=setup(),tree=t.render();const rear=all(tree,'View').filter(n=>n.props.testID==='draft-memory-rear');assert.equal(rear.length,2);
 assert.deepEqual(rear.map(n=>all(n,'Memory')[0].props.s.photoPath),['raw/c','raw/b']);
 for(const item of rear){assert.equal(item.props.pointerEvents,'none');assert.equal(item.props.importantForAccessibility,'no-hide-descendants');assert.equal(item.props.accessibilityElementsHidden,true);assert.equal(all(item,'Memory')[0].props.swipe.canInteract(),false);}
 assert.equal(front(tree).props.s.id,'a');assert.equal(all(tree,'Actions').length,1);assert.equal(all(all(tree,'AnimatedView')[0],'Actions').length,0);
 t.h.dispose();
});
test('swipes rotate/translate whole card out for210ms before selecting; reduced motion and bounds stay immediate',async()=>{
 const t=setup();t.render();await Promise.resolve();let tree=t.render();
 assert.equal(button(tree,'Previous memory card').props.disabled,true);
 assert.equal(gesture(tree).onMoveShouldSetPanResponder(null,{dx:60,dy:50}),false);
 assert.equal(gesture(tree).onMoveShouldSetPanResponder(null,{dx:-70,dy:4}),true);
 gesture(tree).onPanResponderRelease(null,{dx:-80,dy:4});assert.deepEqual(t.selected,[]);assert.equal(t.pending.length,1);
 assert.deepEqual(t.pending[0].options,{toValue:-410,duration:210,useNativeDriver:true});assert.equal(front(tree).props.swipe.canInteract(),false);
 button(tree,'Next memory card').props.onPress();assert.equal(t.pending.length,1);t.pending.pop().fn({finished:true});assert.deepEqual(t.selected,['b']);
 t.props.selectedId='b';tree=t.render();gesture(tree).onPanResponderRelease(null,{dx:80,dy:0});assert.equal(t.pending[0].options.toValue,410);t.pending.pop().fn({finished:true});assert.equal(t.selected.at(-1),'a');
 t.reduce();tree=t.render();button(tree,'Next memory card').props.onPress();assert.equal(t.selected.at(-1),'c');assert.equal(t.pending.length,0);
 t.props.selectedId='c';tree=t.render();assert.equal(button(tree,'Next memory card').props.disabled,true);assert.deepEqual(t.props.stops.map(s=>s.id),['a','b','c']);t.h.dispose();
});
test('partial/vertical gestures never select and stale completion cancels after selection/reorder/modal/background/termination/unmount',async()=>{
 for(const reason of ['select','reorder','inactive','replace','background','terminate','unmount']){
 const t=setup();t.render();await Promise.resolve();let tree=t.render();gesture(tree).onPanResponderRelease(null,{dx:20,dy:0});gesture(tree).onPanResponderRelease(null,{dx:-90,dy:100});assert.equal(t.pending.length,0);
 gesture(tree).onPanResponderRelease(null,{dx:-80,dy:0});const completion=t.pending.pop().fn;
 if(reason==='select'){t.props.selectedId='c';t.render();}
 if(reason==='reorder'){t.props.stops=[t.props.stops[1],t.props.stops[0],t.props.stops[2]];t.render();}
 if(reason==='inactive'){t.props.active=false;t.render();}
 if(reason==='replace'){t.props.stops=[{id:'x'}];t.render();}
 if(reason==='background')t.background();if(reason==='terminate')gesture(tree).onPanResponderTerminate();if(reason==='unmount')t.h.dispose();
 completion({finished:true});assert.deepEqual(t.selected,[],reason);if(reason!=='unmount')t.h.dispose();assert.equal(t.h.lateUpdates(),0);
 }
});
test('private edit/reorder/remove controls stay outside swipe surface and refuse stale interactions during exit',()=>{
 const t=setup(),calls=[];const {MemoryRow}=load('src/components/create/memory-row.tsx',{'react-native':t.native,'../discovery/thumbnail-photo':{ThumbnailPhoto:'Photo'},'../discovery/ui':{colors:{}}});
 const row=MemoryRow({stop:{id:'a',name:'A',description:'',day:'',rating:'',latitude:0,longitude:0},index:1,total:3,photo:null,disabled:false,deck:true,swipeHandlers:{onMoveShouldSetPanResponder:()=>true},canInteract:()=>false,onEdit:()=>calls.push('edit'),onMove:()=>calls.push('move'),onRemove:()=>calls.push('remove')});
 const surface=all(row,'View').find(n=>n.props.testID==='draft-memory-swipe');assert.equal(all(surface,'Pressable').length,1);
 assert.equal(all(surface,'Pressable')[0].props.accessibilityLabel,'Edit memory 2: A');for(const press of all(row,'Pressable'))press.props.onPress();assert.deepEqual(calls,[]);
 for(const press of all(row,'Pressable').filter(n=>n.props.accessibilityLabel!=='Edit memory 2: A'))assert.equal(press.props.onMoveShouldSetPanResponder,undefined);t.h.dispose();
});
test('empty memories retain side actions and bounded controls; one card invents no rear memories',()=>{
 const t=setup();t.props.stops=[];let tree=t.render();assert.equal(all(tree,'Actions').length,1);assert.equal(all(tree,'AnimatedView').length,0);assert.equal(button(tree,'Next memory card'),undefined);assert.equal(button(tree,'Previous memory card'),undefined);
 t.props.stops=[{id:'a'}];tree=t.render();assert.equal(all(tree,'View').filter(n=>n.props.testID==='draft-memory-rear').length,0);t.h.dispose();
});


test('zero-only onboarding slot replaces generic rail without changing nonempty stack',()=>{
 const t=setup();t.props.emptyContent={type:'Onboarding',props:{}};t.props.stops=[];let tree=t.render();assert.equal(all(tree,'Onboarding').length,1);assert.equal(all(tree,'Actions').length,0);
 t.props.stops=[{id:'a',name:'First'}];tree=t.render();assert.equal(all(tree,'Onboarding').length,0);assert.equal(all(tree,'Actions').length,1);assert.equal(all(tree,'AnimatedView').length,1);t.h.dispose();
});
