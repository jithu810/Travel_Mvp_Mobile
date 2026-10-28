import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(file, modules = {}, timers = globalThis) {
  const exports = {}, code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', code)(name => { assert.ok(name in modules, name); return modules[name]; }, exports, timers.setTimeout, timers.clearTimeout); return exports;
}
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
test('actual live safety hook never renders a stale fix and releases on failed/late native projection and unmount', async () => {
  const h = hooks(), time = clock(), timers = { setTimeout: time.set, clearTimeout: time.clear };
  const { useLiveBuddySafety, LIVE_PROJECTION_INTERVAL } = load('src/hooks/use-live-buddy-safety.ts', { react: h.react, '@/lib/buddy/map-presentation': { liveBuddyClear } }, timers);
  let resolve, coords = [[1, 1]], enabled = true;
  const render = () => h.render(() => useLiveBuddySafety(coords, { width: 390, height: 800 }, [], enabled), {});
  const settle = async () => { await Promise.resolve(); await Promise.resolve(); return render(); };
  let value = render(); value.mapRef({ getPointInView: () => new Promise(done => { resolve = done; }) }); value.idle(); value = render();
  assert.equal(value.clear, false); assert.equal(value.present, false, 'Nothing is owned before the first clear projection');
  time.advance(LIVE_PROJECTION_INTERVAL); resolve([180, 350]); value = await settle(); assert.equal(value.clear, true); assert.equal(value.present, true);
  coords = [[2, 2]]; value = render(); assert.equal(value.clear, false, 'An old fix projection never renders a new fix');
  time.advance(LIVE_PROJECTION_INTERVAL); time.advance(1500); resolve([180, 350]); value = await settle();
  assert.equal(value.clear, false, 'Timed-out projection cannot return'); assert.equal(value.present, false, 'Failed projection releases ownership');
  value.moving(); value = render(); assert.equal(value.clear, false); enabled = false; value = render(); assert.equal(value.present, false); h.dispose(); assert.equal(time.jobs.size, 0);
});
test('GPS following keeps live ownership through camera motion and new fixes, and projects once per burst', async () => {
  const h = hooks(), time = clock(), timers = { setTimeout: time.set, clearTimeout: time.clear };
  const { useLiveBuddySafety, LIVE_PROJECTION_INTERVAL } = load('src/hooks/use-live-buddy-safety.ts', { react: h.react, '@/lib/buddy/map-presentation': { liveBuddyClear } }, timers);
  let resolve, calls = 0, coords = [[1, 1]], enabled = true, controls = [];
  const render = () => h.render(() => useLiveBuddySafety(coords, { width: 390, height: 800 }, controls, enabled), {});
  const settle = async () => { await Promise.resolve(); await Promise.resolve(); return render(); };
  let value = render(); value.mapRef({ getPointInView: () => new Promise(done => { calls++; resolve = done; }) }); value.idle(); value = render();
  assert.equal(calls, 0, 'Projection is debounced, not run synchronously on the fix');
  time.advance(LIVE_PROJECTION_INTERVAL); assert.equal(calls, 1); resolve([180, 350]); value = await settle(); assert.equal(value.present, true);
  for (let fix = 2; fix < 6; fix++) {
    value.moving(); value = render();
    assert.equal(value.present, true, 'Follow camera motion keeps the map companion (no floating Buddy remount)');
    coords = [[fix, fix]]; value.idle(); value = render(); assert.equal(value.present, true, 'A pending newer fix keeps the last clear answer');
  }
  assert.equal(calls, 1, 'Bursts of fixes/camera moves do not project on every fix');
  time.advance(LIVE_PROJECTION_INTERVAL); assert.equal(calls, 2); resolve([180, 350]); value = await settle(); assert.equal(value.present, true);
  controls = [{ x: 198, y: 300, width: 44, height: 44 }]; value = render(); time.advance(LIVE_PROJECTION_INTERVAL); resolve([180, 350]); value = await settle();
  assert.equal(value.present, false, 'A settled overlap genuinely releases ownership');
  value.moving(); value.idle(); value = render(); assert.equal(value.present, false, 'Motion after a release never re-claims without a clear projection');
  controls = []; value = render(); time.advance(LIVE_PROJECTION_INTERVAL); resolve([180, 350]); value = await settle(); assert.equal(value.present, true);
  enabled = false; value = render(); assert.equal(value.present, false, 'Pause/invalid fix/guidance release immediately');
  enabled = true; value = render(); assert.equal(value.present, false, 'Re-enabling waits for a fresh clear projection');
  h.dispose(); assert.equal(time.jobs.size, 0);
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
  const { MapBuddyHelp } = load('src/components/buddy/map-buddy-help.tsx', { react: h.react, 'react/jsx-runtime': runtime, 'expo-router': { useRouter: () => ({ navigate: path => routes.push(path) }) }, 'react-native': { Modal: 'Modal', View: 'View', Pressable: 'Pressable', StyleSheet: { absoluteFill: { position: 'absolute' } }, AppState: { currentState: 'active' }, useWindowDimensions: () => ({ width: 390, height: 800 }) }, '@/hooks/use-journey-buddy': { useBuddyApi: () => api }, './buddy-help-sheet': { BuddyHelpSheet: 'BuddyHelpSheet' } });
  const element = MapBuddyHelp(), render = () => h.render(element.type, element.props);
  store.openMapHelp('/journey/one', { x: 120, y: 220 }); const layer = render(); let bubble = layer.props.children.props.children[1];
  assert.equal(layer.type, 'Modal');
  assert.equal(bubble.props.fallback, false); assert.ok(bubble.props.placement.y > 220, 'Near-top Buddy gets a bubble below');
  assert.ok(bubble.props.placement.x >= 0); bubble.props.onClose();
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
test('an unclaimed expired celebration stops hiding map Buddies even when no floating actor clears it', () => {
  const time = clock(), { createBuddyStore: create } = load('src/lib/buddy/store.ts', { './model': model }, { setTimeout: time.set, clearTimeout: time.clear });
  const store = create(), path = '/journey/one'; store.environment(path, true); let published = 0; store.subscribe(() => published++);
  assert.equal(store.celebrate(path, 'jump', {}, Date.now() - 6001), true); assert.equal(store.getCelebration(), null, 'Expired unclaimed event is ignored');
  assert.equal(store.celebrate(path, 'jump', {}), true, 'An expired event cannot block a newer success'); assert.ok(store.getCelebration());
  const before = published; time.advance(6000); assert.equal(store.getCelebration(), null); assert.ok(published > before, 'Expiry is published to subscribers');
  store.celebrate(path, 'run', {}); const claimed = store.claimCelebration(store.getCelebration().id); assert.ok(claimed);
  assert.equal(store.getCelebration(claimed.expiresAt + 1000), claimed, 'A claimed animation is owned by its actor timer');
  time.advance(6000); assert.equal(store.getCelebration(), claimed, 'Expiry timer never drops a claimed animation');
  const h = hooks(), api = { store: create(), preference: { get: () => ({ enabled: true }) } }; api.store.environment(path, true);
  api.store.screen({}, { path, state: { floating: true }, act() {} });
  const { useMapBuddy } = load('src/hooks/use-map-buddy.ts', { react: h.react, 'expo-router': { usePathname: () => path, useFocusEffect: fn => h.react.useEffect(fn, [fn]) }, 'react-native': { AppState: { currentState: 'active' } }, './use-journey-buddy': { useBuddyApi: () => api, useBuddyPreference: () => ({ enabled: true, loaded: true }) } });
  api.store.celebrate(path, 'jump', {}, Date.now() - 7000);
  const render = () => h.render(() => useMapBuddy(true), {}); render(); render();
  assert.equal(render().visible, true, 'Stale event no longer hides the map Buddy'); assert.equal(api.store.current().mapOwned, true); h.dispose();
});
test('map help ownership follows the Story walker: floating Buddy and map help never both apply', () => {
  const api = { store: createBuddyStore(), preference: { get: () => ({ enabled: true }) } }, path = '/journey/one';
  api.store.environment(path, true); api.store.screen({}, { path, state: { floating: true }, act() {} });
  const mount = () => { const h = hooks(); const { useMapBuddy } = load('src/hooks/use-map-buddy.ts', { react: h.react, 'expo-router': { usePathname: () => path, useFocusEffect: fn => h.react.useEffect(fn, [fn]) }, 'react-native': { AppState: { currentState: 'active' } }, './use-journey-buddy': { useBuddyApi: () => api, useBuddyPreference: () => ({ enabled: true, loaded: true }) } }); return { h, useMapBuddy }; };
  const walker = mount(), map = mount(); let walking = false;
  const renderWalker = () => walker.h.render(() => walker.useMapBuddy(walking), {}), renderMap = () => map.h.render(() => map.useMapBuddy(false), {});
  renderWalker(); renderWalker(); assert.equal(renderMap().owned, false, 'Floating Buddy is shown before the walker owns the map');
  walking = true; renderWalker(); renderWalker(); assert.equal(api.store.current().mapOwned, true); assert.equal(renderMap().owned, true, 'Map help appears only once the floating Buddy is hidden');
  api.store.openMapHelp(path, { x: 120, y: 220 }); renderWalker(); assert.equal(renderWalker().visible, true, 'Anchored messages keep the map Buddy visible'); assert.equal(renderWalker().helping, true); api.store.closeMapHelp();
  api.store.setTour(0); renderWalker(); assert.equal(renderMap().owned, false, 'Tour returns presentation to the floating Buddy and removes map help');
  api.store.setTour(null); renderWalker(); renderWalker(); assert.equal(renderMap().owned, true);
  walking = false; renderWalker(); assert.equal(renderMap().owned, false); walker.h.dispose(); map.h.dispose();
});


test('selected journey can own its map Buddy while magic cards and blocked screens stay suppressed', () => {
  let path = '/customized/selection';
  const h = hooks(), api = { store: createBuddyStore(), preference: { get: () => ({ enabled: true }) } };
  api.store.environment(path, true);api.store.screen({}, { path, state: { floating: true }, act() {} });
  const { useMapBuddy } = load('src/hooks/use-map-buddy.ts', { react: h.react, 'expo-router': { usePathname: () => path, useFocusEffect: fn => h.react.useEffect(fn, [fn]) }, 'react-native': { AppState: { currentState: 'active' } }, './use-journey-buddy': { useBuddyApi: () => api, useBuddyPreference: () => ({ enabled: true, loaded: true }) } });
  const render = () => h.render(() => useMapBuddy(true), {});
  render();render();assert.equal(render().visible,true);assert.equal(api.store.current().mapOwned,true);
  const blocker={};api.store.block(blocker,path,true);assert.equal(render().visible,false);
  api.store.block(blocker,path,false);render();assert.equal(render().visible,true);
  path='/customize/original';api.store.environment(path,true);assert.equal(render().visible,false,'Card deck does not opt into Buddy presentation');
  path='/customized/selection';api.store.environment(path,false);assert.equal(render().visible,false,'Background keeps the selected-route Buddy hidden');
  h.dispose();assert.equal(api.store.current().mapOwned,false);
});


test('anchored map messages present above the expanded native map, use window coordinates and retain guarded dismissal', () => {
  const h = hooks(), store = createBuddyStore(), routes = [], api = { store, preference: { get: () => ({ enabled: true }) } };
  const path = '/journey/expanded'; store.environment(path, true); store.screen({}, { path, state: { floating: true }, act() {} });
  const native = { AppState: { currentState: 'active' }, Modal: 'Modal', View: 'View', Pressable: 'Pressable', StyleSheet: { absoluteFill: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } }, useWindowDimensions: () => ({ width: 390, height: 800 }) };
  const { MapBuddyHelp } = load('src/components/buddy/map-buddy-help.tsx', { react: h.react, 'react/jsx-runtime': runtime, 'expo-router': { useRouter: () => ({ navigate: route => routes.push(route) }) }, 'react-native': native, '@/hooks/use-journey-buddy': { useBuddyApi: () => api }, './buddy-help-sheet': { BuddyHelpSheet: 'BuddyHelpSheet' } });
  const element = MapBuddyHelp({ origin: { x: 17, y: 29 } }), render = () => h.render(element.type, element.props);
  store.openMapHelp(path, { x: 120, y: 220 }); let layer = render();
  assert.equal(layer.type, 'Modal'); assert.equal(layer.props.visible, true); assert.equal(layer.props.transparent, true); assert.equal(layer.props.presentationStyle, 'overFullScreen');
  assert.equal(layer.props.statusBarTranslucent, true); assert.equal(layer.props.navigationBarTranslucent, true); assert.equal(layer.props.animationType, 'none');
  const surface = layer.props.children, backdrop = surface.props.children[0], bubble = surface.props.children[1];
  assert.equal(surface.props.accessibilityViewIsModal, true); assert.equal(surface.props.style.backgroundColor, undefined, 'No dim scrim hides Buddy');
  assert.equal(backdrop.type, 'Pressable'); assert.equal(bubble.type, 'BuddyHelpSheet'); assert.equal(bubble.props.fallback, false, 'Anchored bubble does not open a second native Modal');
  assert.deepEqual(bubble.props.placement, { x: 24, y: 248, above: false, tailX: 96 }, 'Page anchor uses full-window coordinates regardless of root host offset');
  const staleBack = layer.props.onRequestClose, staleBackdrop = backdrop.props.onPress; layer.props.onRequestClose(); assert.equal(store.getMapHelp(), null);
  store.openMapHelp(path, { x: 170, y: 280 }); const newer = store.getMapHelp(); layer = render(); staleBack(); staleBackdrop(); assert.equal(store.getMapHelp(), newer, 'Old modal callbacks cannot close a newer request');
  layer.props.children.props.children[0].props.onPress(); assert.equal(store.getMapHelp(), null, 'Backdrop dismisses current request');
  store.openMapHelp(path); const legacy = render(); assert.equal(legacy.type, 'BuddyHelpSheet'); assert.equal(legacy.props.fallback, true, 'Legacy unanchored help keeps its existing single fallback Modal');
  const oldCreate = legacy.props.onCreate; store.environment('/discover', true); oldCreate(); assert.deepEqual(routes, []); h.dispose();
});
