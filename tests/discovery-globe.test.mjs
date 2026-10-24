import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const output = mkdtempSync(join(tmpdir(), 'discovery-globe-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/discovery/map.ts', 'src/lib/discovery/travel.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  types: ['node'], outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
assert.equal(ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics).length, 0);
const { discoveryPoints, selectedJourneyId, worldCamera } = createRequire(import.meta.url)(join(output, 'lib/discovery/map.js'));
const stop = (id, sequence, latitude, longitude) => ({ id, sequence, latitude, longitude, name: id });
test('globe points use real ordered coordinates, deduplicate overlaps, and leave the journey untouched', () => {
  const journey = { id: 'public-id', stops: [stop('later', 3, 9, 76), stop('first', 1, 0, 0),
    stop('duplicate', 2, 0, 0), stop('missing', 4, null, null), stop('invalid', 5, 91, 2), stop('coercion', 6, '8', 2)] };
  const before = JSON.stringify(journey);
  const points = discoveryPoints(journey);
  assert.deepEqual(points.features.map(f => [f.id, f.geometry.coordinates]), [['first', [0, 0]], ['later', [76, 9]]]);
  assert.ok(points.features.every(f => f.properties.journeyId === journey.id));
  assert.equal(JSON.stringify(journey), before);
});
test('empty, absent and unmapped journeys never invent a destination marker', () => {
  for (const journey of [null, { id: 'id', stops: [] }, { id: 'id', stops: [stop('bad', 0, Infinity, 0)] }])
    assert.deepEqual(discoveryPoints(journey).features, []);
});
test('marker selection only opens the currently plotted public journey', () => {
  const points = discoveryPoints({ id: 'current', stops: [stop('one', 0, 8, 76)] });
  assert.equal(selectedJourneyId({ journeyId: 'current' }, points), 'current');
  for (const value of [null, {}, { journeyId: 'stale' }, { journeyId: 4 }])
    assert.equal(selectedJourneyId(value, points), null);
  assert.equal(selectedJourneyId({ journeyId: 'current' }, discoveryPoints(null)), null);
});
test('world configuration starts at globe scale; Home and Story remain separate', () => {
  assert.ok(worldCamera.zoomLevel >= 0 && worldCamera.zoomLevel < 2);
  assert.deepEqual(worldCamera.centerCoordinate, [35, 18]);
  const native = readFileSync('src/components/discovery/globe/native-globe.tsx', 'utf8');
  assert.ok(native.includes('projection="globe"'));
  assert.ok(native.includes('logoEnabled attributionEnabled'));
  assert.ok(!native.includes('<Mapbox.Terrain'));
  const web = readFileSync('src/components/discovery/globe/discovery-globe.tsx', 'utf8');
  assert.ok(!web.includes('@rnmapbox/maps'));
  const home = readFileSync('src/app/discover.tsx', 'utf8');
  assert.ok(home.includes('selectedId ? loadPublicJourney(selectedId, signal) : Promise.resolve(null)'));
  assert.ok(!home.includes('Promise.all'));
  assert.ok(readFileSync('src/components/discovery/discovery-panel.tsx', 'utf8').includes('journeys.slice(0, visible)'));
});

test('Home markers use each stop own resolved HTTPS photo and retain plain fallback without using journey cover', () => {
  const journey = { id: 'photos', cover: 'https://example.com/cover.jpg', stops: [
    { ...stop('photo', 0, 8, 76), photo: 'https://example.com/stop.jpg' },
    { ...stop('none', 1, 9, 77), photo: null },
    { ...stop('unsigned', 2, 10, 78), photo: 'journey-media/owner/private.jpg' },
    { ...stop('unsafe', 3, 11, 79), photo: 'http://example.com/image.jpg' },
  ] };
  const points = discoveryPoints(journey);
  assert.deepEqual(points.features.map(p => p.properties.photo), ['https://example.com/stop.jpg', null, null, null]);
});
test('Home marker thumbnail property preserves original photos, coordinates and stable marker identity',()=>{
 const journey={id:'thumbs',stops:[{...stop('one',0,8,76),photo:'https://example.com/full.jpg',photoThumbnail:'https://example.com/thumb.jpg'},
  {...stop('unsafe',1,9,77),photo:'https://example.com/original.jpg',photoThumbnail:'journey-media/private/unsigned.jpg'},
  {...stop('thumb-only',2,10,78),photo:null,photoThumbnail:'https://example.com/only-thumb.jpg'}]};
 const points=discoveryPoints(journey);assert.deepEqual(points.features.map(p=>p.properties.photoThumbnail),['https://example.com/thumb.jpg',null,'https://example.com/only-thumb.jpg']);assert.deepEqual(points.features.map(p=>p.properties.photo),['https://example.com/full.jpg','https://example.com/original.jpg',null]);assert.deepEqual(points.features.map(p=>[p.id,p.geometry.coordinates]),[['one',[76,8]],['unsafe',[77,9]],['thumb-only',[78,10]]]);
});
test('coincident markers select one source pair and never combine different stops original and thumbnail',()=>{
 const make=stops=>discoveryPoints({id:'same-place',stops}).features[0];
 let point=make([{...stop('legacy-first',0,8,76),photo:'https://example.com/a.jpg'},
  {...stop('new-second',1,8,76),photo:'https://example.com/b.full.jpg',photoThumbnail:'https://example.com/b.thumb.jpg'}]);
 assert.equal(point.properties.photo,'https://example.com/a.jpg');assert.equal(point.properties.photoThumbnail,null);assert.equal(point.id,'legacy-first');assert.deepEqual(point.geometry.coordinates,[76,8]);
 point=make([{...stop('thumb-first',0,8,76),photo:null,photoThumbnail:'https://example.com/a.thumb.jpg'},
  {...stop('full-second',1,8,76),photo:'https://example.com/b.full.jpg',photoThumbnail:'https://example.com/b.thumb.jpg'}]);
 assert.equal(point.properties.photo,null);assert.equal(point.properties.photoThumbnail,'https://example.com/a.thumb.jpg');
});

const { discoveryRoute, travelLegs, travelLine, travelPosition, createTravelPlayback } = createRequire(import.meta.url)(join(output, 'lib/discovery/travel.js'));
test('decorative route follows stored order and never draws across missing stops or animates duplicates', () => {
  const journey = { stops: [stop('last', 5, 12, 79), stop('first', 0, 8, 76), stop('repeat', 1, 8, 76),
    stop('second', 2, 9, 77), stop('missing', 3, null, null), stop('fourth', 4, 11, 78)] };
  const before = JSON.stringify(journey), route = discoveryRoute(journey);
  assert.deepEqual(route, [[[76, 8], [76, 8], [77, 9]], [[78, 11], [79, 12]]]);
  const legs = travelLegs(route);
  assert.equal(legs.length, 2); assert.deepEqual(legs[1].start, [78, 11]);
  assert.equal(JSON.stringify(journey), before);
  assert.deepEqual(discoveryRoute(null), []);
  assert.equal(travelLegs(discoveryRoute({ stops: [stop('one', 0, 0, 0)] })).length, 0);
});
test('dateline connector splits at matching edges and plane travels the shortest longitude arc', () => {
  for (const segment of [[[179, 10], [-179, 12]], [[-179, 10], [179, 12]]]) {
    const route = [segment], leg = travelLegs(route)[0], line = travelLine(route);
    assert.equal(Math.abs(leg.target[0] - leg.start[0]), 2);
    assert.equal(line.geometry.coordinates.length, 2);
    for (const part of line.geometry.coordinates) {
      for (let i = 1; i < part.length; i++) assert.ok(Math.abs(part[i][0] - part[i - 1][0]) <= 2);
    }
    const exit = line.geometry.coordinates[0].at(-1), entry = line.geometry.coordinates[1][0];
    assert.equal(exit[0], -entry[0]); assert.equal(exit[1], entry[1]);
    assert.ok(exit[1] > 11 && exit[1] < 11.01); // Spherical, not a linear latitude midpoint.
  }
});
test('travel playback advances once per completion with dwell and cancels stale steps on interruption', () => {
  const moves = [], timers = new Map(); let stops = 0;
  const legs = travelLegs([[[76, 8], [77, 9], [78, 10]]]);
  const playback = createTravelPlayback(legs, (leg, done) => moves.push({ leg, done }), () => stops++, {
    set(callback, delay) { timers.set(callback, delay); return callback; }, clear(callback) { timers.delete(callback); },
  });
  playback.start(); assert.equal(moves.length, 1); assert.equal(moves[0].leg.duration, 2800);
  moves[0].done(true); assert.equal(timers.size, 1);
  const [next, delay] = [...timers][0]; assert.equal(delay, 650);
  playback.cancel(); assert.equal(timers.size, 0);
  next(); moves[0].done(true); assert.equal(moves.length, 1);
  playback.start(); assert.equal(moves.length, 2);
  moves[1].done(true); const callback = [...timers.keys()][0]; timers.clear(); callback();
  assert.equal(moves.length, 3); moves[2].done(true); assert.equal(timers.size, 0);
  assert.ok(stops >= 3); playback.cancel();
});
test('native overlay refreshes image snapshots, handles failure, and has no per-frame React position updates', () => {
  const overlay = readFileSync('src/components/discovery/globe/journey-overlays.tsx', 'utf8');
  assert.ok(overlay.includes('fadeDuration={0}') && overlay.includes('annotation.current?.refresh()'));
  assert.ok(overlay.includes('useThumbnailSource(point.properties.photo, point.properties.photoThumbnail)'));
  assert.ok(overlay.includes('onError={() => { if (uri) onError(); }}'));
  assert.ok(overlay.includes('onSelected={() => onOpen(point.properties.journeyId)}'));
  assert.ok(overlay.includes('Mapbox.Animated.ShapeSource') && overlay.includes('playback.cancel(); progress.removeListener(listener)'));
  assert.ok(!overlay.includes('setInterval') && !overlay.includes('setCoordinate'));
});

test('coincident stop markers retain an available uploaded photo even when the first stop has none', () => {
  const points = discoveryPoints({ id: 'same-place', stops: [stop('first', 0, 8, 76),
    { ...stop('return', 1, 8, 76), photo: 'https://example.com/return.jpg' }] });
  assert.equal(points.features.length, 1);
  assert.equal(points.features[0].properties.photo, 'https://example.com/return.jpg');
});


test('great-circle samples bow toward the pole, remain spherical and preserve exact endpoints', () => {
  const [leg] = travelLegs([[[-60, 40], [60, 40]]]);
  assert.deepEqual(leg.start, [-60, 40]); assert.deepEqual(leg.target, [60, 40]);
  assert.ok(leg.coordinates[Math.floor(leg.coordinates.length / 2)][1] > 59);
  const xyz = ([lon, lat]) => {
    const r = Math.PI / 180;
    return [Math.cos(lat * r) * Math.cos(lon * r), Math.cos(lat * r) * Math.sin(lon * r), Math.sin(lat * r)];
  };
  const a = xyz(leg.start), b = xyz(leg.target);
  const normal = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  for (const coordinate of leg.coordinates) {
    const v = xyz(coordinate);
    assert.ok(Math.abs(v.reduce((sum, value, i) => sum + value * normal[i], 0)) < 1e-12);
  }
});

test('plane and line share bounded samples, constant timing and the same interpolated path', () => {
  const route = [[[-70, 20], [90, 65]]], [leg] = travelLegs(route);
  const line = travelLine(route, [leg]);
  assert.ok(leg.coordinates.length >= 9 && leg.coordinates.length <= 97);
  assert.equal(leg.duration, 2800);
  assert.deepEqual(travelPosition(leg, 0), leg.start);
  assert.deepEqual(travelPosition(leg, 1), leg.target);
  for (let i = 0; i < leg.coordinates.length; i++) {
    const point = travelPosition(leg, i / (leg.coordinates.length - 1));
    assert.ok(point.every((value, axis) => Math.abs(value - leg.coordinates[i][axis]) < 1e-10));
  }
  assert.ok(line.geometry.coordinates.flat().length >= leg.coordinates.length);
  const halfway = travelPosition(leg, 0.5 / (leg.coordinates.length - 1));
  assert.deepEqual(halfway, leg.start.map((value, i) => (value + leg.coordinates[1][i]) / 2));
});

test('invalid route coordinates break connectivity; return stops and leg ordering are preserved', () => {
  for (const invalid of [[NaN, 0], [0, Infinity], [181, 0], [0, 91], [null, 0], ['5', 0]]) {
    const legs = travelLegs([[[10, 10], invalid, [20, 20], [30, 30]]]);
    assert.equal(legs.length, 1); assert.deepEqual(legs[0].start, [20, 20]);
  }
  const legs = travelLegs([[[10, 10], [20, 20], [10, 10]], [[30, 30], [40, 40]]]);
  assert.deepEqual(legs.map(leg => leg.start), [[10, 10], [20, 20], [30, 30]]);
  assert.deepEqual(legs.map(leg => leg.target), [[20, 20], [10, 10], [40, 40]]);
  assert.deepEqual(travelLegs([[[180, 0], [-180, 0]], [[0, 90], [120, 90]]]), []);
});

test('polar, long, antipodal and boundary routes stay finite without world-spanning dateline chords', () => {
  for (const pair of [[[170, 80], [-170, 80]], [[0, 0], [180, 0]], [[0, 5], [179.99999, -5]],
    [[180, 10], [-170, 20]], [[-180, 10], [170, 20]], [[-90, 89], [90, 89]]]) {
    const [leg] = travelLegs([pair]);
    assert.ok(leg.coordinates.length <= 97);
    assert.ok(leg.coordinates.every(p => p.every(Number.isFinite) && Math.abs(p[1]) <= 90));
    assert.ok(Math.abs(leg.target[1] - pair[1][1]) < 1e-12);
    assert.ok(Math.abs((((leg.target[0] - pair[1][0]) % 360) + 360) % 360) < 1e-8);
    for (const part of travelLine([pair]).geometry.coordinates) {
      assert.ok(part.length >= 2);
      for (let i = 1; i < part.length; i++) assert.ok(Math.abs(part[i][0] - part[i-1][0]) <= 180);
    }
  }
});
