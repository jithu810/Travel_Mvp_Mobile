import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(path, modules = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  new Function('require', 'exports', source)(name => {
    assert.ok(name in modules, `Unexpected dependency: ${name}`);
    return modules[name];
  }, exports);
  return exports;
}
const requests = load('src/lib/discovery/request-cache.ts');
const { createJourneyDetailCache } = load('src/lib/discovery/journey-detail-cache.ts', { './request-cache': requests });
const { createFirstImagePrefetch } = load('src/lib/discovery/journey-feed-prefetch.ts');
const model = load('src/lib/discovery/model.ts', { '../../types/journey': { travelerTypes: ['solo'] } });
const feed = load('src/lib/discovery/journey-feed-session.ts', { './model': model });
const id = n => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;
const raw = n => ({ id: id(n), title: `Public ${n}`, cover: 'journey-media/synthetic/cover.jpg',
  stops: [{ id: 'first', name: 'First', photo: 'journey-media/synthetic/first.jpg' },
    { id: 'second', name: 'Second', photo: 'journey-media/synthetic/second.jpg' }] });
const signal = () => new AbortController().signal;
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }

test('QA: six outstanding raw transports stay bounded across repeated clear even when abort is ignored', async () => {
  const cache = createJourneyDetailCache(), pending = [], sources = [], rejected = [];
  for (let n = 1; n <= 6; n++) {
    const item = deferred(); pending.push(item);
    const result = cache.get(id(n), signal(), s => { sources.push(s); return item.promise; });
    // Attach rejection handler before invalidation aborts its shared request.
    rejected.push(assert.rejects(result, /cancelled/));
    await tick(); cache.clear();
  }
  assert.equal(sources.length, 6);
  assert.ok(sources.every(s => s.aborted));
  let extra = 0;
  await assert.rejects(cache.get(id(7), signal(), async () => { extra++; return raw(7); }), /busy/);
  assert.equal(extra, 0);
  pending.forEach((item, n) => item.resolve(raw(n + 1)));
  await Promise.all(rejected); await tick();
  assert.equal((await cache.get(id(7), signal(), async () => { extra++; return raw(7); })).id, id(7));
  assert.equal(extra, 1);
});

test('QA: same-account cache reuse survives, account switch rejects prior fulfilled and inflight values', async () => {
  let now = 0, calls = 0; const cache = createJourneyDetailCache(() => now);
  const loader = async () => { calls++; return raw(1); };
  cache.account('A'); await cache.get(id(1), signal(), loader);
  cache.account('A'); now = 44999; await cache.get(id(1), signal(), loader); assert.equal(calls, 1);
  now = 45000; await cache.get(id(1), signal(), loader); assert.equal(calls, 2);
  cache.account('B'); await cache.get(id(1), signal(), loader); assert.equal(calls, 3);
  const stale = deferred();
  const old = cache.get(id(2), signal(), () => stale.promise), rejected = assert.rejects(old, /cancelled/);
  await tick(); cache.account('anonymous'); stale.resolve(raw(2)); await rejected; await tick();
  let fresh = 0; await cache.get(id(2), signal(), async () => { fresh++; return raw(2); }); assert.equal(fresh, 1);
});

test('QA: delayed Android request id is aborted after cancellation; failed and obsolete transports release budget', async () => {
  const prefetch = createFirstImagePrefetch(), work = deferred(), aborted = [];
  const controller = new AbortController(); let register;
  const first = prefetch('https://synthetic/first', controller.signal, (_url, callback) => { register = callback; return work.promise; }, value => aborted.push(value));
  controller.abort(); register(42); assert.deepEqual(aborted, [42]);
  assert.equal(await prefetch('https://synthetic/second', signal(), () => assert.fail('unsettled native call must consume budget')), false);
  work.resolve(true); assert.equal(await first, false);
  assert.equal(await prefetch('https://synthetic/failure', signal(), async () => { throw new Error('image failed'); }), false);
  assert.equal(await prefetch('https://synthetic/recovered', signal(), async () => true), true);
  const cancelled = new AbortController(); cancelled.abort();
  assert.equal(await prefetch('https://synthetic/cancelled', cancelled.signal, () => assert.fail('already cancelled')), false);
});

// Run the real feed component and useLoad against controlled public/native seams.
// This intentionally does not simulate native view layout, Mapbox or touch delivery.
function harness() {
  const slots = []; let cursor = 0, effects = [], tree, focus = true, appListener;
  let account = 'A', membershipMode = 'allow', nextMetadata, nextPhotos;
  const membership = [], metadata = [], photos = [], images = [];
  const hooks = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((x, j) => x !== slots[i].deps[j])) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((x, j) => x !== slots[i].deps[j])) {
      slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = fn(); });
    } },
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const sessions = feed.createJourneyFeedSessions(), cache = createJourneyDetailCache();
  const token = sessions.create([id(1), id(2), id(3)], id(1), 'A');
  const { useLoad } = load('src/hooks/use-load.ts', { react: hooks });
  const component = load('src/app/journey-feed.tsx', {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      View: 'View', Text: 'Text', StyleSheet: { create: value => value }, Platform: { OS: 'android' },
      useWindowDimensions: () => ({ height: 800 }),
      AppState: { currentState: 'active', addEventListener(_name, listener) { appListener = listener; return { remove() {} }; } },
      AccessibilityInfo: { isReduceMotionEnabled: async () => true, addEventListener: () => ({ remove() {} }), announceForAccessibility() {} },
      Animated: { View: 'Animated', Value: class { setValue() {} stopAnimation() {} }, timing() { return { start: fn => fn({ finished: true }) }; } },
      Image: { prefetch: async uri => { images.push(uri); return true; } },
    },
    'expo-router': { Stack: { Screen: 'Stack' }, useLocalSearchParams: () => ({ session: token }),
      useFocusEffect: callback => hooks.useEffect(() => focus ? callback() : undefined, [focus, callback]) },
    'react-native-safe-area-context': { SafeAreaView: 'Safe' }, './journey/[id]': { JourneyStoryContent: 'Story' },
    '@/hooks/session-context': { useSessionState: () => ({ loading: false, session: account ? { user: { id: account } } : null }) },
    '@/hooks/use-load': { useLoad }, '@/components/branded-loading': { BrandedLoading: 'Loading' },
    '@/components/discovery/ui': { Message: 'Message', ScreenHeader: 'Header', ui: {} },
    '@/lib/discovery/journey-feed-session': { journeyFeedSessions: sessions },
    '@/lib/discovery/journey-detail-cache': { journeyDetailCache: cache },
    '@/lib/discovery/journey-feed-prefetch': { prefetchFirstImage: createFirstImagePrefetch() },
    '@/lib/discovery/queries': {
      async loadPublicJourneyCard(value, s) {
        membership.push({ id: value, signal: s });
        if (membershipMode === 'error') throw new Error('membership offline');
        return membershipMode === 'deny' ? null : raw(Number(value.slice(0, 8)));
      },
      async loadPublicJourneyMetadata(value, s) {
        metadata.push({ id: value, signal: s });
        const job = nextMetadata; nextMetadata = undefined;
        return job ? job.promise : raw(Number(value.slice(0, 8)));
      },
      async resolvePhotos(rows, s) {
        photos.push({ rows, signal: s });
        const job = nextPhotos; nextPhotos = undefined;
        return job ? job.promise : rows.map(row => ({ ...row, stops: row.stops.map(stop => ({ ...stop, photo: `https://synthetic/${row.id}/${stop.id}/${photos.length}` })) }));
      },
    },
  }).default;
  const flatten = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)];
  function render() { cursor = 0; effects = []; tree = component(); effects.forEach(fn => fn()); return flatten(tree); }
  return { membership, metadata, photos, images, cache,
    async settle() { for (let i = 0; i < 8; i++) { render(); await tick(); } return flatten(tree); },
    story: () => flatten(tree).find(node => node.type === 'Story'),
    nodes: () => flatten(tree),
    background(value) { appListener(value); },
    focus(value) { focus = value; }, account(value) { account = value; },
    gate(value) { membershipMode = value; },
    deferMetadata(value) { nextMetadata = value; }, deferPhotos(value) { nextPhotos = value; },
    dispose() { slots.forEach(slot => slot?.cleanup?.()); cache.clear(); },
  };
}

test('QA: cached detail stays hidden during public-check error and null denial; resume rechecks before reusing it', async () => {
  const h = harness();
  try {
    await h.settle(); assert.equal(h.story().props.journey.id, id(1));
    h.background('background'); await h.settle(); assert.equal(h.story(), undefined);
    h.gate('error'); h.background('active'); await h.settle();
    assert.equal(h.story(), undefined); assert.ok(h.nodes().some(node => node.props?.body === 'membership offline'));
    assert.equal(h.metadata.filter(call => call.id === id(1)).length, 1);
    h.focus(false); await h.settle(); h.gate('deny'); h.focus(true); await h.settle(); assert.equal(h.story(), undefined);
    h.focus(false); await h.settle(); h.gate('allow'); h.focus(true); await h.settle();
    assert.equal(h.story().props.journey.id, id(1));
    assert.equal(h.metadata.filter(call => call.id === id(1)).length, 2, 'null denial evicts formerly cached metadata');
    assert.equal(h.membership.length, 4);
  } finally { h.dispose(); }
});

test('QA: background cancels speculative next metadata, and late ignored-abort completion never starts image work', async () => {
  const h = harness(), speculation = deferred();
  try {
    // Active photo resolution is deferred to install the next-only metadata seam.
    const displayed = deferred(); h.deferPhotos(displayed);
    await h.settle(); h.deferMetadata(speculation); displayed.resolve([raw(1)]); await h.settle();
    const speculativeCall = h.metadata.find(call => call.id === id(2)); assert.ok(speculativeCall);
    h.background('background'); assert.equal(speculativeCall.signal.aborted, true, 'native background callback aborts before React rerender');
    await h.settle();
    assert.equal(h.story(), undefined); speculation.resolve(raw(2)); await h.settle();
    assert.equal(h.images.length, 0); assert.equal(h.photos.length, 1);
    h.background('active'); await h.settle();
    assert.equal(h.story().props.journey.id, id(1));
    assert.equal(h.metadata.filter(call => call.id === id(2)).length, 2, 'cancelled speculation did not populate cache');
    assert.equal(h.images.length, 1);
  } finally { speculation.resolve(null); h.dispose(); }
});

test('QA: same-tick background and sheet callbacks fence a previously captured page callback', async () => {
  const h = harness();
  try {
    await h.settle();
    let oldPage = h.story().props.feed.onPage;
    h.story().props.feed.onAvailability(false); oldPage(1); await h.settle();
    assert.equal(h.story().props.journey.id, id(1), 'sheet disables old page callback synchronously');
    h.story().props.feed.onAvailability(true); await h.settle(); oldPage = h.story().props.feed.onPage;
    h.background('background'); oldPage(1); await h.settle();
    h.background('active'); await h.settle();
    assert.equal(h.story().props.journey.id, id(1), 'background cannot commit queued navigation before render');
  } finally { h.dispose(); }
});

test('QA: pending active photos cannot publish after blur/account switch even if transport ignores abort', async () => {
  const h = harness(), photo = deferred(); h.deferPhotos(photo);
  try {
    await h.settle(); assert.equal(h.story(), undefined); assert.equal(h.photos.length, 1);
    h.focus(false); await h.settle(); assert.equal(h.photos[0].signal.aborted, true);
    h.account('B'); photo.resolve([{ ...raw(1), title: 'Obsolete private-looking marker' }]); await h.settle();
    h.focus(true); await h.settle(); assert.equal(h.story(), undefined);
    assert.equal(h.images.length, 0); assert.equal(h.metadata.length, 1);
  } finally { photo.resolve([]); h.dispose(); }
});
