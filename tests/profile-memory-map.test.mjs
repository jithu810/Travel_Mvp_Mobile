import { buddyGeometryStub } from './helpers/buddy-geometry-stub.mjs';
import { appMobileTheme, lightPilotTheme } from './helpers/dark-pilot-harness.mjs';
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Type-checked compile of the pure model and its real (pure) dependencies.
const output = mkdtempSync(join(tmpdir(), 'profile-memory-map-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/profile/memory-map.ts', 'src/lib/journey/story-layout.ts', 'src/lib/discovery/request-cache.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, types: ['node'],
  outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
const diagnostics = ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const nodeRequire = createRequire(import.meta.url);
const memory = nodeRequire(join(output, 'lib/profile/memory-map.js'));
const model = nodeRequire(join(output, 'lib/discovery/model.js'));
const { selectedStopId } = nodeRequire(join(output, 'lib/journey/story-layout.js'));
const requestCache = nodeRequire(join(output, 'lib/discovery/request-cache.js'));

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const jid = n => `33333333-3333-4333-8333-${String(n).padStart(12, '0')}`;
const sid = (j, n) => `44444444-4444-4444-${String(4000 + j).padStart(4, '0')}-${String(n).padStart(12, '0')}`;
const stopRow = (j, n, extra = {}) => ({ id: sid(j, n), name: 'Stop ' + n, sequence: n, day_number: 1, latitude: 10 + n * 0.01, longitude: 76 + j * 0.01, photo_path: null, ...extra });
const row = (j, stops = [stopRow(j, 0)], extra = {}) => ({ id: jid(j), title: 'Journey ' + j, status: 'published', is_demo: false, user_id: owner, updated_at: '2026-11-0' + (j % 9 + 1), journey_stops: stops, ...extra });
const photoPath = (j, n) => `journey-media/${owner}/${jid(j)}/stops/${sid(j, n)}/${'55555555-5555-4555-8555-555555555555'}.full-v1.jpg`;

function loadQueries({ data = [], error = null, client = 'public', resolvePhotos, pending = false } = {}) {
  const calls = [];
  const builder = {
    select(columns) { calls.push(['select', columns]); return builder; },
    eq(column, value) { calls.push(['eq', column, value]); return builder; },
    order(column, options) { calls.push(['order', column, options]); return builder; },
    limit(count) { calls.push(['limit', count]); return builder; },
    async abortSignal(signal) { calls.push(['abortSignal', signal]); if (pending) return new Promise(() => {}); return { data: typeof data === 'function' ? data() : data, error }; },
  };
  const publicClient = { from(table) { calls.push(['from', table]); return builder; }, rpc() { throw Error('No RPC is used'); } };
  const signing = [];
  const modules = {
    '../discovery/model': model,
    '../supabase/public': { publicSupabase: client === 'public' ? publicClient : null },
    '../discovery/queries': { resolvePhotos: async (journeys, signal) => { signing.push(journeys); return resolvePhotos ? resolvePhotos(journeys, signal) : journeys; } },
    './memory-map': memory, '../discovery/request-cache': requestCache,
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync('src/lib/profile/memory-map-queries.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  // Any other import (notably the persistent authenticated '../supabase/client') fails the test.
  new Function('require', 'exports', code)(name => { assert.ok(name in modules, 'Unexpected import ' + name); return modules[name]; }, exports);
  return { load: (id = owner, signal = new AbortController().signal, options) => exports.loadProfileMemoryMap(id, signal, options), sign: (pins, signal = new AbortController().signal, budget) => exports.signMemoryPins(pins, signal, budget), calls, signing };
}

test('memory map uses one anonymous journeys read with the agreed published-only filters, order, bound and abort signal', async () => {
  const h = loadQueries({ data: [row(1)] });
  const controller = new AbortController();
  const result = await h.load(owner, controller.signal);
  assert.equal(result.pins.length, 1);
  assert.deepEqual(h.calls.slice(0, -1), [
    ['from', 'journeys'],
    ['select', 'id,title,status,is_demo,user_id,updated_at,journey_stops(id,name,sequence,day_number,latitude,longitude,photo_path)'],
    ['eq', 'user_id', owner], ['eq', 'status', 'published'], ['eq', 'is_demo', false],
    ['order', 'updated_at', { ascending: false }], ['order', 'id', undefined],
    ['order', 'sequence', { referencedTable: 'journey_stops', ascending: true }],
    ['limit', 100],
  ]);
  assert.ok(h.calls.at(-1)[0] === 'abortSignal' && h.calls.at(-1)[1] instanceof AbortSignal);
  assert.equal(h.calls.filter(call => call[0] === 'from').length, 1, 'Single read');
  const source = readFileSync('src/lib/profile/memory-map-queries.ts', 'utf8');
  assert.doesNotMatch(source, /supabase\/client/);
  for (const invalid of ['', 'not-a-uuid', owner + 'x']) {
    const skipped = loadQueries({ data: [row(1)] });
    assert.deepEqual((await skipped.load(invalid)).pins, []); assert.equal(skipped.calls.length, 0, 'Invalid owner never queries');
  }
  await assert.rejects(loadQueries({ client: null }).load(), /not configured/);
  const aborted = new AbortController(); aborted.abort();
  const early = loadQueries({ data: [row(1)] });
  await assert.rejects(early.load(owner, aborted.signal), /cancelled/); assert.equal(early.calls.length, 0);
  const hanging = loadQueries({ data: [row(1)], pending: true }), during = new AbortController();
  const request = hanging.load(owner, during.signal); await new Promise(setImmediate);
  during.abort(); await assert.rejects(request, /cancelled/);
  assert.equal(hanging.calls.at(-1)[1].aborted, true, 'Leaving the map aborts the transport');
});

test('short cache: a focus return within 45 s reuses pins without a refetch; fresh reads and other owners query again', async () => {
  let version = 0;
  const h = loadQueries({ data: () => [row(1, [stopRow(1, version++)])] });
  const first = await h.load(); const again = await h.load();
  assert.equal(again, first, 'Same model object: no refetch, no remount-inducing change');
  assert.equal(h.calls.filter(call => call[0] === 'from').length, 1);
  const forced = await h.load(owner, undefined, { fresh: true });
  assert.notEqual(forced, first); assert.equal(h.calls.filter(call => call[0] === 'from').length, 2, 'Pull-to-refresh/foreground force a fresh read');
  await h.load(other); assert.equal(h.calls.filter(call => call[0] === 'from').length, 3, 'Cache is per owner');
  assert.equal(readFileSync('src/lib/profile/memory-map-queries.ts', 'utf8').includes('createRequestCache<MemoryMapModel>(4, memoryMapCacheTtl)'), true);
});

test('fail-closed guard drops drafts, demo, other-owner, unknown-status and malformed rows for anonymous, other-user and owner viewers alike', async () => {
  // The read is viewer-independent: the same anonymous client serves anon, other users and the owner.
  const rows = [row(1), row(2, undefined, { status: 'draft' }), row(3, undefined, { is_demo: true }), row(4, undefined, { is_demo: null }),
    row(5, undefined, { user_id: other }), row(6, undefined, { user_id: undefined }), row(7, undefined, { status: undefined }),
    row(8, undefined, { id: 'bad-id' }), null, 'text', [row(9)], row(1)];
  const result = await loadQueries({ data: rows }).load();
  assert.deepEqual(result.pins.map(pin => pin.journeyId), [jid(1)], 'Only the published, non-demo journey of this owner, once');
  assert.equal(result.journeyCount, 1);
  assert.equal(JSON.stringify(result).includes(owner), false, 'user_id never leaves the owner check');
  assert.equal(JSON.stringify(result).includes('status'), false);
  const upper = await loadQueries({ data: [row(1, undefined, { user_id: owner.toUpperCase() })] }).load();
  assert.equal(upper.pins.length, 1, 'UUID case does not matter');
});

test('empty, malformed and failed responses: empty map vs fail-closed errors', async () => {
  assert.deepEqual(await loadQueries({ data: [] }).load(), { pins: [], journeyCount: 0, featuredCount: 0, limited: false });
  const noStops = await loadQueries({ data: [row(1, []), row(2, null)] }).load();
  assert.equal(noStops.pins.length, 0); assert.equal(noStops.journeyCount, 0);
  for (const data of [null, { rows: [] }, 'oops', 7]) await assert.rejects(loadQueries({ data }).load(), /temporarily unavailable/);
  await assert.rejects(loadQueries({ data: [row(1)], error: { message: 'offline' } }).load(), /couldn’t load the travel map/);
});

test('only finite in-range coordinate pairs with valid stop ids become pins, in journey/stop order', () => {
  const stops = [stopRow(1, 0), stopRow(1, 1, { latitude: null }), stopRow(1, 2, { longitude: 181 }), stopRow(1, 3, { latitude: -91 }),
    stopRow(1, 4, { latitude: Number.NaN }), stopRow(1, 5, { longitude: '76' }), stopRow(1, 6, { id: 'not-uuid' }), stopRow(1, 7, { latitude: 90, longitude: -180 }),
    stopRow(1, 8, { sequence: -1 }), stopRow(1, 9, { name: '' })];
  const result = memory.normalizeMemoryMap([row(1, stops)], owner);
  assert.deepEqual(result.pins.map(pin => pin.stopId), [sid(1, 0), sid(1, 7)]);
  assert.equal(result.pins[1].stopIndex, 7, 'Art highlight uses the stop position within its journey');
  assert.equal(result.pins[0].art.stops.length, 8, 'Art keeps the journey route context (valid stops only)');
  const reordered = memory.normalizeMemoryMap([row(1, [stopRow(1, 2), stopRow(1, 0), stopRow(1, 1)])], owner);
  assert.deepEqual(reordered.pins.map(pin => pin.stopName), ['Stop 0', 'Stop 1', 'Stop 2'], 'Embedded stops ordered by sequence');
});

test('photo pins: pins first, then best-effort signing; unsafe/absent paths, per-photo, thrown and slow signing fall back to art', async () => {
  const stops = [stopRow(1, 0, { photo_path: photoPath(1, 0) }), stopRow(1, 1, { photo_path: 'journey-media/../secret.jpg' }), stopRow(1, 2, { photo_path: 'http://insecure/p.jpg' }),
    stopRow(1, 3), stopRow(1, 4, { photo_path: photoPath(1, 4) }), stopRow(1, 5, { photo_path: 'https://cdn.example/p.jpg' })];
  const signer = async journeys => journeys.map(journey => ({ ...journey, stops: journey.stops.map(stop => stop.id === sid(1, 4)
    ? { ...stop, photo: null } // this photo failed to sign
    : { ...stop, photo: stop.photo?.startsWith('journey-media/') ? 'https://signed/' + stop.id : stop.photo, photoThumbnail: stop.photo?.startsWith('journey-media/') ? 'https://signed/thumb/' + stop.id : undefined }) }));
  const h = loadQueries({ data: [row(1, stops)], resolvePhotos: signer });
  const unsigned = await h.load();
  assert.equal(h.signing.length, 0, 'The map read never waits for photo signing');
  assert.ok(unsigned.pins.every(pin => pin.photo === null && pin.photoThumbnail === null), 'Pins render with art before signing; raw paths are never display URLs');
  const result = await h.sign(unsigned.pins);
  const by = Object.fromEntries(result.map(pin => [pin.stopId, pin]));
  assert.deepEqual([by[sid(1, 0)].photo, by[sid(1, 0)].photoThumbnail], ['https://signed/' + sid(1, 0), 'https://signed/thumb/' + sid(1, 0)]);
  for (const n of [1, 2, 3, 4]) assert.deepEqual([by[sid(1, n)].photo, by[sid(1, n)].photoThumbnail], [null, null], 'Stop ' + n + ' uses stop art');
  assert.equal(by[sid(1, 5)].photo, 'https://cdn.example/p.jpg');
  assert.deepEqual(h.signing[0].flatMap(j => j.stops.map(s => s.photo)), [photoPath(1, 0), photoPath(1, 4), 'https://cdn.example/p.jpg'], 'Only safe featured photos are submitted for signing');
  assert.ok(h.signing[0].every(j => j.cover === null && j.stops.length === 1));
  const broken = loadQueries({ data: [row(1, stops)], resolvePhotos: async () => { throw Error('Photo service unavailable.'); } });
  assert.ok((await broken.sign((await broken.load()).pins)).every(pin => pin.photo === null), 'A failing photo service keeps the map with art');
  let innerSignal;
  const slow = loadQueries({ data: [row(1, stops)], resolvePhotos: (_journeys, signal) => { innerSignal = signal; return new Promise(() => {}); } });
  const started = Date.now(); const timed = await slow.sign((await slow.load()).pins, undefined, 30);
  assert.ok(timed.every(pin => pin.photo === null) && Date.now() - started < 1000, 'Slow signing ends at its own budget with art');
  assert.equal(innerSignal.aborted, true, 'Timed-out signing is cancelled');
  const cancel = new AbortController(); const cancelAt = Date.now(); const pendingSign = slow.sign(unsigned.pins, cancel.signal, 5000); cancel.abort();
  await assert.rejects(pendingSign, /cancelled/, 'Leaving the map never returns stale photos'); assert.ok(Date.now() - cancelAt < 1000, 'Cancellation is prompt');
  const noPhotos = loadQueries({ data: [row(1, [stopRow(1, 0)])] }); await noPhotos.sign((await noPhotos.load()).pins); assert.equal(noPhotos.signing.length, 0, 'Nothing to sign, no signing call');
});

test('large profiles stay bounded: 100 journeys x 50 stops, 24 featured places, at most 24 photos signed', async () => {
  const rows = Array.from({ length: 140 }, (_, j) => row(j, Array.from({ length: 60 }, (_, n) => stopRow(j, n, { photo_path: photoPath(j, n) }))));
  const h = loadQueries({ data: rows });
  const result = await h.load();
  assert.equal(result.limited, true, 'Hitting the 100-journey cap is reported');
  assert.equal(memory.normalizeMemoryMap(rows.slice(0, 99), owner).limited, false);
  assert.equal(result.pins.length, 100 * 50);
  assert.equal(result.journeyCount, 100);
  assert.equal(result.featuredCount, memory.memoryMapFeaturedLimit); assert.equal(memory.memoryMapFeaturedLimit, 24);
  assert.equal(result.pins.filter(pin => pin.featured).length, 24);
  const signed = await h.sign(result.pins);
  assert.equal(h.signing[0].length, 24, 'Signing jobs: <= 24 photos (<= 48 with thumbnails), well within the 512 queue');
  assert.ok(result.pins.filter(pin => !pin.featured).every(pin => pin.photoPath === null), 'Unfeatured paths are never kept for signing');
  assert.ok(signed.filter(pin => !pin.featured).every(pin => pin.photo === null && pin.photoThumbnail === null));
  assert.ok(result.pins.slice(0, 24).every(pin => pin.featured && pin.journeyId === jid(0)), 'Most recent journey first');
  const same = memory.normalizeMemoryMap([row(1, [stopRow(1, 0, { latitude: 20 }), stopRow(1, 1, { latitude: 10, longitude: 76.01 }), stopRow(1, 2, { latitude: 10, longitude: 76.01 })])], owner);
  assert.deepEqual(same.pins.map(pin => pin.featured), [true, true, false], 'One featured marker per distinct place');
});

test('pins route to Story at their stop; Story falls back to the first stop for an unknown stop', () => {
  const pin = memory.normalizeMemoryMap([row(7, [stopRow(7, 0), stopRow(7, 3)])], owner).pins[1];
  assert.deepEqual(memory.memoryPinRoute(pin), { pathname: '/journey/[id]', params: { id: jid(7), stop: sid(7, 3) } });
  assert.match(memory.memoryPinLabel(pin), /^Open Journey 7 at stop 2: Stop 3$/);
  assert.equal('storyStopParam' in memory, false, 'Story keeps its own inline check');
  const stops = [{ id: sid(7, 0) }, { id: sid(7, 3) }];
  assert.equal(selectedStopId(stops, sid(7, 3)), sid(7, 3));
  assert.equal(selectedStopId(stops, sid(9, 9)), sid(7, 0), 'Unknown stop falls back to the first stop');
  assert.equal(selectedStopId(stops, null), sid(7, 0));
});

test('memory map frame fits every pin without joining unrelated journeys, and limits single-place zoom', () => {
  const viewport = { width: 360, height: 400 };
  assert.equal(memory.memoryMapFrame([], viewport), null);
  const one = memory.memoryMapFrame([{ key: 'a', stopName: 'A', latitude: 10, longitude: 76 }], viewport);
  assert.deepEqual(one.camera.centerCoordinate, [76, 10]); assert.equal(one.camera.zoomLevel, memory.memoryMapMaxZoom);
  const many = memory.memoryMapFrame([{ key: 'a', stopName: 'A', latitude: 48.85, longitude: 2.35 }, { key: 'b', stopName: 'B', latitude: 35.68, longitude: 139.69 }, { key: 'c', stopName: 'C', latitude: -33.86, longitude: 151.2 }], viewport, { paddingTop: 64 });
  assert.equal(many.route.geometry.coordinates.length, 0, 'No planned line between separate places');
  assert.equal(many.markerCount, 3); assert.ok(many.camera.zoomLevel < 3);
  assert.ok(many.extent.west <= 2.35 + 1e-9 && many.extent.east >= 151.2 - 1e-9);
  const dateline = memory.memoryMapFrame([{ key: 'a', stopName: 'A', latitude: -17, longitude: 178 }, { key: 'b', stopName: 'B', latitude: -14, longitude: -171 }], viewport);
  assert.ok(dateline.extent.crossesAntimeridian, 'Pacific places fit across the antimeridian');
});

test('overlapping places: identical coordinates get a chooser, multi-hit or crowded taps zoom, a lone place opens', () => {
  const pin = (key, latitude, longitude) => ({ key, stopName: key, latitude, longitude });
  const pins = [pin('a', 10, 76), pin('b', 10, 76), pin('c', 10.2, 76.2), pin('d', 48, 2)];
  assert.deepEqual(memory.memoryPlacePress(pins, 'a', ['a'], 4), { kind: 'choose', keys: ['a', 'b'] }, 'Same landmark in two journeys stays reachable');
  const crowded = memory.memoryPlacePress(pins, 'c', ['c'], 3);
  assert.equal(crowded.kind, 'zoom'); assert.ok(crowded.zoomLevel > 3); assert.deepEqual(crowded.centerCoordinate, [76.2, 10.2]);
  assert.deepEqual(memory.memoryPlacePress(pins, 'c', ['c'], 12), { kind: 'open', key: 'c' }, 'Separated at this zoom: opens');
  assert.equal(memory.memoryPlacePress(pins, 'd', ['d', 'c'], 12).kind, 'zoom', 'A tap hitting several places zooms');
  assert.deepEqual(memory.memoryPlacePress(pins, 'd', ['d', 'c'], 16), { kind: 'choose', keys: ['d', 'c'] }, 'No zoom loop at the cap');
  assert.deepEqual(memory.memoryPlacePress(pins, 'd', ['d', 'unknown'], 12), { kind: 'open', key: 'd' }, 'Unknown features are ignored');
  assert.equal(memory.memoryPlacePress(pins, 'missing', [], 3), null);
});

test('native map load state never waits indefinitely: style fallback, stale events and the total deadline', () => {
  const next = memory.nextMemoryMapLoad, start = memory.initialMemoryMapLoad;
  assert.deepEqual(start, { style: 'satellite', ready: false });
  assert.ok(memory.memoryMapStyleBudget < memory.memoryMapTotalBudget && memory.memoryMapTotalBudget <= 20000);
  assert.deepEqual(next(start, { type: 'loaded', style: 'satellite' }), { style: 'satellite', ready: true });
  const outdoors = next(start, { type: 'style-timeout' }); assert.deepEqual(outdoors, { style: 'outdoors', ready: false });
  assert.equal(next(outdoors, { type: 'loaded', style: 'satellite' }), outdoors, 'A late event from the replaced style is ignored');
  assert.equal(next(outdoors, { type: 'error', style: 'satellite' }), outdoors);
  assert.deepEqual(next(outdoors, { type: 'loaded', style: 'outdoors' }), { style: 'outdoors', ready: true });
  assert.deepEqual(next(start, { type: 'error', style: 'satellite' }), outdoors, 'An error advances immediately');
  assert.deepEqual(next(outdoors, { type: 'error', style: 'outdoors' }), { style: 'failed', ready: false });
  for (const state of [start, outdoors]) assert.deepEqual(next(state, { type: 'deadline' }), { style: 'failed', ready: false }, 'Deadline always reaches the notice');
  const ready = { style: 'satellite', ready: true };
  assert.equal(next(ready, { type: 'deadline' }), ready); assert.equal(next(ready, { type: 'style-timeout' }), ready);
  const failed = { style: 'failed', ready: false }; assert.equal(next(failed, { type: 'loaded', style: 'failed' }), failed);
  // Regression guard for the phone blocker: the MapView must not wait on a layout event
  // gated by a passive effect, and the timeout must not depend on the frame.
  const source = readFileSync('src/components/profile/native-memory-map.tsx', 'utf8');
  assert.match(source, /useState<MemoryMapViewport>\(initialViewport\)/);
  assert.doesNotMatch(source, /onLayout=\{event => \{\s*if \(!mounted\.current\)/);
  assert.match(source, /if \(ready \|\| failed \|\| !appActive\) return;/);
  assert.match(readFileSync('src/components/profile/memory-map-view.native.tsx', 'utf8'), /Date\.now\(\) \+ memoryMapTotalBudget/, 'One budget spans import and style load');
});

test('camera cache resumes the last camera per owner only while the places are unchanged', () => {
  const cache = memory.createMemoryCameraCache(2);
  const pins = [{ key: 'a', latitude: 10, longitude: 76 }, { key: 'b', latitude: 11, longitude: 77 }];
  const signature = memory.memoryPinsSignature(pins);
  assert.equal(cache.get(owner, signature), null, 'First open fits');
  cache.set(owner, signature, { centerCoordinate: [76.5, 10.5], zoomLevel: 9.5, heading: 12 });
  assert.deepEqual(cache.get(owner, signature), { centerCoordinate: [76.5, 10.5], zoomLevel: 9.5, heading: 12 });
  assert.equal(cache.get(owner, memory.memoryPinsSignature([...pins, { key: 'c', latitude: 1, longitude: 1 }])), null, 'Changed places refit');
  assert.equal(cache.get(other, signature), null, 'Never another owner’s camera');
  cache.set(other, signature, { centerCoordinate: [Number.NaN, 0], zoomLevel: 3, heading: 0 }); assert.equal(cache.get(other, signature), null, 'Invalid cameras are not stored');
  cache.set(other, signature, { centerCoordinate: [1, 2], zoomLevel: 30, heading: Number.NaN }); assert.deepEqual(cache.get(other, signature), { centerCoordinate: [1, 2], zoomLevel: 16, heading: 0 });
  cache.set('third', signature, { centerCoordinate: [1, 2], zoomLevel: 3, heading: 0 }); assert.equal(cache.get(owner, signature), null, 'Bounded');
  const source = readFileSync('src/components/profile/native-memory-map.tsx', 'utf8');
  assert.match(source, /defaultSettings=\{restored \? \{ \.\.\.restored, pitch: 0 \} : frame\.camera\}/);
  assert.match(source, /if \(first && restored\) return;/, 'A resumed camera is not refit');
  const wrapper = readFileSync('src/components/profile/profile-memory-map.tsx', 'utf8');
  assert.match(wrapper, /\{focused && <MemoryMapView /, 'Native map renders only while the profile is focused');
});

// ---- Component and screen wiring (mocked React tree, no native rendering) ----
const jsx = (type, props, key) => ({ type, props, key });
function hooks() {
  const slots = []; let cursor = 0, effects = [];
  const changed = (previous, deps) => !previous || !deps || deps.some((dep, i) => dep !== previous[i]);
  const memo = (factory, deps) => { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { deps, value: factory() }; return slots[i].value; };
  return {
    react: { createElement: jsx, memo: c => c, useMemo: memo, useCallback: (fn, deps) => memo(() => fn, deps),
      useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
      useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
      useEffect: (fn, deps) => { const i = cursor++; if (changed(slots[i]?.deps, deps)) { slots[i]?.cleanup?.(); const slot = { deps }; slots[i] = slot; effects.push(() => { slot.cleanup = fn(); }); } } },
    render(fn) { cursor = 0; effects = []; const tree = fn(); effects.forEach(effect => effect()); return tree; },
  };
}
const native = Object.fromEntries(['View', 'Text', 'Image', 'Pressable', 'FlatList', 'ScrollView', 'Modal', 'ActivityIndicator', 'RefreshControl', 'Switch'].map(n => [n, n]));
native.StyleSheet = { create: s => s }; native.useWindowDimensions = () => ({ width: 360, height: 800, fontScale: 1 });
native.AppState = { addEventListener: () => ({ remove() {} }) };
const ui = { colors: {}, ui: {}, Action: 'Action', Message: 'Message' };
function load(path, modules, react) {
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(name => {
    if (name === '@/lib/discovery/journey-feed-session' && !(name in modules)) return { journeyFeedSessions: { create: () => null } };
    if (name === 'react') return react; if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react-native') return native; if (name === '@/theme/dark-pilot') return lightPilotTheme; if (name === '@/theme/mobile-theme') return appMobileTheme;
    if (name === '@/hooks/use-buddy-geometry') return buddyGeometryStub;
    if (name in modules) return modules[name];
    throw Error('Unexpected import ' + name);
  }, exports);
  return exports;
}
function all(tree, type) { if (!tree || typeof tree !== 'object') return []; return [...(tree.type === type ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(t => all(t, type))]; }

function mapComponent(initial) {
  const h = hooks(), routes = [], loaders = []; let state = initial, photos = { data: null, loading: true, error: null }, refreshes = 0, focus, calls = 0;
  const { ProfileMemoryMap } = load('src/components/profile/profile-memory-map.tsx', {
    'expo-router': { useRouter: () => ({ push: route => routes.push(route) }), useFocusEffect: fn => { focus = fn; } },
    '@/components/discovery/ui': ui, '@/lib/discovery/presentation': { spaceColor: '#080F1E' },
    '@/hooks/use-load': { useLoad: loader => { loaders.push(loader); return calls++ % 2 ? photos : { ...state, refresh() { refreshes++; }, retry() { refreshes++; } }; } },
    '@/lib/profile/memory-map': memory, '@/lib/profile/memory-map-queries': { loadProfileMemoryMap: (id, signal, options) => ({ id, signal, options }), signMemoryPins: (pins, signal) => ({ pins, signal }) },
    './memory-map-view': { MemoryMapView: 'MemoryMapView' },
  }, h.react);
  return { render: props => h.render(() => ProfileMemoryMap(props)), routes, loaders, set: next => { state = next; }, setPhotos: next => { photos = next; }, refreshes: () => refreshes, focus: () => focus };
}

test('ProfileMemoryMap: loading, error with retry, owner/visitor empty copy, refresh failure and pin navigation', () => {
  const c = mapComponent({ data: null, loading: true, error: null });
  let tree = c.render({ ownerId: owner });
  assert.equal(tree.props.accessibilityLabel, 'Loading travel map'); assert.equal(all(tree, 'MemoryMapView').length, 0);
  assert.deepEqual(c.loaders.at(-2)('signal'), { id: owner, signal: 'signal', options: { fresh: false } }, 'Loader is bound to this owner');
  c.set({ data: null, loading: false, error: 'Offline' }); tree = c.render({ ownerId: owner });
  assert.equal(tree.type, 'Message'); assert.equal(tree.props.body, 'Offline'); tree.props.retry(); assert.equal(c.refreshes(), 1);
  c.set({ data: { pins: [], journeyCount: 0, featuredCount: 0, limited: false }, loading: false, error: null });
  let empty = all(c.render({ ownerId: owner, owner: true }), 'Message')[0];
  assert.equal(empty.props.title, 'No mapped places yet'); assert.match(empty.props.body, /Drafts stay private/); assert.equal(empty.props.retry, undefined);
  empty = all(c.render({ ownerId: owner }), 'Message')[0]; assert.match(empty.props.body, /this creator’s published journeys/);
  const pins = memory.normalizeMemoryMap([row(1, [stopRow(1, 0), stopRow(1, 1)])], owner).pins;
  c.set({ data: { pins, journeyCount: 1, featuredCount: 2, limited: false }, loading: false, error: 'Refresh failed' }); tree = c.render({ ownerId: owner });
  assert.equal(all(tree, 'View').find(node => node.props.accessibilityRole === 'alert').props.accessibilityLabel, 'Refresh failed', 'Last good pins stay with a refresh error');
  let view = all(tree, 'MemoryMapView')[0]; assert.equal(view.props.pins, pins, 'Unsigned pins show before photos');
  assert.deepEqual(view.props.initialViewport, { width: 328, height: 300 }, 'Map receives its usable parent dimensions');
  assert.deepEqual(c.loaders.at(-1)('s'), { pins, signal: 's' }, 'Photos are signed for the loaded pins after they render');
  const signedPins = pins.map(pin => ({ ...pin, photo: 'https://signed/' + pin.stopId }));
  c.setPhotos({ data: signedPins, loading: false, error: null }); tree = c.render({ ownerId: owner }); view = all(tree, 'MemoryMapView')[0];
  assert.equal(view.props.pins, signedPins);
  c.setPhotos({ data: null, loading: false, error: 'The request timed out. Please try again.' }); tree = c.render({ ownerId: owner });
  assert.equal(all(tree, 'MemoryMapView')[0].props.pins, pins, 'Signing timeout keeps the map'); assert.equal(all(tree, 'View').filter(node => node.props.accessibilityRole === 'alert').length, 1, 'No extra error for photos');
  assert.equal(view.props.mosaic, undefined, 'Only the pannable map is mounted');
  view.props.onOpen(pins[1]); assert.deepEqual(c.routes, [{ pathname: '/journey/[id]', params: { id: jid(1), stop: sid(1, 1) } }]);
  view.props.onOpen(pins[1]); view.props.onOpen(pins[0]); assert.equal(c.routes.length, 1, 'Marker+dot or double taps push Story once');
  assert.equal(view.props.cameraKey, owner, 'Buddy selection and camera remain scoped to the owner');
  const refreshesBeforeStory = c.refreshes(), loadersBeforeStory = c.loaders.length;
  c.focus()()(); tree = c.render({ ownerId: owner }); // focus, then blur (navigate to Story)
  assert.equal(all(tree, 'MemoryMapView').length, 0, 'Native map is released while Story is open');
  c.focus()(); tree = c.render({ ownerId: owner });
  assert.equal(all(tree, 'MemoryMapView').length, 1, 'Native presentation may remount on return');
  assert.equal(c.refreshes(), refreshesBeforeStory, 'Focus return alone never forces a read');
  const [mapBefore, photosBefore] = c.loaders.slice(loadersBeforeStory - 2, loadersBeforeStory);
  assert.deepEqual(c.loaders.slice(-2), [mapBefore, photosBefore], 'Same loaders: the cached data and photos are reused, not reloaded');
  all(tree, 'MemoryMapView')[0].props.onOpen(pins[0]); assert.equal(c.routes.length, 2, 'Focus return releases the lock');
  c.set({ data: { pins, journeyCount: 100, featuredCount: 2, limited: true }, loading: false, error: null });
  assert.equal(all(c.render({ ownerId: owner, fullBleed: true, mapHeight: 240, onScreen: false }), 'MemoryMapView')[0].props.initialViewport.width, 360);
  assert.equal(all(c.render({ ownerId: owner, fullBleed: true, mapHeight: 240, onScreen: false }), 'MemoryMapView')[0].props.initialViewport.height, 240);
  assert.equal(all(c.render({ ownerId: owner, onScreen: false }), 'MemoryMapView')[0].props.onScreen, false);
});

test('ProfileMemoryMap: soft refresh may reuse the cache; reload forces a fresh read', () => {
  const c = mapComponent({ data: { pins: [], journeyCount: 0, featuredCount: 0, limited: false }, loading: false, error: null });
  c.render({ ownerId: owner, refreshKey: 3, reloadKey: 1 }); assert.equal(c.refreshes(), 0, 'Mounting does not double-load');
  c.render({ ownerId: owner, refreshKey: 3, reloadKey: 1 }); assert.equal(c.refreshes(), 0);
  c.render({ ownerId: owner, refreshKey: 4, reloadKey: 1 }); assert.equal(c.refreshes(), 1);
  const mapLoader = c.loaders[0];
  assert.deepEqual(mapLoader('s').options, { fresh: false }, 'Focus return may use the 45 s cache');
  c.render({ ownerId: owner, refreshKey: 4, reloadKey: 2 }); assert.equal(c.refreshes(), 2);
  assert.deepEqual(mapLoader('s').options, { fresh: true }, 'Pull/foreground reload bypasses the cache');
  assert.deepEqual(mapLoader('s').options, { fresh: false }, 'Only once');
});

function profileUi() {
  return load('src/components/profile/profile-ui.tsx', {
    '@expo/vector-icons/Feather': { __esModule: true, default: 'Feather' },
    'expo-router': { useRouter: () => ({ push() {} }), useFocusEffect() {} }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/discovery/journey-photo': { JourneyPhoto: 'JourneyPhoto' }, '@/components/discovery/thumbnail-photo': { ThumbnailPhoto: 'ThumbnailPhoto' },
    '@/components/art/journey-art': { JourneyArt: 'JourneyArt' }, '@/lib/art/journey-art': { artSeed: () => 'seed' }, '@/lib/discovery/model': { journeyFacts: () => '' },
    './profile-styles': { profileUIStyles: {}, profileStyles: {} }, '@/lib/remix/model': { draftRemixCredit: () => '' }, '@/components/delete-draft-action': { DeleteDraftAction: 'DeleteDraftAction' },
  }, hooks().react);
}

test('Map is an accessible option beside existing collections on own and public profiles; existing options keep their order', () => {
  const { ProfileCollections, ProfileTabs } = profileUi(); let selected;
  const tiles = all(ProfileCollections({ publishedCount: 2, draftCount: 1, savedCount: null, selected: 'map', onSelect: v => { selected = v; } }), 'Pressable');
  assert.deepEqual(tiles.map(n => n.props.accessibilityLabel), ['Published journeys, 2', 'Private saved journeys, count unavailable', 'Private drafts, 1', 'Travel map of published journey stops']);
  assert.deepEqual(tiles.map(n => n.props.accessibilityState.selected), [false, false, false, true]);
  assert.equal(all(tiles[3], 'Feather')[0].props.name, 'map'); tiles[3].props.onPress(); assert.equal(selected, 'map');
  const visitor = all(ProfileTabs({ selected: 'published', onSelect: v => { selected = v; } }), 'Pressable');
  assert.deepEqual(visitor.map(n => n.props.accessibilityLabel), ['Published journeys', 'Travel map of published journey stops'], 'Visitors never get Drafts');
  visitor[1].props.onPress(); assert.equal(selected, 'map');
  const ownerTabs = all(ProfileTabs({ selected: 'map', drafts: true, onSelect() {} }), 'Pressable');
  assert.deepEqual(ownerTabs.map(n => n.props.accessibilityLabel), ['Published journeys', 'Private drafts', 'Travel map of published journey stops']);
  assert.equal(ownerTabs[2].props.accessibilityState.selected, true);
});

function accountScreen() {
  const h = hooks(); const states = [];
  const make = data => { const state = { data, loading: false, refreshing: false, error: null, refreshCount: 0, retry() {} }; state.refresh = () => { state.refreshCount++; }; return state; };
  const drafts = make([{ id: 'draft', title: 'Private draft' }]), published = make({ profile: null, journeys: [{ id: jid(1), title: 'Published', stops: [] }] }), saved = make([]);
  let calls = 0, focus, foreground;
  const components = Object.fromEntries(['ProfileHeader', 'ProfileIdentity', 'ProfileCollections', 'ProfileDraftCard', 'ProfileJourneyCard'].map(n => [n, n])); components.profileStyles = {};
  // Screen-level AppState listener for this harness (registered when focus runs).
  native.AppState = { addEventListener: (_n, fn) => { foreground = fn; return { remove() {} }; } };
  const { default: Screen } = load('src/app/account.tsx', {
    'expo-router': { useLocalSearchParams: () => ({}), useRouter: () => ({ push() {}, setParams() {} }), useFocusEffect: fn => { focus = fn; } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/components/discovery/ui': ui, '@/components/profile/profile-ui': components,
    '@/components/profile/profile-connections': { ProfileConnections: 'ProfileConnections' }, '@/components/profile/profile-memory-map': { ProfileMemoryMap: 'ProfileMemoryMap' },
    '@/components/buddy/travel-preferences-settings': { TravelPreferencesSettings: 'TravelPreferencesSettings' },
    '@/hooks/use-journey-buddy': { useBuddyScreen() {}, useBuddyGreetingsReset: () => () => {}, useBuddyPreference: () => ({ loaded: true, enabled: false }) },
    '@/hooks/session-context': { useSessionState: () => ({ loading: false, error: null, session: { access_token: 't', user: { id: owner, user_metadata: {} } } }) },
    '@/hooks/action-intent': { useActionIntent: () => ({ cancel() {} }) },
    '@/hooks/use-load': { useLoad: () => { const state = [drafts, published, saved][calls++ % 3]; states.push(state); return state; } },
    '@/lib/remix/queries': { loadPrivateDrafts: async () => [], withDraftSources: rows => rows }, '@/hooks/use-draft-credits': { useDraftCredits: () => new Map() },
    '@/lib/profile/queries': { loadPublishedProfileJourneys: async () => [] }, '@/lib/profile/edit-queries': { loadOwnProfile: async () => ({}) },
    '@/lib/discovery/model': { safePhoto: () => null }, '@/lib/auth/queries': { signOutAccount: async () => {} },
    '@/lib/create/recovery-store': { creationRecovery: { clearUser: async () => {} } }, '@/lib/journey/trip-recovery-store': { tripPersistence: { clearUser: async () => {} } },
    '@/lib/social/saved-queries': { loadSavedJourneys: async () => [] },
  }, h.react);
  return { render: () => h.render(Screen), drafts, published, focus: () => focus, foreground: state => foreground(state) };
}

test('Account Map tab swaps the grid for the owner map (published-only component), keeps header/grid key and follows profile refreshes', () => {
  const a = accountScreen();
  let list = all(a.render(), 'FlatList')[0];
  assert.equal(list.props.data[0].kind, 'published'); assert.equal(all(list, 'ProfileMemoryMap').length, 0, 'Map loads lazily, only when selected');
  all(list.props.ListHeaderComponent, 'ProfileCollections')[0].props.onSelect('map');
  list = all(a.render(), 'FlatList')[0];
  assert.deepEqual(list.props.data, []); assert.equal(list.props.key, 'journey-grid-3', 'Header/connections do not remount'); assert.equal(list.props.numColumns, 3);
  const map = list.props.ListEmptyComponent;
  assert.equal(map.type, 'ProfileMemoryMap'); assert.equal(map.props.ownerId, owner); assert.equal(map.props.owner, true); assert.equal(map.key, owner);
  assert.equal(all(list.props.ListHeaderComponent, 'Text').some(n => n.props.children === 'Travel map'), false, 'No heading band between tabs and atlas');
  assert.equal(map.props.fullBleed, true, 'Map reaches both sides of the Account viewport');
  const key = map.props.refreshKey, reload = map.props.reloadKey;
  const published = a.published.refreshCount;
  list.props.refreshControl.props.onRefresh(); list = all(a.render(), 'FlatList')[0];
  assert.equal(list.props.ListEmptyComponent.props.reloadKey, reload + 1, 'Pull-to-refresh forces a fresh map'); assert.equal(a.published.refreshCount, published + 1, 'and the published list');
  a.focus()(); list = all(a.render(), 'FlatList')[0]; assert.equal(list.props.ListEmptyComponent.props.refreshKey, key + 1, 'Focus is a soft map refresh');
  assert.equal(list.props.ListEmptyComponent.props.reloadKey, reload + 1);
  a.foreground('active'); list = all(a.render(), 'FlatList')[0]; assert.equal(list.props.ListEmptyComponent.props.reloadKey, reload + 2, 'Foreground forces a fresh map');
  const draftRefreshes = a.drafts.refreshCount; a.foreground('background'); a.render(); assert.equal(a.drafts.refreshCount, draftRefreshes);
  all(list.props.ListHeaderComponent, 'ProfileCollections')[0].props.onSelect('drafts');
  list = all(a.render(), 'FlatList')[0]; assert.equal(list.props.data[0].kind, 'draft'); assert.equal(list.props.numColumns, 1, 'Drafts unchanged');
});

test('Account map fills measured content below its header, removes Map footer and pauses when scrolled offscreen', () => {
  const a = accountScreen();let tree = a.render(), list = all(tree, 'FlatList')[0];
  all(list.props.ListHeaderComponent, 'ProfileCollections')[0].props.onSelect('map');tree = a.render();list = all(tree, 'FlatList')[0];
  const viewport = all(tree, 'View').find(node => node.props.onLayout && node.props.style?.flex === 1 && node.props.style.minHeight === 0);
  viewport.props.onLayout({ nativeEvent: { layout: { height: 700 } } });
  list.props.ListHeaderComponent.props.onLayout({ nativeEvent: { layout: { height: 480 } } });list = all(a.render(), 'FlatList')[0];
  assert.equal(list.props.ListEmptyComponent.props.mapHeight, 214);assert.equal(list.props.ListFooterComponent, null);
  assert.equal(Object.assign({}, ...list.props.contentContainerStyle).paddingBottom, 0);
  assert.equal(all(a.render(), 'FlatList')[0].props.ListEmptyComponent.props.onScreen, true);
  list.props.ListHeaderComponent.props.onLayout({ nativeEvent: { layout: { height: 900 } } });a.render();list = all(a.render(), 'FlatList')[0];
  assert.equal(list.props.ListEmptyComponent.props.mapHeight, 160, 'Existing short/large-text scrolling retains a usable map minimum');assert.equal(list.props.ListEmptyComponent.props.onScreen, false);
  list.props.onScroll({ nativeEvent: { contentOffset: { y: 300 } } });list = all(a.render(), 'FlatList')[0];assert.equal(list.props.ListEmptyComponent.props.onScreen, true);
  list.props.onScroll({ nativeEvent: { contentOffset: { y: 1200 } } });list = all(a.render(), 'FlatList')[0];assert.equal(list.props.ListEmptyComponent.props.onScreen, false);
});

test('public profile Map tab shows the creator map for every viewer; Drafts still routes owners to Account', () => {
  const routes = []; let viewer = null; const h = hooks();
  const state = { data: { profile: { id: owner, username: 'creator', displayName: 'Creator', avatar: null, bio: null }, journeys: [{ id: jid(1) }] }, loading: false, refreshing: false, error: null, refresh() { profileRefreshes++; }, retry() {} };
  let profileRefreshes = 0;
  let focus;
  const { default: Screen } = load('src/app/profile/[username].tsx', {
    'expo-router': { useFocusEffect: fn => { focus = fn; }, useRouter: () => ({ push: r => routes.push(r) }), useLocalSearchParams: () => ({ username: 'creator' }) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/components/discovery/ui': ui, '@/components/branded-loading': { BrandedLoading: 'BrandedLoading' },
    '@/components/profile/profile-ui': { ProfileHeader: 'ProfileHeader', ProfileIdentity: 'ProfileIdentity', ProfileJourneyCard: 'JourneyCard', ProfileTabs: 'ProfileTabs', profileStyles: {} },
    '@/components/profile/profile-connections': { ProfileConnections: 'ProfileConnections' }, '@/components/profile/profile-memory-map': { ProfileMemoryMap: 'ProfileMemoryMap' },
    '@/hooks/use-journey-buddy': { useBuddyScreen() {} }, '@/hooks/session-context': { useSessionState: () => ({ session: viewer ? { user: { id: viewer } } : null }) },
    '@/hooks/use-load': { useLoad: () => state }, '@/lib/profile/queries': { loadPublicProfile() {} },
  }, h.react);
  for (viewer of [null, other, owner]) {
    let list = all(h.render(Screen), 'FlatList')[0];
    let tabs = all(list.props.ListHeaderComponent, 'ProfileTabs')[0];
    assert.equal(tabs.props.selected, 'published'); assert.equal(list.props.data.length, 1);
    tabs.props.onSelect('map'); list = all(h.render(Screen), 'FlatList')[0];
    assert.deepEqual(list.props.data, []); const map = list.props.ListEmptyComponent;
    assert.equal(map.type, 'ProfileMemoryMap'); assert.equal(map.props.ownerId, owner, 'Same profile owner data for every viewer'); assert.equal(map.props.owner, viewer === owner);
    const key = map.props.refreshKey, reload = map.props.reloadKey, before = profileRefreshes; list.props.refreshControl.props.onRefresh(); focus();
    assert.equal(profileRefreshes, before + 2, 'Profile refreshes with its map');
    list = all(h.render(Screen), 'FlatList')[0];
    assert.equal(list.props.ListEmptyComponent.props.refreshKey, key + 1, 'Focus: soft'); assert.equal(list.props.ListEmptyComponent.props.reloadKey, reload + 1, 'Pull: forced');
    tabs = all(list.props.ListHeaderComponent, 'ProfileTabs')[0]; assert.equal(tabs.props.selected, 'map');
    tabs.props.onSelect('drafts'); assert.equal(routes.length, viewer === owner ? 1 : 0);
    tabs.props.onSelect('published'); list = all(h.render(Screen), 'FlatList')[0]; assert.equal(list.props.data.length, 1, 'Journeys grid returns unchanged');
  }
  assert.deepEqual(routes, [{ pathname: '/account', params: { collection: 'drafts' } }]);
});

test('Story honors a valid stop param only; absent/invalid params keep existing entry behavior', () => {
  const params = { id: jid(1) };
  const state = { data: { id: jid(1), title: 'Story', stops: [] }, loading: false, refreshing: false, error: null, refresh() {}, retry() {} };
  const stub = new Proxy({}, { get: (_t, key) => key === '__esModule' ? false : String(key) });
  const h = hooks();
  const { default: Screen } = load('src/app/journey/[id].tsx', new Proxy({
    'expo-router': { Stack: { Screen: 'StackScreen' }, useLocalSearchParams: () => params, useRouter: () => ({}), useFocusEffect() {} },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/hooks/use-load': { useLoad: () => state }, '@/components/discovery/ui': ui,
  }, { has: () => true, get: (target, key) => target[key] ?? stub }), h.react);
  const content = () => all(h.render(Screen), 'SafeAreaView')[0].props.children.props.children[1];
  assert.equal(content().props.initialStop, undefined, 'Absent param: unchanged Story entry');
  for (const invalid of ['first', '', [sid(1, 1)], sid(1, 1) + 'x']) { params.stop = invalid; assert.equal(content().props.initialStop, undefined); }
  params.stop = sid(1, 1); assert.equal(content().props.initialStop, sid(1, 1));
  const source = readFileSync('src/app/journey/[id].tsx', 'utf8');
  assert.match(source, /useState<string \| null>\(feed\?\.initialStop \|\| initialStop \|\| null\)/, 'Feed entry keeps precedence; selection still goes through selectedStopId fallback');
  assert.match(source, /const selectedId = selectedStopId\(journey\.stops, requestedId\);/);
});
