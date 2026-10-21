import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const module = { exports: {} };
new Function('module', 'exports', ts.transpileModule(readFileSync('src/lib/journey/foreground-location.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(module, module.exports);
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function fixture() {
  let now = 100000, id = 0, removedGPS = 0, removedHeading = 0, starts = 0;
  const timers = new Map(), callbacks = [];
  const port = {
    permission: async () => ({ granted: true, canAskAgain: true }), services: async () => true,
    watch: async (update, error) => { Object.assign(callbacks.at(-1), { update, error }); return { remove() { removedGPS++; } }; },
    watchHeading: async (update, error) => { starts++; callbacks.push({ heading: update, headingError: error }); return { remove() { removedHeading++; } }; },
  };
  const controller = module.exports.createForegroundLocation(port, () => now, {
    set(fn, ms) { timers.set(++id, { fn, due: now + ms, ms }); return id; }, clear(key) { timers.delete(key); },
  });
  return { controller, port, timers, callbacks,
    async begin() { controller.sync('active', true, true); await flush(); },
    advance(ms) { now += ms; },
    fix(patch = {}) { callbacks.at(-1).update({ latitude: 0, longitude: 0, accuracy: 5, timestamp: now, heading: null, speed: 0, ...patch }); },
    compass(heading = 90, accuracy = 3, patch = {}) { callbacks.at(-1).heading({ heading, accuracy, timestamp: now, ...patch }); },
    counts: () => ({ removedGPS, removedHeading, starts }),
    due() { for (const [key, timer] of [...timers]) if (timer.due <= now) { timers.delete(key); timer.fn(); } },
  };
}

test('stationary startup uses reliable compass without changing raw GPS coordinates or timestamp', async () => {
  const f = fixture(); await f.begin(); f.fix();
  assert.equal(f.controller.get().position.direction, null);
  const before = f.controller.get().position;
  f.advance(1000); f.compass(90);
  const after = f.controller.get().position;
  assert.equal(after.direction, 90); assert.equal(after.directionSource, 'compass');
  for (const key of ['latitude', 'longitude', 'accuracy', 'timestamp']) assert.equal(after[key], before[key]);
  f.controller.stop();
});

test('invalid, uncalibrated, stale and future compass readings never invent a heading', async () => {
  for (const [heading, accuracy, patch] of [[NaN, 3, {}], [-1, 3, {}], [360, 3, {}], [90, 0, {}], [90, 1, {}], [90, 2.5, {}], [90, 3, { timestamp: 100001 }], [90, 3, { timestamp: 69999 }]]) {
    const f = fixture(); await f.begin(); f.fix(); f.compass(heading, accuracy, patch);
    assert.equal(f.controller.get().position.direction, null); f.controller.stop();
  }
});

test('moving GPS course wins over compass; stationary sensor wraparound stays near north', async () => {
  const f = fixture(); await f.begin(); f.fix({ speed: 2, heading: 180 }); f.compass(359);
  f.advance(1000); f.fix({ speed: 2, heading: 180 }); f.compass(1);
  assert.equal(f.controller.get().position.direction, 180);
  f.advance(1000); f.fix({ speed: 0, heading: null }); f.compass(359); f.advance(1000); f.compass(1);
  const angle = f.controller.get().position.direction;
  assert.ok(angle < 10 || angle > 350); assert.equal(f.controller.get().position.directionSource, 'compass');
  f.controller.stop();
});

test('compass expires without refreshing the GPS watchdog; heading failure leaves position tracking active', async () => {
  const f = fixture(); await f.begin(); f.fix(); f.compass();
  f.advance(20000); f.fix(); f.advance(10001); f.due(); assert.equal(f.controller.get().position.direction, null);
  f.compass(45); f.callbacks.at(-1).headingError();
  assert.equal(f.controller.get().position.direction, null); assert.equal(f.controller.get().status, 'tracking');
  f.advance(20000); f.due(); assert.equal(f.controller.get().position, null);
  f.controller.stop();
});

test('Pause Finish background and blur remove compass and GPS and reject abandoned callbacks', async () => {
  for (const args of [['paused', true, true], ['finished', true, true], ['active', false, true], ['active', true, false]]) {
    const f = fixture(); await f.begin(); f.fix(); f.compass(); const old = f.callbacks[0];
    f.controller.sync(...args); const before = f.controller.get();
    old.heading({ heading: 20, accuracy: 3, timestamp: 100000 }); old.headingError();
    assert.equal(f.controller.get(), before); assert.equal(f.timers.size, 0);
    assert.deepEqual(f.counts(), { removedGPS: 1, removedHeading: 1, starts: 1 });
    f.controller.sync('active', true, true); await flush(); f.fix();
    assert.equal(f.counts().starts, 2); assert.equal(f.controller.get().position.direction, null);
    f.controller.stop();
  }
});

test('late compass subscription resolves after Pause and is removed without publishing', async () => {
  const f = fixture(); let resolve, callback;
  f.port.watchHeading = update => { f.callbacks.push({}); callback = update; return new Promise(done => { resolve = done; }); };
  await f.begin(); f.fix(); f.controller.sync('paused', true, true);
  let removed = 0; resolve({ remove() { removed++; } }); await flush();
  callback({ heading: 90, accuracy: 3, timestamp: 100000 });
  assert.equal(removed, 1); assert.equal(f.controller.get().position, null); assert.equal(f.timers.size, 0);
});

test('missing or rejected compass support preserves GPS and explains unavailable direction', async () => {
  for (const mode of ['missing', 'rejected']) {
    const f = fixture();
    // GPS remains independent of optional hardware support.
    f.callbacks.push({});
    if (mode === 'missing') delete f.port.watchHeading;
    else f.port.watchHeading = async () => { throw new Error('sensor unavailable'); };
    await f.begin(); f.fix();
    assert.equal(f.controller.get().status, 'tracking'); assert.equal(f.controller.get().position.direction, null);
    assert.match(module.exports.locationLabel(f.controller.get(), 100000), /Direction unavailable/);
    f.controller.stop(); assert.equal(f.timers.size, 0);
  }
});

test('native heading adapter uses true north instead of magnetic fallback and timestamps receipt', async () => {
  let update, fail, removed = 0;
  const native = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(readFileSync('src/lib/journey/location-port.native.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText)(name => {
    assert.equal(name, 'expo-location');
    return { watchHeadingAsync: async (next, error) => { update = next; fail = error; return { remove() { removed++; } }; } };
  }, native, native.exports);
  let reading, errors = 0;
  const before = Date.now(); const subscription = await native.exports.locationPort.watchHeading(next => { reading = next; }, () => errors++);
  update({ trueHeading: 90, magHeading: 45, accuracy: 3 });
  assert.equal(reading.heading, 90); assert.equal(reading.accuracy, 3);
  assert.ok(reading.timestamp >= before && reading.timestamp <= Date.now());
  update({ trueHeading: -1, magHeading: 45, accuracy: 3 }); assert.equal(reading.heading, -1);
  fail('private sensor error'); assert.equal(errors, 1); subscription.remove(); assert.equal(removed, 1);
});

test('inaccurate GPS status explains position quality instead of advising compass recovery', async () => {
  for (const accuracy of [30, 60]) {
    const f = fixture(); await f.begin(); f.fix({ accuracy }); f.compass(90);
    assert.equal(f.controller.get().position.direction, null);
    const message = module.exports.locationLabel(f.controller.get(), 100000);
    assert.match(message, /accuracy|signal|accurate|GPS/i);
    assert.doesNotMatch(message, /turn phone|move when safe/i);
    f.controller.stop();
  }
});

test('obsolete queued compass expiry cannot erase a resumed subscription timer handle', async () => {
  const f = fixture(); await f.begin(); f.fix(); f.compass();
  const obsolete = [...f.timers.values()].at(-1).fn;
  f.controller.sync('paused', true, true);
  f.controller.sync('active', true, true); await flush(); f.fix(); f.compass(180);
  const before = f.controller.get(); obsolete();
  assert.equal(f.controller.get(), before);
  f.controller.sync('paused', true, true);
  assert.equal(f.timers.size, 0);
});
