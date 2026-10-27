import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { buddyGeometryStub } from './helpers/buddy-geometry-stub.mjs';

// Synthetic IDs and fixtures only; no network or hosted data.
const output = mkdtempSync(join(tmpdir(), 'journey-remix-attribution-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/remix/model.ts', 'src/lib/remix/queries.ts', 'src/lib/create/editor-model.ts', 'src/lib/create/photo-save.ts', 'src/lib/discovery/model.ts', 'src/lib/discovery/queries.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, types: ['node'], esModuleInterop: true,
  outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
const diagnostics = ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const require = createRequire(import.meta.url);
const remix = require(join(output, 'lib/remix/model.js'));
const editorModel = require(join(output, 'lib/create/editor-model.js'));
const createModel = require(join(output, 'lib/create/model.js'));
const discovery = require(join(output, 'lib/discovery/model.js'));
const uid = '22222222-2222-4222-8222-222222222222', draftId = '33333333-3333-4333-8333-333333333333';
const sourceId = '11111111-1111-4111-8111-111111111111', plainId = '55555555-5555-4555-8555-555555555555';
const otherSource = '66666666-6666-4666-8666-666666666666', goneSource = '77777777-7777-4777-8777-777777777777';

test('remix credit copy names the direct parent title and author and keeps the unavailable text', () => {
  assert.equal(remix.remixCredit('Remix of', { title: 'Backwaters', creatorName: 'Asha' }), 'Remix of Backwaters · by Asha');
  assert.equal(remix.remixCredit('Remixed from', { title: 'Backwaters', creatorName: 'Asha' }), 'Remixed from Backwaters · by Asha');
  assert.equal(remix.remixCredit('Remixed from', { title: 'Backwaters', creatorName: '' }), 'Remixed from Backwaters');
  assert.equal(remix.remixCredit('Remix of', null), 'Remixed from an original journey that is currently unavailable.');
  assert.equal(remix.draftRemixCredit({ title: 'Backwaters', creatorName: 'Asha' }), 'Remix of Backwaters · by Asha');
  assert.equal(remix.draftRemixCredit(null), remix.unavailableSourceCopy, 'Not public any more');
  assert.equal(remix.draftRemixCredit(undefined), 'Remix of another journey', 'Lookup skipped or failed');
});

test('photo hint shows only for remix drafts whose places all lack saved and local photos', () => {
  const stops = [{ id: 'a', photoPath: null }, { id: 'b' }];
  assert.equal(remix.needsRemixPhotoHint(sourceId, stops, []), true);
  assert.equal(remix.needsRemixPhotoHint(undefined, stops, []), false, 'Own journeys never show the remix hint');
  assert.equal(remix.needsRemixPhotoHint(sourceId, [], []), false, 'No places, nothing to photograph yet');
  assert.equal(remix.needsRemixPhotoHint(sourceId, [{ id: 'a', photoPath: 'journey-media/u/j/stops/s/p.jpg' }, { id: 'b' }], []), false);
  assert.equal(remix.needsRemixPhotoHint(sourceId, stops, ['b']), false, 'A local unsaved photo also counts');
  assert.equal(remix.needsRemixPhotoHint(sourceId, stops, ['cover']), true, 'A cover photo is not a place photo');
  assert.equal(remix.remixPhotoHint, 'Add your own photos — places show a map until you do.');
});

test('mapLimited bounds concurrency and keeps input order', async () => {
  let active = 0, peak = 0;
  const result = await remix.mapLimited([5, 1, 4, 2, 3], 2, async value => { active++; peak = Math.max(peak, active); await new Promise(r => setTimeout(r, value)); active--; return value * 10; });
  assert.deepEqual(result, [50, 10, 40, 20, 30]); assert.equal(peak, 2);
  assert.deepEqual(await remix.mapLimited([], 3, async () => 1), []);
});

const version = '2026-10-25T10:00:00.000Z';
const draftRow = { id: draftId, user_id: uid, title: 'Remix', description: null, destination_slug: 'kochi', destination_name: 'Kochi', destination_latitude: 9.97, destination_longitude: 76.28,
  traveler_type: 'solo', duration_days: 2, cover_image_path: null, status: 'draft', is_demo: false, updated_at: version, copied_from_journey_id: sourceId };
const stopRows = [{ id: '44444444-4444-4444-8444-444444444444', journey_id: draftId, sequence: 1, name: 'Fort', description: '', latitude: 9.96, longitude: 76.24, mapbox_place_id: null, photo_path: null, rating: null, day_number: null }];
test('editor hydration exposes lineage for display only and never sends it on save', () => {
  const form = editorModel.hydrateDraft(draftRow, stopRows, draftId, uid);
  assert.equal(form.sourceId, sourceId);
  const payload = createModel.savePayload(form, 'published');
  assert.equal(payload.copied_from_journey_id, undefined); assert.equal(payload.sourceId, undefined);
  assert.equal(payload.cover_image_path, null); assert.equal(payload.stops[0].photo_path, null);
  assert.equal(createModel.validateForm(form, 'published'), null, 'Photos stay optional for publishing a remix');
  for (const value of [null, undefined, 'not-a-uuid', 7, draftId]) assert.equal('sourceId' in editorModel.hydrateDraft({ ...draftRow, copied_from_journey_id: value }, stopRows, draftId, uid), false, String(value));
  assert.ok(readFileSync('src/lib/create/queries.ts', 'utf8').includes(',updated_at,copied_from_journey_id\')'), 'The editor select reads lineage');
});

test('credit and photo hint survive a Save draft round trip; lineage is never in any payload', async () => {
  const { createPhotoSaveController } = require(join(output, 'lib/create/photo-save.js'));
  const payloads = []; let saves = 0;
  const metadata = createModel.createSaveController(async payload => { payloads.push(payload); saves++; return { id: payload.id, status: payload.status, updated_at: '2026-10-25T11:0' + saves + ':00.000Z' }; });
  const controller = createPhotoSaveController({ save: metadata.save, checkDraft: async () => { throw new Error('No photos in this test'); }, upload: async () => { throw new Error('No uploads'); }, uuid: () => plainId });
  const hydrated = editorModel.hydrateDraft(draftRow, stopRows, draftId, uid);
  const edited = { ...hydrated, title: 'My remix', stops: hydrated.stops.map(stop => ({ ...stop, description: 'Edited note' })) };
  const first = await controller.save(edited, 'draft', {}, new AbortController().signal);
  assert.equal(first.kind, 'saved');
  assert.equal(first.form.sourceId, sourceId, 'The saved checkpoint keeps the credit');
  assert.equal(remix.needsRemixPhotoHint(first.form.sourceId, first.form.stops, []), true, 'The hint still shows after saving');
  const second = await controller.save({ ...first.form, title: 'Again' }, 'draft', {}, new AbortController().signal);
  assert.equal(second.form.sourceId, sourceId); assert.equal(second.form.updatedAt, '2026-10-25T11:02:00.000Z');
  // A fresh load after saving (the server never rewrites lineage) hydrates the same credit.
  const reloaded = editorModel.hydrateDraft({ ...draftRow, title: 'Again', updated_at: second.form.updatedAt }, stopRows, draftId, uid);
  assert.equal(reloaded.sourceId, sourceId);
  assert.equal(payloads.length, 2);
  for (const payload of payloads) { assert.equal('sourceId' in payload, false); assert.equal('copied_from_journey_id' in payload, false); assert.ok(!JSON.stringify(payload).includes(sourceId)); }
});

test('published detail carries a valid, distinct direct parent id only', () => {
  const card = { id: plainId, title: 'T', description: '', destination: 'Kochi', destinationSlug: 'kochi', creatorName: 'A', creatorUsername: null, travelerType: 'solo', durationDays: 1, likes: 0, cover: null, stops: [] };
  const row = { id: plainId, status: 'published', is_demo: false, stops: [] };
  assert.equal(discovery.normalizePublicDetail({ ...row, copied_from_journey_id: sourceId }, card).sourceId, sourceId);
  for (const value of [null, '', 'bad', plainId]) assert.equal('sourceId' in discovery.normalizePublicDetail({ ...row, copied_from_journey_id: value }, card), false, String(value));
});

// Public card lookup through the isolated anonymous client stub.
const publicCalls = []; let publicFailure = new Set(), publicActive = 0, publicPeak = 0, publicHang = false, publicAborted = 0;
const publicRow = (id, title, creator) => ({ id, title, description: '', destination_slug: 'kochi', destination_name: 'Kochi', traveler_type: 'solo', duration_days: 1, is_demo: false, creator_name: creator, likes_count: 0, cover_image_path: 'journey-media/a/b/cover/c.jpg', stops: [] });
const publicClient = {
  rpc: (name, args) => ({ abortSignal: async signal => {
    publicCalls.push([name, args]); publicActive++; publicPeak = Math.max(publicPeak, publicActive);
    if (publicHang) { try { await new Promise((_resolve, reject) => { if (signal.aborted) reject(new Error('aborted')); signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }); }); } finally { publicActive--; publicAborted++; } }
    await new Promise(r => setTimeout(r, 2)); publicActive--;
    assert.equal(signal.aborted, false);
    if (publicFailure.has(args?.journey_filter)) return { data: null, error: { code: 'PGRST000' } };
    const rows = { [sourceId]: [publicRow(sourceId, 'Backwaters', 'Asha')], [otherSource]: [publicRow(otherSource, 'Hills', 'Ravi')] }[args?.journey_filter] || [];
    return { data: rows, error: null };
  } }),
  storage: { from: () => { throw new Error('Card lookups must not sign photos'); } },
};
require.cache[join(output, 'lib/supabase/public.js')] = { exports: { publicSupabase: publicClient } };
const discoveryQueries = require(join(output, 'lib/discovery/queries.js'));
test('loadPublicJourneyCard reads one public card: no detail RPC and no photo signing', async () => {
  publicCalls.length = 0;
  const card = await discoveryQueries.loadPublicJourneyCard(sourceId, new AbortController().signal);
  assert.equal(card.title, 'Backwaters'); assert.equal(card.creatorName, 'Asha'); assert.equal(card.cover, 'journey-media/a/b/cover/c.jpg', 'Raw path, never signed');
  assert.deepEqual(publicCalls, [['get_public_journeys', { journey_filter: sourceId }]]);
  assert.equal(await discoveryQueries.loadPublicJourneyCard(goneSource, new AbortController().signal), null);
  assert.equal(await discoveryQueries.loadPublicJourneyCard('bad', new AbortController().signal), null);
  publicFailure = new Set([sourceId]); await assert.rejects(discoveryQueries.loadPublicJourneyCard(sourceId, new AbortController().signal)); publicFailure = new Set();
  const source = readFileSync('src/components/remix/source-attribution.tsx', 'utf8');
  assert.ok(source.includes('loadPublicJourneyCard(id, signal)') && !/loadPublicJourney\(/.test(source), 'Attribution uses the lightweight lookup everywhere');
});

// Private drafts list: RPC rows, one owner-scoped lineage read, bounded parent lookups.
const reads = []; let lineage = { data: [], error: null }; let lineageThrows = false; let draftRows = [];
const client = {
  auth: { getUser: async () => ({ data: { user: { id: uid } }, error: null }) },
  rpc: (name, args) => ({ abortSignal: async () => { reads.push(['rpc', name, args]); return { data: draftRows, error: null }; } }),
  from: table => {
    if (lineageThrows) throw new Error('offline');
    const entry = { table, filters: [] }; reads.push(entry);
    const query = { select(columns) { entry.columns = columns; return query; }, eq(key, value) { entry.filters.push([key, value]); return query; }, abortSignal: async () => lineage };
    return query;
  },
};
require.cache[join(output, 'lib/supabase/client.js')] = { exports: { supabase: client } };
const queries = require(join(output, 'lib/remix/queries.js'));
const draft = (id, title) => ({ id, title, creator_id: uid, status: 'draft', is_demo: false });
test('Account drafts credit the direct parent by title and author with distinct, capped, concurrent lookups', async () => {
  reads.length = 0; publicCalls.length = 0; publicPeak = 0;
  const second = '99999999-9999-4999-8999-999999999999', third = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fourth = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  draftRows = [draft(draftId, 'Remix'), draft(second, 'Remix again'), draft(third, 'Gone'), draft(fourth, 'Flaky'), draft(plainId, 'Own')];
  lineage = { data: [{ id: draftId, copied_from_journey_id: sourceId }, { id: second, copied_from_journey_id: sourceId }, { id: third, copied_from_journey_id: goneSource },
    { id: fourth, copied_from_journey_id: otherSource }, { id: plainId, copied_from_journey_id: null }], error: null };
  const list = await queries.loadPrivateDrafts(uid, new AbortController().signal, { lineage: true });
  assert.deepEqual(list, [{ id: draftId, title: 'Remix', sourceId }, { id: second, title: 'Remix again', sourceId }, { id: third, title: 'Gone', sourceId: goneSource },
    { id: fourth, title: 'Flaky', sourceId: otherSource }, { id: plainId, title: 'Own' }]);
  assert.equal(publicCalls.length, 0, 'The list itself never waits for parent lookups');
  publicFailure = new Set([otherSource]);
  const cards = await queries.loadDraftSourceCards(list.flatMap(item => item.sourceId ? [item.sourceId] : []), new AbortController().signal);
  publicFailure = new Set();
  const result = queries.withDraftSources(list, cards);
  assert.deepEqual(result, [
    { id: draftId, title: 'Remix', sourceId, source: { title: 'Backwaters', creatorName: 'Asha' } },
    { id: second, title: 'Remix again', sourceId, source: { title: 'Backwaters', creatorName: 'Asha' } },
    { id: third, title: 'Gone', sourceId: goneSource, source: null },
    { id: fourth, title: 'Flaky', sourceId: otherSource },
    { id: plainId, title: 'Own' },
  ]);
  assert.deepEqual(result.map(item => remix.draftRemixCredit(item.source)).slice(0, 4), ['Remix of Backwaters · by Asha', 'Remix of Backwaters · by Asha', remix.unavailableSourceCopy, 'Remix of another journey']);
  assert.equal(publicCalls.length, 3, 'Each distinct parent is looked up once');
  assert.ok(publicCalls.every(([name]) => name === 'get_public_journeys'), 'No detail calls');
  const read = reads.find(entry => entry.table === 'journeys');
  assert.equal(read.columns, 'id,copied_from_journey_id'); assert.deepEqual(read.filters, [['user_id', uid], ['status', 'draft']]);
  assert.equal(reads.filter(entry => entry.table).length, 1, 'One lineage read for the whole list');
  // Many distinct parents: capped, with limited concurrency; the rest keep the generic credit.
  publicCalls.length = 0; publicPeak = 0;
  const many = Array.from({ length: 16 }, (_, index) => 'cccccccc-cccc-4ccc-8ccc-' + String(index).padStart(12, '0'));
  const manyCards = await queries.loadDraftSourceCards(many, new AbortController().signal);
  assert.equal(publicCalls.length, queries.draftSourceLookupLimit); assert.ok(publicPeak <= 3, 'peak ' + publicPeak);
  assert.equal(manyCards.size, queries.draftSourceLookupLimit);
});
test('aborting credit lookups stops queued lookups and rejects promptly', async () => {
  const many = Array.from({ length: 9 }, (_, index) => 'dddddddd-dddd-4ddd-8ddd-' + String(index).padStart(12, '0'));
  publicCalls.length = 0; publicAborted = 0; publicHang = true;
  try {
    const controller = new AbortController();
    const pending = queries.loadDraftSourceCards(many, controller.signal);
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(publicCalls.length, 3, 'Only the concurrency limit has started');
    const started = Date.now(); controller.abort();
    await assert.rejects(pending, /cancelled/);
    assert.ok(Date.now() - started < 100, 'Rejects without waiting for lookups or timeouts');
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(publicCalls.length, 3, 'Queued lookups never start after abort'); assert.equal(publicAborted, 3, 'Running lookups were aborted');
    publicCalls.length = 0;
    const already = new AbortController(); already.abort();
    await assert.rejects(queries.loadDraftSourceCards(many, already.signal), /cancelled/);
    assert.equal(publicCalls.length, 0, 'An already aborted signal starts nothing');
  } finally { publicHang = false; }
  let ran = 0; const stop = new AbortController();
  const limited = remix.mapLimited([1, 2, 3, 4], 1, async value => { ran++; if (value === 1) stop.abort(); return value; }, stop.signal);
  await assert.rejects(limited, /cancelled/); assert.equal(ran, 1, 'mapLimited takes no new items once aborted');
});
test('drafts list without lineage stays a single RPC; lineage failures only omit the credit', async () => {
  draftRows = [draft(draftId, 'Remix'), draft(plainId, 'Own')];
  reads.length = 0; publicCalls.length = 0;
  assert.deepEqual(await queries.loadPrivateDrafts(uid, new AbortController().signal), [{ id: draftId, title: 'Remix' }, { id: plainId, title: 'Own' }]);
  assert.equal(reads.filter(entry => entry.table).length, 0); assert.equal(publicCalls.length, 0, 'Create shortcuts make no extra reads');
  for (const failure of [{ data: null, error: { code: '42501' } }, { data: 'bad', error: null }]) {
    lineage = failure;
    assert.deepEqual(await queries.loadPrivateDrafts(uid, new AbortController().signal, { lineage: true }), [{ id: draftId, title: 'Remix' }, { id: plainId, title: 'Own' }]);
  }
  lineageThrows = true;
  assert.equal((await queries.loadPrivateDrafts(uid, new AbortController().signal, { lineage: true })).length, 2); lineageThrows = false;
  const account = readFileSync('src/app/account.tsx', 'utf8');
  assert.match(account, /loadPrivateDrafts\(userId, signal, \{ lineage: true \}\)/);
  assert.match(account, /withDraftSources\(drafts\.data \|\| \[\], credits\)/);
});
const parentCard = (title, creatorName) => ({ title, creatorName });
function draftCreditsHarness(limit = 12) {
  const exports = {};
  const code = ts.transpileModule(readFileSync('src/hooks/use-draft-credits.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const slots = []; let cursor = 0; const effects = [];
  // Effects run after render in declaration order, like a React commit.
  let pending = [];
  const react = {
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect: (fn, deps) => { const i = cursor++; if (!deps || !slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) { const previous = slots[i]; const slot = { deps }; slots[i] = slot; effects.push(slot); pending.push(() => { previous?.cleanup?.(); slot.cleanup = fn(); }); } },
  };
  new Function('require', 'exports', code)(name => ({ react, '@/lib/remix/queries': { loadDraftSourceCards: async () => new Map(), draftSourceLookupLimit: limit } })[name], exports);
  return { effects, render: (list, load) => { cursor = 0; pending = []; const result = exports.useDraftCredits(list, load); pending.forEach(run => run()); return result; } };
}
const remixDraft = (id, parent) => ({ id, title: 'Draft ' + id.slice(0, 4), sourceId: parent });
test('useDraftCredits renders the list first, fills credits after they resolve and aborts on unmount or change', async () => {
  const h = draftCreditsHarness();
  const calls = []; let resolve;
  const load = (ids, signal) => { calls.push({ ids, signal }); return new Promise(r => { resolve = r; }); };
  const drafts = [{ id: draftId, title: 'Remix', sourceId }, { id: plainId, title: 'Own' }];
  let credits = h.render(drafts, load);
  assert.equal(credits.size, 0, 'First render has no credits, so the list shows immediately');
  assert.deepEqual(queries.withDraftSources(drafts, credits), drafts);
  assert.deepEqual(calls.map(call => call.ids), [[sourceId]]);
  resolve(new Map([[sourceId, parentCard('Backwaters', 'Asha')]])); await new Promise(setImmediate);
  credits = h.render(drafts, load);
  assert.equal(remix.draftRemixCredit(queries.withDraftSources(drafts, credits)[0].source), 'Remix of Backwaters · by Asha');
  h.render([...drafts, { id: '12121212-1212-4121-8121-121212121212', title: 'New', sourceId: otherSource }], load);
  assert.deepEqual(calls[1].ids, [otherSource], 'Only uncached parents are fetched');
  h.effects.at(-1).cleanup(); assert.equal(calls[1].signal.aborted, true, 'Unmount aborts outstanding lookups');
  assert.equal(h.render([{ id: plainId, title: 'Own' }], load).size, 0, 'No remixes, no credits');
});
test('useDraftCredits caps lookups in list order and keeps earlier credits while a new list loads', async () => {
  const h = draftCreditsHarness(3);
  const ids = ['ffff0003', 'ffff0001', 'ffff0004', 'ffff0002', 'ffff0005'].map(prefix => prefix + '-ffff-4fff-8fff-ffffffffffff');
  const calls = []; const resolvers = [];
  // A fresh inline function each render must not loop or refetch.
  const render = list => h.render(list, (lookup, signal) => { calls.push({ ids: lookup, signal }); return new Promise(r => resolvers.push(r)); });
  const list = ids.map((parent, index) => remixDraft(String(index).padStart(8, '0') + '-0000-4000-8000-000000000000', parent));
  render(list); render(list); render(list);
  assert.equal(calls.length, 1, 'Re-renders with an inline loader do not refetch');
  assert.deepEqual(calls[0].ids, ids.slice(0, 3), 'The cap follows list order (first appearance), not sorted order');
  resolvers[0](new Map(ids.slice(0, 3).map((id, index) => [id, parentCard('Source ' + index, 'Author')])));
  await new Promise(setImmediate);
  let credits = render(list);
  assert.deepEqual([...credits.keys()], ids.slice(0, 3));
  // A changed list: the first two remain, a new parent appears. Previous credits stay visible.
  const next = [list[0], remixDraft('99999999-0000-4000-8000-000000000000', '0f0f0f0f-0f0f-40f0-80f0-0f0f0f0f0f0f'), list[1]];
  credits = render(next);
  assert.deepEqual(calls[1].ids, ['0f0f0f0f-0f0f-40f0-80f0-0f0f0f0f0f0f'], 'Cached parents are reused');
  assert.equal(credits.get(ids[0]).title, 'Source 0'); assert.equal(credits.get(ids[1]).title, 'Source 1');
  assert.equal(credits.has(ids[2]), false, 'Credits are filtered to the current list');
  assert.deepEqual(queries.withDraftSources(next, credits).map(item => remix.draftRemixCredit(item.source)), ['Remix of Source 0 · by Author', 'Remix of another journey', 'Remix of Source 1 · by Author'], 'No flicker back to the generic line for known parents');
  resolvers[1](new Map([['0f0f0f0f-0f0f-40f0-80f0-0f0f0f0f0f0f', null]])); await new Promise(setImmediate);
  assert.equal(remix.draftRemixCredit(queries.withDraftSources(next, render(next))[1].source), remix.unavailableSourceCopy);
});

// Component harness for SourceAttribution and the Account draft card.
const jsx = (type, props) => ({ type, props });
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const text = tree => nodes(tree).filter(n => n.type === 'Text').map(n => [n.props.children].flat(Infinity).filter(c => typeof c === 'string').join('')).join(' ');
function component(path, modules) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', code)(name => { assert.ok(name in modules, 'Unexpected dependency: ' + name); return modules[name]; }, exports);
  return exports;
}
const native = { StyleSheet: { create: value => value }, View: 'View', Text: 'Text', Pressable: 'Pressable' };
function attribution(state) {
  const routes = [], loaders = [];
  const { SourceAttribution } = component('src/components/remix/source-attribution.tsx', {
    react: { useCallback: fn => fn }, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'react-native': native,
    'expo-router': { useRouter: () => ({ push: route => routes.push(route) }) }, '@/components/discovery/ui': { Action: 'Action', ui: {} },
    '@/hooks/use-load': { useLoad: loader => { loaders.push(loader); return state; } }, '@/lib/discovery/queries': { loadPublicJourneyCard: async id => ['card', id] },
    '@/lib/remix/model': remix, '@/theme/mobile-theme': { theme: {} },
  });
  return { SourceAttribution, routes, loaders };
}
const source = { title: 'Backwaters', creatorName: 'Asha' };
test('editor credit is one non-navigating line: loading, "Remix of … · by …", unavailable and retry', async () => {
  let h = attribution({ loading: true, data: null, error: null });
  assert.equal(text(h.SourceAttribution({ id: sourceId, variant: 'editor' })), 'Checking the original journey…');
  assert.deepEqual(await h.loaders[0](new AbortController().signal), ['card', sourceId], 'Uses the lightweight public card lookup');
  h = attribution({ loading: false, data: source, error: null });
  let tree = h.SourceAttribution({ id: sourceId, variant: 'editor' });
  assert.equal(text(tree), 'Remix of Backwaters · by Asha'); assert.equal(nodes(tree).some(n => n.type === 'Pressable'), false, 'Editing never navigates away from the credit');
  h = attribution({ loading: false, data: null, error: null });
  assert.equal(text(h.SourceAttribution({ id: sourceId, variant: 'editor' })), remix.unavailableSourceCopy);
  let retried = 0; h = attribution({ loading: false, data: null, error: 'offline', retry: () => retried++ });
  tree = h.SourceAttribution({ id: sourceId, variant: 'editor' }); nodes(tree).find(n => n.type === 'Pressable').props.onPress(); assert.equal(retried, 1);
});
test('published credit links to a public original and stays plain text when unavailable', () => {
  let h = attribution({ loading: false, data: source, error: null });
  let tree = h.SourceAttribution({ id: sourceId, variant: 'published' });
  assert.match(text(tree), /^Remixed from Backwaters · by Asha/);
  const link = nodes(tree).find(n => n.type === 'Pressable'); assert.equal(link.props.accessibilityRole, 'link');
  link.props.onPress(); assert.deepEqual(h.routes, [{ pathname: '/journey/[id]', params: { id: sourceId } }]);
  h = attribution({ loading: false, data: null, error: null });
  tree = h.SourceAttribution({ id: sourceId, variant: 'published' });
  assert.equal(text(tree), remix.unavailableSourceCopy); assert.equal(nodes(tree).some(n => n.type === 'Pressable'), false);
});
test('draft-screen credit uses the same "Remix of … · by …" copy with the View original action', () => {
  let h = attribution({ loading: false, data: source, error: null });
  let tree = h.SourceAttribution({ id: sourceId });
  assert.equal(text(tree), 'Remix of Backwaters · by Asha');
  const action = nodes(tree).find(n => n.type === 'Action'); assert.equal(action.props.label, 'View original journey');
  action.props.onPress(); assert.deepEqual(h.routes.at(-1), { pathname: '/journey/[id]', params: { id: sourceId } });
  h = attribution({ loading: false, data: null, error: 'offline', retry() {} });
  tree = h.SourceAttribution({ id: sourceId });
  assert.equal(text(tree), remix.unavailableSourceCopy);
  assert.deepEqual(nodes(tree).filter(n => n.type === 'Action').map(n => n.props.label), ['Retry source attribution']);
  assert.equal(readFileSync('src/app/draft/[id].tsx', 'utf8').includes('function SourceAttribution'), false, 'The screen uses the shared component');
});

test('screens wire the credits and the optional, non-blocking photo hint', () => {
  const create = readFileSync('src/app/create.tsx', 'utf8');
  assert.match(create, /credit=\{form\.sourceId \? <SourceAttribution key=\{form\.sourceId\} id=\{form\.sourceId\} variant="editor" \/> : undefined\}/);
  assert.match(create, /needsRemixPhotoHint\(form\.sourceId, form\.stops, Object\.keys\(localPhotos\.candidates\)\)/);
  assert.match(create, /\{photoHint && <Text testID="remix-photo-hint"/);
  const swipe = create.slice(create.indexOf('<SwipeAction'), create.indexOf('/>', create.indexOf('<SwipeAction')));
  assert.ok(swipe.includes('!readiness') && !swipe.includes('photoHint'), 'Publishing is not gated by photos');
  assert.match(readFileSync('src/app/journey/[id].tsx', 'utf8'), /\{journey\.sourceId && <SourceAttribution [^>]*variant="published" \/>\}/);
});

test('Account draft card shows the direct-source credit only for remixes', () => {
  const { ProfileDraftCard } = component('src/components/profile/profile-ui.tsx', {
    react: { useCallback: fn => fn, useState: value => [value, () => {}] }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'react-native': { ...native, Image: 'Image', Platform: { OS: 'android' }, StatusBar: {}, useWindowDimensions: () => ({ width: 360 }) },
    'expo-router': { useFocusEffect() {}, useRouter: () => ({ push() {} }) }, '@/lib/remix/model': remix,
    '@/components/discovery/journey-photo': { JourneyPhoto: 'JourneyPhoto' }, '@/components/discovery/thumbnail-photo': { ThumbnailPhoto: 'ThumbnailPhoto' },
    '@/lib/discovery/model': { journeyFacts: () => '' }, './profile-styles': { profileUIStyles: {} },
    '@/components/delete-draft-action': { DeleteDraftAction: 'DeleteDraftAction' }, '@/hooks/use-buddy-geometry': buddyGeometryStub,
    '@/components/art/journey-art': { JourneyArt: 'JourneyArt' }, '@/lib/art/journey-art': { artSeed: () => 'seed' },
  });
  const credit = card => nodes(card).find(n => n.props?.testID === 'draft-remix-credit')?.props.children;
  const named = ProfileDraftCard({ draft: { id: draftId, title: 'Remix', sourceId, source }, onDeleted() {} });
  assert.equal(credit(named), 'Remix of Backwaters · by Asha');
  assert.match(nodes(named).find(n => n.type === 'Pressable').props.accessibilityLabel, /Remix of Backwaters · by Asha/);
  assert.equal(credit(ProfileDraftCard({ draft: { id: draftId, title: 'Remix', sourceId, source: null }, onDeleted() {} })), remix.unavailableSourceCopy);
  assert.equal(credit(ProfileDraftCard({ draft: { id: draftId, title: 'Remix', sourceId }, onDeleted() {} })), 'Remix of another journey');
  assert.equal(credit(ProfileDraftCard({ draft: { id: plainId, title: 'Own' }, onDeleted() {} })), undefined);
});
