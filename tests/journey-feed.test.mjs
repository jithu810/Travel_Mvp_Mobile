import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(file, modules = {}) {
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(name => {
    assert.ok(name in modules, name); return modules[name];
  }, exports);
  return exports;
}
const model = load('src/lib/discovery/model.ts', { '../../types/journey': { travelerTypes: ['solo'] } });
const feedModel = load('src/lib/discovery/journey-feed-session.ts', { './model': model });
const requests = load('src/lib/discovery/request-cache.ts');
const caches = load('src/lib/discovery/journey-detail-cache.ts', { './request-cache': requests });
const { createFirstImagePrefetch } = load('src/lib/discovery/journey-feed-prefetch.ts');
const id = i => `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`;
const raw = i => ({ id: id(i), title: `Journey ${i}`, cover: 'journey-media/user/cover.jpg', stops: [{ id: 'stop', photo: 'journey-media/user/stop.jpg', name: 'Original' }, { id: 'later', photo: 'journey-media/user/later.jpg', name: 'Later stop' }] });
const signal = () => new AbortController().signal;
const tick = () => new Promise(resolve => setImmediate(resolve));

test('feed snapshots exact filtered order/selection, bounds memory and rejects expired/account-mismatched sessions', () => {
  let now = 100; const sessions = feedModel.createJourneyFeedSessions(() => now);
  const ids = [id(3), id(1), id(2)]; const token = sessions.create(ids, id(1), 'A'); ids.reverse();
  assert.deepEqual(sessions.get(token, 'A').ids, [id(3), id(1), id(2)]);
  assert.equal(sessions.get(token, 'A').index, 1);
  assert.ok(Object.isFrozen(sessions.get(token, 'A').ids));
  assert.equal(sessions.create([id(1)], id(2), 'A'), null);
  for (let i = 0; i < 15; i++) sessions.selectStop(token, 'A', [id(3), id(1), id(2)][i % 3], `s${i}`);
  assert.equal(sessions.get(token, 'A').stops.get(id(1)), 's13');
  for (let i = 0; i < 3; i++) sessions.create([id(1)], id(1), 'A');
  assert.equal(sessions.get(token, 'A'), null);
  const bounded = sessions.create(Array.from({ length: 110 }, (_, i) => id(i)), id(0), 'A');
  assert.equal(sessions.get(bounded, 'A').ids.length, 100);
  for (let i = 0; i < 15; i++) sessions.selectStop(bounded, 'A', id(i), 'stop');
  assert.equal(sessions.get(bounded, 'A').stops.size, 12);
  assert.equal(sessions.get(bounded, 'B'), null);
  const expired = sessions.create([id(1)], id(1), 'A'); now += 1800001;
  assert.equal(sessions.get(expired, 'A'), null);
});

test('direction lock yields horizontal/diagonal/multitouch/disabled fallback and accepts up/down only', () => {
  const { feedGesture } = feedModel;
  assert.equal(feedGesture(2, -100, 1, true), true);
  assert.equal(feedGesture(2, 100, 1, true), true);
  for (const args of [[100, 30, 1, true], [60, 75, 1, true], [0, 100, 2, true], [0, 100, 1, false], [0, 12, 1, true]]) assert.equal(feedGesture(...args), false);
});

test('profile feed keeps the complete loaded order and opens selections beyond discovery cap without changing Search bounds', () => {
  const sessions = feedModel.createJourneyFeedSessions();
  const ids = Array.from({ length: 125 }, (_, i) => id(i));
  const token = sessions.create(ids, id(120), 'owner', { fullCollection: true });
  assert.deepEqual(sessions.get(token, 'owner').ids, ids);
  assert.equal(sessions.get(token, 'owner').index, 120);
  assert.equal(sessions.create(ids, id(120), 'owner'), null, 'Search keeps its discovery cap');
  assert.equal(sessions.get(token, 'other'), null, 'Profile collections remain account scoped');
});

test('raw cache deduplicates, deeply isolates stop mutation, expires at 45s and bounds six entries', async () => {
  let now = 0, calls = 0; const cache = caches.createJourneyDetailCache(() => now);
  const loader = async () => { calls++; return raw(1); };
  const [a, b] = await Promise.all([cache.get(id(1), signal(), loader), cache.get(id(1), signal(), loader)]);
  assert.equal(calls, 1); a.stops[0].name = 'Mutated'; assert.equal(b.stops[0].name, 'Original');
  assert.equal((await cache.get(id(1), signal(), loader)).stops[0].name, 'Original');
  now = 45000; await cache.get(id(1), signal(), loader); assert.equal(calls, 2);
  for (let i = 2; i <= 7; i++) await cache.get(id(i), signal(), async () => raw(i));
  await cache.get(id(1), signal(), loader); assert.equal(calls, 3);
});

test('account/invalidation abort old generations and stale transports cannot repopulate', async () => {
  const cache = caches.createJourneyDetailCache(); cache.account('A');
  let finish, upstream;
  const old = cache.get(id(1), signal(), s => { upstream = s; return new Promise(resolve => { finish = resolve; }); });
  await tick(); cache.account('B'); assert.equal(upstream.aborted, true);
  finish(raw(1)); await assert.rejects(old, /cancelled/);
  const current = await cache.get(id(1), signal(), async () => ({ ...raw(1), title: 'B' }));
  assert.equal(current.title, 'B');
});

test('shared subscribers cancel independently; last consumer aborts raw transport; failures retry', async () => {
  const cache = caches.createJourneyDetailCache(); let finish, upstream;
  const a = new AbortController(), b = new AbortController();
  const loader = s => { upstream = s; return new Promise(resolve => { finish = resolve; }); };
  const one = cache.get(id(1), a.signal, loader), two = cache.get(id(1), b.signal, loader);
  await tick(); a.abort(); await assert.rejects(one); assert.equal(upstream.aborted, false);
  finish(raw(1)); assert.equal((await two).id, id(1));
  const c = new AbortController(); const pending = cache.get(id(2), c.signal, loader); await tick(); c.abort(); await assert.rejects(pending); assert.equal(upstream.aborted, true); finish(null);
  await assert.rejects(cache.get(id(3), signal(), async () => { throw new Error('offline'); }));
  assert.equal((await cache.get(id(3), signal(), async () => raw(3))).id, id(3));
});

test('first image prefetch is globally bounded, aborts native id, and ignores obsolete completion', async () => {
  const prefetch = createFirstImagePrefetch(); let finish; const aborted = [];
  const controller = new AbortController();
  const first = prefetch('first', controller.signal, (_url, request) => { request(7); return new Promise(resolve => { finish = resolve; }); }, n => aborted.push(n));
  assert.equal(await prefetch('second', signal(), () => { throw new Error('must stay bounded'); }), false);
  controller.abort(); assert.deepEqual(aborted, [7]); finish(true); assert.equal(await first, false);
  assert.equal(await prefetch('next', signal(), async () => true), true);
});

// Exercise the real route/hooks with controlled reads and native animation events.
function routeHarness({ nextDetail = raw(2) } = {}) {
  let slots = [], cursor = 0, effects = [], focused = true, foregroundListener, account = 'A', revision = 0;
  let allowed = true, detailCalls = [], membership = [], resolutions = [], prefetches = [], animations = [];
  let manualAnimations = false; const pendingAnimations = [], heldMembership = new Map();
  const sessions = feedModel.createJourneyFeedSessions();
  const token = sessions.create([id(1), id(2), id(3)], id(1), 'A');
  const cache = caches.createJourneyDetailCache();
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((x, j) => x !== slots[i].deps[j])) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((x, j) => x !== slots[i].deps[j])) { slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = fn(); }); } },
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const { useLoad } = load('src/hooks/use-load.ts', { react: hooks });
  const native = {
    View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: x => x }, Platform: { OS: 'android' },
    useWindowDimensions: () => ({ height: 800 }),
    AppState: { currentState: 'active', addEventListener(_name, fn) { foregroundListener = fn; return { remove() {} }; } },
    AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: () => ({ remove() {} }), announceForAccessibility() {} },
    Animated: { View: 'Animated', Value: class { constructor(value){this.value=value;} setValue(value){this.value=value;} stopAnimation() {} }, timing(value, options) { animations.push(options); return { start: fn => { const finish=()=>{value.setValue(options.toValue);fn({ finished: true });};if(manualAnimations)pendingAnimations.push(finish);else finish(); } }; } },
    Image: { prefetch: async url => { prefetches.push(url); return true; } },
  };
  const component = load('src/app/journey-feed.tsx', {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native,
    'expo-router': { Stack: { Screen: 'StackScreen' }, useLocalSearchParams: () => ({ session: token }), useFocusEffect: fn => hooks.useEffect(() => focused ? fn() : undefined, [fn, focused]) },
    'react-native-safe-area-context': { SafeAreaView: 'Safe' }, './journey/[id]': { JourneyStoryContent: 'Story' },
    '@/hooks/session-context': { useSessionState: () => ({ session: account ? { user: { id: account } } : null, loading: false }) },
    '@/hooks/use-load': { useLoad }, '@/components/branded-loading': { BrandedLoading: 'Loading' },
    '@/components/discovery/ui': { Message: 'Message', ScreenHeader: 'Header', ui: {} },
    '@/lib/discovery/journey-feed-session': { journeyFeedSessions: sessions }, '@/lib/discovery/journey-detail-cache': { journeyDetailCache: cache },
    '@/lib/discovery/journey-feed-prefetch': { prefetchFirstImage: createFirstImagePrefetch() },
    '@/lib/discovery/queries': {
      loadPublicJourneyCard: async (value, s) => { membership.push({ id: value, signal: s }); if(heldMembership.has(value))await heldMembership.get(value).promise; if (allowed === 'error') throw new Error('Public check unavailable'); return allowed ? raw(Number(value.slice(0, 8))) : null; },
      loadPublicJourneyMetadata: async (value, s) => { detailCalls.push({ id: value, signal: s }); return value === id(2) ? nextDetail : raw(Number(value.slice(0, 8))); },
      resolvePhotos: async (rows, s) => { resolutions.push({ rows, signal: s }); return rows.map(row => ({ ...row, cover: row.cover ? 'https://test/cover' : null, stops: row.stops.map(stop => ({ ...stop, photo: stop.photo ? `https://test/${row.id}/${++revision}` : null })) })); },
    },
  }).default;
  let tree;
  const flatten = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)];
  function render() { cursor = 0; effects = []; tree = component(); effects.forEach(fn => fn()); return flatten(tree); }
  return { render, async settle() { for (let i = 0; i < 8; i++) { render(); await tick(); } return flatten(tree); }, story: () => flatten(tree).find(node => node.type === 'Story'),
    detailCalls, membership, resolutions, prefetches, animations, sessions, token,
    manualAnimations(value){manualAnimations=value;},finishAnimation(){assert.ok(pendingAnimations.length);pendingAnimations.shift()();},
    holdMembership(value){let release;const promise=new Promise(resolve=>{release=resolve;});heldMembership.set(value,{promise,release});},
    releaseMembership(value){heldMembership.get(value).release();heldMembership.delete(value);},
    background(next) { foregroundListener(next); }, blur() { focused = false; }, focus() { focused = true; }, deny(mode = 'null') { allowed = mode === 'error' ? 'error' : false; }, account(next) { account = next; },
    dispose() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

test('route activates only one Story, prefetches next metadata/one photo, reverses with fresh membership and cached detail', async () => {
  const h = routeHarness(); await h.settle(); assert.equal(h.story().props.journey.id, id(1));assert.equal(h.story().props.saveFirst,undefined,'Feed uses the existing heart-first Story default');
  assert.deepEqual(h.detailCalls.map(x => x.id), [id(1), id(2)]);
  assert.equal(h.prefetches.length, 1);
  assert.equal(h.resolutions[1].rows[0].stops.length, 1); assert.equal(h.resolutions[1].rows[0].cover, null);
  h.story().props.feed.onStop('later'); h.story().props.feed.onPage(1); await h.settle();
  assert.equal(h.story().props.journey.id, id(2));
  h.story().props.feed.onPage(-1); await h.settle();
  assert.equal(h.story().props.journey.id, id(1)); assert.equal(h.story().props.feed.initialStop, 'later');
  assert.equal(h.detailCalls.filter(x => x.id === id(1)).length, 1);
  assert.equal(h.membership.filter(x => x.id === id(1)).length, 2);
  assert.ok(h.animations.some(x => x.toValue === -800)); assert.ok(h.animations.some(x => x.toValue === 800));
  h.dispose();
});

test('sheets block paging; background/blur remove Story; refocus revalidates and denies cached public detail', async () => {
  const h = routeHarness(); await h.settle(); const page = h.story().props.feed.onPage;
  h.story().props.feed.onAvailability(false); page(1); assert.equal(h.sessions.get(h.token, 'A').index, 0, 'Opening a mounted Story sheet fences same-tick paging'); await h.settle(); page(1); await h.settle(); assert.equal(h.story().props.journey.id, id(1));
  h.story().props.feed.onAvailability(true); await h.settle();
  h.background('background'); page(1); assert.equal(h.sessions.get(h.token, 'A').index, 0, 'Native background fence rejects a same-tick stale gesture'); await h.settle(); assert.equal(h.story(), undefined);
  h.background('active'); await h.settle(); assert.equal(h.story().props.journey.id, id(1)); assert.equal(h.membership.length, 2);
  h.blur(); await h.settle(); assert.equal(h.story(), undefined);
  h.deny(); h.focus(); await h.settle(); assert.equal(h.story(), undefined); assert.equal(h.membership.length, 3);
  h.dispose();
});

test('explicit refresh bypasses cache and account transition refuses old Search session', async () => {
  const h = routeHarness(); await h.settle(); h.story().props.refresh(); await h.settle();
  assert.equal(h.detailCalls.filter(x => x.id === id(1)).length, 2);
  h.account('B'); await h.settle(); assert.equal(h.story(), undefined);
  h.dispose();
});


test('unavailable last journey retains Previous and disables Next at the frozen result boundary', async()=>{
 const h=routeHarness();h.sessions.get(h.token,'A').index=2;h.deny();const tree=await h.settle();
 const previous=tree.find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Previous journey');
 const next=tree.find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Next journey');
 assert.equal(previous.props.disabled,false);assert.equal(next.props.disabled,true);previous.props.onPress();await h.settle();
 assert.equal(h.sessions.get(h.token,'A').index,1);h.dispose();
});


test('next-image prefetch follows a valid remembered stop and falls back for a removed stop', async()=>{
 for(const [remembered,expected] of [['later','later'],['removed','stop']]){
  const h=routeHarness();h.sessions.selectStop(h.token,'A',id(2),remembered);await h.settle();
  const nextPhoto=h.resolutions.find(call=>call.rows[0].id===id(2));
  assert.equal(nextPhoto.rows[0].stops.length,1);assert.equal(nextPhoto.rows[0].stops[0].id,expected);
  assert.equal(h.prefetches.length,1);h.dispose();
 }
});


test('About refresh denial/error releases the unmounted Story fence for previous and next recovery', async()=>{
 for(const mode of ['null','error']) for(const step of [-1,1]){
  const h=routeHarness();h.sessions.get(h.token,'A').index=1;await h.settle();const story=h.story();
  story.props.feed.onAvailability(false);await h.settle();h.deny(mode);story.props.refresh();
  const tree=await h.settle();assert.equal(h.story(),undefined);
  tree.find(n=>n.type==='Pressable'&&n.props.accessibilityLabel===(step<0?'Previous journey':'Next journey')).props.onPress();await h.settle();
  assert.equal(h.sessions.get(h.token,'A').index,1+step,mode);h.dispose();
 }
});

test('resuming after background with About open and a denied/error public check permits fallback browsing', async()=>{
 for(const mode of ['null','error']) for(const step of [-1,1]){
  const h=routeHarness();h.sessions.get(h.token,'A').index=1;await h.settle();h.story().props.feed.onAvailability(false);await h.settle();
  h.background('background');await h.settle();h.deny(mode);h.background('active');const tree=await h.settle();assert.equal(h.story(),undefined);
  tree.find(n=>n.type==='Pressable'&&n.props.accessibilityLabel===(step<0?'Previous journey':'Next journey')).props.onPress();await h.settle();
  assert.equal(h.sessions.get(h.token,'A').index,1+step,mode);h.dispose();
 }
});

test('photo-less and empty next decks retain metadata prefetch without signing/fetching an unused cover', async()=>{
 for(const nextDetail of [{...raw(2),stops:[{...raw(2).stops[0],photo:null}]},{...raw(2),stops:[]}]){
  const h=routeHarness({nextDetail});await h.settle();
  assert.ok(h.detailCalls.some(call=>call.id===id(2)));assert.equal(h.prefetches.length,0);
  assert.equal(h.resolutions.filter(call=>call.rows[0].id===id(2)).length,0);h.dispose();
 }
});


test('upward and downward loaders stay outside nonzero Story transforms, with no loader after data arrives',async()=>{
 const h=routeHarness();await h.settle();h.manualAnimations(true);
 for(const [step,target,expectedOffset]of[[1,id(2),192],[-1,id(1),-192]]){
  h.holdMembership(target);h.story().props.feed.onPage(step);h.render();h.finishAnimation();
  const loading=h.render();assert.ok(loading.some(n=>n.type==='Loading'));assert.equal(loading.filter(n=>n.type==='Animated').length,0,'Loading is never inside the translated Story');assert.equal(h.story(),undefined,'No stale Story retained while gating next detail');
  h.releaseMembership(target);const incoming=await h.settle();assert.equal(incoming.some(n=>n.type==='Loading'),false);assert.equal(h.story().props.journey.id,target);assert.equal(h.story().props.feed.enabled,false,'Interactions stay locked during entry');
  const animated=incoming.find(n=>n.type==='Animated');assert.equal(animated.props.style[1].transform[0].translateY.value,expectedOffset);
  h.finishAnimation();await h.settle();assert.equal(h.story().props.feed.enabled,true);
 }
 h.dispose();
});
