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
const model = load('src/lib/journey/turn-guidance.ts');
const navigation = load('src/lib/journey/navigation.ts', { './turn-guidance': model, './off-route': load('src/lib/journey/off-route.ts', { './turn-guidance': model }) });
const { parseRouteSteps, createGuidance, maneuverIcon, geographicDistance } = model;
const { navigationFix, parseRoadRoute, createNavigation } = navigation;
// Equatorial coordinates make fixture distances simple (~1 degree = 111 km).
const a = [0, 0], b = [0.001, 0], c = [0.001, 0.001], d = [0.002, 0.001];
const step = (start, end, type, instruction, modifier = 'straight') => ({
  maneuver: { location: start, type, instruction, modifier },
  geometry: { type: 'LineString', coordinates: [start, end] }, distance: geographicDistance(start, end), duration: 10,
});
const raw = () => [step(a, b, 'depart', 'Head east'), step(b, c, 'turn', 'Turn left onto North Road', 'left'),
  step(c, d, 'turn', 'Turn right onto East Road', 'right'), step(d, d, 'arrive', 'You have arrived at your destination')];
function routeFixture(steps = raw()) {
  return { code: 'Ok', routes: [{ geometry: { type: 'LineString', coordinates: [a, b, c, d] },
    distance: steps.reduce((sum, item) => sum + item.distance, 0), duration: 30, legs: [{ steps }] }] };
}
const road = () => parseRoadRoute(routeFixture());
function fixture() {
  let time = 100000;
  const route = road(), controller = createGuidance(navigationFix, () => time);
  const position = (x, y, patch = {}) => ({ longitude: x, latitude: y, accuracy: 5, timestamp: time, ...patch });
  const at = (x, y, ms = 1000, patch = {}) => { time += ms; return controller.update(route, position(x, y, patch)); };
  return { controller, route, at, position, advance(ms) { time += ms; }, now: () => time };
}
test('Directions steps parse in API order with maneuver starts, geometries, text, distances and duration', () => {
  const steps = parseRouteSteps(routeFixture().routes[0].legs, [a, b, c, d]);
  assert.deepEqual(steps.map(item => item.type), ['depart', 'turn', 'turn', 'arrive']);
  assert.equal(steps[1].instruction, 'Turn left onto North Road'); assert.deepEqual(steps[1].location, b);
  assert.equal(steps[1].duration, 10); assert.deepEqual(road().steps, steps);
  assert.equal(maneuverIcon(steps[1]), '↰'); assert.equal(maneuverIcon(steps[2]), '↱');
  assert.equal(maneuverIcon({ type: 'roundabout', modifier: 'right' }), '↻');
  assert.equal(maneuverIcon({ type: 'future type', modifier: null }), '◇');
});
test('missing, malformed or discontinuous middle steps disable guidance without losing a valid road route', () => {
  for (const mutate of [
    r => { delete r.routes[0].legs; }, r => { r.routes[0].legs[0].steps = []; },
    r => { r.routes[0].legs[0].steps[1].maneuver.instruction = ''; },
    r => { r.routes[0].legs[0].steps[1].maneuver.location = [181, 0]; },
    r => { r.routes[0].legs[0].steps[1].geometry.coordinates[0] = [1, 1]; },
    r => { r.routes[0].legs[0].steps[1].distance = -1; },
    r => { r.routes[0].legs[0].steps[1].duration = '5'; },
    r => { r.routes[0].legs[0].steps[1].maneuver.modifier = {}; },
    r => { r.routes[0].legs[0].steps[1].distance = 9999; },
    r => { r.routes[0].legs[0].steps.reverse(); },
  ]) {
    const response = routeFixture(); mutate(response); const result = parseRoadRoute(response);
    assert.ok(result.geometry); assert.equal(result.steps, null);
    assert.equal(createGuidance(navigationFix).update(result, null).status, 'unavailable');
  }
});
test('step parser bounds payload sizes and never coerces strings or accepts invented endpoint coordinates', () => {
  assert.equal(parseRouteSteps([{ steps: Array(2001).fill(raw()[0]) }], [a, d]), null);
  const steps = raw(); steps[1].geometry.coordinates = Array(100001).fill(b);
  assert.equal(parseRouteSteps([{ steps }], [a, d]), null);
  const bad = raw(); bad[0].maneuver.location = ['0', 0]; assert.equal(parseRouteSteps([{ steps: bad }], [a, d]), null);
  assert.equal(parseRouteSteps(routeFixture().routes[0].legs, [[1, 1], d]), null);
});
test('upcoming maneuvers advance in sequence only after forward outgoing fixes at least one second apart', () => {
  const f = fixture(); let state = f.at(0, 0);
  assert.equal(state.maneuverIndex, 1); assert.match(state.maneuver.instruction, /left/);
  assert.ok(state.distanceToManeuver > 110 && state.distanceToManeuver < 112);
  f.at(0.0004, 0); f.at(0.0008, 0);
  state = f.at(0.001, 0.00015); assert.equal(state.maneuverIndex, 1, 'One outgoing fix is not enough');
  state = f.at(0.001, 0.0003); assert.equal(state.maneuverIndex, 2);
  assert.match(state.maneuver.instruction, /right/); assert.ok(state.remainingDistance < 200);
  f.at(0.001, 0.00065); f.at(0.001, 0.00085);
  state = f.at(0.00115, 0.001); assert.equal(state.maneuverIndex, 2);
  state = f.at(0.0013, 0.001); assert.equal(state.maneuverIndex, 3);
  assert.equal(state.maneuver.type, 'arrive', 'Endpoint remains upcoming; controller never completes a stop');
  state = f.at(0.0017, 0.001); state = f.at(0.002, 0.001);
  assert.equal(state.maneuverIndex, 3); assert.equal(state.status, 'ready');
});
test('duplicate callbacks/ticks and stationary junction drift cannot advance a maneuver', () => {
  const f = fixture(); f.at(0, 0); f.at(0.0004, 0); f.at(0.0008, 0);
  const waiting = f.at(0.001, 0.00015);
  assert.equal(f.controller.update(f.route, f.position(0.001, 0.00015)), waiting);
  assert.equal(f.at(0.001, 0.00015).maneuverIndex, 1, 'New timestamps without forward movement do not confirm');
  assert.equal(f.at(0.001, 0.0003).maneuverIndex, 2);
});

test('remaining geometry clips accepted progress through a turn without mutating the calculated route', () => {
  const f = fixture(), original = structuredClone(f.route);
  f.at(0, 0); const east = f.at(0.0004, 0).remainingGeometry;
  assert.equal(east.type, 'LineString');
  assert.ok(Math.abs(east.coordinates[0][0] - 0.0004) < 1e-10);
  assert.ok(Math.abs(east.coordinates[0][1]) < 1e-10);
  assert.deepEqual(east.coordinates.at(-1), d);
  f.at(0.0008, 0); f.at(0.001, 0.00015);
  const north = f.at(0.001, 0.0003).remainingGeometry;
  assert.ok(Math.abs(north.coordinates[0][0] - 0.001) < 1e-10);
  assert.ok(Math.abs(north.coordinates[0][1] - 0.0003) < 1e-10);
  assert.equal(north.coordinates.some(p => p[0] < 0.001 - 1e-10), false);
  assert.deepEqual(north.coordinates.at(-1), d);
  assert.deepEqual(f.route, original);
});

test('poor GPS, genuine off-route movement and later-leg jumps freeze accepted trim without false snapping', () => {
  for (const [x, y, patch] of [[0.0005, 0, { accuracy: 60 }], [0.0004, 0.001, {}], [0.0015, 0.001, {}], [0.0001, 0, {}]]) {
    const f = fixture(); f.at(0, 0); const accepted = f.at(0.0004, 0).remainingGeometry;
    const held = f.at(x, y, 1000, patch);
    assert.equal(held.status, 'waiting'); assert.equal(held.maneuver, null);
    assert.deepEqual(held.remainingGeometry, accepted);
  }
  const f = fixture(); f.at(0, 0); const accepted = f.at(0.0004, 0).remainingGeometry;
  assert.deepEqual(f.controller.update(f.route, null).remainingGeometry, accepted);
  const recovered = f.at(0.0005, 0);
  assert.equal(recovered.status, 'ready');
  assert.ok(recovered.remainingGeometry.coordinates[0][0] > accepted.coordinates[0][0]);
});

test('route replacement resets trim and routes without valid steps never invent progress geometry', () => {
  const f = fixture(); f.at(0, 0); f.at(0.0004, 0);
  f.advance(1000);
  const replacement = road();
  const state = f.controller.update(replacement, f.position(0, 0));
  assert.deepEqual(state.remainingGeometry.coordinates[0], a);
  const noSteps = { ...replacement, steps: null };
  assert.equal(f.controller.update(noSteps, f.position(0.0004, 0)).remainingGeometry, undefined);
  assert.deepEqual(noSteps.geometry.coordinates, [a, b, c, d]);
});
test('slow forward movement can accumulate confirmation distance across several fresh fixes', () => {
  const f = fixture(); f.at(0, 0); f.at(0.0004, 0); f.at(0.0008, 0);
  assert.equal(f.at(0.001, 0.00015).maneuverIndex, 1);
  assert.equal(f.at(0.001, 0.00016).maneuverIndex, 1);
  assert.equal(f.at(0.001, 0.00018).maneuverIndex, 2);
});
test('jumping ahead, large drift, backward travel and future/stale/inaccurate readings cannot skip a turn', () => {
  const f = fixture(); f.at(0, 0); f.at(0.0004, 0);
  assert.equal(f.at(0.001, 0.001).status, 'waiting'); // Later route segment is never a global matching candidate.
  assert.equal(f.at(0.0005, 0).status, 'waiting', 'Recovery from a rejected distant fix must itself settle');
  assert.equal(f.at(0.0005, 0).maneuverIndex, 1);
  assert.equal(f.at(0.0002, 0).status, 'waiting');
  assert.equal(f.at(0.0005, 0).maneuverIndex, 1);
  for (const patch of [{ accuracy: 26 }, { accuracy: null }, { timestamp: f.now() - 16000 }, { timestamp: f.now() + 50000 }]) {
    const state = f.at(0.001, 0.0003, 1000, patch); assert.equal(state.status, 'waiting'); assert.equal(state.maneuver, null);
  }
});
test('GPS expiry and long gaps hold guidance rather than accepting distant progress', () => {
  const f = fixture(); f.at(0, 0); const old = f.position(0, 0); f.advance(15001);
  assert.equal(f.controller.update(f.route, old).status, 'waiting');
  assert.equal(f.at(0.001, 0.001).status, 'waiting');
  const g = fixture(); g.at(0, 0); g.at(0.0004, 0);
  assert.equal(g.at(0.0008, 0, 6000).status, 'waiting');
});
test('new route identity resets maneuver progress and uses the replacement steps', () => {
  const f = fixture(); f.at(0, 0); f.at(0.0004, 0); f.at(0.0008, 0); f.at(0.001, 0.00015); f.at(0.001, 0.0003);
  const replacement = road(); replacement.steps[1].instruction = 'Replacement left turn';
  f.advance(1000); const state = f.controller.update(replacement, f.position(0, 0));
  assert.equal(state.maneuverIndex, 1); assert.equal(state.maneuver.instruction, 'Replacement left turn');
  f.controller.reset(); assert.equal(f.controller.update(replacement, f.position(0, 0)).maneuverIndex, 1);
});
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
test('existing navigation controller requests steps once, updates guidance on GPS, and clears it on every lifecycle stop', async () => {
  for (const patch of [{ status: 'paused' }, { status: 'finished' }, { status: 'completed' }, { foreground: false }, { focused: false }]) {
    let time = 100000, calls = 0;
    const route = road(), controller = createNavigation(async () => { calls++; return route; }, () => time);
    const base = { status: 'active', foreground: true, focused: true, position: { latitude: 0, longitude: 0, accuracy: 5, timestamp: time }, destination: { id: 'first', latitude: d[1], longitude: d[0] } };
    controller.update(base); await flush(); assert.equal(controller.get().guidance.maneuverIndex, 1);
    time += 1000; const next = { ...base, position: { ...base.position, timestamp: time, longitude: 0.0004 } };
    controller.update(next); assert.equal(calls, 1); assert.ok(controller.get().guidance.distanceToManeuver < 70);
    controller.update({ ...next, ...patch }); assert.equal(controller.get().guidance, null);
    time += 5000; controller.update({ ...base, position: { ...base.position, timestamp: time } }); await flush();
    assert.equal(controller.get().guidance.maneuverIndex, 1); assert.equal(calls, 2, 'Existing resume/reentry routing path is reused');
    controller.stop(); assert.equal(controller.get().guidance, null);
  }
});
test('stop change cancels obsolete guidance and late route success; route failures never expose old instructions', async () => {
  let time = 100000, resolve; const route = road();
  const controller = createNavigation(() => new Promise(done => { resolve = done; }), () => time);
  const base = { status: 'active', foreground: true, focused: true, position: { latitude: 0, longitude: 0, accuracy: 5, timestamp: time }, destination: { id: 'first', latitude: d[1], longitude: d[0] } };
  controller.update(base); await flush(); const oldResolve = resolve;
  time += 5000; controller.update({ ...base, destination: { ...base.destination, id: 'second' } }); await flush();
  oldResolve(route); await flush(); assert.equal(controller.get().guidance, null);
  resolve(route); await flush(); assert.equal(controller.get().guidance.maneuverIndex, 1); controller.stop();
  const failure = createNavigation(async () => { throw new navigation.RoutingError('No driving route found'); });
  failure.update({ ...base, position: { ...base.position, timestamp: Date.now() } }); await flush();
  assert.equal(failure.get().status, 'error'); assert.equal(failure.get().guidance, null); failure.stop();
});

test('failed rerouting withholds instructions but preserves accepted turn progress when recovering onto the previous route', async () => {
  let time = 100000, calls = 0; const route = road();
  const controller = createNavigation(async () => { if (++calls === 1) return route; throw new navigation.RoutingError('Mapbox request limit reached'); }, () => time);
  const at = (longitude, latitude, ms = 1000) => { time += ms; controller.update({ status: 'active', focused: true, foreground: true,
    destination: { id: 'stop', name: 'Stop', longitude: d[0], latitude: d[1] }, position: { longitude, latitude, accuracy: 5, timestamp: time } }); };
  at(0, 0); await flush(); at(0.0004, 0); at(0.0008, 0); at(0.001, 0.00015); at(0.001, 0.0003);
  assert.equal(controller.get().guidance.maneuverIndex, 2);
  at(0.0017, 0.0003, 4000); at(0.0017, 0.0003, 4000); at(0.0017, 0.0003, 4000); await flush();
  assert.equal(calls, 2); assert.equal(controller.get().status, 'error'); assert.equal(controller.get().guidance, null);
  assert.equal(controller.get().route, route); assert.equal(controller.get().routeOutdated, true);
  at(0.001, 0.0003, 4000); at(0.001, 0.0003); // First fix reestablishes continuity after the signal gap.
  assert.equal(controller.get().status, 'ready'); assert.equal(controller.get().route, route);
  assert.equal(controller.get().guidance.maneuverIndex, 2, 'Failed replacement must not restart the previous turn sequence');
  assert.equal(calls, 2); controller.stop();
});


test('right-turn confirmation hides the previous 30 m without changing accepted progress or completion gates', () => {
  let time = 100000;
  const xy = (x, y) => [x / 111195, y / 111195];
  const points = [xy(0, 0), xy(100, 0), xy(100, -100), xy(200, -100)];
  const route = { distance: 300, duration: 30, geometry: { type: 'LineString', coordinates: points },
    steps: points.map((point, i) => ({ location: point, geometry: [point, points[Math.min(i + 1, 3)]],
      instruction: ['Head east', 'Turn right onto South Road', 'Turn left onto East Road', 'Destination'][i],
      type: i === 0 ? 'depart' : i === 3 ? 'arrive' : 'turn', modifier: i === 1 ? 'right' : 'left',
      distance: i === 3 ? 0 : 100, duration: 10 })) };
  const controller = createGuidance(navigationFix, () => time);
  const at = (x, y, ms = 1000, patch = {}) => {
    time += ms;
    const [longitude, latitude] = xy(x, y);
    return controller.update(route, { longitude, latitude, accuracy: 5, timestamp: time, ...patch });
  };
  at(0, 0); at(40, 0);
  const approach = at(70, 0);
  assert.equal(Math.round(approach.distanceToManeuver), 30);
  assert.equal(approach.confirmingTurn, false);
  const pending = at(100, -15);
  assert.equal(pending.status, 'ready'); assert.equal(pending.confirmingTurn, true);
  assert.equal(pending.message, 'Confirming turn'); assert.equal(pending.distanceToManeuver, null);
  assert.equal(pending.maneuverIndex, 1); assert.equal(pending.maneuver, approach.maneuver);
  assert.deepEqual(pending.remainingGeometry, approach.remainingGeometry);
  assert.equal(pending.remainingDistance, approach.remainingDistance);
  assert.equal(at(100, -15, 0), pending, 'Duplicate GPS retains confirmation');
  assert.equal(at(100, -19, 500).maneuverIndex, 1, 'Movement without one second cannot advance');
  const stationary = at(100, -15, 500);
  assert.equal(stationary.confirmingTurn, true); assert.equal(stationary.distanceToManeuver, null);
  assert.equal(stationary.maneuverIndex, 1, 'Fresh stationary reading cannot advance');
  assert.equal(at(100, -17).maneuverIndex, 1, 'Less than three metres cannot confirm');
  const confirmed = at(100, -19);
  assert.equal(confirmed.confirmingTurn, false); assert.equal(confirmed.maneuverIndex, 2);
  assert.equal(confirmed.maneuver.instruction, 'Turn left onto East Road');
  assert.ok(confirmed.distanceToManeuver > 80 && confirmed.distanceToManeuver < 82);
  assert.notDeepEqual(confirmed.remainingGeometry, approach.remainingGeometry);
});


test('navigation subscribers receive confirmation and GPS holds clear it without stale instructions', async () => {
  let time = 100000;
  const route = road(), controller = createNavigation(async () => route, () => time);
  let notifications = 0;
  const unsubscribe = controller.subscribe(() => { notifications++; });
  const base = { status: 'active', foreground: true, focused: true,
    destination: { id: 'target', longitude: d[0], latitude: d[1] } };
  const at = (longitude, latitude, accuracy = 5) => {
    time += 1000;
    controller.update({ ...base, position: { longitude, latitude, accuracy, timestamp: time } });
  };
  at(0, 0); await flush(); at(0.0004, 0); at(0.00073, 0);
  const before = notifications;
  at(0.001, 0.00015);
  assert.ok(notifications > before);
  assert.equal(controller.get().guidance.confirmingTurn, true);
  assert.equal(controller.get().guidance.distanceToManeuver, null);
  at(0.001, 0.00015, 26);
  assert.equal(controller.get().guidance.holdReason, 'gps');
  assert.equal(controller.get().guidance.maneuver, null);
  assert.notEqual(controller.get().guidance.confirmingTurn, true);
  controller.stop(); unsubscribe();
});


test('controller publishes a confirmation-only change when every other guidance field is unchanged', async () => {
  const route = road();
  let guidance = { status: 'ready', message: 'Same message', maneuver: route.steps[1], maneuverIndex: 1,
    distanceToManeuver: null, remainingDistance: 230, remainingGeometry: route.geometry, confirmingTurn: false };
  const isolated = load('src/lib/journey/navigation.ts', {
    './turn-guidance': { ...model, createGuidance: () => ({ update: () => guidance, reset() {} }) },
    './off-route': load('src/lib/journey/off-route.ts', { './turn-guidance': model }),
  });
  let time = 100000, notifications = 0;
  const controller = isolated.createNavigation(async () => route, () => time);
  const unsubscribe = controller.subscribe(() => { notifications++; });
  const input = { status: 'active', foreground: true, focused: true,
    position: { longitude: 0, latitude: 0, accuracy: 5, timestamp: time },
    destination: { id: 'target', longitude: d[0], latitude: d[1] } };
  controller.update(input); await flush();
  const count = notifications;
  guidance = { ...guidance, confirmingTurn: true };
  time += 1000;
  controller.update({ ...input, position: { ...input.position, timestamp: time } });
  assert.equal(notifications, count + 1);
  assert.equal(controller.get().guidance.confirmingTurn, true);
  guidance = { ...guidance, confirmingTurn: false };
  time += 1000;
  controller.update({ ...input, position: { ...input.position, timestamp: time } });
  assert.equal(notifications, count + 2);
  assert.equal(controller.get().guidance.confirmingTurn, false);
  controller.stop(); unsubscribe();
});
