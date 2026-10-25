import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { buddyGeometryStub, buddyMapPinsStub } from './helpers/buddy-geometry-stub.mjs';
const module = { exports: {} };
const guidanceModule = { exports: {} };
new Function('module', 'exports', ts.transpileModule(readFileSync('src/lib/journey/turn-guidance.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(guidanceModule, guidanceModule.exports);
const deviationModule = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(readFileSync('src/lib/journey/off-route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(() => guidanceModule.exports, deviationModule, deviationModule.exports);
new Function('require', 'module', 'exports', ts.transpileModule(readFileSync('src/lib/journey/navigation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(name => name === './off-route' ? deviationModule.exports : guidanceModule.exports, module, module.exports);
const { navigationFix, navigationBlock, firstNavigationStop, parseRoadRoute, requestRoadRoute, createNavigation, observeNavigation, ROUTE_TIMEOUT_MS, routeSummary } = module.exports;
const now = 100000;
const fix = (patch = {}) => ({ latitude: 8, longitude: 76, accuracy: 10, timestamp: now, ...patch });
const stop = (patch = {}) => ({ id: 'first', name: 'First', sequence: 0, latitude: 9, longitude: 77, ...patch });
const input = (patch = {}) => ({ status: 'active', foreground: true, focused: true, position: fix(), destination: stop(), ...patch });
const response = (patch = {}) => ({ code: 'Ok', routes: [{ geometry: { type: 'LineString', coordinates: [[76, 8], [77, 9]] }, distance: 2400, duration: 600, ...patch }] });
const road = parseRoadRoute(response());
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function fixture(loader) {
  let time = now, count = 0; const calls = [], pending = new Map();
  const controller = createNavigation((origin, destination, signal) => { calls.push({ origin, destination, signal }); return loader ? loader(origin, destination, signal) : Promise.resolve(road); }, () => time,
    { set(fn, ms) { const id = ++count; pending.set(id, { fn, ms }); return id; }, clear(id) { pending.delete(id); } });
  return { controller, calls, pending, advance(ms) { time += ms; }, current: () => time, sample: patch => input({ position: fix({ timestamp: time }), ...patch }) };
}
test('navigation requires valid, nonfuture, ≤15-second GPS with known accuracy ≤50 m', () => {
  for (const accuracy of [0, 50]) assert.equal(navigationFix(fix({ accuracy, timestamp: now - 15000 }), now), true);
  for (const patch of [{ latitude: 91 }, { longitude: -181 }, { latitude: NaN }, { accuracy: null }, { accuracy: -1 }, { accuracy: 50.01 }, { accuracy: Infinity }, { timestamp: now + 1 }, { timestamp: now - 15001 }, { timestamp: NaN }]) assert.equal(navigationFix(fix(patch), now), false);
  assert.equal(navigationFix(null, now), false);
  assert.equal(navigationFix(fix({ latitude: 0, longitude: 0 }), now), true);
});
test('first incomplete stop follows creator order and never skips missing coordinates or follows preview selection', () => {
  const missing = stop({ latitude: null }); const stops = [stop({ id: 'later', sequence: 2 }), missing];
  assert.equal(firstNavigationStop(stops), missing); assert.equal(stops[0].id, 'later');
  assert.match(navigationBlock(input({ destination: missing }), now), /coordinates/);
  assert.equal(firstNavigationStop([]), undefined);
});
test('route parser validates bounded GeoJSON, distance and optional duration without coercion', () => {
  assert.deepEqual(road.geometry.coordinates, [[76, 8], [77, 9]]);
  assert.equal(parseRoadRoute(response({ duration: undefined })).duration, null);
  for (const data of [{}, { code: 'Ok', routes: [] }, response({ distance: -1 }), response({ distance: '4' }), response({ duration: NaN }), response({ duration: -1 }), response({ geometry: { type: 'MultiLineString', coordinates: [] } }), response({ geometry: { type: 'LineString', coordinates: [[0, 0]] } }), response({ geometry: { type: 'LineString', coordinates: [[181, 0], [0, 0]] } }), response({ geometry: { type: 'LineString', coordinates: Array(100001).fill([0, 0]) } })]) assert.throws(() => parseRoadRoute(data), /invalid route/);
  for (const code of ['NoRoute', 'NoSegment']) assert.throws(() => parseRoadRoute({ code }), /No driving route/);
  assert.match(routeSummary(road), /2.4 km.*10 min/);
});
test('Directions uses driving POST, form body, public-token configuration and abort signal; coordinates stay out of URL', async () => {
  const abort = new AbortController(); let captured;
  await requestRoadRoute(fix(), stop(), 'pk.test-placeholder', abort.signal, async (url, options) => { captured = { url, options }; return { ok: true, json: async () => response() }; });
  assert.match(captured.url, /directions\/v5\/mapbox\/driving/); assert.equal(captured.url.includes('76,8'), false);
  assert.equal(captured.options.method, 'POST'); assert.equal(captured.options.signal, abort.signal);
  const body = new URLSearchParams(captured.options.body); assert.equal(body.get('coordinates'), '76,8;77,9'); assert.equal(body.get('steps'), 'true'); assert.equal(body.get('language'), 'en');
  assert.equal(captured.options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  let calls = 0; const transport = async () => { calls++; };
  await assert.rejects(requestRoadRoute(fix(), stop(), undefined, abort.signal, transport), /not configured/);
  await assert.rejects(requestRoadRoute(fix(), stop({ latitude: null }), 'pk.test-placeholder', abort.signal, transport), /coordinates/); assert.equal(calls, 0);
});
test('HTTP, network, no-route and malformed JSON errors are sanitized and actionable', async () => {
  const signal = new AbortController().signal;
  for (const [status, pattern] of [[401, /token/], [403, /restrictions/], [429, /limit/], [500, /temporarily/]]) await assert.rejects(requestRoadRoute(fix(), stop(), 'pk.test-placeholder', signal, async () => ({ ok: false, status })), pattern);
  await assert.rejects(requestRoadRoute(fix(), stop(), 'pk.test-placeholder', signal, async () => { throw new Error('private transport details'); }), /Network unavailable/);
  await assert.rejects(requestRoadRoute(fix(), stop(), 'pk.test-placeholder', signal, async () => ({ ok: true, json: async () => { throw new Error('private payload'); } })), /invalid route/);
  await assert.rejects(requestRoadRoute(fix(), stop(), 'pk.test-placeholder', signal, async () => ({ ok: true, json: async () => ({ code: 'NoRoute' }) })), /No driving route/);
});
test('one request per eligible destination; GPS ticks do not refresh or reroute; failures need bounded retry', async () => {
  const f = fixture(); f.controller.update(f.sample()); await flush(); assert.equal(f.controller.get().route, road);
  f.advance(10000); f.controller.update(f.sample({ position: fix({ latitude: 10, timestamp: f.current() }) })); await flush(); assert.equal(f.calls.length, 1);
  let fails = true; const g = fixture(() => fails ? Promise.reject(new Error('private network error')) : Promise.resolve(road));
  g.controller.update(g.sample()); await flush(); assert.equal(g.controller.get().status, 'error'); assert.equal(g.controller.get().message.includes('private'), false);
  g.controller.update(g.sample(), true); await flush(); assert.equal(g.calls.length, 1);
  g.advance(5000); g.controller.update(g.sample()); await flush(); assert.equal(g.calls.length, 1);
  fails = false; g.controller.update(g.sample(), true); await flush(); assert.equal(g.calls.length, 2); assert.equal(g.controller.get().route, road);
});
test('destination replacement aborts and hides old output; obsolete success and failure cannot publish', async () => {
  const gates = []; const f = fixture(() => new Promise((resolve, reject) => gates.push({ resolve, reject })));
  f.controller.update(f.sample()); await flush(); const signal = f.calls[0].signal;
  f.advance(5000); f.controller.update(f.sample({ destination: stop({ id: 'second', longitude: 78 }) })); await flush(); assert.equal(signal.aborted, true); assert.equal(f.controller.get().route, null);
  gates[0].resolve(road); await flush(); assert.equal(f.controller.get().status, 'loading');
  gates[1].resolve(road); await flush(); assert.equal(f.controller.get().route, road);
  f.controller.stop(); assert.equal(f.controller.get().route, null);
});
test('timeout invalidates even a transport that ignores abort; no late success can restore a route', async () => {
  let resolve; const f = fixture(() => new Promise(done => { resolve = done; })); f.controller.update(f.sample()); await flush();
  const timer = [...f.pending.values()][0]; assert.equal(timer.ms, ROUTE_TIMEOUT_MS); timer.fn();
  assert.equal(f.calls[0].signal.aborted, true); assert.equal(f.controller.get().status, 'error'); assert.match(f.controller.get().message, /timed out/);
  resolve(road); await flush(); assert.equal(f.controller.get().route, null); assert.equal(f.pending.size, 0);
});
test('ineligible states never request; lifecycle clears routes while GPS loss retains hidden reference progress', async () => {
  for (const patch of [{ status: 'ready' }, { status: 'paused' }, { status: 'finished' }, { foreground: false }, { focused: false }, { position: null }, { position: fix({ accuracy: 51 }) }, { destination: undefined }, { destination: stop({ longitude: null }) }]) {
    const f = fixture(); f.controller.update(f.sample(patch)); await flush(); assert.equal(f.calls.length, 0);
    f.controller.update(f.sample()); await flush(); assert.equal(f.controller.get().route, road);
    f.controller.update(f.sample(patch));
    if ('position' in patch) { assert.equal(f.controller.get().route, road); assert.equal(f.controller.get().gpsHeld, true); }
    else assert.equal(f.controller.get().route, null);
    assert.equal(f.pending.size, 0); f.controller.stop();
  }
  const f = fixture(); f.controller.update(input()); await flush(); f.advance(15001); f.controller.update(input()); assert.equal(f.controller.get().route, road); assert.equal(f.controller.get().gpsHeld, true); f.controller.stop();
});
test('Pause/Finish/blur/background invalidate in-flight responses and remove timers', async () => {
  for (const patch of [{ status: 'paused' }, { status: 'finished' }, { focused: false }, { foreground: false }]) {
    let resolve; const f = fixture(() => new Promise(done => { resolve = done; })); f.controller.update(f.sample()); await flush();
    f.controller.update(f.sample(patch)); assert.equal(f.calls[0].signal.aborted, true); resolve(road); await flush(); assert.equal(f.controller.get().route, null); assert.equal(f.pending.size, 0);
  }
});
test('screen lifecycle observer responds synchronously to store/GPS/AppState and fully cleans up on blur', async () => {
  const f = fixture(); let current = f.sample(), listener, appListener, tick, unsubscribed = 0, removed = 0, cleared = 0;
  const source = { subscribe(fn) { listener = fn; return () => { unsubscribed++; }; } };
  const cleanup = observeNavigation(f.controller, () => current, [source], { addEventListener(event, fn) { appListener = fn; return { remove() { removed++; } }; } }, { set(fn, ms) { tick = fn; assert.equal(ms, 1000); return 1; }, clear() { cleared++; } });
  await flush(); assert.equal(f.controller.get().route, road);
  current = f.sample({ status: 'paused' }); listener(); assert.equal(f.controller.get().route, null);
  f.advance(5000); current = f.sample(); listener(); await flush(); assert.equal(f.controller.get().route, road);
  current = f.sample({ foreground: false }); appListener(); assert.equal(f.controller.get().route, null);
  cleanup(); assert.equal(unsubscribed, 1); assert.equal(removed, 1); assert.equal(cleared, 1);
  const count = f.calls.length; current = f.sample(); tick(); listener(); appListener(); await flush(); assert.equal(f.calls.length, count);
});

test('late failure from a cancelled request cannot replace a new destination route', async () => {
  let reject; const f = fixture(() => new Promise((_, fail) => { reject = fail; })); f.controller.update(f.sample()); await flush();
  f.controller.update(f.sample({ destination: stop({ id: 'new' }) })); reject(new Error('obsolete failure')); await flush();
  assert.equal(f.controller.get().status, 'idle'); assert.equal(f.controller.get().message.includes('failure'), false);
});
test('a response arriving after GPS expires is rejected even before a lifecycle tick', async () => {
  let resolve; const f = fixture(() => new Promise(done => { resolve = done; })); f.controller.update(input()); await flush();
  f.advance(15001); resolve(road); await flush(); assert.equal(f.controller.get().route, null); assert.equal(f.controller.get().status, 'idle');
});
test('an initial route is rejected if current GPS has moved away from its geometry before the response arrives', async () => {
  let resolve; const f = fixture(() => new Promise(done => { resolve = done; }));
  f.controller.update(f.sample()); await flush();
  f.advance(6000); f.controller.update(f.sample({ position: fix({ latitude: 10, longitude: 79, timestamp: f.current() }) }));
  resolve(road); await flush();
  assert.equal(f.controller.get().status, 'error'); assert.equal(f.controller.get().route, null); assert.equal(f.controller.get().guidance, null);
  assert.match(f.controller.get().message, /current GPS/);
  f.controller.stop();
});
test('native map renders a separate blue route source only when supplied and foregrounded', () => {
  let appState = 'active';
  const jsx = (type, props) => ({ type, props });
  const native = { exports: {} };
  const react = { memo: fn => fn, useCallback: fn => fn, useEffect() {}, useMemo: fn => fn(), useRef: () => ({ current: null }), useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] };
  const mapbox = Object.fromEntries(['MapView','Atmosphere','Camera','ShapeSource','LineLayer','CircleLayer','SymbolLayer'].map(name => [name, name])); mapbox.StyleURL = {};
  const frame = { camera: {}, projection: 'mercator', route: { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: [[[76, 8], [77, 9]]] } }, fitsViewport: true };
  const mocks = {
    '@/components/journey/journey-action-icon': { JourneyActionIcon: 'JourneyActionIcon' },
    '@/lib/journey/nearby': { nearbyFocus: () => null }, '../nearby-locations': { NearbyLocations: 'NearbyLocations' },
    'expo-router': { useFocusEffect() {} },
    '@/components/discovery/globe/journey-overlays': { JourneyOverlays: 'JourneyOverlays' },
    'react/jsx-runtime': { jsx, jsxs: jsx }, react, '@rnmapbox/maps': { __esModule: true, default: mapbox, ...mapbox },
    'react-native': { AppState: { get currentState() { return appState; } }, StyleSheet: { create: x => x }, View: 'View', Text: 'Text', Pressable: 'Pressable' },
    '@/components/discovery/ui': { colors: {} }, '@/lib/discovery/presentation': {}, '@/lib/discovery/globe-style': {},
    '@/lib/journey/map-camera': { frameJourneyMap: () => frame }, './map-frame': {},
    '@/hooks/use-travel-camera': { useTravelCamera: () => ({ explore() {}, canMove: () => true }) },
    '@/hooks/use-buddy-geometry': buddyGeometryStub,
    '@/hooks/use-buddy-map-pins': buddyMapPinsStub,
    '@/lib/buddy/map-controls': { journeyBuddyControls: () => [] },
  };
  new Function('require','module','exports',ts.transpileModule(readFileSync('src/components/journey/map/native-map.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(id => { assert.ok(id in mocks, id); return mocks[id]; }, native, native.exports);
  const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  const render = route => nodes(native.exports.NativeJourneyMap({ data: { markers: [] }, stops: [], presentation: 'expanded', navigationRoute: route }));
  assert.equal(render(null).some(node => node.props?.id === 'travel-road-route'), false);
  const tree = render(road.geometry); assert.deepEqual(tree.find(node => node.props?.id === 'travel-road-route').props.shape.geometry, road.geometry);
  assert.equal(tree.find(node => node.props?.id === 'travel-road-line').props.style.lineColor, '#2677D9');
  assert.deepEqual(tree.find(node => node.props?.id === 'planned-line-layer').props.style.lineDasharray, [2, 2]);
  appState = 'background'; assert.equal(render(road.geometry).some(node => node.props?.id === 'travel-road-route'), false);
});
