import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function load(file, modules = {}) {
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(id => { assert.ok(id in modules, id); return modules[id]; }, exports);
  return exports;
}
const model = load('src/lib/navigation-scroll.ts');
test('deliberate downward travel compacts, reverse travel restores before reaching top', () => {
  let state = model.initialNavigationScroll();
  for (const y of [4, 12, 25, 40]) state = model.nextNavigationScroll(state, y);
  assert.equal(state.compact, true);
  state = model.nextNavigationScroll(state, 37); assert.equal(state.compact, true);
  state = model.nextNavigationScroll(state, 24); assert.equal(state.compact, false);
});
test('jitter, pull-to-refresh bounce, bottom bounce and invalid offsets do not toggle the pill', () => {
  let state = model.initialNavigationScroll();
  for (const y of [-30, 0, 10, 12, 11, 13, 12, 15]) state = model.nextNavigationScroll(state, y);
  assert.equal(state.compact, false);
  state = model.nextNavigationScroll(state, 60, 100); assert.equal(state.compact, true);
  state = model.nextNavigationScroll(state, 160, 100);
  state = model.nextNavigationScroll(state, 120, 100); assert.equal(state.compact, true);
  assert.equal(model.nextNavigationScroll(state, NaN), state);
  assert.equal(model.nextNavigationScroll(state, 0).compact, false);
  assert.equal(model.nextNavigationScroll(state, 50, 0).compact, false, 'short content cannot collapse');
});
function hookHarness() {
  const slots = []; let index = 0, focus, cleanup, enabled = true, key = 'published', initial = false;
  const changes = [], setCompact = value => changes.push(value);
  const react = { createContext: value => ({value}), useContext: () => setCompact, useRef: initial => slots[index++] ??= {current:initial}, useCallback: fn => fn, useState: () => {}, useEffect: () => {} };
  const hook = load('src/hooks/use-navigation-scroll.ts', { react, 'expo-router': {useFocusEffect: callback => {focus=callback;}}, 'react-native': {}, '@/lib/navigation-scroll':model });
  let onScroll;
  const render = () => {index=0;onScroll=hook.useNavigationScroll(enabled,key,initial);};
  const enter = () => {cleanup?.();render();cleanup=focus();};
  const scroll = y => onScroll({nativeEvent:{contentOffset:{y},contentSize:{height:1000},layoutMeasurement:{height:400}}});
  return {changes, enter, scroll, blur:()=>cleanup?.(), collection(next){key=next;enter();}, seed(value){initial=value;enter();}, disable(){enabled=false;enter();}};
}
test('focus/collection resets and blurred callbacks cannot alter another page', () => {
  const h=hookHarness();h.enter();h.scroll(50);assert.deepEqual(h.changes,[false,true]);
  h.blur();h.scroll(0);assert.deepEqual(h.changes,[false,true]);
  h.enter();assert.equal(h.changes.at(-1),false);h.scroll(60);h.collection('map');assert.equal(h.changes.at(-1),false);
  h.disable();const count=h.changes.length;h.scroll(100);assert.equal(h.changes.length,count);
});
test('Home expansion seeds compact history, so top or reverse scroll restores the banner and bar', () => {
  const h=hookHarness();h.seed(true);assert.equal(h.changes.at(-1),true);h.scroll(0);assert.equal(h.changes.at(-1),false);
  h.seed(true);h.scroll(60);h.scroll(40);assert.equal(h.changes.at(-1),false);
  h.seed(false);assert.equal(h.changes.at(-1),false);
});
test('reduced motion applies immediately and animation cleanup stops interrupted transitions', async () => {
  let compact=true, reduced=true, change, pending=[], index=0;
  const slots=[],effects=[],writes=[],animations=[];
  class Value { stopAnimation(){writes.push('stop');} setValue(value){writes.push(value);} }
  const react={createContext:()=>({}),useContext:()=>compact,useState(initial){const slot=index++;if(!(slot in slots))slots[slot]=typeof initial==='function'?initial():initial;return [slots[slot],value=>slots[slot]=value];},useEffect(effect){effects.push(effect);},useCallback:fn=>fn,useRef:()=>({})};
  const hook=load('src/hooks/use-navigation-scroll.ts',{react,'expo-router':{},'@/lib/navigation-scroll':model,'react-native':{AccessibilityInfo:{isReduceMotionEnabled:async()=>reduced,addEventListener:(_,callback)=>{change=callback;return{remove(){}};}},Animated:{Value,timing:(_,config)=>{animations.push(config);return{start(){},stop(){writes.push('cancel');}};}}}});
  const render=()=>{index=0;effects.length=0;hook.useNavigationAnimation();pending=effects.map(effect=>effect());};
  render();assert.equal(writes.at(-1),1);await Promise.resolve();change(false);render();assert.equal(animations.at(-1).toValue,1);assert.equal(animations.at(-1).useNativeDriver,false);pending.at(-1)();assert.equal(writes.at(-1),'cancel');compact=false;render();assert.equal(animations.at(-1).toValue,0);change(true);render();assert.equal(writes.at(-1),0);
});
