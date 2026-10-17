import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('src/lib/journey/trip-session.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const module = { exports: {} };
new Function('require', 'module', 'exports', source)(() => ({
  canOpenTravelMode: journey => Boolean(journey && /^[0-9a-f-]{36}$/i.test(journey.id) && journey.title && journey.stops.length),
}), module, module.exports);
const { createTripStore, elapsedTime, formatTripTime, monotonicClock, observeTripTimer, tripDestination } = module.exports;
const id = '11111111-1111-4111-8111-111111111111';
const journey = { id, title: 'Coastal journey', stops: [{ id: 'first', sequence: 0, name: 'First' }] };
function fixture() {
  let time = 1000;
  const store = createTripStore(() => time);
  const act = action => store.transition(journey, action, store.get(id));
  return { store, act, advance: value => { time += value; }, elapsed: () => elapsedTime(store.get(id), store.now()) };
}

test('every state accepts only its explicit transitions and rejects stale/double taps', () => {
  const allowed = { ready: ['begin'], active: ['pause', 'finish'], paused: ['resume', 'finish'], finished: ['new'] };
  for (const status of Object.keys(allowed)) for (const action of ['begin', 'pause', 'resume', 'finish', 'new']) {
    const f = fixture();
    if (status !== 'ready') f.act('begin');
    if (status === 'paused') f.act('pause');
    if (status === 'finished') f.act('finish');
    const before = f.store.get(id); let notified = 0;
    const unsubscribe = f.store.subscribe(() => notified++);
    const valid = allowed[status].includes(action);
    assert.equal(f.store.transition(journey, action, before), valid, status + ' → ' + action);
    assert.equal(notified, valid ? 1 : 0);
    assert.equal(f.store.transition(journey, action, before), false, 'Repeated callback is rejected');
    if (!valid) assert.equal(f.store.get(id), before);
    unsubscribe();
  }
});

test('elapsed time derives from timestamps, excludes paused time, and freezes on either finish path', () => {
  const f = fixture();
  f.act('begin'); f.advance(1537); assert.equal(f.elapsed(), 1537);
  f.act('pause'); f.advance(92000); assert.equal(f.elapsed(), 1537);
  f.act('resume'); f.advance(2981); assert.equal(f.elapsed(), 4518);
  f.act('finish'); f.advance(999999); assert.equal(f.elapsed(), 4518);
  assert.equal(f.act('resume'), false); assert.equal(f.act('begin'), false);
  assert.equal(f.act('new'), true); assert.equal(f.store.get(id).status, 'ready'); assert.equal(f.elapsed(), 0);
  f.act('begin'); f.advance(777); f.act('pause'); f.advance(9000); f.act('finish'); assert.equal(f.elapsed(), 777);
});

test('sessions survive new subscribers/reentry, isolate journey keys, and reset only in a new process store', () => {
  const f = fixture(); f.act('begin'); f.advance(10000);
  const session = f.store.get(id), unsubscribe = f.store.subscribe(() => {}); unsubscribe();
  assert.equal(f.store.get(id), session); assert.equal(f.elapsed(), 10000);
  assert.deepEqual(session.journey, journey); assert.notEqual(session.journey, journey);
  assert.notEqual(session.journey.stops[0], journey.stops[0], 'Session itinerary is copied in process memory');
  assert.equal(f.store.get('another-id').status, 'ready');
  const other = { ...journey, id: '22222222-2222-4222-8222-222222222222' };
  assert.equal(f.store.transition(other, 'begin', f.store.get(other.id)), true);
  assert.equal(f.store.get(id), session, 'A different journey cannot replace this session');
  assert.equal(createTripStore().get(id).status, 'ready', 'No persistent restart restoration');
  f.act('finish');
  assert.equal(f.store.get(id).title, journey.title); assert.equal(f.store.get(id).plannedStops, 1);
  assert.equal(f.store.transition({ ...journey, title: 'Changed', stops: [...journey.stops, journey.stops[0]] }, 'begin', f.store.get(id)), false);
  assert.equal(f.store.get(id).title, journey.title, 'Finished summary does not silently adopt different metadata');
});

test('invalid and empty journeys cannot allocate or begin a session', () => {
  const f = fixture();
  for (const invalid of [{ ...journey, id: 'invalid' }, { ...journey, stops: [] }, { ...journey, title: '' }]) {
    const before = f.store.get(invalid.id);
    assert.equal(f.store.transition(invalid, 'begin', before), false);
    assert.equal(f.store.get(invalid.id), before);
  }
});

test('monotonic clock clamps backward/invalid samples and duration formatting handles hours', () => {
  let value = 10; const now = monotonicClock(() => value);
  assert.equal(now(), 10); value = 3; assert.equal(now(), 10); value = NaN; assert.equal(now(), 10); value = 200; assert.equal(now(), 200);
  assert.equal(formatTripTime(0), '00:00'); assert.equal(formatTripTime(59999), '00:59');
  assert.equal(formatTripTime(60500), '01:00'); assert.equal(formatTripTime(3661000), '1:01:01');
  assert.equal(formatTripTime(360000000), '100:00:00');
});

test('display timer stops in background, restarts once on foreground, and ignores stale ticks after cleanup', () => {
  const pending = new Map(); let next = 0, listener, removed = 0, updates = 0;
  const app = { currentState: 'active', addEventListener: (_, callback) => { listener = callback; return { remove: () => removed++ }; } };
  const timers = { setInterval: (callback, delay) => { assert.equal(delay, 1000); pending.set(++next, callback); return next; }, clearInterval: key => pending.delete(key) };
  const dispose = observeTripTimer(app, () => updates++, timers);
  assert.equal(pending.size, 1); const lateTick = pending.values().next().value; lateTick(); assert.equal(updates, 1);
  listener('background'); assert.equal(pending.size, 0); lateTick(); assert.equal(updates, 1);
  listener('inactive'); assert.equal(pending.size, 0);
  listener('active'); assert.equal(pending.size, 1); assert.equal(updates, 2);
  listener('active'); assert.equal(pending.size, 1);
  dispose(); assert.equal(pending.size, 0); assert.equal(removed, 1);
  const count = updates; lateTick(); listener('active'); assert.equal(updates, count); assert.equal(pending.size, 0);
  app.currentState = 'background'; const other = observeTripTimer(app, () => updates++, timers);
  assert.equal(pending.size, 0); other();
});

test('default timer wrappers do not call host timer functions with an arbitrary object receiver', () => {
  const isolated = { exports: {} }; let scheduled = 0, cleared = 0;
  function hostInterval(callback, delay) { 'use strict'; assert.equal(this, undefined); assert.equal(delay, 1000); scheduled++; return 42; }
  function hostClear(value) { 'use strict'; assert.equal(this, undefined); assert.equal(value, 42); cleared++; }
  new Function('require', 'module', 'exports', 'setInterval', 'clearInterval', source)(() => ({}), isolated, isolated.exports, hostInterval, hostClear);
  const cleanup = isolated.exports.observeTripTimer({ currentState: 'active', addEventListener: () => ({ remove() {} }) }, () => {});
  assert.equal(scheduled, 1); cleanup(); assert.equal(cleared, 1);
});

const orderedJourney = { ...journey, stops: [
  { id: 'third', sequence: 30, name: 'Third', latitude: 10, longitude: 78 },
  { id: 'first', sequence: 10, name: 'First', latitude: 8, longitude: 76 },
  { id: 'missing', sequence: 20, name: 'Missing', latitude: null, longitude: null },
] };
test('completion follows stored sequence, rejects skip/duplicate/stale taps and never skips missing coordinates', () => {
  const store = createTripStore();
  assert.equal(tripDestination(orderedJourney, store.get(id)).id, 'first');
  assert.equal(store.completeStop(id, 'first', store.get(id)), false, 'Ready cannot complete');
  store.transition(orderedJourney, 'begin', store.get(id));
  const first = store.get(id);
  assert.equal(first.destinationId, 'first');
  assert.equal(store.completeStop(id, 'third', first), false);
  assert.equal(store.completeStop(id, 'first', first), true);
  assert.equal(store.completeStop(id, 'first', first), false, 'Duplicate callback');
  assert.equal(store.completeStop(id, 'missing', first), false, 'Old snapshot cannot advance the next stop');
  assert.equal(store.completeStop(id, 'first', store.get(id)), false);
  assert.equal(tripDestination(orderedJourney, store.get(id)).id, 'missing');
  assert.deepEqual(store.get(id).completedStopIds, ['first']);
  const updatedSource = { ...orderedJourney, stops: [orderedJourney.stops[0]] };
  assert.equal(tripDestination(updatedSource, store.get(id)).id, 'missing', 'Session snapshot wins over refreshed source');
  assert.equal(store.completeStop(id, 'missing', store.get(id)), true);
  assert.equal(store.get(id).destinationId, 'third');
  assert.deepEqual(orderedJourney.stops.map(stop => stop.id), ['third', 'first', 'missing']);
});

test('progress survives pause/reentry; final completion freezes pause-excluded time and only new resets it', () => {
  let time = 1000;
  const store = createTripStore(() => time);
  const act = action => store.transition(orderedJourney, action, store.get(id));
  act('begin'); time += 2000;
  store.completeStop(id, 'first', store.get(id));
  const beforePause = store.get(id);
  act('pause'); time += 9000;
  assert.equal(store.completeStop(id, 'missing', store.get(id)), false);
  assert.equal(store.completeStop(id, 'missing', beforePause), false);
  const unsubscribe = store.subscribe(() => {}); unsubscribe();
  assert.deepEqual(store.get(id).completedStopIds, ['first']);
  act('resume'); time += 3000;
  store.completeStop(id, 'missing', store.get(id));
  let synchronousStatus;
  store.subscribe(() => { synchronousStatus = store.get(id).status; });
  store.completeStop(id, 'third', store.get(id));
  const ended = store.get(id);
  assert.equal(synchronousStatus, 'completed'); assert.equal(ended.status, 'completed');
  assert.equal(ended.destinationId, null); assert.equal(tripDestination(orderedJourney, ended), undefined);
  assert.deepEqual(ended.completedStopIds, ['first', 'missing', 'third']);
  assert.equal(ended.activeSince, null); time += 10000; assert.equal(elapsedTime(ended, time), 5000);
  for (const action of ['finish', 'pause', 'resume', 'begin']) assert.equal(act(action), false);
  assert.equal(store.completeStop(id, 'third', ended), false);
  assert.equal(act('new'), true); assert.deepEqual(store.get(id).completedStopIds, []);
  assert.equal(store.get(id).destinationId, null); assert.equal(store.get(id).status, 'ready');
  act('begin'); assert.equal(store.get(id).destinationId, 'first');
});

test('early Finish preserves partial progress and differs from completing every stop', () => {
  const store = createTripStore(); store.transition(orderedJourney, 'begin', store.get(id));
  store.completeStop(id, 'first', store.get(id));
  store.transition(orderedJourney, 'pause', store.get(id));
  store.transition(orderedJourney, 'finish', store.get(id));
  assert.equal(store.get(id).status, 'finished');
  assert.deepEqual(store.get(id).completedStopIds, ['first']);
  assert.equal(store.get(id).destinationId, 'missing');
  assert.equal(store.completeStop(id, 'missing', store.get(id)), false);
});
