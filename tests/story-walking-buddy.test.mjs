import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const ts = createRequire(import.meta.url)('typescript');
function load(file, modules = {}, timers = globalThis) {
  const exports = {}, code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', code)(name => { assert.ok(name in modules, name); return modules[name]; }, exports, timers.setTimeout, timers.clearTimeout, timers.setInterval, timers.clearInterval); return exports;
}
const map = load('src/lib/journey/map-data.ts'), travel = load('src/lib/discovery/travel.ts', { '../journey/map-data': map });
const { createStoryBuddyPlayback } = load('src/lib/journey/story-buddy-playback.ts', { './map-data': map, '../discovery/travel': travel });
const stop = (id, sequence, longitude = sequence, latitude = 0) => ({ id, sequence, longitude, latitude });
function clock() {
  let now = 0, id = 0; const jobs = new Map();
  return { jobs, now: () => now, set(fn, delay) { jobs.set(++id, { fn, at: now + delay }); return id; }, clear(key) { jobs.delete(key); }, advance(ms) { const end = now + ms; for (;;) { const next = [...jobs].sort((a, b) => a[1].at - b[1].at)[0]; if (!next || next[1].at > end) break; jobs.delete(next[0]); now = next[1].at; next[1].fn(); } now = end; } };
}
function playback(stops = [stop('a', 0), stop('b', 1), stop('c', 2)]) {
  const time = clock(), model = createStoryBuddyPlayback(stops, time); model.select(stops[0]?.id ?? null); model.configure(true, false); return { time, model };
}
test('first stop idles without an automatic tour; next/previous cards walk and reach selected stops', () => {
  const { model, time } = playback(); assert.deepEqual(model.get().coordinate, [0, 0]); assert.equal(time.jobs.size, 0);
  model.select('b'); assert.equal(model.get().moving, true); time.advance(896); assert.ok(model.get().coordinate[0] > 0.4 && model.get().coordinate[0] < 0.6);
  time.advance(960); assert.deepEqual(model.get().coordinate, [1, 0]); assert.equal(model.get().moving, false); assert.equal(time.jobs.size, 0);
  model.select('a'); assert.equal(model.get().facing, 'left'); time.advance(1856); assert.deepEqual(model.get().coordinate, [0, 0]); model.dispose();
});
test('jumped card selections visit intermediate planned stops forward and backward', () => {
  const { model, time } = playback(); model.select('c'); time.advance(1824); assert.deepEqual(model.get().coordinate, [1, 0]); assert.equal(model.get().moving, false);
  time.advance(250 + 1824); assert.deepEqual(model.get().coordinate, [2, 0]); model.select('a'); time.advance(1824); assert.deepEqual(model.get().coordinate, [1, 0]);
  time.advance(250 + 1824); assert.deepEqual(model.get().coordinate, [0, 0]); model.dispose();
});
test('rapid forward/reverse selection retargets current coordinate without teleporting and rejects stale ticks', () => {
  const { model, time } = playback(); model.select('b'); time.advance(640); const halfway = [...model.get().coordinate], stale = [...time.jobs.values()][0].fn;
  model.select('a'); assert.deepEqual(model.get().coordinate, halfway); assert.equal(model.get().facing, 'left'); stale(); assert.deepEqual(model.get().coordinate, halfway);
  time.advance(1824); assert.deepEqual(model.get().coordinate, [0, 0]); model.select('b'); time.advance(640); const current = [...model.get().coordinate]; model.select('c'); assert.deepEqual(model.get().coordinate, current); time.advance(4000); assert.deepEqual(model.get().coordinate, [2, 0]); model.dispose();
});
test('expansion/lifecycle pause retains the shared position and remaining destination; unmount timers are cleaned', () => {
  const { model, time } = playback(); model.select('c'); time.advance(640); const point = [...model.get().coordinate]; model.pause(); assert.equal(time.jobs.size, 0);
  time.advance(5000); assert.deepEqual(model.get().coordinate, point); model.configure(true, false); assert.deepEqual(model.get().coordinate, point); time.advance(4200); assert.deepEqual(model.get().coordinate, [2, 0]);
  model.select('a'); model.configure(false, false); assert.equal(time.jobs.size, 0); model.dispose(); assert.equal(time.jobs.size, 0);
});
test('queued coincident stops do not advance the reached cursor before Buddy arrives', () => {
  const { model, time } = playback([stop('a', 0, 0), stop('b', 1, 1), stop('same', 2, 1), stop('c', 3, 2)]);
  model.select('c'); time.advance(640); const current = [...model.get().coordinate]; model.select('a');
  assert.deepEqual(model.get().coordinate, current); assert.equal(model.get().facing, 'left'); time.advance(1824); assert.deepEqual(model.get().coordinate, [0, 0]); model.dispose();
});
test('missing/invalid stops never invent a route, and coincident positions stay idle', () => {
  const { model, time } = playback([stop('a', 0), stop('missing', 1, null), stop('c', 2), stop('same', 3, 2)]);
  model.select('missing'); assert.equal(model.get().coordinate, null); assert.equal(time.jobs.size, 0);
  model.select('c'); assert.deepEqual(model.get().coordinate, [2, 0]); assert.equal(time.jobs.size, 0);
  model.select('a'); assert.deepEqual(model.get().coordinate, [0, 0]); assert.equal(time.jobs.size, 0);
  model.select('same'); assert.deepEqual(model.get().coordinate, [2, 0]); model.select('c'); assert.deepEqual(model.get().coordinate, [2, 0]); assert.equal(time.jobs.size, 0); model.dispose();
});
test('reduced motion shows the selected stop stationary and never schedules walking', () => {
  const { model, time } = playback(); model.select('c'); time.advance(640); model.configure(true, true); assert.deepEqual(model.get().coordinate, [2, 0]); assert.equal(model.get().moving, false); assert.equal(time.jobs.size, 0);
  model.select('a'); assert.deepEqual(model.get().coordinate, [0, 0]); model.configure(true, false); assert.equal(time.jobs.size, 0); model.dispose();
});
test('date-line path and pause/resume remain finite on the shortest arc', () => {
  const { model, time } = playback([stop('a', 0, 179, 10), stop('b', 1, -179, 10)]); model.select('b'); time.advance(1200);
  assert.ok(Math.abs(model.get().coordinate[0]) > 179); model.pause(); const point = [...model.get().coordinate]; model.configure(true, false); assert.deepEqual(model.get().coordinate, point);
  time.advance(1824); assert.deepEqual(model.get().coordinate, [-179, 10]); model.dispose();
});
test('Story wires one shared controller into36dp compact and64dp expanded maps without playback/plane controls', () => {
  const screen = readFileSync('src/app/journey/[id].tsx', 'utf8');
  assert.ok(screen.includes('storyBuddySize={36}')); assert.ok(screen.includes('storyBuddySize={64}'));
  assert.equal((screen.match(/storyBuddy={storyBuddy}/g) ?? []).length, 2);
});
test('actual StorySheet releases its blocker only for the explicitly opted-in expanded map', () => {
  const blocked = [], jsx = (type, props) => ({ type, props });
  const { StorySheet } = load('src/components/journey/story-sheet.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'expo-status-bar': { StatusBar: 'StatusBar' },
    '@/theme/mobile-theme': { theme: {} }, 'react-native': { Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', View: 'View', Text: 'Text', StyleSheet: { create: value => value } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/components/discovery/ui': { colors: {} },
    '@/hooks/use-journey-buddy': { useBuddySuppression: value => blocked.push(value) },
  });
  const props = { visible: true, title: 'Map', children: null, onClose() {} };
  StorySheet(props); assert.equal(blocked.at(-1), true);
  StorySheet({ ...props, suppressBuddy: false }); assert.equal(blocked.at(-1), false);
  StorySheet({ ...props, visible: false }); assert.equal(blocked.at(-1), false);
});

function hooks() {
  const slots = []; let cursor = 0, effects = [];
  const react = { useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useSyncExternalStore(_subscribe, get) { return get(); },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((value, j) => value !== slots[i].deps[j])) { slots[i]?.cleanup?.(); const entry = slots[i] = { deps }; effects.push(() => { entry.cleanup = fn(); }); } } };
  return { react, render(fn, props) { cursor = 0; effects = []; const tree = fn(props); effects.forEach(fn => fn()); return tree; }, dispose() { slots.forEach(entry => entry?.cleanup?.()); } };
}
for (const motion of ['walk','run']) test(`actual ${motion} annotation decodes idle and motion before ownership, animates at its clip rate and releases timers on failure`, () => {
  const { model, time } = playback(), h = hooks(), intervals = new Map(), timeouts = new Map(), ownership = []; let id = 0;
  const delays=[];
  const timers = { setInterval(fn,delay) { delays.push(delay);intervals.set(++id, fn); return id; }, clearInterval(key) { intervals.delete(key); }, setTimeout(fn) { timeouts.set(++id, fn); return id; }, clearTimeout(key) { timeouts.delete(key); } };
  const clips = Object.fromEntries(['idle', 'walk','run'].map(name => [name, { source: name, frames: 8, fps: name==='run'?12:10, facing: 'left' }])); const jsx = (type, props) => ({ type, props });
  const { StoryWalkingBuddy } = load('src/components/journey/map/story-walking-buddy.tsx', { react: h.react, 'react/jsx-runtime': { jsx, jsxs: jsx }, '@rnmapbox/maps': { MarkerView: 'MarkerView' }, 'react-native': { Image: 'Image', View: 'View' }, '@/hooks/use-map-buddy': { useMapBuddy(available) { ownership.push(available); return { visible: available }; } }, '@/lib/buddy/animations': { resolveBuddyAnimation: name => clips[name], spriteFrame: (_clip, frame, size) => ({ left: -frame * size }) } }, timers);
  model.select('b'); time.advance(640); const retained = [...model.get().coordinate];
  const props = { playback: model, active: true, reducedMotion: true, motionKnown: false, size: 36,...(motion==='run'?{motion}:{}) }, render = () => h.render(StoryWalkingBuddy, props);
  let tree = render(); assert.equal(ownership.at(-1), false); assert.equal(tree.props.children.props.style.width, 36);
  tree.props.children.props.children.forEach(image => image.props.onLoad()); tree.props.children.props.onLayout({ nativeEvent: { layout: { width: 36, height: 36 } } }); render(); tree = render();
  assert.equal(ownership.at(-1), false); assert.deepEqual(model.get().coordinate, retained, 'Unknown preference during expansion pauses without snapping to the target');
  props.motionKnown = true; props.reducedMotion = false; render(); tree = render(); assert.equal(ownership.at(-1), true); assert.deepEqual(model.get().coordinate, retained);
  model.select('b'); time.advance(640); tree = render(); assert.equal(tree.props.children.props.children[1].props.style.opacity, 1);
  assert.equal(tree.props.children.props.children[1].props.source,motion);assert.equal(delays.at(-1),1000/clips[motion].fps);
  [...intervals.values()][0](); tree = render(); assert.equal(tree.props.children.props.children[1].props.style.left, -36);
  props.size = 64; tree = render(); assert.equal(tree.props.children.props.style.width, 64); assert.equal(tree.props.children.props.children[1].props.style.left, -64);
  tree.props.children.props.children[1].props.onError(); assert.equal(render(), null); assert.equal(ownership.at(-1), false); assert.equal(intervals.size, 0); assert.equal(time.jobs.size, 0); h.dispose(); model.dispose(); assert.equal(timeouts.size, 0);
});

test('run annotation rests on idle after arrival and reduced motion never starts sprite or route timers',()=>{
  const {model,time}=playback(),h=hooks(),intervals=new Map();let id=0;
  const timers={setInterval(fn){intervals.set(++id,fn);return id;},clearInterval(key){intervals.delete(key);},setTimeout:()=>++id,clearTimeout(){}};
  const clips=Object.fromEntries(['idle','run'].map(source=>[source,{source,frames:8,fps:12,facing:'left'}])),jsx=(type,props)=>({type,props});
  const {StoryWalkingBuddy}=load('src/components/journey/map/story-walking-buddy.tsx',{react:h.react,'react/jsx-runtime':{jsx,jsxs:jsx},'@rnmapbox/maps':{MarkerView:'MarkerView'},'react-native':{Image:'Image',View:'View'},'@/hooks/use-map-buddy':{useMapBuddy:available=>({visible:available})},'@/lib/buddy/animations':{resolveBuddyAnimation:name=>clips[name],spriteFrame:()=>({})}},timers);
  const props={playback:model,active:true,reducedMotion:false,motion:'run',size:36},render=()=>h.render(StoryWalkingBuddy,props);
  let tree=render();tree.props.children.props.children.forEach(image=>image.props.onLoad());tree.props.children.props.onLayout({nativeEvent:{layout:{width:36,height:36}}});render();render();model.select('b');time.advance(1856);tree=render();
  assert.equal(model.get().moving,false);assert.equal(tree.props.children.props.children[0].props.source,'idle');assert.equal(tree.props.children.props.children[0].props.style.opacity,1);assert.equal(tree.props.children.props.children[1].props.style.opacity,0);
  props.reducedMotion=true;render();model.select('a');render();assert.equal(intervals.size,0);assert.equal(time.jobs.size,0);assert.deepEqual(model.get().coordinate,[0,0]);h.dispose();model.dispose();
});
