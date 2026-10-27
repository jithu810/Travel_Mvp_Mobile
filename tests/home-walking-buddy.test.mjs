import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const ts = createRequire(import.meta.url)('typescript');
function load(file, modules, timers = globalThis) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', code)(name => {
    assert.ok(name in modules, name); return modules[name];
  }, exports, timers.setInterval, timers.clearInterval, timers.setTimeout, timers.clearTimeout);
  return exports;
}
const map = load('src/lib/journey/map-data.ts', {});
const travel = load('src/lib/discovery/travel.ts', { '../journey/map-data': map });
const jsx = (type, props) => ({ type, props });
const runtime = { jsx, jsxs: jsx, Fragment: 'Fragment' };
function hooks() {
  const slots = []; let cursor = 0, effects = [];
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((value, j) => value !== slots[i].deps[j])) { slots[i]?.cleanup?.(); const entry = slots[i] = { deps }; effects.push(() => { entry.cleanup = fn(); }); } },
  };
  return { react, render(fn, props) { cursor = 0; effects = []; const tree = fn(props); effects.forEach(fn => fn()); return tree; }, dispose() { slots.forEach(entry => entry?.cleanup?.()); } };
}
function harness(route = [[[0, 0], [1, 0], [-1, 0]]]) {
  const h = hooks(), intervals = new Map(), timeouts = new Map(), animations = [], ownership = []; let id = 0, visible = true;
  const timers = { setInterval(fn) { intervals.set(++id, fn); return id; }, clearInterval(key) { intervals.delete(key); }, setTimeout(fn) { timeouts.set(++id, fn); return id; }, clearTimeout(key) { timeouts.delete(key); } };
  const playback = load('src/lib/discovery/travel.ts', { '../journey/map-data': map }, timers);
  class Value {
    listeners = new Map(); addListener(fn) { this.listeners.set(++id, fn); return id; }
    removeListener(key) { this.listeners.delete(key); }
    setValue(value) { this.listeners.forEach(fn => fn({ value })); }
  }
  const clips = Object.fromEntries(['walk', 'idle'].map(name => [name, { source: name, frames: 8, fps: name === 'walk' ? 10 : 6, facing: 'left' }]));
  const { TravelingBuddy } = load('src/components/discovery/globe/traveling-buddy.tsx', {
    react: h.react, 'react/jsx-runtime': runtime,
    '@rnmapbox/maps': { MarkerView: 'MarkerView' },
    'react-native': { Image: 'Image', View: 'View', Easing: { linear: 'linear' }, Animated: { Value, timing(value, config) { const animation = { value, config, start(done) { this.done = done; }, stop() { this.stopped = true; } }; animations.push(animation); return animation; } } },
    '@/hooks/use-map-buddy': { useMapBuddy(available) { ownership.push(available); return { visible: available && visible }; } },
    '@/lib/buddy/animations': { resolveBuddyAnimation: name => clips[name], spriteFrame: (_clip, frame) => ({ left: -frame * 64 }) },
    '@/lib/discovery/travel': playback,
  }, timers);
  let failures = 0; const props = { legs: travel.travelLegs(route), onFailure: () => failures++ };
  const render = () => h.render(TravelingBuddy, props);
  const ready = () => { const tree = render(), view = tree.props.children; view.props.children.forEach(image => image.props.onLoad()); view.props.onLayout({ nativeEvent: { layout: { width: 64, height: 64 } } }); render(); return render(); };
  return { ...h, render, ready, animations, intervals, timeouts, ownership, get failures() { return failures; }, suppress() { visible = false; render(); }, props };
}
test('Home marker claims ownership only after both original sheets decode and the annotation is laid out', () => {
  const h = harness(); const tree = h.render();
  assert.equal(tree.type, 'MarkerView'); assert.deepEqual(tree.props.anchor, { x: 0.5, y: 1 });
  assert.equal(tree.props.pointerEvents, 'none'); assert.equal(tree.props.children.props.style.opacity, 0);
  assert.equal(h.ownership.at(-1), false); assert.equal(h.animations.length, 0);
  tree.props.children.props.children[0].props.onLoad(); h.render(); assert.equal(h.ownership.at(-1), false);
  h.ready(); assert.equal(h.ownership.at(-1), true); assert.equal(h.animations.length, 1); assert.equal(h.timeouts.size, 0);
  h.dispose(); assert.equal(h.intervals.size, 0); assert.equal(h.timeouts.size, 0);
});
test('actual sprite walks along stored positions, idles at stops and faces the next leg without rotating', () => {
  const h = harness(); let tree = h.ready();
  assert.equal(tree.props.children.props.children.find(image => image.props.source === 'walk').props.style.opacity, 1);
  const first = h.animations[0]; first.value.setValue(0.5); tree = h.render(); assert.deepEqual(tree.props.coordinate, [0.5, 0]);
  assert.deepEqual(tree.props.children.props.style.transform, [{ scaleX: -1 }]);
  first.value.setValue(1); first.done({ finished: true }); tree = h.render();
  assert.deepEqual(tree.props.coordinate, [1, 0]); assert.equal(tree.props.children.props.children[0].props.style.opacity, 1);
  const dwell = [...h.timeouts.values()][0]; h.timeouts.clear(); dwell(); tree = h.render();
  assert.equal(h.animations.length, 2); assert.deepEqual(tree.props.children.props.style.transform, [{ scaleX: 1 }]);
  const second = h.animations[1]; second.value.setValue(1); second.done({ finished: true }); tree = h.render();
  assert.deepEqual(tree.props.coordinate, [-1, 0]); assert.equal(tree.props.children.props.children[0].props.style.opacity, 1);
  h.dispose();
});
test('finished Locate walk rests briefly at the final stop, then releases map ownership so the floating Buddy and its help return', () => {
  const h = harness(); h.ready(); const first = h.animations[0]; first.value.setValue(1); first.done({ finished: true }); h.render();
  assert.equal(h.timeouts.size, 1, 'Only the stop dwell is pending mid-journey'); const dwell = [...h.timeouts.values()][0]; h.timeouts.clear(); dwell(); h.render();
  const last = h.animations[1]; last.value.setValue(1); last.done({ finished: true }); let tree = h.render();
  assert.deepEqual(tree.props.coordinate, [-1, 0]); assert.equal(h.ownership.at(-1), true, 'Buddy idles at arrival while still owning the map');
  assert.equal(h.timeouts.size, 1); const rest = [...h.timeouts.values()][0]; h.timeouts.clear(); rest(); tree = h.render();
  assert.equal(tree, null, 'Map Buddy leaves instead of duplicating the floating Buddy'); assert.equal(h.ownership.at(-1), false); assert.equal(h.failures, 0, 'Release is not a plane fallback');
  assert.equal(h.intervals.size, 0); assert.equal(h.timeouts.size, 0); h.render(); assert.equal(h.animations.length, 2, 'Released walk never replays'); h.dispose();
});
test('cancelling Locate before arrival never schedules the release rest', () => {
  const h = harness(); h.ready(); h.animations[0].done({ finished: false }); h.render(); assert.equal(h.timeouts.size, 0); assert.equal(h.ownership.at(-1), true); h.dispose(); assert.equal(h.timeouts.size, 0);
});
test('suppression and unmount stop movement, sprite timers and stale completion; a new Locate starts at stop one', () => {
  const h = harness(); h.ready(); const first = h.animations[0];
  h.suppress(); assert.equal(first.stopped, true); assert.equal(h.intervals.size, 0);
  first.done({ finished: true }); assert.equal(h.timeouts.size, 0); h.dispose();
  const replay = harness(); const tree = replay.ready(); assert.deepEqual(tree.props.coordinate, [0, 0]); replay.dispose();
});
test('date-line crossings face the shortest spherical direction in both directions', () => {
  for (const [route, scale] of [[[[[179, 10], [-179, 10]]], -1], [[[[ -179, 10], [179, 10]]], 1]]) {
    const h = harness(route), tree = h.ready();
    assert.deepEqual(tree.props.children.props.style.transform, [{ scaleX: scale }]);
    h.animations[0].value.setValue(0.5); const halfway = h.render().props.coordinate;
    assert.ok(Math.abs(Math.abs(halfway[0]) - 180) < 0.01); h.dispose();
  }
});
test('decode errors and timeout release ownership and request one plane fallback', () => {
  for (const fail of [h => h.render().props.children.props.children[0].props.onError(), h => [...h.timeouts.values()][0]()]) {
    const h = harness(); h.render(); fail(h); assert.equal(h.render(), null); assert.equal(h.ownership.at(-1), false); assert.equal(h.failures, 1); h.dispose(); assert.equal(h.timeouts.size, 0);
  }
});
test('Home opts in without changing Create/Story playback; existing lifecycle and reduced-motion gate remains authoritative', () => {
  const globe = readFileSync('src/components/discovery/globe/native-globe.tsx', 'utf8');
  const overlays = readFileSync('src/components/discovery/globe/journey-overlays.tsx', 'utf8');
  assert.ok(globe.includes('walkingBuddy={!preview && homeSearch}'));
  assert.ok(globe.includes('travel?.request === requestKey && focused && appActive && !reduceMotion'));
  assert.ok(globe.includes('setTravel(null); transition.cancel()'));
  assert.ok(overlays.includes('walkingBuddy = false')); assert.ok(overlays.includes('walkingBuddy ? <HomeTraveler'));
  assert.ok(overlays.includes('preference.loaded && preference.enabled && !failed'));
});
