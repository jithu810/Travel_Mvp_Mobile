import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText)(name => { assert.ok(name in dependencies, name); return dependencies[name]; }, module, module.exports);
  return module.exports;
}
const { createForegroundLocation, validPosition, locationLabel } = load('src/lib/journey/foreground-location.ts');
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; };
function fixture() {
  let clock = 100000, granted = true, canAskAgain = true, services = true, removed = 0, watches = 0, commits = 0, updates, error;
  const requests = [], pending = new Map(); let nextTimer = 0;
  const port = {
    async permission(request) { requests.push(request); return { granted, canAskAgain }; },
    async services() { return services; },
    async watch(onUpdate, onError) { watches++; updates = onUpdate; error = onError; return { remove() { removed++; } }; },
  };
  const controller = createForegroundLocation(port, () => clock, { set(callback) { const id = ++nextTimer; pending.set(id, callback); return id; }, clear(id) { pending.delete(id); } });
  controller.sync('ready', true, true);
  return { controller, port, requests, pending,
    setGranted(value, retry = true) { granted = value; canAskAgain = retry; }, setServices(value) { services = value; },
    fix(value = {}) { updates?.({ latitude: 8, longitude: 76, accuracy: 15, timestamp: clock, ...value }); },
    advance(ms) { clock += ms; }, error: () => error(), counts: () => ({ removed, watches, commits }),
    begin: () => controller.begin(() => { commits++; return true; }),
  };
}

test('no permission on ready load; explicit Begin waits for grant and prevents duplicate taps', async () => {
  const f = fixture(); const gate = deferred();
  f.port.permission = async request => { f.requests.push(request); return gate.promise; };
  assert.deepEqual(f.requests, []); assert.equal(f.controller.get().status, 'ready');
  const first = f.begin(); await f.begin();
  assert.deepEqual(f.requests, [true]); assert.equal(f.counts().commits, 0); assert.equal(f.controller.get().position, null);
  gate.resolve({ granted: true, canAskAgain: true }); await first;
  assert.deepEqual(f.counts(), { removed: 0, watches: 1, commits: 1 });
  assert.equal(f.controller.get().status, 'requesting', 'Session started but a fix is not available yet');
  f.fix(); assert.equal(f.controller.get().status, 'tracking');
  f.controller.sync('finished', true, true);
});

test('permission-dialog inactivity waits for foreground; real background cancels pending Begin', async () => {
  const f = fixture(), gate = deferred(); f.port.permission = () => gate.promise;
  const begin = f.begin(); f.controller.sync('ready', false, true, 'inactive');
  gate.resolve({ granted: true, canAskAgain: true }); await flush();
  assert.equal(f.counts().commits, 0); assert.equal(f.counts().watches, 0);
  f.controller.sync('ready', true, true, 'active'); await begin;
  assert.equal(f.counts().commits, 1); assert.equal(f.counts().watches, 1); f.controller.stop();
  const g = fixture(), other = deferred(); g.port.permission = () => other.promise;
  const cancelled = g.begin(); g.controller.sync('ready', false, true, 'inactive');
  other.resolve({ granted: true, canAskAgain: true }); await flush();
  g.controller.sync('ready', false, true, 'background'); await cancelled;
  g.controller.sync('ready', true, true); await flush();
  assert.equal(g.counts().commits, 0); assert.equal(g.counts().watches, 0);
});

test('denied Begin never starts session; explicit retry only; permanent denial exposes settings state', async () => {
  const f = fixture(); f.setGranted(false, false); await f.begin();
  assert.equal(f.counts().commits, 0); assert.equal(f.counts().watches, 0);
  assert.equal(f.controller.get().status, 'denied'); assert.equal(f.controller.get().canAskAgain, false);
  f.controller.sync('ready', false, true); f.controller.sync('ready', true, true);
  assert.deepEqual(f.requests, [true]);
  f.setGranted(true); await f.begin(); f.fix(); assert.equal(f.controller.get().status, 'tracking');
  f.controller.stop();
});

test('Pause, Finish, background and blur remove subscriptions and ignore old callbacks; active foreground resumes without prompting', async () => {
  for (const [status, active, focused] of [['paused', true, true], ['finished', true, true], ['active', false, true], ['active', true, false]]) {
    const f = fixture(); await f.begin(); f.fix();
    f.controller.sync(status, active, focused);
    assert.equal(f.counts().removed, 1); assert.equal(f.pending.size, 0); assert.equal(f.controller.get().position, null);
    const before = f.controller.get(); f.advance(1000); f.fix(); assert.equal(f.controller.get(), before);
    f.controller.sync(status, active, focused); assert.equal(f.counts().removed, 1);
    if (status === 'active') {
      f.controller.sync('active', true, true); await flush();
      assert.deepEqual(f.requests, [true, false]); assert.equal(f.counts().watches, 2);
      f.controller.sync('finished', true, true);
    }
  }
});

test('Resume rechecks revoked permission and does not automatically prompt; retry can recover', async () => {
  const f = fixture(); await f.begin(); f.controller.sync('paused', true, true); f.setGranted(false);
  f.controller.sync('active', true, true); await flush();
  assert.deepEqual(f.requests, [true, false]); assert.equal(f.controller.get().status, 'denied'); assert.equal(f.counts().watches, 1);
  f.setGranted(true); await f.controller.retry(); assert.deepEqual(f.requests, [true, false, true]);
  assert.equal(f.counts().watches, 2); f.controller.stop();
});

test('disabled services, errors and timeouts show unavailable, clear positions and clean up', async () => {
  const f = fixture(); f.setServices(false); await f.begin();
  assert.equal(f.counts().commits, 1); assert.equal(f.counts().watches, 0); assert.equal(f.controller.get().status, 'unavailable');
  f.setServices(true); await f.controller.retry(); f.fix(); f.error();
  assert.equal(f.controller.get().status, 'unavailable'); assert.equal(f.controller.get().position, null); assert.equal(f.counts().removed, 1);
  await f.controller.retry(); assert.equal(f.pending.size, 1);
  [...f.pending.values()][0](); assert.equal(f.counts().removed, 2); assert.equal(f.pending.size, 0);
  const gate = deferred(); f.port.permission = () => gate.promise;
  const retry = f.controller.retry(); [...f.pending.values()][0](); gate.resolve({ granted: true, canAskAgain: true }); await retry;
  assert.equal(f.counts().watches, 2, 'Timed out permission completion cannot subscribe');
});

test('invalid, old, future and duplicate fixes are ignored; uncertain accuracy is honest and expired fixes disappear', async () => {
  const f = fixture(); await f.begin();
  for (const fix of [{ latitude: NaN }, { latitude: 91 }, { longitude: 181 }, { timestamp: 0 }, { timestamp: 106000 }]) f.fix(fix);
  assert.equal(f.controller.get().position, null);
  f.fix({ accuracy: 300 }); assert.equal(f.controller.get().status, 'weak'); assert.match(locationLabel(f.controller.get()), /300 m/);
  const before = f.controller.get(); f.fix({ accuracy: 2 }); assert.equal(f.controller.get(), before, 'Same timestamp ignored');
  f.advance(1); f.fix({ accuracy: -1 }); assert.equal(f.controller.get().position.accuracy, null); assert.equal(f.controller.get().status, 'weak');
  f.advance(1); f.fix({ accuracy: 5 }); assert.equal(f.controller.get().status, 'tracking');
  [...f.pending.values()][0](); assert.equal(f.controller.get().position, null); assert.equal(f.controller.get().status, 'unavailable');
  assert.equal(validPosition({ latitude: 0, longitude: 0, timestamp: 100, accuracy: null }, 100), true);
});

test('late subscriptions, pending permissions and rejected stale commits cannot start an old journey', async () => {
  const f = fixture(), gate = deferred(); f.port.watch = () => gate.promise;
  const begin = f.begin(); await flush(); f.controller.sync('finished', true, true);
  let removed = 0; gate.resolve({ remove() { removed++; } }); await begin; assert.equal(removed, 1);
  const g = fixture(), permission = deferred(); g.port.permission = () => permission.promise;
  const old = g.begin(); g.controller.sync('ready', false, false);
  permission.resolve({ granted: true, canAskAgain: true }); await old;
  assert.equal(g.counts().commits, 0); assert.equal(g.counts().watches, 0);
  const h = fixture(); await h.controller.begin(() => false); assert.equal(h.counts().watches, 0); assert.equal(h.controller.get().status, 'ready');
});

test('future-dated fixes never enter the GPS source or poison its timestamp watermark', async () => {
  const f = fixture(); await f.begin();
  for (const timestamp of [100001, 104999, 105000]) f.fix({ timestamp });
  assert.equal(f.controller.get().position, null);
  f.fix(); assert.equal(f.controller.get().position.timestamp, 100000, 'A valid current fix still recovers');
  f.controller.stop();
});

test('watch startup rejection invalidates callbacks and explicit Retry creates only one fresh watcher', async () => {
  const f = fixture(); let abandonedUpdate, abandonedError;
  const original = f.port.watch;
  f.port.watch = async (update, error) => { abandonedUpdate = update; abandonedError = error; throw new Error('native startup failure'); };
  await f.begin(); const unavailable = f.controller.get();
  assert.equal(unavailable.status, 'unavailable'); assert.equal(f.pending.size, 0);
  abandonedUpdate({ latitude: 8, longitude: 76, accuracy: 5, timestamp: 100000 }); abandonedError();
  assert.equal(f.controller.get(), unavailable, 'Failed startup callbacks cannot restore GPS');
  f.port.watch = original; await f.controller.retry(); f.fix();
  assert.equal(f.controller.get().status, 'tracking'); assert.equal(f.counts().watches, 1);
  abandonedUpdate({ latitude: 9, longitude: 77, accuracy: 5, timestamp: 100001 }); abandonedError();
  assert.equal(f.controller.get().position.latitude, 8); assert.equal(f.counts().removed, 0);
  f.controller.sync('finished', true, true); assert.equal(f.counts().removed, 1);
});

test('foreground reentry rechecks revoked permission and disabled services, then recovers without duplicate watchers', async () => {
  const f = fixture(); await f.begin(); f.fix();
  f.controller.sync('active', false, true); f.setGranted(false, false);
  f.controller.sync('active', true, true); await flush();
  assert.equal(f.controller.get().status, 'denied'); assert.equal(f.controller.get().position, null);
  assert.equal(f.controller.get().canAskAgain, false); assert.equal(f.requests.at(-1), false);
  f.setGranted(true); f.setServices(false); await f.controller.retry();
  assert.equal(f.controller.get().status, 'unavailable'); assert.equal(f.counts().watches, 1);
  f.setServices(true); await f.controller.retry(); f.advance(1); f.fix();
  assert.equal(f.controller.get().status, 'tracking'); assert.equal(f.counts().watches, 2);
  f.error(); assert.equal(f.controller.get().position, null); await f.controller.retry(); f.advance(1); f.fix();
  assert.equal(f.counts().watches - f.counts().removed, 1); f.controller.stop();
});

test('native adapter checks permission before requesting and uses only foreground watches', async () => {
  let result = { granted: false, canAskAgain: true }, prompts = 0, callback, errorCallback, options;
  const { locationPort } = load('src/lib/journey/location-port.native.ts', { 'expo-location': {
    getForegroundPermissionsAsync: async () => result,
    requestForegroundPermissionsAsync: async () => { prompts++; return result; },
    hasServicesEnabledAsync: async () => true, Accuracy: { High: 4 },
    watchPositionAsync: async (settings, fix, error) => { options = settings; callback = fix; errorCallback = error; return { remove() {} }; },
  } });
  await locationPort.permission(false); assert.equal(prompts, 0);
  await locationPort.permission(true); assert.equal(prompts, 1);
  result = { granted: false, canAskAgain: false }; await locationPort.permission(true); assert.equal(prompts, 1);
  result = { granted: true, canAskAgain: true }; await locationPort.permission(true); assert.equal(prompts, 1);
  result = { granted: false, canAskAgain: true, status: 'denied' };
  await locationPort.permission(true, true); await locationPort.permission(true, true);
  assert.equal(prompts, 1, 'Opening Travel never repeats a previously denied native prompt');
  result = { granted: false, canAskAgain: true, status: 'undetermined' };
  await locationPort.permission(true, true); assert.equal(prompts, 2, 'First opening requests undetermined permission');
  result = { granted: false, canAskAgain: true, status: 'denied' };
  await locationPort.permission(true); assert.equal(prompts, 3, 'Explicit Retry may request permission again');
  let fix, errors = 0; await locationPort.watch(value => { fix = value; }, () => errors++);
  callback({ coords: { latitude: 8, longitude: 76, accuracy: 25 }, timestamp: 123 }); errorCallback('private native details');
  assert.deepEqual(fix, { latitude: 8, longitude: 76, accuracy: 25, timestamp: 123 }); assert.equal(errors, 1); assert.equal(options.accuracy, 4);
});

test('web adapter never requests browser geolocation', async () => {
  const { locationPort } = load('src/lib/journey/location-port.ts');
  await assert.rejects(locationPort.permission(true), /native development build/);
});

test('opening prepares permission once without GPS or a session; Begin remains explicit', async () => {
  const f = fixture(), gate = deferred();
  f.port.permission = async request => { f.requests.push(request); return gate.promise; };
  const first = f.controller.prepare(); await f.controller.prepare(); await f.begin();
  assert.deepEqual(f.requests, [true]); assert.equal(f.counts().commits, 0); assert.equal(f.counts().watches, 0);
  gate.resolve({ granted: true, canAskAgain: true }); await first;
  assert.equal(f.controller.get().status, 'permitted'); assert.equal(f.controller.get().position, null); assert.equal(f.pending.size, 0);
  await f.begin(); assert.deepEqual(f.requests, [true, false]);
  assert.equal(f.counts().commits, 1); assert.equal(f.counts().watches, 1); f.controller.stop();
});

test('denied preparation never starts tracking, reentry checks silently and ready Retry never starts the timer', async () => {
  const f = fixture(); f.setGranted(false); await f.controller.prepare();
  assert.equal(f.controller.get().status, 'denied'); assert.equal(f.counts().commits, 0);
  f.controller.sync('ready', false, false); f.controller.sync('ready', true, true);
  await f.controller.prepare(); await f.begin();
  assert.deepEqual(f.requests, [true, false, false]); assert.equal(f.counts().watches, 0);
  f.setGranted(true); await f.controller.retry();
  assert.equal(f.requests.at(-1), true); assert.equal(f.controller.get().status, 'permitted');
  assert.equal(f.counts().commits, 0); assert.equal(f.counts().watches, 0);
  await f.begin(); assert.equal(f.counts().commits, 1); assert.equal(f.counts().watches, 1); f.controller.stop();
  const g = fixture(); g.setServices(false); await g.controller.prepare();
  assert.equal(g.controller.get().status, 'unavailable'); assert.equal(g.counts().commits, 0); assert.equal(g.counts().watches, 0); assert.equal(g.pending.size, 0);
});

test('permission preparation cleans up on blur, background, finish and timeout and rejects late grants', async () => {
  for (const [status, active, focused] of [['ready', true, false], ['ready', false, true], ['finished', true, true]]) {
    const f = fixture(), gate = deferred(); f.port.permission = () => gate.promise;
    const preparing = f.controller.prepare(); f.controller.sync(status, active, focused);
    gate.resolve({ granted: true, canAskAgain: true }); await preparing;
    assert.notEqual(f.controller.get().status, 'permitted'); assert.equal(f.pending.size, 0);
    assert.equal(f.counts().commits, 0); assert.equal(f.counts().watches, 0);
  }
  const f = fixture(), gate = deferred(); f.port.permission = () => gate.promise;
  const preparing = f.controller.prepare(); [...f.pending.values()][0]();
  gate.resolve({ granted: true, canAskAgain: true }); await preparing;
  assert.equal(f.controller.get().status, 'unavailable'); assert.equal(f.pending.size, 0); assert.equal(f.counts().watches, 0);
});

test('permission dialog inactivity during preparation waits for foreground and never begins a session', async () => {
  const f = fixture(), gate = deferred(); f.port.permission = () => gate.promise;
  const preparing = f.controller.prepare(); f.controller.sync('ready', false, true, 'inactive');
  gate.resolve({ granted: true, canAskAgain: true }); await flush();
  assert.equal(f.counts().commits, 0); assert.equal(f.counts().watches, 0);
  f.controller.sync('ready', true, true); await preparing;
  assert.equal(f.controller.get().status, 'permitted'); assert.equal(f.counts().watches, 0); assert.equal(f.pending.size, 0);
});
