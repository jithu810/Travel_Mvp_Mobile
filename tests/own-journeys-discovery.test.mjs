import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Synthetic fixtures only: no hosted Supabase calls, sessions or writes.
const output = mkdtempSync(join(tmpdir(), 'journey-own-discovery-test-'));
const program = ts.createProgram(['src/lib/discovery/model.ts', 'src/lib/discovery/queries.ts', 'src/types/journey.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  types: ['node'], outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
const emitted = program.emit();
const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitted.diagnostics);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
after(() => rmSync(output, { recursive: true, force: true }));
const requireCompiled = createRequire(import.meta.url);
const model = requireCompiled(join(output, 'lib/discovery/model.js'));

const U = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const V = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const other = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const jid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const row = (n, creator, patch = {}) => ({
  id: jid(n), title: 'Journey ' + n, status: 'published', is_demo: false, traveler_type: 'solo',
  destination_name: 'Place ' + n, creator_name: 'Traveler ' + n, creator_id: creator, stops: [], ...patch,
});
const entries = rows => rows.map(model.normalizeDiscoveryEntry).filter(Boolean);
const ids = journeys => journeys.map(j => j.id);

test('hideViewerJourneys removes only the viewer rows and keeps order; null viewer is unchanged', () => {
  const list = entries([row(1, other), row(2, U), row(3, V), row(4, U), row(5, other)]);
  assert.deepEqual(ids(model.hideViewerJourneys(list, U)), [jid(1), jid(3), jid(5)]);
  assert.deepEqual(ids(model.hideViewerJourneys(list, V)), [jid(1), jid(2), jid(4), jid(5)]);
  for (const viewer of [null, undefined, '', 'not-a-user-id']) assert.deepEqual(ids(model.hideViewerJourneys(list, viewer)), ids(list.map(e => e.journey)));
  // Case-insensitive UUID comparison.
  assert.deepEqual(ids(model.hideViewerJourneys(entries([row(1, U.toUpperCase()), row(2, other)]), U)), [jid(2)]);
  assert.deepEqual(ids(model.hideViewerJourneys(list, U.toUpperCase())), [jid(1), jid(3), jid(5)]);
});

test('missing or invalid creator ids keep the journey (fail-open for display)', () => {
  const list = entries([row(1, undefined), row(2, null), row(3, 'bad'), row(4, 42), row(5, ''), row(6, U)]);
  assert.equal(list.length, 6);
  assert.deepEqual(list.slice(0, 5).map(e => e.creatorId), [null, null, null, null, null]);
  assert.deepEqual(ids(model.hideViewerJourneys(list, U)), [1, 2, 3, 4, 5].map(jid));
});

test('demos, drafts and malformed rows are still rejected; cards carry no owner id', () => {
  for (const patch of [{ is_demo: true }, { is_demo: undefined }, { status: 'draft' }, { id: 'bad' }, { traveler_type: 'unknown' }, { title: '' }]) {
    assert.equal(model.normalizeDiscoveryEntry(row(1, U, patch)), null, JSON.stringify(patch));
  }
  const [entry] = entries([row(1, U)]);
  assert.equal(entry.creatorId, U);
  assert.equal('creator_id' in entry.journey, false);
  assert.equal('creatorId' in entry.journey, false);
  assert.deepEqual(entry.journey, model.normalizePublicJourney(row(1, U)));
});

test('typed query searches everything including own journeys; empty/whitespace query hides them', () => {
  const list = entries([row(1, U, { title: 'Kerala coast' }), row(2, other, { title: 'Kerala hills' }), row(3, other, { title: 'Goa' })]);
  const view = query => ids(model.searchJourneys(model.discoveryJourneys(list, U, query), query));
  assert.deepEqual(view('kerala'), [jid(1), jid(2)]);
  assert.deepEqual(view('  coast '), [jid(1)]);
  for (const blank of ['', ' ', '\t\n ']) assert.deepEqual(view(blank), [jid(2), jid(3)]);
  assert.deepEqual(ids(model.discoveryJourneys(list, null, '')), [jid(1), jid(2), jid(3)]);
});

test('discoveryViewer holds while loading and treats session errors as signed out', () => {
  assert.deepEqual(model.discoveryViewer({ session: null, loading: true, error: null }), { pending: true, id: null });
  assert.deepEqual(model.discoveryViewer({ session: { user: { id: U } }, loading: true, error: null }), { pending: true, id: null });
  assert.deepEqual(model.discoveryViewer({ session: { user: { id: U } }, loading: false, error: null }), { pending: false, id: U });
  assert.deepEqual(model.discoveryViewer({ session: { user: { id: U } }, loading: false, error: 'expired' }), { pending: false, id: null });
  assert.deepEqual(model.discoveryViewer({ session: null, loading: false, error: null }), { pending: false, id: null });
  assert.deepEqual(model.discoveryViewer({ session: { user: { id: 'bad' } }, loading: false, error: null }), { pending: false, id: null });
  // A restore that outlasts its limit fails open as signed out; a restored session always wins.
  assert.deepEqual(model.discoveryViewer({ session: { user: { id: U } }, loading: true, error: null }, true), { pending: false, id: null });
  assert.deepEqual(model.discoveryViewer({ session: { user: { id: U } }, loading: false, error: null }, true), { pending: false, id: U });
  assert.equal(model.isUuid(U), true); assert.equal(model.isUuid('bad'), false);
});

// Queries against a fake anonymous client (same pattern as tests/discovery.test.mjs).
let responses = [];
let requests = [];
const fakeClient = {
  rpc(name, args) { requests.push({ name, args }); return { abortSignal: async () => responses.shift() ?? { data: [], error: null } }; },
  storage: { from() { return { createSignedUrls: async paths => ({ data: paths.map(path => ({ signedUrl: 'https://example.org/signed/' + path })), error: null }) }; } },
};
const publicModulePath = join(output, 'lib/supabase/public.js');
requireCompiled.cache[publicModulePath] = { id: publicModulePath, filename: publicModulePath, loaded: true, exports: { publicSupabase: fakeClient } };
const queries = requireCompiled(join(output, 'lib/discovery/queries.js'));
const signal = () => new AbortController().signal;
function setup(values) { queries.invalidatePublicJourneys(); responses = values; requests = []; }

test('one anonymous RPC serves U, signed-out and V within TTL; invalidate still clears', async () => {
  setup([{ data: [row(1, U), row(2, V), row(3, other)], error: null }]);
  const forU = model.hideViewerJourneys(await queries.loadDiscoveryEntries(signal()), U);
  const signedOut = model.hideViewerJourneys(await queries.loadDiscoveryEntries(signal()), null);
  const forV = model.hideViewerJourneys(await queries.loadDiscoveryEntries(signal()), V);
  assert.deepEqual(ids(forU), [jid(2), jid(3)]);
  assert.deepEqual(ids(signedOut), [jid(1), jid(2), jid(3)]);
  assert.deepEqual(ids(forV), [jid(1), jid(3)]);
  assert.deepEqual(ids(await queries.loadPublicJourneys(signal())), [jid(1), jid(2), jid(3)]);
  assert.deepEqual(requests, [{ name: 'get_public_journeys', args: {} }], 'cache key stays viewer-independent');
  // Filtering one viewer never mutates the shared cached collection.
  forU.length = 0;
  assert.equal((await queries.loadDiscoveryEntries(signal())).length, 3);
  responses = [{ data: [row(4, other)], error: null }];
  queries.invalidatePublicJourneys();
  assert.deepEqual(ids((await queries.loadDiscoveryEntries(signal())).map(e => e.journey)), [jid(4)]);
  assert.equal(requests.length, 2);
});

test('returned PublicJourney values have no creator id', async () => {
  setup([{ data: [row(1, U)], error: null }]);
  const [entry] = await queries.loadDiscoveryEntries(signal());
  assert.equal(entry.creatorId, U);
  assert.equal('creator_id' in entry.journey, false);
  const [journey] = await queries.loadPublicJourneys(signal());
  assert.equal('creator_id' in journey, false);
  assert.equal('creatorId' in journey, false);
  // Exactly the pre-change PublicJourney card keys (no stored thumbnails in this fixture).
  const cardKeys = ['id', 'title', 'description', 'destination', 'destinationSlug', 'creatorName', 'creatorUsername', 'travelerType', 'durationDays', 'likes', 'cover', 'stops'];
  assert.deepEqual(Object.keys(entry.journey), cardKeys);
  assert.deepEqual(Object.keys(journey), cardKeys);
  assert.deepEqual(Object.keys(model.normalizeDiscoveryEntry(row(1, U)).journey), cardKeys);
  assert.deepEqual(Object.keys(entry).sort(), ['creatorId', 'journey']);
});
test('creator ids are re-attached by journey id, not by position', () => {
  const source = readFileSync('src/lib/discovery/queries.ts', 'utf8');
  assert.ok(source.includes('new Map(entries.map(entry => [entry.journey.id, entry.creatorId]))'));
  assert.ok(source.includes('creators.get(journey.id) ?? null'));
  assert.ok(!source.includes('entries[index]'));
});

test('100-row fixture with k own and d demo rows yields 100-k-d for the owner', async () => {
  const k = 7, d = 4;
  const rows = Array.from({ length: 100 }, (_, n) => n < k ? row(n, U) : n < k + d ? row(n, other, { is_demo: true }) : row(n, n % 2 ? V : other));
  // Rows past the RPC's 100 bound are ignored even if a transport returns them.
  setup([{ data: [...rows, row(500, other), row(501, other)], error: null }]);
  const list = await queries.loadDiscoveryEntries(signal());
  assert.equal(list.length, 100 - d);
  assert.equal(model.hideViewerJourneys(list, U).length, 100 - k - d);
  assert.equal(model.hideViewerJourneys(list, null).length, 100 - d);
});

test('journey detail (loadPublicJourney) still returns an own published journey', async () => {
  setup([{ data: [row(1, U)], error: null }, { data: { ...row(1, U), status: 'published' }, error: null }]);
  const detail = await queries.loadPublicJourney(jid(1), signal());
  assert.equal(detail?.id, jid(1));
  assert.deepEqual(requests.map(r => r.name), ['get_public_journeys', 'get_journey_detail']);
});

// Screen harness (same pattern as tests/search-explore.test.mjs) with the real model, useLoad and viewer hook.
const jsx = (type, props) => ({ type, props });
const runtime = { jsx, jsxs: jsx, Fragment: 'Fragment' };
const native = Object.fromEntries(['View', 'Text', 'Pressable', 'FlatList', 'TextInput', 'KeyboardAvoidingView', 'RefreshControl', 'Image', 'ActivityIndicator'].map(x => [x, x]));
native.StyleSheet = { create: x => x }; native.Platform = { OS: 'android' }; native.Keyboard = { dismiss() {} };
native.AppState = { addEventListener: () => ({ remove() {} }) };
const all = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(all)];
function load(path, modules, timers = globalThis) {
  const exports = {};
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText)(id => { assert.ok(id in modules, id); return modules[id]; }, exports, timers.setTimeout, timers.clearTimeout);
  return exports;
}
function stateHarness() {
  const slots = []; let cursor = 0, effects = [];
  const memo = (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { value: fn(), deps }; return slots[i].value; };
  const hooks = { useMemo: memo, useCallback: (fn, deps) => memo(() => fn, deps), useRef: v => { const i = cursor++; return slots[i] ??= { current: v }; },
    useState: v => { const i = cursor++; if (!(i in slots)) slots[i] = typeof v === 'function' ? v() : v; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; },
    useEffect: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) { slots[i]?.cleanup?.(); const slot = { deps }; slots[i] = slot; effects.push(() => { slot.cleanup = fn(); }); } } };
  return { hooks, render(fn) { cursor = 0; effects = []; const tree = fn(); effects.forEach(fn => fn()); return all(tree); }, dispose() { slots.forEach(s => s?.cleanup?.()); } };
}
// Fake timers: callbacks run only when the test fires them.
function fakeTimers() {
  const timers = new Map(); let next = 0;
  return { setTimeout: (fn, ms) => { timers.set(++next, { fn, ms }); return next; }, clearTimeout: id => { timers.delete(id); },
    pending: ms => [...timers.values()].filter(t => t.ms === ms).length,
    fire: ms => { for (const [id, t] of [...timers]) if (t.ms === ms) { timers.delete(id); t.fn(); } } };
}
const tick = () => new Promise(setImmediate);
const signedIn = id => ({ session: { user: { id }, access_token: 'synthetic-' + id }, loading: false, error: null });
const signedOut = { session: null, loading: false, error: null };
const restoring = { session: null, loading: true, error: null };
const fixture = () => entries([row(1, U, { title: 'Kerala coast', destination_name: 'Kerala' }), row(2, other, { destination_name: 'Goa' }), row(3, V, { destination_name: 'Kerala' })]);
const ownOnly = () => entries([row(1, U), row(2, U)]);
const viewerHook = (h, getAuth, timers) => load('src/hooks/use-discovery-viewer.ts', { react: h.hooks, './session-context': { useSessionState: () => getAuth() }, '@/lib/discovery/model': model }, timers);
const shared = { 'react/jsx-runtime': runtime, 'react-native': native, '@/lib/discovery/model': model };
function searchScreen(h, getAuth, getView, publicLoader, extra = {}) {
  return load('src/app/search.tsx', {
    ...shared, react: h.hooks, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { useRouter: () => ({ push() {} }), useLocalSearchParams: () => ({ view: getView() }), useFocusEffect() {} },
    '@/hooks/session-context': { useSessionState: () => getAuth() }, '@/hooks/use-discovery-viewer': viewerHook(h, getAuth, extra.timers),
    '@/hooks/use-load': { useLoad: load('src/hooks/use-load.ts', { react: h.hooks }).useLoad }, '@/lib/social/saved-queries': { loadSavedJourneys: extra.saved || (async () => []) },
    '@/components/discovery/compact-search-input': { CompactSearchInput: 'TextInput' }, '@/components/journey/journey-action-icon': { JourneyActionIcon: 'Icon' }, '@/components/branded-loading': { BrandedLoading: 'BrandedLoading' },
    '@/components/discovery/explore-tile': { ExploreTile: 'ExploreTile' }, '@/components/discovery/journey-card': { JourneyCard: 'JourneyCard' },
    '@/components/discovery/ui': { colors: {}, ui: {}, ScreenHeader: 'Header', Message: 'Message', LoadingCards: 'LoadingCards' },
    '@/lib/discovery/queries': { invalidatePublicJourneys() {}, loadDiscoveryEntries: publicLoader },
    ...(extra.model ? { '@/lib/discovery/model': extra.model } : {}),
  }).default;
}
function homeScreen(h, getAuth, publicLoader, timers) {
  return load('src/app/discover.tsx', {
    ...shared, react: h.hooks,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'expo-router': { Stack: { Screen: 'StackScreen' }, useRouter: () => ({ push() {} }), useFocusEffect() {} },
    '@/theme/mobile-theme': { theme: {}, primaryControl: {} }, '@/components/branded-loading': { BrandedLoading: 'BrandedLoading' },
    '@/components/create/place-picker': { PlacePicker: 'PlacePicker' }, '@/components/floating-navigation': { FloatingNavigation: 'Navigation' },
    '@/components/discovery/globe/discovery-globe': { DiscoveryGlobe: 'Globe' }, '@/components/discovery/discovery-panel': { DiscoveryPanel: 'Panel' },
    '@/hooks/use-discovery-viewer': viewerHook(h, getAuth, timers), '@/hooks/use-load': { useLoad: load('src/hooks/use-load.ts', { react: h.hooks }).useLoad },
    '@/lib/discovery/map': { discoveryPoints: () => ({ features: [] }), worldCamera: { centerCoordinate: [35, 18] } },
    '@/lib/discovery/travel': { discoveryRoute: () => null }, '@/lib/discovery/presentation': { spaceColor: '#000' },
    '@/lib/discovery/queries': { invalidatePublicJourneys() {}, loadDiscoveryEntries: publicLoader, loadPublicJourney: async () => null },
  }).default;
}
const list = t => t.find(n => n.type === 'FlatList'), data = t => ids(list(t).props.data);
const input = t => t.find(n => n.type === 'TextInput');

test('Search/Explore and Story list hide own journeys per viewer without refetching; typed query shows them', async () => {
  const h = stateHarness(); let auth = restoring, view, publicCalls = 0;
  const component = searchScreen(h, () => auth, () => view, async () => { publicCalls++; return fixture(); });
  const render = () => h.render(component);
  const chips = t => all(list(t).props.ListHeaderComponent).filter(n => n.type === 'Pressable').map(n => n.props.accessibilityLabel);
  try {
    render(); await tick(); let tree = render();
    assert.ok(!tree.some(n => n.type === 'BrandedLoading'), 'session restore keeps the screen mounted');
    assert.ok(input(tree), 'search field stays mounted while the viewer is pending');
    assert.deepEqual(data(tree), [], 'own cards never flash'); assert.equal(list(tree).props.ListEmptyComponent.type, 'LoadingCards');
    input(tree).props.onChangeText('kerala'); tree = render(); assert.deepEqual(data(tree), [], 'public results area is held even for a typed query');
    input(tree).props.onChangeText(''); auth = signedIn(U); tree = render();
    assert.deepEqual(data(tree), [jid(2), jid(3)]);
    input(tree).props.onChangeText('kerala'); tree = render();
    assert.deepEqual(data(tree), [jid(1), jid(3)], 'typed query includes own matches');
    input(tree).props.onChangeText('   '); tree = render();
    assert.deepEqual(data(tree), [jid(2), jid(3)], 'whitespace query still hides own journeys');
    auth = signedOut; tree = render(); assert.deepEqual(data(tree), [jid(1), jid(2), jid(3)]);
    auth = signedIn(V); tree = render(); assert.deepEqual(data(tree), [jid(1), jid(2)]);
    auth = { ...signedIn(U), error: 'Session could not be restored' }; tree = render(); assert.deepEqual(data(tree), [jid(1), jid(2), jid(3)], 'session error is treated as signed out');
    view = 'stories'; auth = signedIn(U); tree = render();
    assert.equal(list(tree).props.numColumns, 1); assert.deepEqual(data(tree), [jid(2), jid(3)]);
    assert.deepEqual(chips(tree), ['Search Goa', 'Search Kerala'], 'place chips derive from the filtered list');
    input(tree).props.onChangeText('kerala'); tree = render(); assert.deepEqual(data(tree), [jid(1), jid(3)], 'Story typed query includes own matches');
    input(tree).props.onChangeText(' \t '); tree = render(); assert.deepEqual(data(tree), [jid(2), jid(3)], 'Story whitespace query hides own journeys');
    input(tree).props.onChangeText(''); auth = signedIn(V); tree = render(); assert.deepEqual(chips(tree), ['Search Kerala', 'Search Goa']);
    assert.equal(publicCalls, 1, 'sign-in/out re-derives from the same load');
  } finally { h.dispose(); }
});

test('Search browse shows the only-own empty copy, otherwise the existing copy', async () => {
  const h = stateHarness(); let auth = signedIn(U), rows = ownOnly();
  const component = searchScreen(h, () => auth, () => undefined, async () => rows);
  const render = () => h.render(component), empty = t => list(t).props.ListEmptyComponent;
  try {
    render(); await tick(); let tree = render();
    assert.deepEqual(data(tree), []);
    assert.equal(empty(tree).props.title, 'Only your journeys so far'); assert.equal(empty(tree).props.body, 'Search to find them.');
    input(tree).props.onChangeText('Journey'); tree = render(); assert.deepEqual(data(tree), [jid(1), jid(2)], 'search finds own journeys');
    input(tree).props.onChangeText('zzz'); tree = render(); assert.equal(empty(tree).props.title, 'No journeys found');
    input(tree).props.onChangeText(''); auth = signedOut; tree = render(); assert.deepEqual(data(tree), [jid(1), jid(2)]);
    rows = []; list(tree).props.refreshControl.props.onRefresh(); render(); await tick(); auth = signedIn(U); tree = render();
    assert.equal(empty(tree).props.title, 'More stories are on their way', 'genuinely empty collection keeps existing copy');
  } finally { h.dispose(); }
});

test('viewer restore past ~4s fails open as signed out (fake timers); restored session still filters', async () => {
  const timers = fakeTimers(), h = stateHarness(); let auth = restoring;
  const component = searchScreen(h, () => auth, () => undefined, async () => fixture(), { timers });
  const render = () => h.render(component);
  try {
    render(); await tick(); let tree = render();
    assert.deepEqual(data(tree), []); assert.equal(timers.pending(4000), 1);
    timers.fire(4000); tree = render();
    assert.deepEqual(data(tree), [jid(1), jid(2), jid(3)], 'pending timeout treats the viewer as signed out');
    auth = signedIn(U); tree = render(); assert.deepEqual(data(tree), [jid(2), jid(3)], 'a later restored session still hides own journeys');
  } finally { h.dispose(); }
  // Hook level: a restore finishing before the limit clears its timer.
  const t2 = fakeTimers(), h2 = stateHarness(); let auth2 = restoring;
  const { useDiscoveryViewer, discoveryViewerPendingLimit } = viewerHook(h2, () => auth2, t2);
  assert.equal(discoveryViewerPendingLimit, 4000);
  let viewer; const renderHook = () => h2.render(() => { viewer = useDiscoveryViewer(); return null; });
  renderHook(); assert.deepEqual(viewer, { pending: true, id: null }); assert.equal(t2.pending(4000), 1);
  auth2 = signedIn(U); renderHook(); assert.deepEqual(viewer, { pending: false, id: U }); assert.equal(t2.pending(4000), 0);
  h2.dispose();
});

test('Search Saved filter keeps its own account collection unchanged', async () => {
  const h = stateHarness(); const auth = signedIn(U), savedRows = [{ id: jid(1), destination: 'Kerala' }];
  const component = searchScreen(h, () => auth, () => undefined, async () => fixture(), { saved: async () => savedRows,
    model: { ...model, searchJourneys: (rows, q) => rows.filter(x => x.destination.toLowerCase().includes(q.trim().toLowerCase())) } });
  const render = () => h.render(component);
  try {
    render(); await tick(); let tree = render();
    tree.find(n => n.props?.accessibilityLabel === 'Show saved journeys').props.onPress(); render(); await tick(); tree = render();
    assert.deepEqual(data(tree), [jid(1)]);
  } finally { h.dispose(); }
});

test('Home card list hides own journeys, holds during restore without masking errors, and handles selections', async () => {
  const h = stateHarness(); let auth = restoring, publicCalls = 0, fail = false;
  const component = homeScreen(h, () => auth, async () => { publicCalls++; if (fail) throw new Error('Offline'); return fixture(); });
  const render = () => h.render(component), panel = t => t.find(n => n.type === 'Panel'), globe = t => t.find(n => n.type === 'Globe');
  try {
    render(); await tick(); let tree = render();
    assert.deepEqual(panel(tree).props.journeys, []); assert.equal(panel(tree).props.loading, true, 'session restore holds the card list');
    assert.ok(!tree.some(n => n.type === 'BrandedLoading'), 'public Home itself does not wait for authentication');
    auth = signedOut; tree = render(); assert.deepEqual(ids(panel(tree).props.journeys), [jid(1), jid(2), jid(3)]); assert.equal(panel(tree).props.loading, false);
    assert.equal(panel(tree).props.emptyText, undefined);
    panel(tree).props.onLocate(jid(1)); tree = render(); assert.equal(globe(tree).props.selectionId, jid(1));
    auth = signedIn(U); render(); tree = render();
    assert.deepEqual(ids(panel(tree).props.journeys), [jid(2), jid(3)]);
    assert.equal(globe(tree).props.selectionId, null, 'own selection is dropped after sign-in');
    auth = signedOut; tree = render(); panel(tree).props.onLocate(jid(2)); render(); auth = signedIn(U); render(); tree = render();
    assert.equal(globe(tree).props.selectionId, jid(2), 'a non-own selection survives sign-in');
    panel(tree).props.onLocate(jid(3)); tree = render(); assert.equal(globe(tree).props.selectionId, jid(3));
    auth = signedIn(V); render(); tree = render(); assert.deepEqual(ids(panel(tree).props.journeys), [jid(1), jid(2)]); assert.equal(globe(tree).props.selectionId, null);
    auth = { ...signedIn(U), error: 'expired' }; tree = render(); assert.deepEqual(ids(panel(tree).props.journeys), [jid(1), jid(2), jid(3)]);
    assert.equal(publicCalls, 1, 'viewer changes never refetch the public collection');
    fail = true; auth = restoring; panel(tree).props.onRefresh(); render(); await tick(); tree = render();
    assert.equal(panel(tree).props.error, 'Offline'); assert.equal(panel(tree).props.loading, false, 'pending viewer does not mask a load error');
  } finally { h.dispose(); }
});

test('Home shows the only-own empty copy and the panel renders it in place of the default', async () => {
  const h = stateHarness(); let auth = signedIn(U);
  const component = homeScreen(h, () => auth, async () => ownOnly());
  const render = () => h.render(component), panel = t => t.find(n => n.type === 'Panel');
  try {
    render(); await tick(); let tree = render();
    assert.deepEqual(panel(tree).props.journeys, []); assert.equal(panel(tree).props.emptyText, 'Only your journeys so far. Find them in Search.');
    auth = signedOut; tree = render(); assert.equal(panel(tree).props.emptyText, undefined); assert.equal(panel(tree).props.journeys.length, 2);
  } finally { h.dispose(); }
  const p = stateHarness();
  const { DiscoveryPanel } = load('src/components/discovery/discovery-panel.tsx', {
    react: p.hooks, 'react/jsx-runtime': runtime, 'react-native': { ...native, Animated: { View: 'AnimatedView', add: (a, b) => a + b } },
    '@/lib/discovery/presentation': { discoveryCardWidth: () => 300 }, '@/hooks/use-discovery-sheet': { useDiscoverySheet: () => ({ height: 200, expanded: false, offset: { current: 0 }, responders: { handle: {}, content: {} } }) },
    './home-journey-card': { HomeJourneyCard: 'Card' }, './ui': { colors: {} },
  });
  const emptyCopy = props => {
    const tree = p.render(() => DiscoveryPanel({ journeys: [], selectedId: null, onLocate() {}, onOpen() {}, notice: '', onClear() {}, loading: false, refreshing: false, error: null, onRefresh() {}, onHeight() {}, onInteraction() {}, availableHeight: 720, availableWidth: 360, ...props }));
    return all(list(tree).props.ListEmptyComponent).filter(n => n.type === 'Text').map(n => n.props.children).join(' ');
  };
  assert.equal(emptyCopy({ emptyText: 'Only your journeys so far. Find them in Search.' }), 'Only your journeys so far. Find them in Search.');
  assert.equal(emptyCopy({}), 'The next story is still to come. No public journeys yet.');
  assert.equal(emptyCopy({ error: 'Offline', emptyText: 'Only your journeys so far. Find them in Search.' }), 'A small detour. Tap Refresh to try again.');
  p.dispose();
});

test('source: Home and Search derive the filter from the session user; detail/profile/story loaders untouched', () => {
  const home = readFileSync('src/app/discover.tsx', 'utf8'), search = readFileSync('src/app/search.tsx', 'utf8'), hook = readFileSync('src/hooks/use-discovery-viewer.ts', 'utf8');
  assert.ok(home.includes('useLoad(loadDiscoveryEntries)') && home.includes('const viewer = useDiscoveryViewer()'));
  assert.ok(home.includes('hideViewerJourneys(state.data || [], viewer.id)'));
  assert.ok(home.includes('loading={state.loading || (viewer.pending && !state.error)}'));
  assert.ok(hook.includes('const auth = useSessionState()') && hook.includes('discoveryViewer(auth, timedOut)'));
  assert.ok(search.includes('useLoad(loadDiscoveryEntries)') && search.includes('const viewer = useDiscoveryViewer()'));
  assert.ok(search.includes('discoveryJourneys(state.data || [], viewer.id, query)'));
  assert.ok(search.includes('loadSavedJourneys(userId, signal)'), 'Saved stays account-scoped');
  const queriesSource = readFileSync('src/lib/discovery/queries.ts', 'utf8');
  assert.ok(queriesSource.includes("collections.get('public', signal,"), 'cache key stays viewer-independent');
  assert.ok(!/hideViewerJourneys|discoveryViewer|session/i.test(queriesSource), 'loaders never filter by viewer');
  const users = [];
  const walk = dir => readdirSync(dir).forEach(name => { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (/\.(ts|tsx)$/.test(name) && /hideViewerJourneys|discoveryJourneys|discoveryViewer|DiscoveryViewer|loadDiscoveryEntries/.test(readFileSync(path, 'utf8'))) users.push(path.replaceAll('\\', '/')); });
  walk('src');
  assert.deepEqual(users.sort(), ['src/app/discover.tsx', 'src/app/search.tsx', 'src/hooks/use-discovery-viewer.ts', 'src/lib/discovery/model.ts', 'src/lib/discovery/queries.ts']);
  assert.ok(readFileSync('src/app/journey/[id].tsx', 'utf8').includes("import { loadPublicJourney } from '@/lib/discovery/queries'"));
  assert.ok(/export async function loadPublicJourney\(id: string, signal: AbortSignal\)[\s\S]*journey_filter: id[\s\S]*normalizePublicJourney/.test(queriesSource));
  assert.ok(readFileSync('src/app/profile/[username].tsx', 'utf8').includes("from '@/lib/profile/queries'"));
});
