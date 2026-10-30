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
  [...f.pending.values()][0](); assert.equal(f.counts().removed, 2); assert.equal(f.pending.size, 1);
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
  assert.equal(unavailable.status, 'unavailable'); assert.equal(f.pending.size, 1);
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
  callback({ coords: { latitude: 8, longitude: 76, accuracy: 25, heading: 90, speed: 2 }, timestamp: 123 }); errorCallback('private native details');
  assert.deepEqual(fix, { latitude: 8, longitude: 76, accuracy: 25, timestamp: 123, heading: 90, speed: 2 }); assert.equal(errors, 1); assert.equal(options.accuracy, 4);
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

// Android: the settings dialog backgrounds the app, so the rejection usually arrives on a stale token.
function declineFixture() {
  const f = fixture(), original = f.port.watch, session = {};
  let declining = true, attempts = 0, gate = null;
  const declinedError = () => Object.assign(new Error('Location settings declined'), { settingsDeclined: true });
  f.port.watch = (...args) => {
    attempts++;
    if (gate) return gate.promise;
    return declining ? Promise.reject(declinedError()) : original(...args);
  };
  const sync = (status, active = true, focused = true, identity = session) => f.controller.sync(status, active, focused, active ? 'active' : 'background', identity);
  sync('active');
  return Object.assign(f, { sync, attempts: () => attempts, accept() { declining = false; },
    // Opens a dialog that stays up until release(): the retry promise settles only then.
    async open() { gate = {}; gate.promise = new Promise((_, reject) => { gate.reject = () => reject(declinedError()); }); void f.controller.retry(); await flush(); },
    release() { const pending = gate; gate = null; pending.reject(); } });
}
const assertDeclined = f => {
  assert.equal(f.controller.get().status, 'unavailable'); assert.equal(f.controller.get().reason, 'settings-declined');
  assert.equal(f.controller.get().position, null); assert.equal(f.controller.get().canAskAgain, true);
  assert.equal(f.pending.size, 0, 'No retry timer or watchdog remains');
};

test('declined settings stay unavailable with no timer and no foreground or focus reconnect', async () => {
  const f = declineFixture(); await flush();
  assertDeclined(f); assert.equal(f.attempts(), 1);
  f.sync('active', false); f.sync('active'); await flush();
  assertDeclined(f); assert.equal(f.attempts(), 1, 'Returning to foreground does not reopen the dialog');
  f.sync('active', false, false, undefined); f.sync('active'); await flush();
  assertDeclined(f); assert.equal(f.attempts(), 1, 'Blur cleanup syncs without identity; refocus does not reopen the dialog');
  assert.equal(locationLabel(f.controller.get()), 'Location settings need attention. Turn on Location Accuracy, then tap Retry location.');
  f.controller.stop();
});

test('dialog app-state change cannot reopen settings in either native ordering', async () => {
  const rejectFirst = declineFixture(); await flush(); await rejectFirst.open();
  assert.equal(rejectFirst.attempts(), 2);
  rejectFirst.sync('active', false); rejectFirst.release(); await flush();
  rejectFirst.sync('active'); await flush();
  assertDeclined(rejectFirst); assert.equal(rejectFirst.attempts(), 2);
  rejectFirst.controller.stop();
  const resumeFirst = declineFixture(); await flush(); await resumeFirst.open();
  resumeFirst.sync('active', false); resumeFirst.sync('active'); await flush();
  assert.equal(resumeFirst.pending.size, 1, 'The pending watcher defers recovery rather than overlapping it');
  const [[timer, recover]] = [...resumeFirst.pending]; resumeFirst.pending.delete(timer); recover(); await flush();
  assert.equal(resumeFirst.pending.size, 1, 'A retry firing during the dialog defers again'); assert.equal(resumeFirst.attempts(), 2);
  resumeFirst.release(); await flush();
  assertDeclined(resumeFirst); assert.equal(resumeFirst.attempts(), 2);
  resumeFirst.controller.stop();
});

test('Retry reconnects exactly once, can be declined again, and success restores normal recovery', async () => {
  const f = declineFixture(); await flush();
  await f.controller.retry(); await flush();
  assertDeclined(f); assert.equal(f.attempts(), 2, 'A second decline latches again without a loop');
  f.accept(); await Promise.all([f.controller.retry(), f.controller.retry()]); await flush();
  assert.equal(f.attempts(), 3); f.fix();
  assert.equal(f.controller.get().status, 'tracking'); assert.equal(f.counts().watches, 1);
  f.error(); assert.equal(f.controller.get().reason, 'temporary'); assert.equal(f.pending.size, 1, 'Normal recovery returned');
  f.sync('finished'); assert.equal(f.pending.size, 0);
});

test('Pause then Resume reconnects; Finish stays clean; a new Begin is explicit', async () => {
  const f = declineFixture(); await flush();
  f.sync('paused'); await flush();
  assert.equal(f.controller.get().status, 'paused'); assert.equal(f.pending.size, 0); assert.equal(f.attempts(), 1, 'Pause never reconnects');
  f.sync('active'); await flush(); assert.equal(f.attempts(), 2, 'Resume is an explicit tap');
  assertDeclined(f);
  f.sync('finished'); await flush();
  assert.equal(f.controller.get().status, 'finished'); assert.equal(f.pending.size, 0); assert.equal(f.attempts(), 2);
  f.accept(); f.sync('ready'); await f.begin(); await flush();
  assert.equal(f.attempts(), 3); f.fix(); assert.equal(f.controller.get().status, 'tracking');
  f.sync('finished'); assert.equal(f.counts().removed, 1); assert.equal(f.pending.size, 0);
});

test('a decline settling after Pause or session replacement does not latch the next session', async () => {
  const paused = declineFixture(); await flush(); await paused.open();
  paused.sync('paused'); paused.release(); await flush();
  assert.equal(paused.controller.get().status, 'paused'); assert.equal(paused.pending.size, 0);
  paused.accept(); paused.sync('active'); await flush(); paused.fix();
  assert.equal(paused.controller.get().status, 'tracking'); paused.controller.stop();
  const replaced = declineFixture(); await flush(); await replaced.open();
  replaced.sync('active', true, true, {}); replaced.release(); await flush();
  assert.notEqual(replaced.controller.get().reason, 'settings-declined');
  assert.equal(replaced.pending.size, 1, 'The new session keeps its recovery'); replaced.controller.stop();
  const fresh = declineFixture(); await flush();
  fresh.accept(); fresh.sync('active', true, true, {}); await flush();
  assert.equal(fresh.attempts(), 2, 'A new session owes nothing to the previous decline'); fresh.controller.stop();
});

test('native adapter maps only the settings rejection to the neutral declined error', async () => {
  let failure;
  const { locationPort } = load('src/lib/journey/location-port.native.ts', { 'expo-location': { Accuracy: { High: 4 }, watchPositionAsync: async () => { throw failure; } } });
  failure = Object.assign(new Error('Location request failed due to unsatisfied device settings'), { code: 'ERR_LOCATION_SETTINGS_UNSATISFIED' });
  await assert.rejects(locationPort.watch(() => {}, () => {}), error => error.settingsDeclined === true && !('code' in error));
  failure = Object.assign(new Error('Location request failed due to unsatisfied device settings'), { code: 'ERR_A' });
  await assert.rejects(locationPort.watch(() => {}, () => {}), error => error.settingsDeclined === true, 'Minified code still matches on the native message');
  for (failure of [Object.assign(new Error('other'), { code: 'ERR_LOCATION_UNAVAILABLE' }), new Error('plain')])
    await assert.rejects(locationPort.watch(() => {}, () => {}), error => error === failure && error.settingsDeclined === undefined);
});

test('returning to the app recovers silently only when the setting is now on', async () => {
  const f = declineFixture(); let enabled = false, checks = 0, failing = false; await flush();
  f.port.settingsEnabled = async () => { checks++; if (failing) throw new Error('native'); return enabled; };
  f.sync('active', false); assert.equal(checks, 0, 'Backgrounding never checks'); f.sync('active'); await flush();
  assert.equal(checks, 1); assertDeclined(f); assert.equal(f.attempts(), 1, 'Still off: no reconnect and no dialog');
  failing = true; enabled = true; f.sync('active', false); f.sync('active'); await flush();
  assert.equal(checks, 2); assertDeclined(f); assert.equal(f.attempts(), 1, 'A failed check stays latched');
  failing = false; f.accept(); f.sync('active', false, false, undefined); f.sync('active'); await flush();
  assert.equal(checks, 3); assert.equal(f.attempts(), 2, 'Enabled: reconnects once'); f.fix();
  assert.equal(f.controller.get().status, 'tracking'); assert.equal(f.counts().watches, 1);
  f.sync('active', false); f.sync('active'); await flush();
  assert.equal(checks, 3, 'No check once recovered'); f.controller.stop();
});

test('a silent settings check cannot reconnect after the user leaves or pauses', async () => {
  for (const exit of ['background', 'paused']) {
    const f = declineFixture(); let answer; await flush();
    f.port.settingsEnabled = () => new Promise(done => { answer = done; });
    f.sync('active', false); f.sync('active'); await flush(); f.accept();
    if (exit === 'background') f.sync('active', false); else f.sync('paused');
    answer(true); await flush(); assert.equal(f.attempts(), 1); f.controller.stop();
  }
});

test('native adapter reads provider status for the silent check', async () => {
  let status = {}, prompts = 0;
  const { locationPort } = load('src/lib/journey/location-port.native.ts', { 'expo-location': { getProviderStatusAsync: async () => status, enableNetworkProviderAsync: async () => { prompts++; } } });
  status = { networkAvailable: true }; assert.equal(await locationPort.settingsEnabled(), true);
  for (status of [{ networkAvailable: false }, {}]) assert.equal(await locationPort.settingsEnabled(), false);
  assert.equal(prompts, 0); assert.equal(load('src/lib/journey/location-port.ts').locationPort.settingsEnabled, undefined);
});
