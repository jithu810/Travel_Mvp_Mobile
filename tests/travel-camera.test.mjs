import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function load(path, dependencies = {}) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(name => dependencies[name], module, module.exports);
  return module.exports;
}
const guidance = load('src/lib/journey/turn-guidance.ts');
const navigation = load('src/lib/journey/navigation.ts', { './turn-guidance': guidance, './off-route': load('src/lib/journey/off-route.ts', { './turn-guidance': guidance }) });
const { createTravelCamera, NAVIGATION_ZOOM } = load('src/lib/journey/travel-camera.ts', { './navigation': navigation });
const now = 100000;
const fix = (patch = {}) => ({ latitude: 8, longitude: 76, accuracy: 10, timestamp: now, ...patch });
const input = (patch = {}) => ({ status: 'active', focused: true, foreground: true, ready: true,
  position: fix(), locationStatus: 'tracking', reduceMotion: false, top: 100, bottom: 250, ...patch });
function fixture() {
  const commands = []; let canceled = 0, time = now;
  const controller = createTravelCamera(command => commands.push(command), () => canceled++, () => time);
  return { controller, commands, get canceled() { return canceled; }, advance(ms) { time += ms; } };
}
test('active entry follows a suitable fix at street zoom, avoids stationary jitter and recenters explicitly', () => {
  const entry = fixture(); entry.controller.update(input({ status: 'ready' })); entry.controller.explore();
  entry.controller.update(input()); assert.equal(entry.commands.length, 1, 'Explicit Begin restores follow after pre-trip exploration');
  const f = fixture(); f.controller.update(input({ position: null })); assert.equal(f.commands.length, 0);
  f.controller.update(input()); assert.equal(f.commands.length, 1);
  assert.deepEqual(f.commands[0], { centerCoordinate: [76, 8], zoomLevel: NAVIGATION_ZOOM, heading: 0, pitch: 0,
    padding: { paddingTop: 100, paddingBottom: 250, paddingLeft: 28, paddingRight: 28 }, animationMode: 'easeTo', animationDuration: 450 });
  f.controller.update(input({ position: fix({ timestamp: now + 1000 }) })); assert.equal(f.commands.length, 1, 'Future fix cannot move the camera');
  f.controller.update(input()); assert.equal(f.commands.length, 2, 'Recovery after losing eligibility');
  f.controller.update(input()); assert.equal(f.commands.length, 2);
  f.controller.update(input(), true); assert.equal(f.commands.length, 3);
  f.controller.update(input({ position: fix({ longitude: 76.001 }) })); assert.equal(f.commands.length, 4);
  assert.equal(f.controller.get().following, true);
});
test('invalid, unavailable, stale, future and inaccurate GPS never invent a center; denial gives recovery feedback', () => {
  for (const position of [null, fix({ latitude: NaN }), fix({ longitude: 181 }), fix({ accuracy: null }), fix({ accuracy: -1 }), fix({ accuracy: 50.01 }), fix({ timestamp: now - 15001 }), fix({ timestamp: now + 1 })]) {
    const f = fixture(); assert.equal(f.controller.update(input({ position }), true), false);
    assert.equal(f.commands.length, 0); assert.match(f.controller.get().message, /accurate GPS/);
  }
  const f = fixture(); f.controller.update(input({ position: null, locationStatus: 'denied' }), true);
  assert.match(f.controller.get().message, /permission denied.*settings/);
  f.controller.update(input({ position: fix({ accuracy: 50, timestamp: now - 15000 }) }), true); assert.equal(f.commands.length, 1);
});
test('manual camera interaction suspends following until a successful Recenter, without invalid fixes re-enabling it', () => {
  const f = fixture(); f.controller.update(input()); f.controller.explore();
  f.controller.update(input({ position: fix({ longitude: 77 }) })); assert.equal(f.commands.length, 1);
  assert.equal(f.controller.get().following, false);
  f.controller.update(input({ position: null }), true); assert.equal(f.controller.get().following, false);
  f.controller.update(input({ position: fix({ longitude: 77 }) }), true);
  assert.equal(f.commands.length, 2); assert.equal(f.controller.get().following, true);
  f.controller.update(input({ position: fix({ longitude: 78 }) })); assert.equal(f.commands.length, 3);
});
test('Pause, Finish, final completion, background, blur and expired GPS cancel and reject recenter; active reentry resumes safely', () => {
  for (const patch of [{ status: 'paused' }, { status: 'finished' }, { status: 'completed' }, { foreground: false }, { focused: false }, { ready: false }]) {
    const f = fixture(); f.controller.update(input());
    f.controller.update(input(patch)); assert.equal(f.canceled, 1);
    f.controller.update(input(patch), true); assert.equal(f.commands.length, 1);
    f.controller.update(input()); assert.equal(f.commands.length, 2);
    f.controller.stop(); assert.equal(f.canceled, 2);
  }
  const f = fixture(); f.controller.update(input()); f.advance(15001);
  f.controller.update(input()); assert.equal(f.canceled, 1); assert.equal(f.commands.length, 1);
  f.controller.update(input({ status: 'ready' }), true); assert.match(f.controller.get().message, /Begin Trip/);
  f.controller.update(input({ status: 'paused' }), true); assert.match(f.controller.get().message, /Resume/);
});
test('follow honors measured sheet padding and Reduce Motion; exploration survives lifecycle and layout updates', () => {
  const f = fixture(); f.controller.update(input({ reduceMotion: true })); assert.equal(f.commands[0].animationDuration, 0);
  f.controller.update(input({ bottom: 450 })); assert.equal(f.commands[1].padding.paddingBottom, 450);
  f.controller.explore(); f.controller.stop(); f.controller.update(input({ bottom: 300 }));
  assert.equal(f.commands.length, 2); assert.equal(f.controller.get().following, false);
  f.controller.update(input({ status: 'finished' })); f.controller.update(input({ status: 'ready' }));
  f.controller.update(input()); assert.equal(f.controller.get().following, true, 'A new trip restores initial follow intent');
  assert.equal(f.commands.length, 3);
});

test('explicit blur cleanup cancels preview camera work even before Begin or while paused', () => {
  for (const status of ['ready', 'paused']) {
    const f = fixture(); f.controller.update(input({ status, position: null })); f.controller.explore();
    f.controller.update(input({ status, position: null })); assert.equal(f.canceled, 0, 'Ordinary idle ticks must leave map exploration usable');
    f.controller.stop(); assert.equal(f.canceled, 1, 'Blur must cancel native preview animations even when GPS-follow was ineligible');
    assert.equal(f.controller.get().following, false);
  }
});

test('enabling Reduce Motion updates an in-flight follow command at the same GPS coordinate without animating', () => {
  const f = fixture(); f.controller.update(input());
  f.controller.update(input({ reduceMotion: true })); assert.equal(f.commands.length, 2);
  assert.equal(f.commands.at(-1).animationDuration, 0);
  f.controller.explore(); f.controller.update(input({ reduceMotion: false })); assert.equal(f.commands.length, 2, 'Accessibility updates do not take over exploration');
});
