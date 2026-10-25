import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const output = mkdtempSync(join(tmpdir(), 'discovery-camera-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/discovery/camera.ts', 'src/lib/discovery/idle-motion.ts', 'src/lib/discovery/locate-transition.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, types: ['node'],
  outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
assert.equal(ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics).length, 0);
const require = createRequire(import.meta.url);
const { worldCamera } = require(join(output, 'lib/discovery/map.js'));
const { locateCamera, discoveryPadding, localStopZoom, maxDiscoveryZoom } = require(join(output, 'lib/discovery/camera.js'));
const { createIdleMotion, idleDelay, rotationDuration, rotationStep } = require(join(output, 'lib/discovery/idle-motion.js'));
const points = coordinates => ({ type: 'FeatureCollection', features: coordinates.map((coordinate, index) => ({
  type: 'Feature', id: String(index), geometry: { type: 'Point', coordinates: coordinate }, properties: { journeyId: 'public', name: 'stop' },
})) });
const viewport = { width: 360, height: 484 };

test('Locate tightly bounds all actual nearby stops instead of centering the first at zoom 5', () => {
  // Synthetic local cluster, not destination geocoding or production records.
  const data = points([[77.00, 8.60], [77.05, 8.75], [77.02, 8.68]]);
  const before = JSON.stringify(data);
  const fit = locateCamera(data, viewport, 260);
  assert.equal(fit.bounds, undefined);
  assert.ok(fit.zoomLevel > 9 && fit.zoomLevel < 11);
  assert.ok(Math.abs(fit.centerCoordinate[0] - 77.025) < 1e-8);
  assert.ok(fit.centerCoordinate[1] > 8.67 && fit.centerCoordinate[1] < 8.68);
  const expanded = locateCamera(data, viewport, viewport.height - 96);
  assert.ok(expanded.zoomLevel < fit.zoomLevel && expanded.zoomLevel > 7);
  assert.equal(fit.heading, 0); assert.equal(fit.pitch, 0);
  assert.equal(JSON.stringify(data), before);
});
test('wide journeys retain every stop; singleton and identical points receive local zoom', () => {
  const fit = locateCamera(points([[-70, 35], [100, 45], [0, -20]]), viewport, 260);
  assert.ok(fit.zoomLevel >= 0 && fit.zoomLevel < 2);
  assert.equal(fit.bounds, undefined);
});
test('single or repeated exact locations center locally without zero-size native bounds', () => {
  for (const coordinates of [[[0, 0]], [[76, 8], [76, 8]]]) {
    const fit = locateCamera(points(coordinates), viewport, 260);
    assert.deepEqual(fit.centerCoordinate, coordinates[0]);
    assert.equal(fit.zoomLevel, localStopZoom);
    assert.ok(fit.zoomLevel >= 12 && fit.zoomLevel <= maxDiscoveryZoom);
    assert.equal(fit.bounds, undefined);
  }
});
test('invalid/missing coordinates and unmeasured layouts never invent a camera target', () => {
  for (const coordinates of [[], [[NaN, 8]], [[76, null]], [['76', 8]], [[181, 8]], [[76, 91]]])
    assert.equal(locateCamera(points(coordinates), viewport, 260), null);
  const fit = locateCamera(points([[76, 8], [Infinity, 0], [null, 8]]), viewport, 260);
  assert.deepEqual(fit.centerCoordinate, [76, 8]);
  for (const size of [{ width: 0, height: 400 }, { width: 360, height: 0 }, { width: NaN, height: 400 }])
    assert.equal(locateCamera(points([[76, 8]]), size, 260), null);
});
test('camera padding follows collapsed/expanded sheets and always leaves a usable viewport', () => {
  for (const size of [viewport, { width: 412, height: 750 }]) {
    const collapsed = discoveryPadding(size, 260), expanded = discoveryPadding(size, size.height - 96);
    assert.ok(expanded.paddingBottom > collapsed.paddingBottom);
    for (const padding of [collapsed, expanded]) {
      assert.ok(padding.paddingTop + padding.paddingBottom < size.height);
      assert.ok(padding.paddingLeft + padding.paddingRight < size.width);
      assert.ok(padding.paddingBottom >= (padding === collapsed ? 260 : size.height - 96));
    }
  }
  const tiny = discoveryPadding({ width: 30, height: 40 }, 500);
  assert.ok(tiny.paddingTop + tiny.paddingBottom < 40);
});
test('dateline clusters use the shortest arc and screen-derived zoom instead of a nearly global box', () => {
  const fit = locateCamera(points([[179.8, 10], [-179.8, 10.1]]), viewport, 260);
  assert.ok(Math.abs(fit.centerCoordinate[0]) > 179);
  assert.ok(fit.zoomLevel > 6 && fit.zoomLevel <= maxDiscoveryZoom);
  assert.equal(fit.bounds, undefined);
});

function harness(observePose = true) {
  let time = 0, sequence = 0;
  const timers = new Map(), moves = [], stops = [];
  const clock = {
    now: () => time,
    set(callback, delay) { const id = ++sequence; timers.set(id, { at: time + delay, callback }); return id; },
    clear(id) { timers.delete(id); },
    advance(milliseconds) {
      const end = time + milliseconds;
      for (;;) {
        const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]); time = next[1].at; next[1].callback();
      }
      time = end;
    },
  };
  const motion = createIdleMotion((camera, duration) => moves.push({ camera, duration }), camera => stops.push(camera), clock);
  motion.configure({ focused: true, active: true, ready: true, reduceMotion: false });
  const pose = { centerCoordinate: [35, 18], zoomLevel: 1.2, heading: 24, pitch: 0 };
  if (observePose) motion.observe(pose, false);
  return { motion, clock, moves, stops, pose, timers };
}
test('first rotation starts immediately from a valid ready pose and preserves native animation duration', () => {
  const h = harness();
  assert.equal(h.moves.length, 0);
  h.clock.advance(0);
  assert.equal(h.moves.length, 1); assert.equal(h.moves[0].duration, rotationDuration);
  assert.ok(Math.abs(h.moves[0].camera.centerCoordinate[0] - 35 - rotationStep) < 1e-9);
  assert.deepEqual([h.moves[0].camera.centerCoordinate[1], h.moves[0].camera.zoomLevel, h.moves[0].camera.heading], [18, 1.2, 24]);
  h.motion.idle(); // Queued old idle event must not advance an unfinished auto movement.
  h.clock.advance(rotationDuration); assert.equal(h.moves.length, 1);
  h.motion.observe({ ...h.moves[0].camera, centerCoordinate: [36.91, 18] }, false); h.motion.idle();
  h.clock.advance(230); assert.equal(h.moves.length, 2);
  h.motion.dispose();
});
test('touch/gesture immediately stop idle motion and resume from the user pose only after idle delay', () => {
  const h = harness(); h.clock.advance(0);
  h.motion.touch(true); assert.equal(h.stops.length, 1);
  const user = { ...h.pose, centerCoordinate: [80, -10], heading: 50 };
  h.motion.observe(user, true); h.clock.advance(30000); assert.equal(h.moves.length, 1);
  h.motion.touch(false); h.motion.idle(); h.clock.advance(idleDelay - 1); assert.equal(h.moves.length, 1);
  h.clock.advance(1); assert.equal(h.moves.length, 2);
  assert.deepEqual([h.moves[1].camera.centerCoordinate[1], h.moves[1].camera.heading], [-10, 50]);
  assert.ok(Math.abs(h.moves[1].camera.centerCoordinate[0] - 80 - rotationStep) < 1e-9);
  h.motion.dispose();
});
test('selected journeys, background, blur and reduce-motion block rotation and cancel timers', () => {
  for (const patch of [{ selected: true }, { active: false }, { focused: false }, { reduceMotion: true }, { ready: false }]) {
    const h = harness(); h.clock.advance(0); h.motion.configure(patch);
    assert.equal(h.stops.length, 1); assert.equal(h.timers.size, 0);
    h.clock.advance(60000); assert.equal(h.moves.length, 1); h.motion.dispose();
  }
});
test('programmatic camera pauses and local zoom prevent competing idle animation', () => {
  const h = harness(); h.motion.pause(900); h.clock.advance(899); assert.equal(h.moves.length, 0);
  h.clock.advance(1); assert.equal(h.moves.length, 1);
  h.motion.observe({ ...h.pose, zoomLevel: 10 }, false);
  h.clock.advance(60000); assert.equal(h.moves.length, 1); assert.equal(h.timers.size, 0);
  h.motion.dispose();
});
test('missing native idle still advances; disposal clears work and handles strict-mode reuse', () => {
  const h = harness(); h.clock.advance(rotationDuration + 230);
  assert.equal(h.moves.length, 2); assert.equal(h.stops.length, 0);
  assert.equal(h.moves[1].camera.centerCoordinate[0], 35 + 2 * rotationStep);
  h.motion.dispose(); assert.equal(h.timers.size, 0); h.clock.advance(60000); assert.equal(h.moves.length, 2);
  h.motion.configure({ focused: true, ready: true }); h.clock.advance(0); assert.equal(h.moves.length, 3);
  h.motion.dispose();
});
test('native Home disables only the scale bar and retains gestures, branding and frame guards', () => {
  const source = readFileSync('src/components/discovery/globe/native-globe.tsx', 'utf8');
  assert.ok(source.includes('scaleBarEnabled={false}'));
  assert.ok(source.includes('logoEnabled attributionEnabled'));
  assert.ok(source.includes('onTouchStart='));
  const syntax = ts.createSourceFile('native-globe.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const handlers = [];
  const visit = node => {
    if (ts.isJsxAttribute(node) && node.name.getText(syntax) === 'onCameraChanged' && node.initializer && ts.isJsxExpression(node.initializer)) handlers.push(node.initializer.expression);
    ts.forEachChild(node, visit);
  };
  visit(syntax); assert.equal(handlers.length, 1);
  const calls = [], state = { properties: { zoom: 2 } };
  const cameraChanged = new Function('pins', 'observe', 'return (' + handlers[0].getText(syntax) + ');')(
    { cameraChanged: value => calls.push(['invalidate pins', value]) }, value => calls.push(value));
  cameraChanged(state);
  assert.deepEqual(calls, [['invalidate pins', state.properties], state], 'Forward the real camera pose to pin protection and the original camera event exactly once');
  assert.ok(source.includes('framed.current.layout === layoutKey'));
  assert.ok(!source.includes('zoomLevel: 5'));
});

test('Locate takes ownership before command and cannot be canceled by old rotation timers', () => {
  const h = harness(); h.clock.advance(0);
  h.motion.configure({ selected: true }); h.motion.pause(900);
  const stopsBeforeLocate = h.stops.length;
  const fit = locateCamera(points([[77, 8.6], [77.05, 8.75]]), viewport, 260);
  h.motion.observe(fit, false); h.motion.idle(); h.clock.advance(60000);
  assert.equal(h.moves.length, 1);
  assert.equal(h.stops.length, stopsBeforeLocate);
  assert.equal(h.timers.size, 0);
  h.motion.dispose();
});
test('rounded and stale idle snapshots do not prevent successive visible steps', () => {
  const h = harness(); h.clock.advance(0);
  for (let index = 0; index < 4; index++) {
    h.motion.observe(h.pose, false); h.motion.idle();
    h.clock.advance(rotationDuration + 230);
  }
  assert.equal(h.moves.length, 5);
  assert.equal(h.moves[4].camera.centerCoordinate[0], 35 + 5 * rotationStep);
  assert.equal(h.stops.length, 0);
  h.motion.dispose();
});

test('nearby fitted markers project inside the exposed area for both panel states', () => {
  const coordinates = [[77, 8.6], [77.05, 8.75], [77.02, 8.68]];
  const y = latitude => (1 - Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360)) / Math.PI) / 2;
  for (const panel of [44, 260, viewport.height - 96]) {
    const fit = locateCamera(points(coordinates), viewport, panel);
    const p = fit.padding, scale = 512 * 2 ** fit.zoomLevel;
    const cx = (p.paddingLeft + viewport.width - p.paddingRight) / 2;
    const cy = (p.paddingTop + viewport.height - p.paddingBottom) / 2;
    for (const [longitude, latitude] of coordinates) {
      const px = cx + (longitude - fit.centerCoordinate[0]) / 360 * scale;
      const py = cy + (y(latitude) - y(fit.centerCoordinate[1])) * scale;
      assert.ok(px >= p.paddingLeft - 1e-6 && px <= viewport.width - p.paddingRight + 1e-6);
      assert.ok(py >= p.paddingTop - 1e-6 && py <= viewport.height - p.paddingBottom + 1e-6);
    }
  }
});

const { createLocateTransition, cinematicLocateDuration } = require(join(output, 'lib/discovery/locate-transition.js'));
function locateHarness() {
  const commands = [], timers = new Map(); let sequence = 0;
  const transition = createLocateTransition(command => commands.push(command), {
    set(callback, delay) { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    clear(id) { timers.delete(id); },
  });
  const finish = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(timer => timer.callback()); };
  return { commands, timers, transition, finish };
}
test('every explicit Locate exits to world, holds, then flies to the exact all-stop fit', () => {
  const h = locateHarness(), fit = locateCamera(points([[77, 8.6], [77.05, 8.75]]), viewport, 260);
  for (let tap = 0; tap < 3; tap++) {
    const request = 'A:' + tap;
    h.transition.select(request); h.transition.run(request, fit);
    assert.deepEqual(h.commands.at(-1), { ...worldCamera, padding: fit.padding, animationMode: 'easeTo', animationDuration: 800 });
    assert.equal([...h.timers.values()][0].delay, 1000);
    h.finish();
    assert.deepEqual(h.commands.at(-1), { ...fit, animationMode: 'flyTo', animationDuration: 1350 });
    assert.equal(cinematicLocateDuration, 2350);
  }
});
test('latest journey wins and late old detail or queued timer cannot start an approach', () => {
  const h = locateHarness(), a = locateCamera(points([[77, 8]]), viewport, 260);
  const b = locateCamera(points([[-179.8, 10], [179.8, 10.1]]), viewport, 260);
  h.transition.select('A:1'); h.transition.run('A:1', a);
  const stale = [...h.timers.values()][0].callback;
  h.transition.select('B:2'); // B loading: immediately invalidate A.
  stale(); assert.equal(h.commands.length, 1);
  assert.equal(h.transition.run('A:1', a), false);
  h.transition.run('B:2', b); h.finish(); stale();
  assert.equal(h.commands.length, 3);
  assert.deepEqual(h.commands.at(-1).centerCoordinate, b.centerCoordinate);
  assert.equal(h.commands.at(-1).zoomLevel, b.zoomLevel);
});
test('cancellation while loading or holding cannot be revived by late detail or focus/layout events', () => {
  for (const started of [false, true]) {
    const h = locateHarness(), fit = locateCamera(points([[77, 8]]), viewport, 260);
    h.transition.select('A:1');
    if (started) h.transition.run('A:1', fit);
    const stale = [...h.timers.values()][0]?.callback;
    h.transition.cancel(); h.transition.select('A:1');
    assert.equal(h.transition.run('A:1', fit), false);
    h.finish(); stale?.();
    assert.equal(h.commands.length, started ? 1 : 0);
    h.transition.select('A:2'); assert.equal(h.transition.run('A:2', fit), true);
    h.finish(); assert.equal(h.commands.at(-1).zoomLevel, fit.zoomLevel);
  }
});
test('panel measurement updates the pending final fit without skipping the world hold', () => {
  const h = locateHarness(), data = points([[77, 8.6], [77.05, 8.75]]);
  const collapsed = locateCamera(data, viewport, 260), expanded = locateCamera(data, viewport, viewport.height - 96);
  h.transition.select('A:1'); h.transition.run('A:1', collapsed);
  const timer = [...h.timers.values()][0];
  h.transition.run('A:1', expanded, false);
  assert.equal(h.commands.length, 1); assert.equal([...h.timers.values()][0], timer);
  h.finish(); assert.deepEqual(h.commands.at(-1), { ...expanded, animationMode: 'flyTo', animationDuration: 1350 });
});
test('single, dateline and wide routes retain exact fitted destinations after world reset', () => {
  for (const coordinates of [[[77, 8]], [[179.8, 10], [-179.8, 10.1]], [[-170, -70], [0, 0], [170, 70]]]) {
    const h = locateHarness(), fit = locateCamera(points(coordinates), viewport, 260);
    h.transition.select('A:1'); h.transition.run('A:1', fit); h.finish();
    assert.deepEqual(h.commands.at(-1), { ...fit, animationMode: 'flyTo', animationDuration: 1350 });
  }
});

test('sheet interaction pauses idle without adding a manual gesture delay or touching selected Locate', () => {
  const h = harness(); h.clock.advance(0);
  h.motion.configure({ interacting: true });
  assert.equal(h.stops.length, 1);
  h.clock.advance(60000); assert.equal(h.moves.length, 1);
  h.motion.configure({ interacting: false }); h.clock.advance(0);
  assert.equal(h.moves.length, 2);
  h.motion.configure({ selected: true }); const stops = h.stops.length;
  h.motion.configure({ interacting: true }); h.motion.configure({ interacting: false });
  h.clock.advance(60000); assert.equal(h.stops.length, stops); assert.equal(h.moves.length, 2);
  h.motion.dispose();
});

test('settled sheet refit waits for the existing Locate flight before applying its latest padding', () => {
  const h = locateHarness(), data = points([[77, 8.6], [77.05, 8.75]]);
  const collapsed = locateCamera(data, viewport, 260), expanded = locateCamera(data, viewport, viewport.height - 96);
  h.transition.select('A:1'); h.transition.run('A:1', collapsed); h.finish();
  assert.equal(h.commands.length, 2);
  h.transition.run('A:1', expanded, false); assert.equal(h.commands.length, 2);
  h.finish(); assert.equal(h.commands.length, 3);
  assert.deepEqual(h.commands.at(-1), { ...expanded, animationMode: 'flyTo', animationDuration: 1350 });
  h.transition.cancel(); h.finish(); assert.equal(h.commands.length, 3);
});

test('idle speed stays within 1–1.5 degrees/sec and repeated steps wrap at the dateline', () => {
  assert.equal(idleDelay, 10000);
  assert.ok(rotationStep / (rotationDuration / 1000) >= 1 && rotationStep / (rotationDuration / 1000) <= 1.5);
  assert.ok(rotationStep / ((rotationDuration + 50) / 1000) >= 1);
  const h = harness();
  h.motion.observe({ ...h.pose, centerCoordinate: [179, 18] }, false);
  h.clock.advance(20 * (rotationDuration + 50));
  assert.equal(h.moves.length, 21);
  for (const [index, move] of h.moves.entries()) {
    const expected = ((179 + (index + 1) * rotationStep + 180) % 360) - 180;
    assert.equal(move.camera.centerCoordinate[0], expected);
    assert.ok(move.camera.centerCoordinate[0] >= -180 && move.camera.centerCoordinate[0] < 180);
  }
  assert.equal(h.timers.size, 1); h.motion.dispose();
});

test('already queued idle completion cannot stop or advance a newer Locate after interruption', () => {
  for (const interrupt of [h => h.motion.touch(true), h => h.motion.configure({ selected: true }),
    h => h.motion.configure({ active: false }), h => h.motion.configure({ focused: false }),
    h => h.motion.configure({ reduceMotion: true }), h => h.motion.pause(900), h => h.motion.dispose()]) {
    const h = harness(); h.clock.advance(0);
    const stale = [...h.timers.values()][0].callback;
    interrupt(h);
    const stopCount = h.stops.length, moveCount = h.moves.length;
    stale();
    assert.equal(h.stops.length, stopCount); assert.equal(h.moves.length, moveCount);
    h.motion.dispose();
  }
});

test('initial camera hold survives readiness/pose updates and starts without a ten-second recovery wait', () => {
  const h = harness(false); h.motion.pause(900);
  h.motion.configure({ ready: true });
  h.motion.observe({ ...h.pose, centerCoordinate: [36, 18] }, false); h.motion.idle();
  h.clock.advance(899); assert.equal(h.moves.length, 0);
  h.clock.advance(1); assert.equal(h.moves.length, 1);
  assert.equal(h.moves[0].camera.centerCoordinate[0], 36 + rotationStep);
  h.motion.pause(900); h.clock.advance(899);
  assert.equal(h.moves.length, 1);
  h.clock.advance(1); assert.equal(h.moves.length, 2); h.motion.dispose();
});

test('startup waits for map readiness, valid camera and motion preference before issuing any command', () => {
  const h = harness(); h.motion.configure({ ready: false });
  h.clock.advance(60000); assert.equal(h.moves.length, 0);
  h.motion.configure({ ready: true, reduceMotion: true });
  h.clock.advance(60000); assert.equal(h.moves.length, 0);
  h.motion.configure({ reduceMotion: false }); h.clock.advance(0);
  assert.equal(h.moves.length, 1); h.motion.dispose();
  const commands = [], timers = [];
  const motion = createIdleMotion(value => commands.push(value), () => {}, {
    set(callback) { timers.push(callback); return callback; }, clear() {},
  });
  motion.configure({ focused: true, active: true, ready: true, reduceMotion: false });
  assert.equal(timers.length, 0); // No native pose yet.
  motion.observe({ ...h.pose, centerCoordinate: [NaN, 18] }, false);
  assert.equal(timers.length, 0); motion.dispose();
});

test('gestures before the first automatic step revoke immediate startup and retain recovery delay', () => {
  const h = harness(); h.motion.touch(true); h.motion.touch(false); h.motion.idle();
  h.clock.advance(idleDelay - 1); assert.equal(h.moves.length, 0);
  h.clock.advance(1); assert.equal(h.moves.length, 1); h.motion.dispose();
});

test('Locate completion starts decoration only for the latest completed fit, never canceled work', () => {
  const commands = [], settled = [], timers = new Map();
  const transition = createLocateTransition(value => commands.push(value), {
    set(callback) { timers.set(callback, callback); return callback; }, clear(callback) { timers.delete(callback); },
  }, request => settled.push(request));
  const finish = () => { const callbacks = [...timers.keys()]; timers.clear(); callbacks.forEach(cb => cb()); };
  const fit = locateCamera(points([[77, 8], [77.01, 8.02]]), viewport, 260);
  transition.select('A'); transition.run('A', fit); finish();
  assert.deepEqual(settled, []);
  const stale = [...timers.keys()][0]; transition.select('B'); stale();
  assert.deepEqual(settled, []);
  transition.run('B', fit); finish();
  transition.run('B', { ...fit, zoomLevel: fit.zoomLevel - 1 }, false);
  finish(); assert.deepEqual(settled, []); // Pending panel fit must finish too.
  finish(); assert.deepEqual(settled, ['B']);
  transition.cancel(); finish(); assert.deepEqual(settled, ['B']);
});


test('closing a journey resumes immediately after return camera hold despite panel and camera events', () => {
  const h = harness(); h.clock.advance(0);
  h.motion.configure({ selected: true }); h.motion.pause(2350);
  h.motion.observe({ ...h.pose, zoomLevel: 12 }, false);
  h.clock.advance(3000); assert.equal(h.moves.length, 1);
  h.motion.configure({ interacting: true }); // X touch starts on the panel.
  h.motion.configure({ selected: false }); h.motion.pause(900);
  h.clock.advance(400);
  h.motion.configure({ interacting: false });
  h.motion.observe({ ...h.pose, zoomLevel: 2 }, false); h.motion.idle();
  h.clock.advance(499); assert.equal(h.moves.length, 1);
  h.motion.observe(h.pose, false); h.motion.idle();
  h.clock.advance(1); assert.equal(h.moves.length, 2);
  assert.equal(h.moves[1].camera.centerCoordinate[0], 35 + rotationStep);
  h.motion.dispose();
});

test('panel events and programmatic idle snapshots do not restart a manual cooldown', () => {
  const h = harness(); h.motion.touch(true); h.motion.observe(h.pose, true);
  h.motion.touch(false); h.motion.idle();
  h.clock.advance(4000); h.motion.configure({ interacting: true });
  h.clock.advance(1000); h.motion.configure({ interacting: false });
  h.motion.pause(900); h.motion.observe(h.pose, false); h.motion.idle();
  h.clock.advance(4999); assert.equal(h.moves.length, 0);
  h.clock.advance(1); assert.equal(h.moves.length, 1);
  h.motion.dispose();
});

test('stale gesture flags without a map touch cannot stop startup or a return transition', () => {
  const h = harness(); h.motion.pause(900);
  h.motion.observe(h.pose, true); h.motion.idle();
  h.clock.advance(899); assert.equal(h.moves.length, 0);
  h.clock.advance(1); assert.equal(h.moves.length, 1);
  h.motion.observe(h.pose, true); h.clock.advance(rotationDuration + 50);
  assert.equal(h.moves.length, 2); h.motion.dispose();
});

test('new selection, manual touch and lifecycle cancellation invalidate pending return callbacks', () => {
  for (const interrupt of [h => h.motion.configure({ selected: true }), h => h.motion.touch(true),
    h => h.motion.configure({ active: false }), h => h.motion.configure({ focused: false }),
    h => h.motion.configure({ ready: false }), h => h.motion.dispose()]) {
    const h = harness(); h.motion.pause(900);
    const stale = [...h.timers.values()][0].callback;
    interrupt(h); stale(); h.clock.advance(1000);
    assert.equal(h.moves.length, 0); h.motion.dispose();
  }
});

test('native startup waits for map loading rather than treating style loading as camera readiness', () => {
  const source = readFileSync('src/components/discovery/globe/native-globe.tsx', 'utf8');
  assert.ok(source.includes('onDidFinishLoadingMap={() => setReady(true)}'));
  assert.ok(!source.includes('onDidFinishLoadingStyle={() => setReady(true)}'));
  assert.ok(source.includes('mapTouch.current && state.gestures.isGestureActive'));
});
