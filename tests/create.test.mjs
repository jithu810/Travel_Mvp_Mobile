import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const output = mkdtempSync(join(tmpdir(), 'journey-create-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/create/id.ts', 'src/lib/create/model.ts', 'src/lib/create/places.ts', 'src/lib/create/queries.ts', 'src/lib/journey/map-data.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, types: ['node'], esModuleInterop: true,
  outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
const diagnostics = ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const require = createRequire(import.meta.url);
const model = require(join(output, 'lib/create/model.js'));
const places = require(join(output, 'lib/create/places.js'));
const { buildMapData } = require(join(output, 'lib/journey/map-data.js'));
const id = '11111111-1111-4111-8111-111111111111', uid = '22222222-2222-4222-8222-222222222222', stopId = '33333333-3333-4333-8333-333333333333', secondId = '44444444-4444-4444-8444-444444444444';
const place = { name: 'Selected town', label: 'Selected town, Region', latitude: 0, longitude: 0, mapboxId: 'mapbox.test' };
const valid = () => ({ ...model.newForm(id), title: ' Journey ', destination: { ...place }, traveler: 'solo', days: '3', stops: model.addStop([], place, stopId) });
test('creation requires title, a real selected destination, traveler type and bounded duration', () => {
  assert.equal(model.validateForm(valid(), 'draft'), null);
  for (const patch of [{ title: '' }, { title: 'x'.repeat(201) }, { destination: null }, { destination: { ...place, latitude: NaN } }, { traveler: '' }, { days: '' }, { days: '366' }, { days: '0' }, { days: '1.2' }, { description: 'x'.repeat(5001) }]) assert.ok(model.validateForm({ ...valid(), ...patch }, 'draft'));
});
test('private drafts may have zero stops or paired null coordinates; publishing requires located stops', () => {
  const form = valid(); form.stops = [];
  assert.equal(model.validateForm(form, 'draft'), null); assert.match(model.validateForm(form, 'published'), /at least one stop/);
  form.stops = [{ ...valid().stops[0], latitude: null, longitude: null }];
  assert.equal(model.validateForm(form, 'draft'), null); assert.match(model.validateForm(form, 'published'), /valid coordinates/);
  form.stops[0].longitude = 0; assert.ok(model.validateForm(form, 'draft'));
});
test('ratings retain zero and fractional values; days may repeat but must fit duration', () => {
  const form = valid(); form.stops = [{ ...form.stops[0], day: '2', rating: '0' }, { ...form.stops[0], id: secondId, day: '2', rating: '4.5' }];
  assert.equal(model.validateForm(form, 'published'), null);
  assert.deepEqual(model.savePayload(form, 'published').stops.map(stop => [stop.day_number, stop.rating]), [[2,0],[2,4.5]]);
  for (const patch of [{ day: '4' }, { day: '0' }, { day: '1.5' }, { rating: '-1' }, { rating: '5.1' }, { rating: 'bad' }, { description: 'x'.repeat(1001) }, { name: '' }]) assert.ok(model.validateForm({ ...form, stops: [{ ...form.stops[0], ...patch }] }, 'draft'));
});
test('stop addition refuses duplicate locations and place IDs; order changes preserve content and IDs', () => {
  const stops = model.addStop([], place, stopId);
  assert.equal(model.addStop(stops, { ...place, name: 'Renamed' }, secondId), stops);
  assert.equal(model.addStop(stops, { ...place, longitude: 1 }, secondId), stops);
  const two = model.addStop(stops, { ...place, name: 'Second', longitude: 1, mapboxId: 'second' }, secondId);
  const before = JSON.stringify(two), reordered = model.moveStop(two, 1, -1);
  assert.deepEqual(reordered.map(stop => stop.id), [secondId, stopId]); assert.equal(JSON.stringify(two), before);
  assert.equal(model.moveStop(two, 0, -1), two);
  assert.deepEqual(model.savePayload({ ...valid(), stops: reordered }, 'draft').stops.map(stop => [stop.id, stop.sequence]), [[secondId,1],[stopId,2]]);
  assert.equal(model.addStop(Array.from({ length: 50 }, () => stops[0]), { ...place, longitude: 2, mapboxId: 'third' }, secondId).length, 50);
});
test('save payload contains only established fields, stable UUIDs, exact order and null optional metadata', () => {
  const form = valid(); const before = JSON.stringify(form);
  const payload = model.savePayload(form, 'draft');
  assert.equal(payload.id, id); assert.equal(payload.status, 'draft'); assert.equal(payload.updated_at, null);
  assert.equal(payload.title, 'Journey'); assert.equal(payload.destination_latitude, 0); assert.equal(payload.destination_longitude, 0);
  assert.equal(payload.cover_image_path, null); assert.equal(payload.stops[0].mapbox_place_id, place.mapboxId);
  assert.equal(payload.stops[0].photo_path, null); assert.equal(payload.user_id, undefined); assert.equal(payload.copied_from_journey_id, undefined);
  assert.equal(payload.likes, undefined); assert.equal(JSON.stringify(form), before);
  assert.equal(model.savePayload(form, 'draft').id, payload.id);
});
test('duplicate/invalid stop IDs and stop limits are rejected before saving', () => {
  for (const stops of [[valid().stops[0], valid().stops[0]], [{ ...valid().stops[0], id: 'bad' }], Array.from({ length: 51 }, () => valid().stops[0])]) assert.ok(model.validateForm({ ...valid(), stops }, 'draft'));
});
test('preview uses planned order and breaks lines around missing locations', () => {
  const stops = [{ ...valid().stops[0], longitude: 1 }, { ...valid().stops[0], id: secondId, name: 'Unlocated', latitude: null, longitude: null }, { ...valid().stops[0], id: uid, longitude: 2 }];
  const geometry = buildMapData(model.previewStops(stops));
  assert.deepEqual(geometry.markers.map(marker => marker.number), [1,3]);
  assert.equal(geometry.missing, 1); assert.equal(geometry.line.geometry.coordinates.length, 0);
  const reverse = model.moveStop(stops, 2, -1);
  assert.equal(buildMapData(model.previewStops(reverse)).line.geometry.coordinates.length, 1);
});
test('Mapbox normalization uses actual longitude/latitude and available place IDs, rejecting invalid features', () => {
  const feature = { id: 'fallback', geometry: { coordinates: [22,11] }, properties: { name: 'Town', full_address: 'Town, Region', mapbox_id: 'mapbox.real' } };
  assert.deepEqual(places.normalizePlace(feature), { name: 'Town', label: 'Town, Region', longitude: 22, latitude: 11, mapboxId: 'mapbox.real' });
  for (const geometry of [{ coordinates: [181,11] }, { coordinates: [22,91] }, { coordinates: ['22',11] }, {}]) assert.equal(places.normalizePlace({ ...feature, geometry }), null);
  assert.equal(places.normalizePlace({ ...feature, properties: {} }), null);
});
test('place transport requests permanent v6 search with real proximity and destination types', async () => {
  let requested;
  const result = await places.searchPlaces('Town', true, place, new AbortController().signal, 'pk.synthetic-test', async url => {
    requested = new URL(url); return { ok: true, json: async () => ({ features: [{ id: 'real', geometry: { coordinates: [22,11] }, properties: { name: 'Town' } }] }) };
  });
  assert.equal(requested.origin, 'https://api.mapbox.com'); assert.equal(requested.pathname, '/search/geocode/v6/forward');
  assert.equal(requested.searchParams.get('permanent'), 'true'); assert.equal(requested.searchParams.get('proximity'), '0,0');
  assert.match(requested.searchParams.get('types'), /place/); assert.equal(result[0].latitude, 11);
});
test('search rejects missing token, invalid queries and failed/malformed transport without invented places', async () => {
  let requests = 0;
  const request = async () => { requests++; throw new Error('unexpected'); };
  for (const query of ['ab', 'bad;query', 'x'.repeat(201), Array(21).fill('word').join(' ')]) await assert.rejects(() => places.searchPlaces(query, false, null, new AbortController().signal, 'pk.synthetic-test', request));
  await assert.rejects(() => places.searchPlaces('Town', false, null, new AbortController().signal, '', request)); assert.equal(requests, 0);
  await assert.rejects(() => places.searchPlaces('Town', false, null, new AbortController().signal, 'pk.synthetic-test', async () => ({ ok: false })));
  await assert.rejects(() => places.searchPlaces('Town', false, null, new AbortController().signal, 'pk.synthetic-test', async () => ({ ok: true, json: async () => ({}) })));
});
const saved = { id, status: 'draft', updated_at: '2026-10-09T10:00:00Z' };
test('save validates before mutation, locks rapid presses and carries the confirmed version into later saves', async () => {
  let resolve, calls = 0; const pending = new Promise(done => { resolve = done; });
  const controller = model.createSaveController(async payload => { calls++; assert.equal(payload.id, id); return pending; });
  assert.equal((await controller.save(model.newForm(id), 'draft')).kind, 'error'); assert.equal(calls, 0);
  const first = controller.save(valid(), 'draft');
  assert.equal((await controller.save(valid(), 'published')).kind, 'blocked'); resolve(saved);
  assert.equal((await first).kind, 'saved'); assert.equal(calls, 1); assert.equal(controller.getResult().updated_at, saved.updated_at);
});
test('safe failures allow retry with unchanged IDs; ambiguous failures block repeat writes and preserve form', async () => {
  const form = valid(), before = JSON.stringify(form); let fail = true;
  const controller = model.createSaveController(async () => { if (fail) throw new model.SaveFailure('Rejected'); return saved; });
  assert.equal((await controller.save(form, 'draft')).kind, 'error'); fail = false;
  assert.equal((await controller.save(form, 'draft')).kind, 'saved'); assert.equal(JSON.stringify(form), before);
  let calls = 0; const uncertain = model.createSaveController(async () => { calls++; throw new model.SaveFailure('Unconfirmed', true); });
  await uncertain.save(form, 'published'); assert.equal((await uncertain.save(form, 'draft')).kind, 'blocked'); assert.equal(calls, 1);
});
const calls = []; let viewer = uid, failure = null, response = saved;
const client = { auth: { getUser: async () => ({ data: { user: viewer ? { id: viewer } : null }, error: null }) },
  rpc: (name, args) => ({ abortSignal: async signal => { assert.equal(signal.aborted, false); calls.push([name, args]); return { data: response, error: failure }; } }) };
require.cache[join(output, 'lib/supabase/client.js')] = { exports: { supabase: client } };
const { saveNewJourney } = require(join(output, 'lib/create/queries.js'));
test('repository reuses one atomic save_journey RPC and confirms draft/publication responses', async () => {
  calls.length = 0; const payload = model.savePayload(valid(), 'draft'); const before = JSON.stringify(payload);
  assert.deepEqual(await saveNewJourney(payload, uid), saved); assert.deepEqual(calls[0], ['save_journey', { payload }]); assert.equal(JSON.stringify(payload), before);
  response = { ...saved, status: 'published' }; assert.equal((await saveNewJourney(model.savePayload(valid(), 'published'), uid)).status, 'published'); response = saved;
});
test('repository rejects signed-out/different users before any save', async () => {
  for (viewer of [null, id]) { calls.length = 0; await assert.rejects(() => saveNewJourney(model.savePayload(valid(), 'draft'), uid)); assert.equal(calls.length, 0); }
  viewer = uid;
});
test('repository never claims mismatched or incomplete save success and classifies SQL versus unknown failures', async () => {
  const payload = model.savePayload(valid(), 'draft');
  for (response of [{ ...saved, id: stopId }, { ...saved, status: 'published' }, { ...saved, updated_at: null }]) await assert.rejects(() => saveNewJourney(payload, uid), error => error.uncertain === true);
  response = saved;
  for (const [code, uncertain] of [['22023',false],['42501',false],['40001',true],['',true],['PGRST000',true]]) { failure = { code }; await assert.rejects(() => saveNewJourney(payload, uid), error => error.uncertain === uncertain); }
  failure = null;
});
test('entry, auth return, private/public routes and existing map reuse remain explicit', () => {
  const screen = readFileSync('src/app/create.tsx', 'utf8');
  assert.ok(screen.includes("context: 'create'")); assert.ok(screen.includes('prompted.current = true'));
  assert.ok(screen.includes("result.saved.status === 'draft' ? '/draft/[id]' : '/journey/[id]'"));
  assert.ok(screen.includes('<JourneyMap stops={stops}')); assert.ok(screen.includes('key={auth.session.user.id}'));
  assert.ok(screen.includes('if (publishedId) return')); assert.ok(readFileSync('src/app/discover.tsx', 'utf8').includes('accessibilityLabel="Create Journey"'));
});

test('secure UUIDs are new valid v4 IDs; cancelled saves never reach the RPC', async () => {
  const { randomUUID } = require(join(output, 'lib/create/id.js'));
  const first = randomUUID(), second = randomUUID();
  assert.notEqual(first, second); assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  const cancelled = new AbortController(); cancelled.abort(); calls.length = 0;
  await assert.rejects(() => saveNewJourney(model.savePayload(valid(), 'draft'), uid, cancelled.signal), error => !error.uncertain);
  assert.equal(calls.length, 0);
  assert.ok(readFileSync('src/lib/create/id.native.ts', 'utf8').includes('requireOptionalNativeModule'));
});
