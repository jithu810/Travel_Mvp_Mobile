import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
function load(file, modules = {}, timers = globalThis) {
  const exports = {}, source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', source)(id => { assert.ok(id in modules, id); return modules[id]; }, exports, timers.setTimeout, timers.clearTimeout); return exports;
}
const model = load('src/lib/buddy/model.ts'), geometry = load('src/lib/buddy/geometry.ts', { './model': model });
const globeStyle = load('src/lib/discovery/globe-style.ts');
const maps = load('src/lib/buddy/map-controls.ts', { '../discovery/globe-style': globeStyle });
const { createBuddyStore } = load('src/lib/buddy/store.ts', { './model': model });
const { createBuddyPreference } = load('src/lib/buddy/preference.ts');
const viewport = { x: 0, y: 0, width: 390, height: 844 }, insets = { top: 24, bottom: 34, left: 0, right: 0 };
const tick = () => new Promise(setImmediate);
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
test('floating geometry uses the unchanged viewport and excludes exact controls with an 8dp gap', () => {
  const controls = [{ x: 16, y: 746, width: 358, height: 56 }, { x: 20, y: 355, width: 350, height: 270 }];
  const state = geometry.createBuddyGeometry(viewport, insets, controls);
  assert.deepEqual(state.bounds, { x: 4, y: 28, width: 382, height: 778 });
  assert.ok(state.areas.length); const point = geometry.nearestBuddyPosition({ x: 330, y: 800 }, state); assert.ok(point);
  assert.equal(geometry.buddyPositionClear(point, state), true);
  for (const rect of controls) assert.ok(point.x + 64 <= rect.x - 8 || point.x >= rect.x + rect.width + 8 || point.y + 64 <= rect.y - 8 || point.y >= rect.y + rect.height + 8);
  assert.ok(geometry.nearestBuddyPosition({ x: 80, y: 100 }, state)); assert.equal(geometry.buddyPositionClear({ x: 80, y: 100 }, state), true, 'Clear upper map is available, not a bottom strip');
});
test('overlapping control unions retain all genuinely free placements and nearest-safe projection crosses zones only when needed', () => {
  const state = geometry.createBuddyGeometry({ x: 0, y: 0, width: 300, height: 300 }, { top: 0, bottom: 0, left: 0, right: 0 }, [{ x: 100, y: 95, width: 70, height: 80 }, { x: 140, y: 140, width: 70, height: 70 }]);
  for (let x = 4; x <= 232; x += 4) for (let y = 4; y <= 232; y += 4) {
    if (!geometry.buddyPositionClear({ x, y }, state)) continue;
    assert.deepEqual(geometry.nearestBuddyPosition({ x, y }, state), { x, y }, 'A valid point is never projected out of a free zone');
  }
  const projected = geometry.nearestBuddyPosition({ x: 125, y: 130 }, state); assert.ok(projected); assert.equal(geometry.buddyPositionClear(projected, state), true);
});
test('full interactive grids and short viewports hide only when no entire64dp placement fits', () => {
  assert.equal(geometry.createBuddyGeometry(viewport, insets, [viewport]).areas.length, 0);
  assert.equal(geometry.createBuddyGeometry({ ...viewport, height: 60 }, insets, []).areas.length, 0);
  const split = geometry.createBuddyGeometry(viewport, insets, [{ x: 0, y: 0, width: 390, height: 300 }, { x: 0, y: 500, width: 390, height: 344 }]);
  assert.ok(split.areas.length); const point = geometry.nearestBuddyPosition({ x: 300, y: 420 }, split); assert.ok(point.y >= 308 && point.y + 64 <= 492);
});
test('automatic walks never sweep through a protected button even when both endpoints are clear', () => {
  const state = geometry.createBuddyGeometry(viewport, insets, [{ x: 145, y: 160, width: 50, height: 50 }]);
  assert.equal(geometry.buddyPathClear({ x: 40, y: 150 }, { x: 220, y: 150 }, state), false);
  for (const start of [{ x: 40, y: 150 }, { x: 250, y: 250 }, { x: 100, y: 650 }]) for (const random of [0, 1]) {
    const target = geometry.floatingWalkTarget(start, state, () => random);
    assert.equal(geometry.buddyPositionClear(target, state), true); assert.equal(geometry.buddyPathClear(start, target, state), true);
    assert.ok(Math.hypot(target.x - start.x, target.y - start.y) <= 96);
  }
});
test('SDK control rectangles leave clear map space and use actual measured map origins and per-control anchors', () => {
  const frame = { x: 12, y: 36, width: 366, height: 600 };
  const controls = maps.journeyBuddyControls(frame, true, 260, 0, true);
  assert.deepEqual(controls[2], { x: 318, y: 292, width: 48, height: 48 });
  const home = maps.globeBuddyControls(frame, 80, true); assert.equal(home.length, 3); assert.equal(home[2].y, 128);
  const state = geometry.createBuddyGeometry(viewport, insets, controls); assert.equal(geometry.buddyPositionClear({ x: 160, y: 150 }, state), true);
  assert.equal(geometry.buddyPositionClear({ x: 300, y: 290 }, state), false);
});
test('Home attribution follows the logo while Buddy can use space released beside the compass', () => {
  const frame = { x: 12, y: 36, width: 500, height: 600 };
  for (const header of [0, 80]) for (const compass of [false, true]) {
    const controls = maps.globeBuddyControls(frame, header, compass);
    const state = geometry.createBuddyGeometry({ ...viewport, width: 600 }, insets, controls);
    assert.deepEqual(controls[1], { x: 128, y: 48 + header, width: 40, height: 40 });
    const released = { x: 360, y: 48 + header };
    const previous = geometry.createBuddyGeometry({ ...viewport, width: 600 }, insets,
      [controls[0], maps.anchoredMapControl(frame, { top: header + 12, right: 56 }, 40, 40), ...controls.slice(2)]);
    assert.equal(geometry.buddyPositionClear(released, previous), false);
    assert.equal(geometry.buddyPositionClear(released, state), true);
    assert.deepEqual(geometry.nearestBuddyPosition(released, state), released);
    for (const control of controls) assert.equal(geometry.buddyPositionClear({ x: control.x, y: control.y }, state), false);
  }
});

test('ordinary interaction pauses walking without marking geometry stale, while scroll ownership remains path-specific', () => {
  const store = createBuddyStore(), owner = {}; store.environment('/journey/id', true); store.screen({}, { path: '/journey/id', state: { floating: true }, act() {} });
  store.interaction(true); assert.equal(store.current().geometryPending, false); assert.equal(store.current().interacting, true);
  store.geometryMotion(owner, '/journey/id', true); assert.equal(store.current().geometryPending, true);
  store.geometryMotion(owner, '/search', false); assert.equal(store.current().geometryPending, true, 'Old path cannot clear a new motion lease');
  store.geometryMotion(owner, '/journey/id', false); assert.equal(store.current().geometryPending, false);
});
test('measurement epochs reject stale results, preserve overlap union and isolate route cleanup', () => {
  const store = createBuddyStore(), first = {}, second = {}; store.environment('/search', true);
  store.protect(first, '/search', [{ x: 0, y: 40, width: 100, height: 100 }]); store.protect(second, '/search', [{ x: 30, y: 80, width: 100, height: 100 }]);
  const old = store.get().measurement; store.requestMeasurements(); assert.equal(store.current().geometryPending, true);
  store.protect(first, '/search', [], old); assert.equal(store.current().geometryPending, true);
  store.protect(first, '/search', [{ x: 0, y: 50, width: 100, height: 100 }]); store.protect(second, '/search', []); assert.equal(store.current().geometryPending, false);
  store.removeProtection({}); assert.equal(store.current().protectedRects.length, 1); store.environment('/account', true); assert.equal(store.current().protectedRects.length, 0);
});
test('200 animated layout events defer native measurements until one settled batch; ordinary layout remains immediate', () => {
  const store = createBuddyStore(), sheet = {}, control = {}; let batches = 0;
  store.environment('/discover', true); store.screen(sheet, { path: '/discover', state: { floating: true, geometryMoving: true }, act() {} }); store.protect(control, '/discover', [{ x: 0, y: 400, width: 390, height: 400 }]);
  store.onMeasure(() => { batches++; store.protect(control, '/discover', [{ x: 0, y: 300, width: 390, height: 500 }]); });
  const start = store.get().measurement;
  for (let i = 0; i < 200; i++) store.requestMeasurements();
  assert.equal(batches, 0); assert.equal(store.get().measurement, start + 1); assert.equal(store.current().geometryPending, true);
  store.screen(sheet, { path: '/discover', state: { floating: true, geometryMoving: false }, act() {} });
  assert.equal(batches, 1); assert.equal(store.current().geometryPending, false); assert.equal(store.current().protectedRects[0].y, 300);
  store.requestMeasurements(); assert.equal(batches, 2, 'Ordinary layout refreshes immediately');
});
test('Home globe failure protects its actual Retry map button and tracks fallback scrolling without adding a wrapper', () => {
  let retries = 0; const jsx = (type, props) => ({ type, props }), protection = { onLayout() {}, ref: 'retry-control', collapsable: false }, scroll = { onScroll() {} };
  const { GlobeFallback } = load('src/components/discovery/globe/fallback.tsx', { 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { View: 'View', ScrollView: 'ScrollView', Pressable: 'Pressable', Text: 'Text', StyleSheet: { create: value => value } }, '@/components/branded-loading': {}, '@/lib/discovery/presentation': {}, '../ui': { colors: {} }, '@/hooks/use-buddy-geometry': { useBuddyProtectedBounds: () => protection, useBuddyScroll: () => scroll } });
  const tree = GlobeFallback({ message: 'Unavailable', retry: () => retries++, bottomInset: 200 });
  assert.equal(tree.type, 'View'); const content = tree.props.children; assert.equal(content.type, 'ScrollView'); assert.equal(content.props.onScroll, scroll.onScroll);
  const button = content.props.children.find(child => child?.type === 'Pressable'); assert.equal(button.props.ref, protection.ref); assert.equal(button.props.collapsable, false); button.props.onPress(); assert.equal(retries, 1);
});

function hooks() {
  const slots = []; let cursor = 0, effects = [];
  const react = { useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback: (fn, deps) => react.useMemo(() => fn, deps),
    useEffect: (fn, deps) => { const i = cursor++; if (!slots[i] || !deps || deps.some((v, j) => v !== slots[i].deps?.[j])) { slots[i]?.cleanup?.(); const slot = slots[i] = { deps }; effects.push(() => { slot.cleanup = fn(); }); } } };
  return { react, render(fn) { cursor = 0; effects = []; const value = fn(); effects.forEach(fn => fn()); return value; }, dispose() { slots.forEach(s => s?.cleanup?.()); } };
}
function clock() { const jobs = new Map(); let id = 0; return { jobs, setTimeout: (fn, ms) => { jobs.set(++id, { fn, ms }); return id; }, clearTimeout: id => jobs.delete(id), fire() { for (const [id, job] of [...jobs]) { jobs.delete(id); job.fn(); } } }; }
async function harness(file) {
  const h = hooks(), timers = clock(), api = { store: createBuddyStore(), preference: createBuddyPreference({ getItem: async () => 'true', setItem: async () => {} }) };
  await api.preference.load(); let path = '/journey/id', blur;
  api.store.environment(path, true); const listeners = new Set(), native = { AppState: { currentState: 'active', addEventListener: (_, fn) => { listeners.add(fn); return { remove: () => listeners.delete(fn) }; } } };
  const module = load(file, { react: h.react, 'react-native': native, 'expo-router': { usePathname: () => path, useFocusEffect: fn => h.react.useEffect(() => { const cleanup = fn(); blur = cleanup; return cleanup; }, [fn]) }, './use-journey-buddy': { useBuddyApi: () => api } }, timers);
  return { h, timers, api, module, native, listeners, blur: () => blur?.(), path: value => { path = value; api.store.environment(value, true); } };
}
test('actual protected ref remeasures ancestor movement, rejects late native callbacks and does no work on ordinary rerenders', async () => {
  const x = await harness('src/hooks/use-buddy-geometry.ts'), callbacks = []; let frame = { x: 20, y: 100, width: 100, height: 44 };
  const render = () => x.h.render(() => x.module.useBuddyProtectedBounds()); let binding = render();
  binding.ref({ measureInWindow: fn => { const captured = frame; callbacks.push(() => fn(captured.x, captured.y, captured.width, captured.height)); } });
  assert.equal(x.api.store.current().geometryPending, true); const old = callbacks.shift();
  frame = { ...frame, y: 180 }; x.api.store.requestMeasurements(); old(); assert.equal(x.api.store.current().geometryPending, true);
  callbacks.splice(0).forEach(fn => fn()); assert.equal(x.api.store.current().protectedRects[0].y, 180); assert.equal(x.api.store.current().geometryPending, false);
  binding = render(); assert.equal(callbacks.length, 0, 'Timer/GPS render does not request measurements');
  binding.ref(null); assert.equal(x.api.store.current().protectedRects.length, 0); x.h.dispose();
});
test('actual scroll lease is released on blur; stale scroll/end/timer callbacks cannot hide the next route', async () => {
  const x = await harness('src/hooks/use-buddy-geometry.ts'), props = x.h.render(() => x.module.useBuddyScroll());
  props.onScroll(); assert.equal(x.api.store.current().geometryPending, true); const late = [...x.timers.jobs.values()][0].fn;
  x.blur(); assert.equal(x.timers.jobs.size, 0); x.path('/account'); const revision = x.api.store.get().revision;
  props.onScroll(); props.onMomentumScrollEnd(); late(); assert.equal(x.api.store.get().revision, revision); assert.equal(x.api.store.current().geometryPending, false);
  const next = x.h.render(() => x.module.useBuddyScroll()); next.onScroll(); assert.equal(x.timers.jobs.size, 1); assert.equal(x.api.store.current().geometryPending, true);
  props.onMomentumScrollEnd(); late(); assert.equal(x.timers.jobs.size, 1, 'Old route end cannot cancel the new route quiet timer');
  x.timers.fire(); assert.equal(x.api.store.current().geometryPending, false); x.h.dispose();
});
test('actual pin projection is in layout points, invalidates once per camera move and ignores stale camera results', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), points = [[76, 8]], frame = { x: 20, y: 80, width: 320, height: 200 };
  let response = () => Promise.resolve([160, 100]), calls = 0;
  const pins = x.h.render(() => x.module.useBuddyMapPins(points, true)); pins.mapRef({ getPointInView: coordinate => { assert.deepEqual(coordinate, points[0]); calls++; return response(); } }); pins.setFrame(frame); await tick();
  assert.deepEqual(x.api.store.current().protectedRects, [{ x: 148, y: 148, width: 64, height: 64 }]); assert.equal(x.timers.jobs.size, 0);
  pins.cameraChanged(); const revision = x.api.store.get().revision; pins.cameraChanged(); pins.cameraChanged(); assert.equal(x.api.store.get().revision, revision);
  const pending = deferred(); response = () => pending.promise; pins.idle(); await tick(); pins.cameraChanged(); pending.resolve([10, 10]); await tick(); assert.equal(x.api.store.current().geometryPending, true);
  response = () => Promise.resolve([80, 80]); pins.idle(); await tick(); assert.equal(x.api.store.current().geometryPending, false); assert.equal(x.api.store.current().protectedRects[0].x, 68); assert.ok(calls <= 3);
  x.blur(); assert.equal(x.timers.jobs.size, 0); assert.equal(x.api.store.current().protectedRects.length, 0); x.h.dispose();
});
test('failed or hung pin projection resolves conservatively and background/disable cancels all projection clocks', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), frame = { x: 20, y: 80, width: 320, height: 200 };
  const pins = x.h.render(() => x.module.useBuddyMapPins([[76, 8]], true)); pins.mapRef({ getPointInView: async () => { throw Error('native failed'); } }); pins.setFrame(frame); await tick();
  assert.deepEqual(x.api.store.current().protectedRects, [frame]); assert.equal(x.api.store.current().geometryPending, false);
  pins.mapRef({ getPointInView: () => new Promise(() => {}) }); pins.idle(); await tick(); assert.equal(x.timers.jobs.size, 1); x.timers.fire(); assert.equal(x.api.store.current().geometryPending, false);
  pins.idle(); x.native.AppState.currentState = 'background'; x.listeners.forEach(fn => fn('background')); assert.equal(x.timers.jobs.size, 0);
  x.native.AppState.currentState = 'active'; pins.idle(); await x.api.preference.setEnabled(false); assert.equal(x.timers.jobs.size, 0); pins.mapRef(null); assert.equal(x.api.store.current().protectedRects.length, 0); x.h.dispose();
});
test('missing SDK idle cannot leave geometry pending: camera quiet projects pins and moving deadline fails safely', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), frame = { x: 20, y: 80, width: 320, height: 200 };
  const pins = x.h.render(() => x.module.useBuddyMapPins([[76, 8]], true)); pins.mapRef({ getPointInView: async () => [120, 80] }); pins.setFrame(frame); await tick();
  pins.cameraChanged(); assert.equal(x.api.store.current().geometryPending, true);
  const quiet = [...x.timers.jobs.entries()].find(([, job]) => job.ms === 250); x.timers.jobs.delete(quiet[0]); quiet[1].fn(); await tick();
  assert.equal(x.api.store.current().geometryPending, false); assert.equal(x.api.store.current().protectedRects[0].width, 64); assert.equal(x.timers.jobs.size, 0);
  pins.cameraChanged(); const deadline = [...x.timers.jobs.entries()].find(([, job]) => job.ms === 1500); x.timers.jobs.delete(deadline[0]); deadline[1].fn();
  assert.equal(x.api.store.current().geometryPending, false); assert.deepEqual(x.api.store.current().protectedRects, [frame]); assert.equal(x.timers.jobs.size, 0);
  pins.idle(); await tick(); assert.equal(x.api.store.current().protectedRects[0].width, 64); x.h.dispose(); assert.equal(x.timers.jobs.size, 0);
});
test('100 duplicate idle/camera events preserve visible eligibility and query accepted pins only once', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), coordinates = [[76, 8]], bounds = { x: 20, y: 80, width: 320, height: 200 }, pose = { center: [76, 8], zoom: 7, heading: 0, pitch: 0 };
  let calls = 0;
  const pins = x.h.render(() => x.module.useBuddyMapPins(coordinates, true)); pins.mapRef({ getPointInView: async () => { calls++; return [120, 80]; } });
  pins.cameraChanged(pose); pins.setFrame(bounds); pins.idle(pose); await tick(); assert.equal(calls, 1); assert.equal(x.api.store.current().geometryPending, false);
  const revision = x.api.store.get().revision;
  for (let i = 0; i < 100; i++) { pins.idle({ ...pose }); pins.cameraChanged({ ...pose }); }
  await tick(); assert.equal(calls, 1); assert.equal(x.api.store.get().revision, revision, 'No pending publication can unmount the actor for equivalent SDK events');
  assert.equal(x.api.store.current().geometryPending, false); assert.equal(x.timers.jobs.size, 0);
  for (let i = 0; i < 100; i++) x.api.store.requestMeasurements();
  await tick(); assert.equal(calls, 1, 'Global measurements reuse valid relative pins synchronously'); assert.equal(x.api.store.current().geometryPending, false); x.h.dispose();
});
test('single-flight duplicate idle/measurement events do not restart the native request or its deadline', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), pending = deferred(), pose = { center: [76, 8], zoom: 8, heading: 0, pitch: 0 }; let calls = 0;
  const pins = x.h.render(() => x.module.useBuddyMapPins([[76, 8]], true)); pins.mapRef({ getPointInView: () => { calls++; return pending.promise; } }); pins.cameraChanged(pose); pins.setFrame({ x: 20, y: 80, width: 320, height: 200 }); pins.idle(pose); await tick();
  const timer = [...x.timers.jobs.keys()][0];
  for (let i = 0; i < 100; i++) { pins.idle(pose); pins.cameraChanged(pose); x.api.store.requestMeasurements(); }
  await tick(); assert.equal(calls, 1); assert.equal([...x.timers.jobs.keys()][0], timer, 'Repeated idle does not extend the bounded native timeout');
  pending.resolve([100, 90]); await tick(); assert.equal(calls, 1); assert.equal(x.api.store.current().geometryPending, false); assert.equal(x.timers.jobs.size, 0); x.h.dispose();
});
test('origin movement translates cached pins; size, coordinates, readiness and map identity invalidate once', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'); let coordinates = [[76, 8]], ready = true, calls = 0;
  const render = () => x.h.render(() => x.module.useBuddyMapPins(coordinates, ready));
  let pins = render(); const target = { getPointInView: async () => { calls++; return [120, 80]; } };
  pins.mapRef(target); pins.setFrame({ x: 20, y: 80, width: 320, height: 200 }); await tick(); assert.equal(calls, 1);
  pins.setFrame({ x: 35, y: 110, width: 320, height: 200 }); assert.equal(calls, 1); assert.deepEqual(x.api.store.current().protectedRects, [{ x: 123, y: 158, width: 64, height: 64 }]);
  pins.setFrame({ x: 35, y: 110, width: 300, height: 200 }); await tick(); assert.equal(calls, 2);
  coordinates = [[77, 9]]; pins = render(); await tick(); assert.equal(calls, 3);
  ready = false; pins = render(); await tick(); assert.equal(calls, 3); assert.equal(x.api.store.current().protectedRects[0].width, 300);
  ready = true; pins = render(); await tick(); assert.equal(calls, 4);
  pins.mapRef({ getPointInView: target.getPointInView }); await tick(); assert.equal(calls, 5); assert.equal(x.api.store.current().geometryPending, false); x.h.dispose();
});
test('native query result publishes against the latest origin without restarting a same-size active projection', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), pending = deferred(); let calls = 0;
  const pins = x.h.render(() => x.module.useBuddyMapPins([[76, 8]], true)); pins.mapRef({ getPointInView: () => { calls++; return pending.promise; } });
  pins.setFrame({ x: 20, y: 80, width: 320, height: 200 }); await tick();
  pins.setFrame({ x: 50, y: 130, width: 320, height: 200 }); pending.resolve([120, 80]); await tick();
  assert.equal(calls, 1); assert.deepEqual(x.api.store.current().protectedRects, [{ x: 138, y: 178, width: 64, height: 64 }]); x.h.dispose();
});
test('tiny SDK camera jitter is ignored in pixel space while cumulative real motion invalidates accepted pins', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), pose = { center: [76, 8], zoom: 7, heading: 0, pitch: 0 }; let calls = 0;
  const pins = x.h.render(() => x.module.useBuddyMapPins([[76, 8]], true)); pins.mapRef({ getPointInView: async () => { calls++; return [100, 100]; } }); pins.cameraChanged(pose); pins.setFrame({ x: 20, y: 80, width: 320, height: 200 }); pins.idle(pose); await tick();
  const baseline = x.api.store.get().revision;
  for (let i = 0; i < 100; i++) { const next = { ...pose, center: [76 + (i % 5) * 1e-7, 8 + (i % 5) * 1e-7] }; pins.cameraChanged(next); pins.idle(next); }
  await tick(); assert.equal(calls, 1); assert.equal(x.api.store.get().revision, baseline);
  const moved = { ...pose, center: [76.01, 8] }; pins.cameraChanged(moved); assert.equal(x.api.store.current().geometryPending, true); pins.idle(moved); await tick(); assert.equal(calls, 2); assert.equal(x.api.store.current().geometryPending, false); x.h.dispose();
});
test('pixel-pose comparison retains zoom, bearing, pitch and genuine accumulated center changes', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), { buddyCameraPoseKey: key, equivalentBuddyCameraPose: same } = x.module;
  const pose = { center: [76, 8], zoom: 7, heading: 359.999, pitch: 0 };
  assert.equal(same(key(pose), key({ ...pose, center: [76.000001, 8.000001], heading: 0.001 })), true);
  for (const next of [{ ...pose, center: [76.01, 8] }, { ...pose, zoom: 7.01 }, { ...pose, heading: 1 }, { ...pose, pitch: 1 }]) assert.equal(same(key(pose), key(next)), false);
  assert.equal(key({ center: [NaN, 8], zoom: 7 }), null); x.h.dispose();
});
test('subpixel movement is compared with the accepted pose so small consecutive steps eventually refresh pins', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), pose = { center: [76, 8], zoom: 7, heading: 0, pitch: 0 }; let calls = 0;
  const pins = x.h.render(() => x.module.useBuddyMapPins([[76, 8]], true)); pins.mapRef({ getPointInView: async () => { calls++; return [100, 100]; } }); pins.cameraChanged(pose); pins.setFrame({ x: 20, y: 80, width: 320, height: 200 }); pins.idle(pose); await tick();
  for (let i = 1; i <= 20; i++) { const next = { ...pose, center: [76 + i * 0.0001, 8] }; pins.cameraChanged(next); pins.idle(next); await tick(); }
  assert.equal(calls, 2, 'Accumulated motion exceeds0.25pixel once although every individual step is smaller'); assert.equal(x.api.store.current().geometryPending, false); x.h.dispose();
});
test('rejected projection cooldown prevents duplicate-idle loops and real camera changes can recover immediately', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), pose = { center: [76, 8], zoom: 7, heading: 0, pitch: 0 }; let calls = 0, fail = true;
  const pins = x.h.render(() => x.module.useBuddyMapPins([[76, 8]], true)); pins.mapRef({ getPointInView: async () => { calls++; if (fail) throw Error('native'); return [100, 100]; } }); pins.cameraChanged(pose); pins.setFrame({ x: 20, y: 80, width: 320, height: 200 }); pins.idle(pose); await tick();
  for (let i = 0; i < 100; i++) pins.idle(pose);
  await tick(); assert.equal(calls, 1); assert.equal(x.api.store.current().geometryPending, false); assert.equal(x.api.store.current().protectedRects[0].width, 320); assert.equal(x.timers.jobs.size, 0);
  fail = false; const next = { ...pose, zoom: 8 }; pins.cameraChanged(next); pins.idle(next); await tick(); assert.equal(calls, 2); assert.equal(x.api.store.current().protectedRects[0].width, 64); x.h.dispose();
});
test('map replacement invalidates an active projection and late old success cannot overwrite the new map cache', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), old = deferred();
  const pins = x.h.render(() => x.module.useBuddyMapPins([[76, 8]], true)); pins.mapRef({ getPointInView: () => old.promise }); pins.setFrame({ x: 20, y: 80, width: 320, height: 200 }); await tick();
  pins.mapRef({ getPointInView: async () => [180, 120] }); await tick(); const accepted = x.api.store.current().protectedRects;
  old.resolve([10, 10]); await tick(); assert.deepEqual(x.api.store.current().protectedRects, accepted); assert.equal(accepted[0].x, 168); assert.equal(x.timers.jobs.size, 0); x.h.dispose();
});
test('known-pose cache is invalidated by a camera event without a valid pose', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), pose = { center: [76, 8], zoom: 7, heading: 0, pitch: 0 }; let calls = 0;
  const pins = x.h.render(() => x.module.useBuddyMapPins([[76, 8]], true)); pins.mapRef({ getPointInView: async () => { calls++; return [100 + calls, 100]; } }); pins.cameraChanged(pose); pins.setFrame({ x: 20, y: 80, width: 320, height: 200 }); pins.idle(pose); await tick(); assert.equal(calls, 1);
  pins.cameraChanged({ center: [NaN, 8], zoom: 7 }); pins.idle(); await tick(); assert.equal(calls, 2); assert.equal(x.api.store.current().protectedRects[0].x, 90); assert.equal(x.api.store.current().geometryPending, false); x.h.dispose();
});
test('initial pins await measured map ownership without a show-before-protection gap and failed mounting is bounded', async () => {
  const x = await harness('src/hooks/use-buddy-map-pins.ts'), coordinates = [[76, 8]]; let ready = false, calls = 0;
  const render = () => x.h.render(() => x.module.useBuddyMapPins(coordinates, ready)); let pins = render();
  assert.equal(x.api.store.current().geometryPending, true, 'Unknown map placement is pending immediately');
  const timer = [...x.timers.jobs.keys()][0]; for (let i = 0; i < 100; i++) pins.idle(); assert.equal([...x.timers.jobs.keys()][0], timer, 'Duplicate events do not extend initialization deadline');
  pins.setFrame({ x: 20, y: 80, width: 320, height: 200 }); assert.equal(x.api.store.current().geometryPending, false); assert.deepEqual(x.api.store.current().protectedRects, [{ x: 20, y: 80, width: 320, height: 200 }]);
  pins.mapRef({ getPointInView: async () => { calls++; return [100, 100]; } }); assert.equal(calls, 0); ready = true; pins = render(); await tick(); assert.equal(calls, 1); assert.equal(x.api.store.current().protectedRects[0].width, 64); x.h.dispose();
  const failed = await harness('src/hooks/use-buddy-map-pins.ts'), missing = failed.h.render(() => failed.module.useBuddyMapPins(coordinates, false));
  assert.equal(failed.api.store.current().geometryPending, true); failed.timers.fire(); assert.equal(failed.api.store.current().geometryPending, false);
  for (let i = 0; i < 100; i++) missing.idle(); assert.equal(failed.timers.jobs.size, 0, 'Unrendered map cannot start an infinite pending loop'); failed.h.dispose();
});
test('rendered map with unknown bounds stays protected after initialization and movement deadlines', async () => {
  for (const moving of [false, true]) {
    const x = await harness('src/hooks/use-buddy-map-pins.ts');
    const pins = x.h.render(() => x.module.useBuddyMapPins([[76, 8]], true));
    pins.mapRef({ getPointInView: async () => [100, 100] });
    if (moving) pins.cameraChanged({ center: [76, 8], zoom: 7 });
    const [id, timer] = [...x.timers.jobs.entries()].find(([, job]) => job.ms === 1500);
    x.timers.jobs.delete(id); timer.fn();
    assert.equal(x.api.store.current().geometryPending, true, 'Rendered pins cannot become unprotected without measured bounds');
    for (let i = 0; i < 100; i++) pins.idle();
    assert.equal(x.api.store.current().geometryPending, true);
    pins.setFrame({ x: 20, y: 80, width: 320, height: 200 }); await tick();
    assert.equal(x.api.store.current().geometryPending, false);
    assert.equal(x.api.store.current().protectedRects[0].width, 64);
    x.h.dispose();
  }
});
test('main-page enabled/off geometry has no Buddy spacer, padding, margin or height dependency', () => {
  assert.equal(existsSync('src/components/buddy/buddy-space.tsx'), false);
  const source = readFileSync('src/components/floating-navigation.tsx', 'utf8'); assert.ok(!source.includes('BuddyDock')); assert.ok(!source.includes('useBuddyPreference'));
  const jsx = (type, props) => ({ type, props }); let path = '/journey/id', enabled = false;
  const setHeight = () => {};
  const { MainNavigationFrame } = load('src/components/floating-navigation.tsx', { '@/theme/mobile-theme': { theme: {} }, react: { useState: initial => [initial, setHeight], useCallback: fn => fn }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'expo-router': { usePathname: () => path, useGlobalSearchParams: () => ({}), useRouter() {}, useFocusEffect() {} }, 'react-native': { StyleSheet: { create: v => v } }, 'react-native-safe-area-context': {},
    '@/hooks/session-context': {}, '@/hooks/use-load': {}, '@/lib/profile/edit-queries': {}, '@/lib/discovery/model': {}, '@/hooks/use-buddy-geometry': { useBuddyProtectedBounds: () => ({ enabled }) } });
  for (path of ['/journey/id', '/create', '/search', '/account', '/profile/name']) {
    enabled = false; const off = MainNavigationFrame({ children: 'SCREEN' }); enabled = true; const on = MainNavigationFrame({ children: 'SCREEN' });
    assert.deepEqual(on, off, path); assert.equal(on.props.children[0].props.children, 'SCREEN'); assert.equal(on.props.children[0].props.style[1].paddingBottom, 72, 'Only pre-existing navigation clearance remains');
  }
});
