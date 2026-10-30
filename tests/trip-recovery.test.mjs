import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(file, modules = {}, clock = globalThis) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', code)(name => { assert.ok(name in modules, name); return modules[name]; }, exports, clock.setTimeout, clock.clearTimeout);
  return exports;
}
const tick = async () => { for (let i = 0; i < 20; i++) await new Promise(setImmediate); };
const isJourneyId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const preview = load('src/lib/journey/travel-preview.ts', { '../discovery/model': { isJourneyId } });
const sessions = load('src/lib/journey/trip-session.ts', { './travel-preview': preview });
const recovery = load('src/lib/journey/trip-recovery.ts');
const gps = load('src/lib/journey/foreground-location.ts');
const uid = '22222222-2222-4222-8222-222222222222', other = '44444444-4444-4444-8444-444444444444';
const journeyId = '11111111-1111-4111-8111-111111111111', tripId = '55555555-5555-4555-8555-555555555555';
const NOW = Date.parse('2026-10-30T00:00:00Z'), DAY = 24 * 60 * 60 * 1000;
const stop = (n, extra = {}) => ({ id: 'stop-' + n, name: 'Stop ' + n, description: '', sequence: n, dayNumber: null, photo: null, rating: null, latitude: 8 + n, longitude: 76 + n, ...extra });
const journey = { id: journeyId, title: 'Coast trip', description: '', destination: 'Kerala', destinationSlug: 'kerala', creatorName: 'A', creatorUsername: null, travelerType: 'solo', durationDays: 1, likes: 0, cover: null, stops: [stop(1), stop(2), stop(3)] };

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return { data, getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); }, removeItem: async key => { data.delete(key); } };
}
const failingStorage = () => ({ getItem: async () => { throw Error('disk'); }, setItem: () => { throw Error('disk'); }, removeItem: async () => { throw Error('disk'); } });
const publicMeta = { sourceId: null, isAddedStop: () => false };
function clockStore() { let time = 1000; const store = sessions.createTripStore(() => time); return { store, advance: ms => { time += ms; } }; }
function appPort() { const listeners = []; return { listeners, addEventListener: (_e, fn) => { listeners.push(fn); return { remove() {} }; }, emit: state => listeners.forEach(fn => fn(state)) }; }
const forbidden = /^(lat|lng|lon|latitude|longitude|coords?|coordinates|heading|accuracy|speed|position|location|fix|route|track|geometry|direction)$/i;
function keysDeep(value, path = []) {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => [[...path, key], ...keysDeep(child, [...path, key])]);
}
function persistenceHarness(seed = {}, meta = () => publicMeta) {
  const storage = memoryStorage(seed), clock = clockStore(), app = appPort(), wall = { now: NOW };
  const store = recovery.createTripRecovery(storage, () => wall.now);
  const persistence = recovery.createTripPersistence({ store: clock.store, recovery: store, app, meta, wallNow: () => wall.now });
  const saved = () => storage.data.has(recovery.tripRecoveryKey(uid)) ? JSON.parse(storage.data.get(recovery.tripRecoveryKey(uid))) : null;
  return { storage, clock, app, wall, store, persistence, saved, trips: clock.store };
}

test('only active or paused trips are kept; ready, finished and completed never are', async () => {
  const h = persistenceHarness();
  h.persistence.track(uid, journeyId); await tick();
  assert.equal(h.saved(), null, 'Ready: nothing stored');
  h.trips.transition(journey, 'begin', h.trips.get(journeyId)); await tick();
  assert.equal(h.saved().status, 'active'); assert.deepEqual(h.saved().stopIds, ['stop-1', 'stop-2', 'stop-3']);
  h.trips.transition(journey, 'pause', h.trips.get(journeyId)); await tick();
  assert.equal(h.saved().status, 'paused');
  h.trips.transition(journey, 'finish', h.trips.get(journeyId)); await tick();
  assert.equal(h.saved(), null, 'Finished trips are cleared');
  h.trips.transition(journey, 'new', h.trips.get(journeyId)); h.trips.transition(journey, 'begin', h.trips.get(journeyId));
  for (const id of ['stop-1', 'stop-2']) h.trips.completeStop(journeyId, id, h.trips.get(journeyId));
  await tick(); assert.deepEqual(h.saved().completedStopIds, ['stop-1', 'stop-2']); assert.equal(h.saved().destinationId, 'stop-3');
  h.trips.completeStop(journeyId, 'stop-3', h.trips.get(journeyId)); await tick();
  assert.equal(h.trips.get(journeyId).status, 'completed'); assert.equal(h.saved(), null, 'Completed trips are cleared');
  for (const status of ['ready', 'finished', 'completed']) assert.equal(recovery.buildTripRecovery(uid, { ...h.trips.get(journeyId), status }, 0, publicMeta, NOW), null);
});

test('no GPS fix, heading or track is ever written; only added search places keep their place coordinates', async () => {
  const h = persistenceHarness();
  h.persistence.track(uid, journeyId); h.trips.transition(journey, 'begin', h.trips.get(journeyId)); await tick();
  const raw = h.storage.data.get(recovery.tripRecoveryKey(uid));
  assert.deepEqual(keysDeep(JSON.parse(raw)).filter(path => forbidden.test(path.at(-1))), [], 'A public trip stores no coordinates at all');
  assert.doesNotMatch(raw, /latitude|longitude|heading|accuracy/);
  // A customized route with one place added from search keeps just that place's coordinates.
  const added = { id: 'added-1', name: 'Cafe', description: '', sequence: 4, dayNumber: null, photo: null, rating: null, latitude: 9.5, longitude: 76.5 };
  const custom = { ...journey, id: tripId, stops: [stop(1), added] };
  const c = persistenceHarness({}, () => ({ sourceId: journeyId, isAddedStop: id => id === 'added-1' }));
  c.persistence.track(uid, tripId); c.trips.transition(custom, 'begin', c.trips.get(tripId)); await tick();
  const copy = c.saved();
  assert.deepEqual(copy.addedStops, [{ id: 'added-1', name: 'Cafe', latitude: 9.5, longitude: 76.5 }]);
  const located = keysDeep(copy).filter(path => forbidden.test(path.at(-1)));
  assert.ok(located.every(path => path[0] === 'addedStops'), 'Coordinates appear only on added search places: ' + JSON.stringify(located));
  assert.equal(copy.customized, true); assert.equal(copy.sourceId, journeyId);
});

test('elapsed time is what had passed when saved; time while the app was closed is never added', async () => {
  const h = persistenceHarness();
  h.persistence.track(uid, journeyId); h.trips.transition(journey, 'begin', h.trips.get(journeyId));
  h.clock.advance(5000); h.app.emit('background'); await tick();
  assert.equal(h.saved().elapsedMs, 5000, 'Background save captures the running time');
  // Hours later, a fresh process restores it.
  const later = clockStore(); later.advance(10 * 60 * 60 * 1000);
  const copy = recovery.parseTripRecovery(JSON.stringify(h.saved()), uid, NOW + 3600000);
  const rebuilt = recovery.rebuildTripJourney(copy, journey);
  assert.equal(later.store.restore(rebuilt, copy), true);
  const restored = later.store.get(journeyId);
  assert.equal(restored.status, 'paused', 'Restored as paused even though it was active');
  assert.equal(sessions.elapsedTime(restored, later.store.now() + 999999), 5000);
});

test('restored trip is paused and location starts only when the user taps Resume', async () => {
  let watches = 0;
  const port = { permission: async () => ({ granted: true, canAskAgain: true }), services: async () => true, watch: async () => { watches++; return { remove() {} }; } };
  const controller = gps.createForegroundLocation(port, () => 100000, { set: () => 0, clear() {} });
  const { store } = clockStore();
  const copy = recovery.parseTripRecovery(JSON.stringify({ version: 1, userId: uid, journeyId, customized: false, sourceId: null, status: 'active', elapsedMs: 1200, completedStopIds: ['stop-1'], destinationId: 'stop-2', title: 'Coast trip', plannedStops: 3, stopIds: ['stop-1', 'stop-2', 'stop-3'], addedStops: [], savedAt: NOW }), uid, NOW);
  store.restore(recovery.rebuildTripJourney(copy, journey), copy);
  controller.sync(store.get(journeyId).status, true, true); await tick();
  assert.equal(watches, 0, 'No GPS on restore');
  assert.equal(store.restore(journey, copy), false, 'Never over a live session');
  store.transition(journey, 'resume', store.get(journeyId)); controller.sync(store.get(journeyId).status, true, true); await tick();
  assert.equal(watches, 1, 'Resume (user action) starts GPS');
});

test('copies are per user, pruned after 7 days, and damaged or foreign data is removed', async () => {
  const key = recovery.tripRecoveryKey(uid), good = { version: 1, userId: uid, journeyId, customized: false, sourceId: null, status: 'paused', elapsedMs: 10, completedStopIds: [], destinationId: 'stop-1', title: 'Coast trip', plannedStops: 3, stopIds: ['stop-1', 'stop-2', 'stop-3'], addedStops: [], savedAt: NOW - DAY };
  const storage = memoryStorage({ [key]: JSON.stringify(good) }), store = recovery.createTripRecovery(storage, () => NOW);
  assert.equal((await store.load(uid)).title, 'Coast trip');
  assert.equal(await store.load(other), null, 'Another user has no copy');
  storage.data.set(recovery.tripRecoveryKey(other), JSON.stringify(good));
  assert.equal(await store.load(other), null, 'A copy naming another user is ignored'); assert.equal(storage.data.has(recovery.tripRecoveryKey(other)), false);
  for (const bad of ['{nope', JSON.stringify({ ...good, version: 2 }), JSON.stringify({ ...good, savedAt: NOW - 8 * DAY }), JSON.stringify({ ...good, completedStopIds: ['stop-2'] }), JSON.stringify({ ...good, addedStops: [{ id: 'stop-1', name: 'x', latitude: 1, longitude: 1 }] })]) {
    storage.data.set(key, bad); assert.equal(await store.load(uid), null); assert.equal(storage.data.has(key), false);
  }
  assert.equal(recovery.parseTripRecovery(JSON.stringify(good), uid, NOW + 6 * DAY).title, 'Coast trip', 'Within 7 days is kept');
});

test('finish clears only its own copy; sign-out clears and drops late writes', async () => {
  const h = persistenceHarness();
  h.persistence.track(uid, journeyId); h.trips.transition(journey, 'begin', h.trips.get(journeyId)); await tick();
  const second = { ...journey, id: tripId };
  h.persistence.track(uid, tripId); h.trips.transition(second, 'begin', h.trips.get(tripId)); await tick();
  assert.equal(h.saved().journeyId, tripId, 'One recoverable trip per user: the latest change wins');
  h.trips.transition(journey, 'finish', h.trips.get(journeyId)); await tick();
  assert.equal(h.saved().journeyId, tripId, 'Finishing another trip leaves this copy');
  await h.persistence.clearUser(uid);
  assert.equal(h.saved(), null);
  h.trips.transition(second, 'pause', h.trips.get(tripId)); h.app.emit('background'); await tick();
  assert.equal(h.saved(), null, 'A trip still in memory after sign-out is not written again');
});

test('rebuild: changed or missing journeys cannot be resumed; customized routes rebuild with added places', () => {
  const copy = { version: 1, userId: uid, journeyId, customized: false, sourceId: null, status: 'paused', elapsedMs: 0, completedStopIds: [], destinationId: 'stop-1', title: 'Coast trip', plannedStops: 3, stopIds: ['stop-1', 'stop-2', 'stop-3'], addedStops: [], savedAt: NOW };
  assert.ok(recovery.rebuildTripJourney(copy, journey));
  assert.equal(recovery.rebuildTripJourney(copy, null), null, 'Not found / not public');
  assert.equal(recovery.rebuildTripJourney(copy, { ...journey, stops: [stop(1), stop(2)] }), null, 'Stops changed');
  const custom = { ...copy, journeyId: tripId, customized: true, sourceId: journeyId, plannedStops: 2, stopIds: ['stop-3', 'added-1'], destinationId: 'stop-3', addedStops: [{ id: 'added-1', name: 'Cafe', latitude: 9.5, longitude: 76.5 }] };
  const rebuilt = recovery.rebuildTripJourney(custom, journey);
  assert.equal(rebuilt.id, tripId); assert.deepEqual(rebuilt.stops.map(s => s.id), ['stop-3', 'added-1']); assert.equal(rebuilt.stops[1].latitude, 9.5);
  assert.equal(recovery.rebuildTripJourney(custom, { ...journey, stops: [stop(1)] }), null, 'A selected source stop disappeared');
  assert.equal(recovery.tripRecoveryPrompt({ ...copy, completedStopIds: ['a', 'b'], plannedStops: 5 }).body, 'You’d completed 2 of 5 stops.');
});

test('storage failures never throw and never block travel', async () => {
  const store = recovery.createTripRecovery(failingStorage(), () => NOW);
  await assert.doesNotReject(store.save({ userId: uid })); assert.equal(await store.load(uid), null);
  await assert.doesNotReject(store.clear(uid, journeyId)); await assert.doesNotReject(store.clearUser(uid));
  const clock = clockStore(), app = appPort();
  const persistence = recovery.createTripPersistence({ store: clock.store, recovery: store, app, meta: () => publicMeta, wallNow: () => NOW });
  persistence.track(uid, journeyId);
  assert.equal(clock.store.transition(journey, 'begin', clock.store.get(journeyId)), true); app.emit('background'); await tick();
  assert.equal(clock.store.get(journeyId).status, 'active');
});

// Travel Mode hook: prompt, Resume (paused, no GPS), Discard and unavailable journeys.
function harness() {
  const slots = []; let cursor = 0, effects = [];
  const memo = (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => slots[i].deps[j] !== v)) slots[i] = { value: fn(), deps }; return slots[i].value; };
  const hooks = { useMemo: memo, useCallback: (fn, deps) => memo(() => fn, deps), useSyncExternalStore: (_subscribe, get) => get(),
    useState: value => { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; },
    useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect: (fn, deps) => { const i = cursor++; if (!deps || !slots[i] || deps.some((v, j) => slots[i].deps?.[j] !== v)) { slots[i]?.cleanup?.(); const slot = { deps }; slots[i] = slot; effects.push(() => { slot.cleanup = fn(); }); } },
  };
  return { hooks, unmount() { slots.forEach(slot => slot?.cleanup?.()); }, render(fn, ...args) { cursor = 0; effects = []; const result = fn(...args); effects.forEach(run => run()); return result; } };
}
function travelHarness({ seed = {}, source = journey, userId = uid, fail = false, loader = null, clock: timers = globalThis } = {}) {
  const h = harness(), alerts = [], storage = memoryStorage(seed), clock = clockStore(), app = appPort(), loads = [];
  let next = 0, focusFn = null, focusCleanup = null;
  const custom = load('src/lib/journey/customized-travel.ts', { '../create/id': { randomUUID: () => '66666666-6666-4666-8666-' + String(++next).padStart(12, '0') }, './trip-session': { tripStore: clock.store }, './travel-preview': preview });
  const store = recovery.createTripRecovery(storage, () => NOW);
  const persistence = recovery.createTripPersistence({ store: clock.store, recovery: store, app, meta: id => ({ sourceId: custom.customizedSourceId(id), isAddedStop: custom.isAddedCustomizedStop }), wallNow: () => NOW });
  const hook = load('src/hooks/use-trip-recovery.ts', { react: h.hooks, 'react-native': { Alert: { alert: (...args) => alerts.push(args) } },
    'expo-router': { useFocusEffect: fn => h.hooks.useEffect(() => { focusFn = fn; focusCleanup = fn(); return () => focusCleanup?.(); }, [fn]) }, '@/hooks/session-context': { useSessionState: () => ({ loading: false, session: userId ? { user: { id: userId } } : null }) },
    '@/lib/discovery/queries': { loadPublicJourney: async (id, signal) => { loads.push(id); if (loader) return loader(id, signal); if (fail) throw Error('offline'); return source; } },
    '@/lib/journey/customized-travel': custom, '@/lib/journey/trip-session': { tripStore: clock.store }, '@/lib/journey/travel-preview': preview,
    '@/lib/journey/trip-recovery-store': { tripRecovery: store, tripPersistence: persistence }, '@/lib/journey/trip-recovery': recovery }, timers);
  return { h, hook, alerts, storage, trips: clock.store, custom, loads, store,
    async open(routeId, id = null, hold = false) { let out = h.render(hook.useTripRecovery, routeId, id, hold); await tick(); out = h.render(hook.useTripRecovery, routeId, id, hold); h.render(hook.useTripRecovery, routeId, id, hold); return out; },
    blur() { focusCleanup?.(); focusCleanup = null; }, focus() { focusCleanup = focusFn(); },
    rerender(routeId, id = null, hold = false) { return h.render(hook.useTripRecovery, routeId, id, hold); } };
}
const key = recovery.tripRecoveryKey(uid);
const copyOf = extra => JSON.stringify({ version: 1, userId: uid, journeyId, customized: false, sourceId: null, status: 'active', elapsedMs: 4200, completedStopIds: ['stop-1', 'stop-2'], destinationId: 'stop-3', title: 'Coast trip', plannedStops: 3, stopIds: ['stop-1', 'stop-2', 'stop-3'], addedStops: [], savedAt: NOW - 1000, ...extra });

test('Travel Mode offers "Resume your trip?"; Resume restores it paused without starting GPS', async () => {
  const t = travelHarness({ seed: { [key]: copyOf() } });
  await t.open(journeyId, journeyId);
  assert.equal(t.alerts.length, 1);
  const [title, body, buttons, options] = t.alerts[0];
  assert.equal(title, 'Resume your trip?'); assert.equal(body, 'You’d completed 2 of 3 stops.');
  assert.deepEqual(buttons.map(b => b.text), ['Discard', 'Resume']); assert.equal(options.cancelable, false);
  assert.equal(t.trips.get(journeyId).status, 'ready', 'Nothing restored until chosen');
  buttons.find(b => b.text === 'Resume').onPress(); await tick();
  const session = t.trips.get(journeyId);
  assert.equal(session.status, 'paused'); assert.equal(session.activeSince, null); assert.equal(session.elapsedMs, 4200);
  assert.deepEqual(session.completedStopIds, ['stop-1', 'stop-2']); assert.equal(session.destinationId, 'stop-3');
  assert.equal(JSON.parse(t.storage.data.get(key)).status, 'paused', 'Tracked again as a paused copy');
});

test('Discard clears the copy and leaves Travel Mode ready', async () => {
  const t = travelHarness({ seed: { [key]: copyOf() } });
  await t.open(journeyId, journeyId);
  t.alerts[0][2].find(b => b.text === 'Discard').onPress(); await tick();
  assert.equal(t.storage.data.has(key), false); assert.equal(t.trips.get(journeyId).status, 'ready');
});

test('an unavailable or changed journey discards the copy and says so', async () => {
  const gone = travelHarness({ seed: { [key]: copyOf() }, source: null });
  const out = await gone.open(journeyId);
  assert.equal(out.notice, 'This journey is no longer available.'); assert.equal(gone.storage.data.has(key), false);
  assert.deepEqual(gone.alerts.map(a => a[1]), ['This journey is no longer available.']);
  const changed = travelHarness({ seed: { [key]: copyOf() }, source: { ...journey, stops: [stop(1), stop(3)] } });
  assert.equal((await changed.open(journeyId, journeyId)).notice, 'This journey is no longer available.'); assert.equal(changed.storage.data.has(key), false);
  const offline = travelHarness({ seed: { [key]: copyOf() }, fail: true });
  const off = await offline.open(journeyId, journeyId);
  assert.equal(off.notice, null); assert.equal(offline.alerts.length, 0); assert.ok(offline.storage.data.has(key), 'A failed load keeps the copy for later');
});

test('a customized trip is rebuilt from its source after a restart, including added places', async () => {
  const seed = { [key]: copyOf({ journeyId: tripId, customized: true, sourceId: journeyId, plannedStops: 2, stopIds: ['stop-3', 'added-1'], completedStopIds: [], destinationId: 'stop-3', addedStops: [{ id: 'added-1', name: 'Cafe', latitude: 9.5, longitude: 76.5 }] }) };
  const t = travelHarness({ seed });
  const out = await t.open(tripId);
  assert.equal(out.checking, true, 'Loading while the choice is open, not "unavailable"');
  assert.deepEqual(t.loads, [journeyId], 'Only the public source is loaded');
  t.alerts[0][2].find(b => b.text === 'Resume').onPress(); await tick();
  assert.deepEqual(t.custom.customizedTravel(tripId).stops.map(s => s.id), ['stop-3', 'added-1']);
  assert.equal(t.custom.isAddedCustomizedStop('added-1'), true); assert.equal(t.trips.get(tripId).status, 'paused');
  assert.equal(t.rerender(tripId, tripId).checking, false);
});

test('Travel Mode never offers another user\'s copy or offers when signed out', async () => {
  const theirs = travelHarness({ seed: { [recovery.tripRecoveryKey(other)]: copyOf({ userId: other }) } });
  await theirs.open(journeyId, journeyId); assert.equal(theirs.alerts.length, 0);
  const signedOut = travelHarness({ seed: { [key]: copyOf() }, userId: null });
  const out = await signedOut.open(journeyId, journeyId); assert.equal(signedOut.alerts.length, 0); assert.equal(out.checking, false);
  assert.ok(signedOut.storage.data.has(key));
});

test('Home card shows only the signed-in user\'s valid copy', async () => {
  const seed = { [key]: copyOf(), [recovery.tripRecoveryKey(other)]: 'broken' };
  const t = travelHarness({ seed });
  t.h.render(t.hook.useUnfinishedTrip, uid); await tick();
  assert.equal(t.h.render(t.hook.useUnfinishedTrip, uid).title, 'Coast trip');
  assert.equal(t.h.render(t.hook.useUnfinishedTrip, other), null, 'Never shown to another user');
  assert.equal(t.h.render(t.hook.useUnfinishedTrip, null), null, 'Signed out: no card');
  const expired = travelHarness({ seed: { [key]: copyOf({ savedAt: NOW - 8 * DAY }) } });
  expired.h.render(expired.hook.useUnfinishedTrip, uid); await tick();
  assert.equal(expired.h.render(expired.hook.useUnfinishedTrip, uid), null); assert.equal(expired.storage.data.has(key), false);
});

test('M1: a trip begun while the check loads is never offered, and Discard never removes a live trip copy', async () => {
  let release; const t = travelHarness({ seed: { [key]: copyOf() }, loader: () => new Promise(resolve => { release = resolve; }) });
  t.rerender(journeyId, journeyId); await tick();
  assert.equal(t.rerender(journeyId, journeyId).checking, true, 'Begin is held while checking');
  t.trips.transition(journey, 'begin', t.trips.get(journeyId)); await tick();
  release(journey); await tick(); const out = t.rerender(journeyId, journeyId); t.rerender(journeyId, journeyId); await tick();
  assert.equal(t.alerts.length, 0, 'No prompt over a live trip'); assert.equal(out.checking, false);
  assert.equal(JSON.parse(t.storage.data.get(key)).status, 'active', 'The live trip keeps its own copy');
  // Offer ready, but a trip starts before the prompt can show (e.g. while unfocused).
  const late = travelHarness({ seed: { [key]: copyOf() } });
  await late.open(journeyId, journeyId, true);
  assert.equal(late.alerts.length, 0, 'Held while a permission request may be showing');
  late.trips.transition(journey, 'begin', late.trips.get(journeyId)); late.rerender(journeyId, journeyId); await tick(); late.rerender(journeyId, journeyId);
  assert.equal(late.alerts.length, 0, 'Offer dropped once a trip is live'); assert.equal(late.rerender(journeyId, journeyId).checking, false);
  // Prompt showing, then a trip goes live: Discard keeps that trip's copy.
  const shown = travelHarness({ seed: { [key]: copyOf() } });
  await shown.open(journeyId, journeyId);
  shown.trips.transition(journey, 'begin', shown.trips.get(journeyId)); await tick();
  shown.alerts[0][2].find(b => b.text === 'Discard').onPress(); await tick();
  assert.equal(JSON.parse(shown.storage.data.get(key)).status, 'active');
  shown.alerts[0][2].find(b => b.text === 'Resume').onPress();
  assert.equal(shown.trips.get(journeyId).status, 'active', 'Resume cannot overwrite the live trip');
});

test('L6: the resume prompt waits while a location-permission request may be on screen', async () => {
  const t = travelHarness({ seed: { [key]: copyOf() } });
  await t.open(journeyId, journeyId, true);
  assert.equal(t.alerts.length, 0);
  t.rerender(journeyId, journeyId, false);
  assert.equal(t.alerts.length, 1);
});

test('L2: a hung check times out with a try-again message, keeps the copy, and an unanswered offer is asked again on refocus', async () => {
  const pending = new Map(); let serial = 0;
  const timers = { setTimeout: (fn, ms) => { pending.set(++serial, { fn, ms }); return serial; }, clearTimeout: id => pending.delete(id) };
  let signal; const t = travelHarness({ seed: { [key]: copyOf({ journeyId: tripId, customized: true, sourceId: journeyId, plannedStops: 2, stopIds: ['stop-3', 'stop-1'], completedStopIds: [], destinationId: 'stop-3' }) }, loader: (_id, s) => { signal = s; return new Promise(() => {}); }, clock: timers });
  t.rerender(tripId); await tick();
  assert.equal(t.rerender(tripId).checking, true);
  const [timeout] = [...pending.values()]; assert.equal(timeout.ms, 15000);
  timeout.fn(); const out = t.rerender(tripId);
  assert.equal(out.checking, false); assert.equal(out.retryNotice, 'We couldn’t reopen your saved trip. Check your connection and try again.');
  assert.equal(signal.aborted, true); assert.ok(t.storage.data.has(key), 'Copy kept'); assert.equal(t.alerts.length, 0);
  out.retry(); t.rerender(tripId); await tick();
  assert.equal(t.rerender(tripId).retryNotice, null); assert.equal(t.loads.length, 2, 'Try again checks once more');
  // Refocus re-asks a prompt that was shown but never answered.
  const r = travelHarness({ seed: { [key]: copyOf() } });
  await r.open(journeyId, journeyId); assert.equal(r.alerts.length, 1);
  r.blur(); r.rerender(journeyId, journeyId); r.focus(); r.rerender(journeyId, journeyId); r.rerender(journeyId, journeyId);
  assert.equal(r.alerts.length, 2);
});

test('M2: after A signs out, A\'s in-memory trip is never saved under B or shown on B\'s Home', async () => {
  const storage = memoryStorage(), clock = clockStore(), app = appPort();
  const store = recovery.createTripRecovery(storage, () => NOW);
  const persistence = recovery.createTripPersistence({ store: clock.store, recovery: store, app, meta: () => publicMeta, wallNow: () => NOW, forget: () => clock.store.clearAll() });
  persistence.track(uid, journeyId); clock.store.transition(journey, 'begin', clock.store.get(journeyId)); await tick();
  assert.ok(storage.data.has(recovery.tripRecoveryKey(uid)));
  await persistence.clearUser(uid);
  assert.equal(clock.store.get(journeyId).status, 'ready', 'A\'s live trip is dropped from memory on sign-out');
  persistence.track(other, journeyId); app.emit('background'); await tick();
  assert.equal(storage.data.size, 0, 'Nothing is written under B');
  assert.equal(await store.load(other), null, 'B\'s Home has no card');
});

test('L3/L4: customized copies naming themselves as source, and future-dated copies, are rejected', () => {
  const base = JSON.parse(copyOf());
  assert.equal(recovery.parseTripRecovery(JSON.stringify({ ...base, customized: true, sourceId: journeyId }), uid, NOW), null);
  assert.ok(recovery.parseTripRecovery(JSON.stringify({ ...base, customized: true, journeyId: tripId, sourceId: journeyId }), uid, NOW));
  assert.ok(recovery.parseTripRecovery(JSON.stringify({ ...base, savedAt: NOW + 4 * 60 * 1000 }), uid, NOW), 'Small clock slack allowed');
  assert.equal(recovery.parseTripRecovery(JSON.stringify({ ...base, savedAt: NOW + 6 * 60 * 1000 }), uid, NOW), null);
});

test('GPS stays off through the real Travel location hook after a restore until the user taps Resume', async () => {
  const h = harness(), { store } = clockStore(); let watches = 0, permissions = 0;
  const port = { permission: async () => { permissions++; return { granted: true, canAskAgain: true }; }, services: async () => true, watch: async () => { watches++; return { remove() {} }; } };
  const { useTripLocation } = load('src/hooks/use-trip-location.ts', { react: h.hooks, 'expo-router': { useFocusEffect: fn => h.hooks.useEffect(fn, [fn]) },
    'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) }, Platform: { OS: 'android' } },
    '@/lib/journey/foreground-location': gps, '@/lib/journey/location-port': { locationPort: port }, '@/lib/journey/trip-session': { tripStore: store },
    '@/hooks/use-journey-buddy': { useBuddyCelebration: () => () => {} } });
  h.render(useTripLocation, journey, store.get(journeyId)); await tick();
  assert.ok(permissions >= 1, 'Ready Travel Mode only checks permission'); assert.equal(watches, 0);
  const copy = recovery.parseTripRecovery(copyOf(), uid, NOW);
  assert.equal(store.restore(recovery.rebuildTripJourney(copy, journey), copy), true);
  h.render(useTripLocation, journey, store.get(journeyId)); await tick();
  assert.equal(store.get(journeyId).status, 'paused'); assert.equal(watches, 0, 'Restoring never starts a GPS watch');
  store.transition(journey, 'resume', store.get(journeyId)); await tick();
  assert.equal(watches, 1, 'Only the Resume action starts GPS');
  h.unmount();
});
