import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(file, modules = {}, timers = globalThis) {
  const exports = {}, code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', code)(name => { assert.ok(name in modules, name); return modules[name]; }, exports, timers.setTimeout, timers.clearTimeout); return exports;
}
const mapData = load('src/lib/journey/map-data.ts'), travel = load('src/lib/discovery/travel.ts', { '../journey/map-data': mapData });
const { createJourneyPreview } = load('src/lib/journey/preview-playback.ts', { '../discovery/travel': travel });
const model = load('src/lib/buddy/model.ts'), { createBuddyStore } = load('src/lib/buddy/store.ts', { './model': model });
const { liveBuddyClear } = load('src/lib/buddy/map-presentation.ts');
const { createBuddyMapImage, buddyMapImageSource } = load('src/lib/buddy/map-image.ts');
function clock() {
  let now = 0, serial = 0; const jobs = new Map();
  return { jobs, now: () => now, set: (fn, ms) => { jobs.set(++serial, { fn, at: now + ms }); return serial; }, clear: id => jobs.delete(id), advance(ms) { now += ms; for (const [id, job] of [...jobs]) if (job.at <= now) { jobs.delete(id); job.fn(); } } };
}

test('map image embeds the unchanged single-pose PNG, never an animation sheet or network URI', () => {
  assert.ok(buddyMapImageSource.uri.startsWith('data:image/png;base64,'));
  const png = Buffer.from(buddyMapImageSource.uri.split(',')[1], 'base64');
  assert.ok(png.equals(readFileSync('assets/journey-buddy/reference.png')), 'Embedded pixels must match the source asset exactly');
  assert.equal(png.readUInt32BE(16), 128); assert.equal(png.readUInt32BE(20), 128);
});
test('Story preview begins on request, retains exact progress/stop dwell on pause and resumes without jumping', () => {
  const time = clock(), preview = createJourneyPreview([[[0, 0], [1, 0], [2, 0]]], time);
  assert.equal(preview.get().status, 'idle'); assert.equal(time.jobs.size, 0); assert.equal(preview.play(), false);
  preview.setReady(true); assert.equal(preview.play(), true); time.advance(4200); preview.pause();
  assert.equal(preview.progress(), 4200); const midway = [...preview.getPosition().coordinate]; assert.ok(midway[0] > 0.4 && midway[0] < 0.6);
  time.advance(100000); assert.deepEqual(preview.getPosition().coordinate, midway); assert.equal(time.jobs.size, 0);
  preview.play(); time.advance(4200); preview.pause(); assert.equal(preview.progress(), 8400); assert.deepEqual(preview.getPosition().coordinate, [1, 0]);
  preview.play(); time.advance(300); preview.pause(); assert.equal(preview.progress(), 8700); assert.deepEqual(preview.getPosition().coordinate, [1, 0]);
  time.advance(50000); preview.play(); time.advance(350); assert.deepEqual(preview.getPosition().coordinate, [1, 0], 'Remaining dwell is retained');
  time.advance(4200); assert.ok(preview.getPosition().coordinate[0] > 1.4); preview.dispose(); assert.equal(time.jobs.size, 0);
});
test('Replay resets intentionally; lifecycle/readiness pauses, no simulated bridge crosses missing-coordinate gaps', () => {
  const time = clock(), preview = createJourneyPreview([[[0, 0], [1, 0]], [[100, 10], [101, 10]]], time);
  preview.setReady(true); preview.play(); time.advance(8400 + 650 + 1000);
  assert.ok(preview.getPosition().coordinate[0] >= 100, 'Next segment begins at its own real start');
  preview.setReady(false); const point = [...preview.getPosition().coordinate]; time.advance(20000);
  assert.deepEqual(preview.getPosition().coordinate, point); assert.equal(preview.play(), false);
  preview.setReady(true); assert.equal(preview.replay(), true); assert.deepEqual(preview.getPosition().coordinate, [0, 0]);
  time.advance(preview.total); assert.equal(preview.get().status, 'finished'); assert.equal(time.jobs.size, 0);
  assert.equal(preview.play(), false); preview.replay(); assert.equal(preview.progress(), 0); preview.dispose(); assert.equal(preview.play(), false);
  const empty = createJourneyPreview([[[0, 0]]], clock()); empty.setReady(true); assert.equal(empty.get().status, 'unavailable'); assert.equal(empty.play(), false);
});
test('map ownership is route scoped, help captures current action owner and success can take presentation without changing preference', () => {
  const store = createBuddyStore(), owner = {}, map = {}; store.environment('/journey/one', true);
  store.screen(owner, { path: '/journey/one', state: { floating: true }, act() {} });
  store.mapPresentation(map, '/journey/one', true); assert.equal(store.current().mapOwned, true);
  store.celebrate('/journey/one', 'run', {}); assert.ok(store.getCelebration());
  assert.equal(store.openMapHelp('/journey/one'), true); assert.equal(store.getCelebration(), null); assert.ok(store.getMapHelp());
  store.closeMapHelp(); assert.equal(store.getMapHelp(), null);
  store.screen(owner, { path: '/journey/one', state: { travel: { guidance: 'Turn now', arrival: false } }, act() {} });
  assert.equal(store.openMapHelp('/journey/one'), false);
  store.screen(owner, { path: '/journey/one', state: { travel: { guidance: null, arrival: true } }, act() {} });
  assert.equal(store.openMapHelp('/journey/one'), false);
  store.environment('/travel/two', true); assert.equal(store.current().mapOwned, false); assert.equal(store.getMapHelp(), null);
  store.mapPresentation(map, '/travel/two', true); store.mapPresentation(map, '/travel/two', false); assert.equal(store.current().mapOwned, false);
});
test('live decorative bounds avoid the dot/arrow, stop hit areas, controls and viewport edges', () => {
  const viewport = { width: 390, height: 800 }, point = [180, 350];
  assert.equal(liveBuddyClear(point, [], viewport, []), true);
  assert.equal(liveBuddyClear(point, [[212, 325]], viewport, []), false);
  assert.equal(liveBuddyClear(point, [], viewport, [{ x: 198, y: 300, width: 44, height: 44 }]), false);
  assert.equal(liveBuddyClear([380, 350], [], viewport, []), false);
  assert.equal(liveBuddyClear([20, 20], [], viewport, []), false);
  assert.equal(liveBuddyClear([NaN, 350], [], viewport, []), false);
});

function hooks() {
  const slots = []; let cursor = 0, effects = [];
  const react = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(value) { return slots[cursor++] ??= { current: value }; },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((value, j) => value !== slots[i].deps[j])) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useSyncExternalStore(_subscribe, get) { return get(); },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((value, j) => value !== slots[i].deps[j])) { slots[i]?.cleanup?.(); const item = slots[i] = { deps }; effects.push(() => { item.cleanup = fn(); }); } },
  };
  return { react, render(fn, props) { cursor = 0; effects = []; const result = fn(props); effects.forEach(effect => effect()); return result; }, dispose() { slots.forEach(item => item?.cleanup?.()); } };
}
const jsx = (type, props) => ({ type, props }), runtime = { jsx, jsxs: jsx, Fragment: 'Fragment' };
const all = (node, type) => !node || typeof node !== 'object' ? [] : [...(node.type === type ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap(child => all(child, type))];
test('actual preview marker uses the same coordinate source for Buddy/plane and cleans its only subscription', () => {
  const h = hooks(), time = clock(), preview = createJourneyPreview([[[0, 0], [1, 0]]], time), sources = [];
  class AnimatedPoint { constructor(value) { this.value = value; sources.push(this); } setValue(value) { this.value = value; } stopAnimation() {} }
  const mapbox = { Animated: { ShapeSource: 'ShapeSource' }, SymbolLayer: 'SymbolLayer' };
  const { StoryPreviewMarker } = load('src/components/journey/map/story-preview-marker.tsx', { react: h.react, 'react/jsx-runtime': runtime, '@rnmapbox/maps': { __esModule: true, default: mapbox, AnimatedPoint } });
  let tree = h.render(StoryPreviewMarker, { preview, buddy: true });
  assert.equal(all(tree, 'SymbolLayer')[0].props.style.iconRotationAlignment, 'viewport'); assert.equal(all(tree, 'SymbolLayer')[0].props.style.iconImage, 'journey-map-buddy');
  preview.setReady(true); preview.play(); time.advance(4200); const point = [...sources[0].value.coordinates];
  tree = h.render(StoryPreviewMarker, { preview, buddy: false }); assert.equal(all(tree, 'SymbolLayer')[0].props.style.textField, '✈');
  assert.deepEqual(all(tree, 'SymbolLayer')[0].props.style.textFont, ['Arial Unicode MS Regular']);
  assert.deepEqual(sources[0].value.coordinates, point); assert.equal(sources.length, 1, 'Comparison never resets position');
  h.dispose(); time.advance(500); assert.deepEqual(sources[0].value.coordinates, point); preview.dispose();
});
test('actual live safety hook hides through motion, coordinate changes, failed/late native projection and unmount', async () => {
  const h = hooks(), time = clock(), timers = { setTimeout: time.set, clearTimeout: time.clear };
  const { useLiveBuddySafety } = load('src/hooks/use-live-buddy-safety.ts', { react: h.react, '@/lib/buddy/map-presentation': { liveBuddyClear } }, timers);
  let resolve, coords = [[1, 1]], enabled = true;
  const render = () => h.render(() => useLiveBuddySafety(coords, { width: 390, height: 800 }, [], enabled), {});
  let value = render(); value.mapRef({ getPointInView: () => new Promise(done => { resolve = done; }) }); value.idle(); value = render();
  assert.equal(value.clear, false); resolve([180, 350]); await Promise.resolve(); await Promise.resolve(); value = render(); assert.equal(value.clear, true);
  coords = [[2, 2]]; value = render(); assert.equal(value.clear, false, 'An old fix projection never renders a new fix');
  time.advance(1500); resolve([180, 350]); await Promise.resolve(); await Promise.resolve(); assert.equal(render().clear, false, 'Timed-out projection cannot return');
  value.moving(); value = render(); assert.equal(value.clear, false); enabled = false; value = render(); assert.equal(value.clear, false); h.dispose(); assert.equal(time.jobs.size, 0);
});

test('actual map ownership honors off, reduced static presence, routine live guidance, arrival and success handoff', () => {
  const h = hooks(), api = { store: createBuddyStore(), preference: { get: () => ({ enabled }) } }; let enabled = true, available = true, quietLive = true, path = '/travel/one';
  api.store.environment(path, true); const screen = {};
  const state = { floating: true, travel: { guidance: 'Continue straight', arrival: false } };
  api.store.screen(screen, { path, state, act() {} });
  const { useMapBuddy } = load('src/hooks/use-map-buddy.ts', { react: h.react, 'expo-router': { usePathname: () => path, useFocusEffect: fn => h.react.useEffect(fn, [fn]) }, 'react-native': { AppState: { currentState: 'active' } }, './use-journey-buddy': { useBuddyApi: () => api, useBuddyPreference: () => ({ enabled, loaded: true }) } });
  const render = () => h.render(() => useMapBuddy(available, quietLive), {});
  assert.equal(render().visible, false, 'Wait until ownership registration prevents a duplicate');
  render();
  let value = render(); assert.equal(value.visible, true, 'Quiet static companion can coexist with unobscured routine guidance'); assert.equal(value.canHelp, false); assert.equal(value.openHelp(), false);
  quietLive = false; value = render(); assert.equal(value.visible, false, 'Preview/floating guidance guards remain separate');
  quietLive = true; state.travel.arrival = true; api.store.screen(screen, { path, state, act() {} }); assert.equal(render().visible, false);
  state.travel = { guidance: null, arrival: false }; api.store.screen(screen, { path, state, act() {} }); render(); assert.equal(render().visible, true);
  api.store.celebrate(path, 'run', {}); assert.equal(render().visible, false, 'Map yields to existing floating success animation');
  api.store.clearCelebration(); render(); assert.equal(render().visible, true);
  assert.equal(render().openHelp(), true); assert.equal(render().visible, false); assert.equal(api.store.celebrate(path, 'run', {}), false, 'Help cannot queue a stale success replay');
  api.store.closeMapHelp(); enabled = false; value = render(); assert.equal(value.visible, false); assert.equal(api.store.current().mapOwned, false);
  enabled = true; available = false; assert.equal(render().visible, false); h.dispose();
});
test('actual map Help reuses accessible fallback, current action owner, tour and route guards', () => {
  const h = hooks(), store = createBuddyStore(), routes = [], api = { store, preference: { get: () => ({ enabled: true }) } };
  let adds = 0; const owner = {}; store.environment('/journey/one', true); store.screen(owner, { path: '/journey/one', state: { canAddMemory: true }, act: () => adds++ });
  const { MapBuddyHelp } = load('src/components/buddy/map-buddy-help.tsx', { react: h.react, 'react/jsx-runtime': runtime, 'expo-router': { useRouter: () => ({ navigate: path => routes.push(path) }) }, 'react-native': { AppState: { currentState: 'active' }, useWindowDimensions: () => ({ width: 390, height: 800 }) }, '@/hooks/use-journey-buddy': { useBuddyApi: () => api }, './buddy-help-sheet': { BuddyHelpSheet: 'BuddyHelpSheet' } });
  const element = MapBuddyHelp(), render = () => h.render(element.type, element.props);
  store.openMapHelp('/journey/one'); let tree = render(); assert.equal(tree.props.fallback, true); assert.equal(tree.props.canAddMemory, true);
  const staleClose = tree.props.onClose;
  tree.props.onAddMemory(); assert.equal(adds, 1); assert.equal(store.getMapHelp(), null);
  store.openMapHelp('/journey/one'); const newer = store.getMapHelp(); store.setTour(1); tree = render(); staleClose();
  assert.equal(store.getMapHelp(), newer, 'Closing Help A cannot dismiss a newer Help B'); assert.equal(store.getTour(), 1, 'Stale close cannot reset the newer tour');
  const blocker = {}; store.block(blocker, '/journey/one', true); tree.props.onClose(); assert.equal(store.getMapHelp(), null, 'Current close still works if suppression changes'); assert.equal(store.getTour(), null);
  store.block(blocker, '/journey/one', false);
  store.openMapHelp('/journey/one'); tree = render(); tree.props.onTour(); tree = render(); assert.equal(tree.props.tour, 0);
  tree.props.onNext(); tree = render(); assert.equal(tree.props.tour, 1); tree.props.onTour(); assert.deepEqual(routes, ['/create']);
  store.setTour(null); store.openMapHelp('/journey/one'); tree = render(); store.environment('/discover', true); tree.props.onAddMemory(); assert.equal(adds, 1, 'Stale map Help cannot invoke an old owner'); h.dispose();
});
test('actual preview controls retain progress across comparison and expose explicit Play/Pause/Replay with off fallback', () => {
  const h = hooks(), time = clock(), preview = createJourneyPreview([[[0, 0], [1, 0]]], time); let enabled = true, buddy = true;
  const { JourneyPreviewControls } = load('src/components/journey/journey-preview-controls.tsx', { react: h.react, 'react/jsx-runtime': runtime, 'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: value => value } }, '@/hooks/use-journey-buddy': { useBuddyPreference: () => ({ enabled }) }, '@/hooks/use-buddy-geometry': { useBuddyProtectedBounds: () => ({}) } });
  const render = () => h.render(JourneyPreviewControls, { preview, active: true, buddy, onBuddy: value => { buddy = value; } });
  let tree = render(); assert.equal(all(tree, 'Pressable')[0].props.disabled, true); assert.ok(all(tree, 'Text').some(node => node.props.children === 'Journey preview'));
  preview.setReady(true); tree = render(); all(tree, 'Pressable')[0].props.onPress(); time.advance(2000); tree = render(); assert.equal(all(tree, 'Pressable')[0].props.accessibilityLabel, 'Pause journey preview');
  all(tree, 'Pressable')[0].props.onPress(); const progress = preview.progress(); tree = render(); all(tree, 'Pressable')[2].props.onPress(); assert.equal(buddy, false); assert.equal(preview.progress(), progress);
  tree = render(); all(tree, 'Pressable')[1].props.onPress(); assert.equal(preview.progress(), 0); enabled = false; tree = render(); assert.equal(all(tree, 'Pressable')[2].props.disabled, true);
  preview.setReady(false); tree = render(); assert.equal(all(tree, 'Pressable')[0].props.disabled, true); assert.equal(preview.get().status, 'paused'); h.dispose(); preview.dispose();
});

test('map artwork requires decoded load plus layout, fails on errors/timeouts, and rejects old callbacks across retry/cancel', () => {
  const time = clock(), gate = createBuddyMapImage(time);

  gate.begin(); const first = gate.get().version;
  gate.loaded(first); gate.layout(first, 0, 0); assert.equal(gate.get().status, 'pending');
  gate.layout(first, 128, 128); assert.equal(gate.get().status, 'ready'); assert.equal(time.jobs.size, 0);
  gate.fail(first); assert.equal(gate.get().status, 'failed'); gate.loaded(first); assert.equal(gate.get().status, 'failed');
  gate.retry(); const second = gate.get().version; assert.ok(second > first);
  gate.loaded(first); gate.layout(first, 128, 128); assert.equal(gate.get().status, 'pending');
  gate.layout(second, 128, 128); time.advance(5000); assert.equal(gate.get().status, 'failed');
  gate.loaded(second); assert.equal(gate.get().status, 'failed', 'Late decode cannot resurrect timed-out artwork');
  gate.retry(); const third = gate.get().version; gate.layout(third, 128, 128); gate.loaded(third); assert.equal(gate.get().status, 'ready');
  gate.cancel(); gate.fail(third); gate.loaded(third); gate.retry(); assert.equal(gate.get().status, 'idle'); assert.equal(time.jobs.size, 0);
});
test('actual image readiness hook guards ordinary RN layout/decode, local retries and stale events after replacement or unmount', () => {
  const h = hooks(), time = clock(); let enabled = true, style = 'satellite';
  const { useBuddyMapImage } = load('src/hooks/use-buddy-map-image.ts', { react: h.react, '@/lib/buddy/map-image': { createBuddyMapImage: () => createBuddyMapImage(time) } });
  const render = () => h.render(() => useBuddyMapImage(enabled, style), {});
  render(); let value = render(); const old = value;
  value.onLoad(); assert.equal(render().ready, false, 'Decode before layout cannot take ownership');
  value.onLayout({ nativeEvent: { layout: { width: 128, height: 128 } } }); value = render(); assert.equal(value.ready, true);
  style = 'outdoors'; render(); value = render(); old.onLoad(); old.onLayout({ nativeEvent: { layout: { width: 128, height: 128 } } }); assert.equal(render().ready, false);
  value.onError(); value = render(); assert.equal(value.failed, true); value.onLoad(); assert.equal(render().ready, false);
  value.retry(); value = render(); time.advance(5000); value = render(); assert.equal(value.failed, true);
  value.retry(); value = render(); value.onLayout({ nativeEvent: { layout: { width: 128, height: 128 } } }); value.onLoad(); assert.equal(render().ready, true);
  enabled = false; render(); const late = value; h.dispose(); late.onError(); late.onLoad(); late.retry(); assert.equal(time.jobs.size, 0);
});
