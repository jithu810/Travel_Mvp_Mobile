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
const navigation = load('src/lib/journey/navigation.ts', { './turn-guidance': guidance, './off-route': load('src/lib/journey/off-route.ts', { './turn-guidance': guidance }) });
const { createArrival, observeArrival, arrivalBlock, ARRIVAL_POLICY } = load('src/lib/journey/arrival.ts', { './navigation': navigation, './turn-guidance': guidance });
const meters = value => value / 6371008.8 * 180 / Math.PI;
const destination = { id: 'first', name: 'First stop', latitude: 0, longitude: 0 };
function fixture(options) {
  let time = 100000;
  const controller = createArrival(options, () => time);
  const input = (distance = 10, patch = {}) => ({ status: 'active', focused: true, foreground: true, destination,
    locationStatus: 'tracking', position: { latitude: 0, longitude: meters(distance), accuracy: 5, timestamp: time }, ...patch });
  const at = (distance = 10, advance = 3000, patch = {}) => { time += advance; controller.update(input(distance, patch)); return controller.get(); };
  const likely = () => { at(); at(); return at().prompt; };
  return { controller, input, at, likely, now: () => time, advance(ms) { time += ms; } };
}
test('arrival radius includes reported accuracy with inclusive configurable threshold boundaries', () => {
  assert.equal(ARRIVAL_POLICY.radiusMeters, 50);
  for (const [distance, accuracy, expected] of [[25, 25, 'collecting'], [25.01, 25, 'waiting'], [45, 5, 'collecting'], [45.01, 5, 'waiting'], [50, 0, 'collecting'], [50.01, 0, 'waiting']]) {
    const f = fixture(); const input = f.input(distance); input.position.accuracy = accuracy;
    f.controller.update(input); assert.equal(f.controller.get().status, expected, distance + ' ±' + accuracy);
  }
  const f = fixture({ radiusMeters: 30, rearmRadiusMeters: 60 }); assert.equal(f.at(26).status, 'waiting');
  assert.throws(() => createArrival({ minReadings: 1 }), /Invalid arrival policy/);
  assert.throws(() => createArrival({ radiusMeters: NaN }), /Invalid arrival policy/);
  assert.throws(() => createArrival({ rearmRadiusMeters: 40 }), /Invalid arrival policy/);
});
test('arrival rejects invalid coordinates, unknown/poor accuracy, stale/future fixes, unavailable/denied GPS and missing stops', () => {
  const f = fixture();
  const base = f.input();
  for (const patch of [{ latitude: NaN }, { longitude: 181 }, { accuracy: null }, { accuracy: -1 }, { accuracy: 25.01 }, { accuracy: Infinity }, { timestamp: f.now() + 1 }, { timestamp: f.now() - 15001 }]) {
    const input = { ...base, position: { ...base.position, ...patch } };
    assert.ok(arrivalBlock(input, f.now())); f.controller.update(input); assert.equal(f.controller.get().prompt, null);
  }
  for (const patch of [{ position: null }, { locationStatus: 'denied' }, { locationStatus: 'unavailable' }, { locationStatus: 'weak' }, { destination: undefined }, { destination: { ...destination, latitude: null } }]) {
    assert.ok(arrivalBlock({ ...base, ...patch }, f.now()));
  }
  assert.equal(arrivalBlock({ ...base, position: { ...base.position, accuracy: 25, timestamp: f.now() - 15000 } }, f.now()), '');
});
test('stationary fixes require three distinct readings over six seconds; ticks never count as GPS readings', () => {
  const f = fixture(); assert.equal(f.at(10, 0).status, 'collecting');
  for (let i = 0; i < 3; i++) { f.controller.update(f.input()); assert.equal(f.controller.get().prompt, null); }
  assert.equal(f.at(10).prompt, null);
  const state = f.at(10); assert.equal(state.status, 'likely'); assert.equal(state.prompt.stopId, 'first');
  const prompt = state.prompt; f.controller.update(f.input()); assert.equal(f.controller.get().prompt, prompt);
  assert.equal(f.controller.canConfirm(prompt, f.input()), true, 'Eligibility only; detector never mutates a session');
});
test('too-fast samples do not bypass dwell or minimum spacing, and slow approaching readings qualify', () => {
  const f = fixture(); for (let i = 0; i < 7; i++) assert.equal(f.at(10, 500).prompt, null);
  assert.equal(f.at(10, 500).prompt, null);
  assert.equal(f.at(10, 2000).prompt, null, 'Six seconds from the first accepted sample has not elapsed');
  assert.ok(f.at(10, 500).prompt);
  const g = fixture(); g.at(20); g.at(15); assert.ok(g.at(10).prompt);
});
test('moving away including cumulative drift clears evidence and visible prompts rather than confirming', () => {
  const f = fixture(); f.at(10); f.at(12); assert.equal(f.at(14).prompt, null);
  const g = fixture(); const prompt = g.likely(); assert.ok(prompt);
  assert.equal(g.at(14).prompt, null); assert.equal(g.controller.canConfirm(prompt, g.input(14)), false);
  const h = fixture(); h.at(10); h.at(10); assert.equal(h.at(40).prompt, null, 'Noisy outward reading resets');
});
test('implausible jumps, fast travel, interrupted fixes and inconsistent timestamps reset arrival evidence', () => {
  const f = fixture(); f.at(1000); assert.equal(f.at(10, 1000).prompt, null);
  assert.equal(f.at(10).prompt, null); assert.equal(f.at(10).prompt, null); assert.ok(f.at(10).prompt);
  const fast = fixture(); fast.at(45); assert.equal(fast.at(10, 2000).status, 'waiting');
  const gap = fixture(); gap.at(); gap.at(); assert.equal(gap.at(10, 5001).prompt, null);
  const stale = fixture(); const prompt = stale.likely(); stale.advance(5001);
  assert.equal(stale.controller.canConfirm(prompt, stale.input(10, { position: { ...stale.input().position, timestamp: stale.now() - 5001 } })), false);
  const duplicate = fixture(); duplicate.at(); duplicate.at();
  duplicate.controller.update(duplicate.input(5)); assert.equal(duplicate.controller.get().prompt, null);
  assert.match(duplicate.controller.get().message, /timestamps/);
  const old = fixture(); old.at(); old.at();
  old.controller.update(old.input(10, { position: { ...old.input().position, timestamp: old.now() - 1 } }));
  assert.match(old.controller.get().message, /timestamps/);
});
test('dismissal suppresses repeated prompts until definitely outside the rearm area, then requires new evidence', () => {
  const f = fixture(); const prompt = f.likely();
  assert.equal(f.controller.dismiss(prompt, f.input()), true); assert.equal(f.controller.dismiss(prompt, f.input()), false);
  for (let i = 0; i < 5; i++) assert.equal(f.at().status, 'dismissed');
  assert.equal(f.controller.canConfirm(prompt, f.input()), false);
  assert.equal(f.at(80).status, 'dismissed', '80 minus 5 m accuracy is exactly the 75 m rearm boundary');
  assert.equal(f.at(81).prompt, null);
  f.at(45); f.at(30); f.at(20); const newPrompt = f.at(10).prompt;
  assert.ok(newPrompt); assert.notEqual(newPrompt, prompt); assert.equal(f.controller.canConfirm(prompt, f.input()), false);
});
test('destination changes, Pause/Resume, Finish, final completion, blur and background clear pending evidence and prompts', () => {
  for (const patch of [{ status: 'paused' }, { status: 'finished' }, { status: 'completed' }, { foreground: false }, { focused: false }, { position: null }, { locationStatus: 'denied' }]) {
    const f = fixture(); const old = f.likely(); f.controller.update(f.input(10, patch));
    assert.equal(f.controller.get().prompt, null); assert.equal(f.controller.canConfirm(old, f.input(10, patch)), false);
    f.at(); f.at(); assert.equal(f.controller.get().prompt, null); assert.ok(f.at().prompt, 'Fresh dwell required');
  }
  const f = fixture(); const old = f.likely();
  f.controller.update(f.input(10, { destination: { ...destination, id: 'second' } }));
  assert.equal(f.controller.get().prompt, null); assert.equal(f.controller.canConfirm(old, f.input()), false);
  f.at(); f.at(); const fresh = f.at().prompt; assert.ok(fresh); assert.notEqual(fresh, old);
});

test('Resume cannot reuse a cached pre-pause fix as one of its three fresh arrival readings', () => {
  const f = fixture(); const old = f.likely(), cached = f.input().position;
  f.controller.update(f.input(10, { status: 'paused' })); f.advance(3000);
  f.controller.update(f.input(10, { position: cached })); assert.equal(f.controller.get().prompt, null);
  assert.match(f.controller.get().message, /new GPS reading/);
  assert.equal(f.at().prompt, null); assert.equal(f.at().prompt, null);
  const fresh = f.at().prompt; assert.ok(fresh); assert.notEqual(fresh, old);
});
test('observer invalidates synchronously, expires stale evidence without GPS callbacks and ignores disposed callbacks', () => {
  const f = fixture(); let sourceListener, appListener, tick, removed = 0, cleared = 0;
  let current = f.input();
  const cleanup = observeArrival(f.controller, () => current, [{ subscribe(fn) { sourceListener = fn; return () => { removed++; }; } }],
    { addEventListener(_, fn) { appListener = fn; return { remove() { removed++; } }; } },
    { set(fn) { tick = fn; return 1; }, clear(id) { assert.equal(id, 1); cleared++; } });
  f.advance(3000); current = f.input(); sourceListener(); f.advance(3000); current = f.input(); sourceListener();
  assert.ok(f.controller.get().prompt);
  f.advance(5001); tick(); assert.equal(f.controller.get().prompt, null);
  current = f.input(10, { foreground: false }); appListener(); assert.equal(f.controller.get().prompt, null);
  cleanup(); const before = f.controller.get(); sourceListener(); appListener(); tick();
  assert.equal(f.controller.get(), before); assert.equal(removed, 2); assert.equal(cleared, 1);
});
