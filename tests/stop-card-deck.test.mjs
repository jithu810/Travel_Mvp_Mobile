import { buddyGeometryStub } from './helpers/buddy-geometry-stub.mjs';
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
  modules={'@/hooks/use-buddy-geometry':buddyGeometryStub,...modules};
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
function find(tree, type) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === type) return tree;
  for (const child of [tree.props?.children, tree.props?.footer].flat(Infinity)) {
    const match = find(child, type);
    if (match) return match;
  }
  return null;
}
function all(tree, type) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(tree.type === type ? [tree] : []), ...[tree.props?.children, tree.props?.footer].flat(Infinity).flatMap(child => all(child, type))];
}

const artModules={'@/components/art/journey-art':{StopArt:'StopArt',JourneyArt:'JourneyArt'},'@/lib/art/journey-art':{artSeed:(id,stops)=>'seed:'+id+':'+stops.map(s=>s.id).join(',')}};
function setup() {
  const h = harness(), calls = [], pending = []; let background, preference;
  class Value { constructor(v) { this.value=v; } setValue(v) { this.value=v; } stopAnimation() {} interpolate() { return '0deg'; } }
  const native = { View:'View',Text:'Text',Pressable:'Pressable',Image:'Image',StyleSheet:{create:v=>v},
    Animated:{Value,View:'AnimatedView',timing:(_v,opts)=>({start:fn=>pending.push({fn,opts})})},
    PanResponder:{create:v=>({panHandlers:v})},
    AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:(_,fn)=>{preference=fn;return {remove(){}};}},
    AppState:{addEventListener:(_,fn)=>{background=fn;return {remove(){}};}},
  };
  const {StopCardDeck}=load('src/components/journey/stop-card-deck.tsx',{'react-native':native,...artModules},h.hooks);
  const stops=['a','b','c'].map(id=>({id,name:id,photo:null,description:'Story',rating:null}));
  const props={stops,selectedId:'a',onSelect:id=>calls.push(id),onDetails:id=>calls.push('read:'+id)};
  return {h,props,calls,pending,render:()=>h.render(StopCardDeck,props),background:()=>background('background'),reduce:()=>preference(true)};
}
function button(tree,label) { return all(tree,'Pressable').find(n=>n.props.accessibilityLabel===label); }

test('deck browses forward/back with swipe dominance, bounded buttons and immediate reduced motion',async()=>{
  const t=setup();let tree=t.render();await Promise.resolve();tree=t.render();
  assert.equal(button(tree,'Previous memory').props.disabled,true);
  let swipe=all(tree,'View').find(n=>n.props.testID==='stop-photo-swipe').props;
  assert.equal(swipe.onMoveShouldSetPanResponder(null,{dx:30,dy:40}),false);
  assert.equal(swipe.onMoveShouldSetPanResponder(null,{dx:60,dy:5}),true);
  swipe.onPanResponderRelease(null,{dx:-80,dy:5});assert.equal(t.calls.length,0);assert.equal(t.pending.length,1);
  t.pending.pop().fn({finished:true});assert.deepEqual(t.calls,['b']);
  t.props.selectedId='b';tree=t.render();t.reduce();tree=t.render();
  all(tree,'View').find(n=>n.props.testID==='stop-photo-swipe').props.onPanResponderRelease(null,{dx:80,dy:0});assert.equal(t.calls.at(-1),'a');
  t.props.selectedId='c';tree=t.render();assert.equal(button(tree,'Next memory').props.disabled,true);
  t.props.stops=[t.props.stops[0]];t.props.selectedId='a';tree=t.render();assert.equal(button(tree,'Next memory').props.disabled,true);
  t.props.stops=[];tree=t.render();assert.equal(all(tree,'Pressable').length,0);t.h.dispose();
});

test('deck cancels stale animation completion after map selection, background, termination and unmount',async()=>{
  for(const cancel of ['map','background','terminate','blur','unmount']) {
    const t=setup();t.render();await Promise.resolve();let tree=t.render();
    all(tree,'View').find(n=>n.props.testID==='stop-photo-swipe').props.onPanResponderRelease(null,{dx:-90,dy:0});const completion=t.pending.pop().fn;
    if(cancel==='map'){t.props.selectedId='c';t.render();}
    if(cancel==='background'){t.background();all(tree,'View').find(n=>n.props.testID==='stop-photo-swipe').props.onPanResponderRelease(null,{dx:-90,dy:0});assert.equal(t.pending.length,0);}
    if(cancel==='blur'){t.props.active=false;t.render();}
    if(cancel==='terminate')all(tree,'View').find(n=>n.props.testID==='stop-photo-swipe').props.onPanResponderTerminate();
    if(cancel==='unmount')t.h.dispose();
    completion({finished:true});assert.deepEqual(t.calls,[],cancel);if(cancel!=='unmount')t.h.dispose();assert.equal(t.h.lateUpdates(),0);
  }
});

test('social rail is outside read pressables and gesture surfaces and remains available for empty journeys',()=>{
 const t=setup();t.props.photoActions={type:'SocialActions',props:{}};t.props.optionsActions={type:'JourneyOptions',props:{}};t.props.creator={type:'StoryCreator',props:{}};let tree=t.render();
 const rail=all(tree,'View').find(n=>n.props.testID==='stop-photo-actions');assert.ok(rail);assert.equal(rail.props.onPanResponderRelease,undefined);
 for(const read of all(tree,'Pressable')){assert.equal(all(read,'SocialActions').length,0);assert.equal(all(read,'JourneyOptions').length,0);assert.equal(all(read,'StoryCreator').length,0);}
 assert.equal(all(find(tree,'AnimatedView'),'SocialActions').length,1);assert.equal(all(find(tree,'AnimatedView'),'StoryCreator').length,1);
 t.props.stops=[];tree=t.render();assert.equal(all(tree,'SocialActions').length,1);assert.equal(all(tree,'JourneyOptions').length,1);t.h.dispose();
});
test('deck never emits raw text as a native View child',()=>{
 const t=setup();const tree=t.render();
 for(const node of [...all(tree,'View'),...all(tree,'AnimatedView')]){
  assert.equal([node.props.children].flat(Infinity).some(child=>typeof child==='string'||typeof child==='number'),false);
 }
 t.h.dispose();
});

test('photo-less deck cards show stop art for their own index on the shared route; photos still win and no map image is requested',()=>{
 const t=setup();t.props.stops=t.props.stops.map((stop,i)=>({...stop,photo:i===1?'https://example.test/b.jpg':null,latitude:9+i/10,longitude:76}));t.props.selectedId='a';
 const tree=t.render();
 const photos=[...all(tree,'Pressable'),...all(tree,'View')].flatMap(n=>[n.props.children].flat(Infinity)).filter(n=>n?.type?.name==='StopPhoto');
 assert.ok(photos.length>=3,'Active card and the two rear cards');
 const rendered=photos.map(node=>({props:node.props,out:node.type(node.props)}));
 for(const {props,out} of rendered){
  const art=all(out,'StopArt')[0];const image=all(out,'Image')[0];
  if(props.stop.photo){assert.equal(art,undefined);assert.equal(image.props.source.uri,props.stop.photo);continue;}
  assert.equal(image,undefined,'No stock photo and no static map image');
  assert.equal(art.props.index,props.stops.indexOf(props.stop),'Highlights this stop');
  assert.equal(art.props.stops,t.props.stops,'Draws the whole journey route');
  assert.equal(art.props.seed,'seed:null:a,b,c','One palette for the whole journey');
  assert.equal(art.props.name,props.stop.name);
  assert.ok(art.props.inset.right>=44,'Keeps the photo action rail clear');
  assert.equal(art.props.accessibilityLabel,undefined,'Decorative: the card Pressable carries the label');
 }
 assert.deepEqual(rendered.filter(r=>!r.props.stop.photo).map(r=>r.props.index).sort(),[0,2]);
 t.h.dispose();
});

test('deck photo button says View stop without a usable photo, including after the photo fails',()=>{
 const t=setup();t.props.stops=t.props.stops.map((stop,i)=>({...stop,photo:i===1?'https://example.test/b.jpg':null}));t.props.selectedId='a';
 let tree=t.render();
 assert.ok(button(tree,'View stop 1: a'));assert.equal(button(tree,'View stop 1: a').props.accessibilityHint,'Opens the full stop story');
 t.props.selectedId='b';tree=t.render();
 const label='View photo for stop 2: b';assert.equal(button(tree,label).props.accessibilityHint,'Opens the full stop story and photo');
 const active=[button(tree,label).props.children].flat().find(n=>n?.type?.name==='StopPhoto');
 const image=all(active.type(active.props),'Image')[0];image.props.onError();tree=t.render();
 assert.ok(button(tree,'View stop 2: b'),'A failed photo is no longer announced as a photo');
 const failed=[button(tree,'View stop 2: b').props.children].flat().find(n=>n?.type?.name==='StopPhoto');
 assert.equal(failed.props.failed,true);assert.equal(all(failed.type(failed.props),'StopArt').length,1);
 t.h.dispose();
});
