import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
function load(path, dependencies = {}) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(name => {
    assert.ok(name in dependencies, name); return dependencies[name];
  }, module, module.exports);
  return module.exports;
}
const guidance = load('src/lib/journey/turn-guidance.ts');
const off = load('src/lib/journey/off-route.ts', { './turn-guidance': guidance });
const nav = load('src/lib/journey/navigation.ts', { './turn-guidance': guidance, './off-route': off });
const meters = value => value / 6371008.8 * 180 / Math.PI;
const xy = (x, y) => [meters(x), meters(y)];
const road = (y = 0) => ({ geometry: { type: 'LineString', coordinates: [xy(0, y), xy(1000, y), xy(1000, 0)] }, distance: 1000 + y, duration: 100, steps: null });
const old = road();
const destination = { id: 'a', name: 'Authoritative stop', longitude: meters(1000), latitude: 0 };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function fixture(loader = () => Promise.resolve(road(100))) {
  let time = 100000, timerId = 0;
  const timers = new Map(), calls = [], session = {};
  const fix = (y = 100, patch = {}) => ({ longitude: meters(100), latitude: meters(y), accuracy: 5, timestamp: time, ...patch });
  const input = (y = 100, patch = {}) => ({ session, status: 'active', focused: true, foreground: true, position: fix(y), destination, ...patch });
  const detector = off.createOffRoute(nav.navigationFix, () => time);
  const controller = nav.createNavigation((origin, stop, signal) => {
    calls.push({ origin, stop, signal }); return calls.length === 1 ? Promise.resolve(old) : loader(origin, stop, signal);
  }, () => time, { set(fn, ms) { timers.set(++timerId, { fn, ms }); return timerId; }, clear(id) { timers.delete(id); } });
  const sample = (y = 100, ms = 4000, patch = {}) => { time += ms; return detector.update(old, fix(y, patch)); };
  const update = (y = 100, ms = 4000, patch = {}) => { time += ms; controller.update(input(y, patch)); return controller.get(); };
  const begin = async () => { controller.update(input(0)); await flush(); };
  const deviate = async () => { await begin(); update(); update(); update(); await flush(); };
  return { detector, controller, fix, input, sample, update, begin, deviate, calls, timers, now: () => time, advance(ms) { time += ms; } };
}
test('off-route policy uses accuracy-aware 40 m margin and all accepted blue geometry', () => {
  assert.equal(off.OFF_ROUTE_POLICY.cooldownMs, 30000);
  assert.equal(off.OFF_ROUTE_POLICY.referenceTtlMs, 120000);
  for (const [y, accuracy, expected] of [[45, 5, 'on-route'], [45.01, 5, 'confirming'], [90, 50, 'on-route'], [90.01, 50, 'confirming']]) {
    const f = fixture(); assert.equal(f.detector.update(old, f.fix(y, { accuracy })).status, expected);
  }
  const intersection = { ...old, geometry: { type: 'LineString', coordinates: [xy(0, 0), xy(1000, 0), xy(1000, 100), xy(0, 100)] } };
  const f = fixture(); assert.equal(f.detector.update(intersection, f.fix(100)).status, 'on-route', 'Nearby future legs stay ambiguous');
  assert.throws(() => off.createOffRoute(nav.navigationFix, Date.now, { minReadings: 2 }), /Invalid off-route policy/);
  assert.throws(() => off.createOffRoute(nav.navigationFix, Date.now, { dwellMs: 7999 }), /Invalid off-route policy/);
});
test('three distinct reliable readings must span eight seconds; stationary or moving deviations qualify', () => {
  for (const moving of [false, true]) {
    const f = fixture();
    assert.equal(f.sample().status, 'confirming');
    assert.equal(f.sample(100, 0).status, 'confirming');
    assert.equal(f.sample(100, 4000, moving ? { longitude: meters(120) } : {}).status, 'confirming');
    assert.equal(f.sample(100, 3999, moving ? { longitude: meters(140) } : {}).status, 'confirming');
    assert.equal(f.sample(100, 1, moving ? { longitude: meters(140) } : {}).status, 'confirmed');
  }
});
test('freshness and accuracy are inclusive; invalid, future and stale fixes clear evidence', () => {
  for (const patch of [{ accuracy: 50.01 }, { accuracy: null }, { latitude: NaN }, { longitude: 181 }, { timestamp: 100001 }, { timestamp: 84999 }]) {
    const f = fixture(); assert.equal(f.detector.update(old, f.fix(100, patch)).status, 'waiting');
  }
  const f = fixture(); assert.equal(f.detector.update(old, f.fix(100, { timestamp: 85000, accuracy: 50 })).status, 'confirming');
  f.advance(1); assert.equal(f.detector.update(old, f.fix(100, { timestamp: 85000, accuracy: 50 })).status, 'waiting');
  assert.equal(f.detector.update(old, null).status, 'waiting');
});
test('duplicates, reversed/inconsistent timestamps, signal gaps and implausible jumps cannot confirm', () => {
  const f = fixture(); f.sample();
  for (let i = 0; i < 10; i++) assert.equal(f.sample(100, 0).status, 'confirming');
  assert.equal(f.sample(100, 0, { longitude: meters(101) }).status, 'waiting');
  assert.equal(f.sample().status, 'confirming');
  assert.equal(f.sample(100, 1000, { longitude: meters(900) }).status, 'waiting');
  assert.equal(f.sample(100, 7000).status, 'waiting');
  assert.equal(f.sample().status, 'confirming');
  f.advance(6001); assert.equal(f.detector.update(old, f.fix(100, { timestamp: f.now() - 6001 })).status, 'waiting');
});
test('returning to corridor resets dwell; parallel roads, intersections and backward travel do not trigger', () => {
  const f = fixture(); f.sample(); f.sample(); assert.equal(f.sample(30).status, 'on-route');
  assert.equal(f.sample().status, 'confirming'); assert.equal(f.sample().status, 'confirming'); assert.equal(f.sample().status, 'confirmed');
  const p = fixture(); for (let x = 500; x >= 100; x -= 50) assert.equal(p.sample(40, 4000, { longitude: meters(x) }).status, 'on-route');
  p.detector.reset(); assert.equal(p.detector.update(old, p.fix()).status, 'waiting', 'Cached fix cannot seed new evidence');
});
test('sustained deviation requests once from latest fix to authoritative destination and resets guidance', async () => {
  const f = fixture(); await f.deviate();
  assert.equal(f.calls.length, 2); assert.equal(f.calls[1].origin.timestamp, f.now()); assert.equal(f.calls[1].stop, destination);
  assert.equal(f.controller.get().status, 'ready'); assert.equal(f.controller.get().message, 'Driving route updated');
  assert.equal(f.controller.get().routeOutdated, undefined); assert.equal(f.controller.get().reroute, null);
  assert.equal(f.controller.get().guidance.status, 'unavailable');
  f.update(); assert.equal(f.calls.length, 2, 'No loop from replacement or GPS ticks');
});
test('one in-flight request, abort on recovery, and late response cannot restore obsolete blue route', async () => {
  let resolve; const f = fixture(() => new Promise(r => { resolve = r; })); await f.deviate();
  assert.equal(f.controller.get().reroute.phase, 'loading'); assert.equal(f.controller.get().guidance, null);
  assert.equal(f.controller.get().route, old); assert.equal(f.controller.get().routeOutdated, true);
  f.update(); f.update(); assert.equal(f.calls.length, 2);
  f.update(0); assert.equal(f.calls[1].signal.aborted, true); assert.equal(f.controller.get().route, old);
  resolve(road(100)); await flush(); assert.equal(f.controller.get().route, old);
});
test('an implausible GPS jump back onto the old route cannot cancel a replacement request', async () => {
  let resolve; const f = fixture(() => new Promise(r => { resolve = r; })); await f.deviate();
  f.update(0, 1000, { position: f.fix(0, { longitude: meters(900), timestamp: f.now() + 1000 }) });
  assert.equal(f.calls[1].signal.aborted, false); assert.equal(f.controller.get().status, 'loading');
  resolve(road(100)); await flush(); f.controller.stop();
});
test('cooldown covers successful and failed attempts, repeated triggers and explicit retries', async () => {
  const f = fixture(() => Promise.reject(new nav.RoutingError('Mapbox request limit reached. Wait before retrying')));
  await f.deviate(); assert.equal(f.controller.get().status, 'error');
  assert.equal(f.controller.get().route, old); assert.equal(f.controller.get().guidance, null);
  assert.match(f.controller.get().message, /Previous route may be outdated/);
  f.controller.update(f.input(), true); await flush(); assert.equal(f.calls.length, 2);
  f.advance(30000); f.controller.update(f.input()); await flush(); assert.equal(f.calls.length, 2, 'Failure requires explicit retry');
  f.controller.update(f.input(), true); await flush(); assert.equal(f.calls.length, 3);
  const s = fixture(); await s.deviate(); s.update(200); s.update(200); s.update(200);
  assert.equal(s.controller.get().reroute.phase, 'cooldown'); assert.equal(s.calls.length, 2);
  for (let i = 0; i < 5; i++) s.update(200);
  await flush(); assert.equal(s.calls.length, 3);
});
test('failed reference expires after two minutes and ineligible GPS immediately hides it', async () => {
  const f = fixture(() => Promise.reject(new Error('private error'))); await f.deviate();
  assert.doesNotMatch(f.controller.get().message, /private error/); f.advance(120000); f.update(100, 0);
  assert.equal(f.controller.get().route, null); assert.equal(f.controller.get().guidance, null);
  const g = fixture(() => Promise.reject(new Error())); await g.deviate();
  g.update(100, 0, { position: g.fix(100, { accuracy: 51 }) }); assert.equal(g.controller.get().route, null);
});
test('timeout cancels replacement and late result is rejected; invalid geometry or obsolete origin fails honestly', async () => {
  let resolve; const f = fixture(() => new Promise(r => { resolve = r; })); await f.deviate();
  [...f.timers.values()][0].fn(); assert.equal(f.calls[1].signal.aborted, true);
  assert.match(f.controller.get().message, /timed out/); resolve(road(100)); await flush(); assert.equal(f.controller.get().status, 'error');
  for (const invalid of [{ ...road(100), geometry: { type: 'LineString', coordinates: [[NaN, 0], [0, 0]] } }, road(300)]) {
    const g = fixture(() => Promise.resolve(invalid)); await g.deviate(); assert.equal(g.controller.get().status, 'error'); assert.equal(g.controller.get().route, old);
  }
});
test('Pause, Finish, completion, blur, background and destination/session changes abort reroutes and clear evidence', async () => {
  for (const patch of [{ status: 'paused' }, { status: 'finished' }, { status: 'completed' }, { focused: false }, { foreground: false },
    { destination: { ...destination, id: 'next' } }, { session: {} }, { destination: { ...destination, latitude: null } }]) {
    let resolve; const f = fixture(() => new Promise(r => { resolve = r; })); await f.deviate();
    f.controller.update(f.input(100, patch)); assert.equal(f.calls[1].signal.aborted, true);
    resolve(road(100)); await flush(); assert.notEqual(f.controller.get().route, old); assert.equal(f.controller.get().reroute, undefined);
  }
  const f = fixture(); await f.begin(); f.update(); f.update(); f.controller.update(f.input(100, { status: 'paused' }));
  f.update(); await flush(); assert.equal(f.calls.length, 2, 'Resume prepares one fresh route, not a cached deviation reroute');
  f.controller.stop(); assert.equal(f.controller.get().route, null);
});

test('accepted replacement uses new instructions from step one without another Directions call', async () => {
  const replacement = road(100);
  replacement.geometry.coordinates[0] = xy(100, 100);
  replacement.steps = [
    { instruction: 'Head east', type: 'depart', modifier: null, location: xy(100, 100), distance: 300, duration: 30, geometry: [xy(100, 100), xy(400, 100)] },
    { instruction: 'New replacement turn', type: 'turn', modifier: 'right', location: xy(400, 100), distance: 700, duration: 70, geometry: [xy(400, 100), xy(1000, 0)] },
    { instruction: 'Complete manually', type: 'arrive', modifier: null, location: xy(1000, 0), distance: 0, duration: 0, geometry: [xy(1000, 0), xy(1000, 0)] },
  ];
  const f = fixture(() => Promise.resolve(replacement)); await f.deviate();
  assert.equal(f.controller.get().route, replacement); assert.equal(f.controller.get().guidance.maneuverIndex, 1);
  assert.equal(f.controller.get().guidance.maneuver.instruction, 'New replacement turn'); assert.equal(f.calls.length, 2);
});

test('atomic manual/arrival completion aborts rerouting to the old stop and final completion stops navigation', async () => {
  const { createTripStore, tripDestination } = load('src/lib/journey/trip-session.ts', { './travel-preview': { canOpenTravelMode: () => true } });
  for (const arrival of [false, true]) {
    const f = fixture(); const store = createTripStore(f.now);
    const journey = { id: 'journey', title: 'Trip', stops: [{ ...destination, sequence: 1 }, { ...destination, id: 'next', sequence: 2 }] };
    store.transition(journey, 'begin', store.get(journey.id));
    const requests = []; const controller = nav.createNavigation((_, stop, signal) => requests.length === 0
      ? (requests.push({ stop, signal }), Promise.resolve(old))
      : new Promise(resolve => requests.push({ stop, signal, resolve })), f.now);
    let y = 0;
    const sync = () => controller.update(f.input(y, { session: store.get(journey.id), destination: tripDestination(journey, store.get(journey.id)), status: store.get(journey.id).status }));
    const unsubscribe = store.subscribe(sync); sync(); await flush();
    y = 100; for (let i = 0; i < 3; i++) { f.advance(4000); sync(); } await flush();
    assert.equal(requests.length, 2);
    let prompt;
    if (arrival) {
      const { createArrival } = load('src/lib/journey/arrival.ts', { './navigation': nav, './turn-guidance': guidance });
      const detector = createArrival({}, f.now);
      for (let i = 0; i < 3; i++) { f.advance(3000); detector.update(f.input(0, { locationStatus: 'tracking', position: { ...f.fix(0), longitude: destination.longitude } })); }
      prompt = detector.get().prompt; assert.equal(prompt.stopId, destination.id);
    }
    const expected = store.get(journey.id);
    assert.equal(store.completeStop(journey.id, prompt?.stopId ?? destination.id, expected), true);
    assert.equal(store.completeStop(journey.id, destination.id, expected), false);
    assert.equal(requests[1].signal.aborted, true); requests[1].resolve(road(100)); await flush();
    assert.equal(controller.get().route, null); f.advance(5000); sync(); await flush(); assert.equal(requests[2].stop.id, 'next');
    assert.equal(store.completeStop(journey.id, 'next', store.get(journey.id)), true);
    assert.equal(store.get(journey.id).status, 'completed'); assert.equal(requests[2].signal.aborted, true);
    requests[2].resolve(road(100)); await flush(); assert.equal(controller.get().route, null); unsubscribe(); controller.stop();
  }
});
