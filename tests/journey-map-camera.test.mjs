import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const output = mkdtempSync(join(tmpdir(), 'story-map-camera-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/journey/map-camera.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, types: ['node'],
  outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
const diagnostics = ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const require = createRequire(import.meta.url);
const { frameJourneyMap } = require(join(output, 'lib/journey/map-camera.js'));
const { buildMapData } = require(join(output, 'lib/journey/map-data.js'));
const { travelLine } = require(join(output, 'lib/discovery/travel.js'));
const viewport = { width: 390, height: 500 };
const stop = (longitude, latitude, sequence = 0) => ({ id: String(sequence), name: 'Stop ' + sequence, sequence, longitude, latitude });
const stops = coordinates => coordinates.map(([longitude, latitude], i) => stop(longitude, latitude, i));
const wrap = lon => ((lon + 180) % 360 + 360) % 360 - 180;
const y = lat => (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2;
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon, actual + ' ≈ ' + expected);
function assertContained(frame, input, size = viewport) {
  assert.ok(frame.fitsViewport, 'Fixture must fit without Mercator clipping or minimum zoom overflow');
  const { west, east, south, north } = frame.extent;
  const { padding, centerCoordinate: center, zoomLevel } = frame.camera;
  const scale = 512 * 2 ** zoomLevel;
  const width = size.width - padding.paddingLeft - padding.paddingRight;
  const height = size.height - padding.paddingTop - padding.paddingBottom;
  const coordinates = [...buildMapData(input).markers.map(marker => marker.coordinate), ...frame.route.geometry.coordinates.flat()];
  for (const [lon, lat] of coordinates) {
    const unwrapped = west + ((lon - west) % 360 + 360) % 360;
    assert.ok(unwrapped <= east + 1e-7, 'All stops and curve samples are within longitude extent');
    assert.ok(lat >= south - 1e-7 && lat <= north + 1e-7);
    assert.ok(Math.abs((unwrapped - (west + east) / 2) / 360 * scale) <= width / 2 + 1e-6, 'Horizontal pixel containment');
    assert.ok(Math.abs((y(lat) - y(center[1])) * scale) <= height / 2 + 1e-6, 'Vertical pixel containment');
  }
}

test('Story frame contains intermediate stops and spherical bulges beyond endpoint bounds', () => {
  const input = stops([[-60, 50], [60, 50]]);
  const frame = frameJourneyMap(input, { width: 1000, height: 1000 });
  assert.ok(frame.extent.north > 65, 'Spherical arc is not a flat endpoint chord');
  assertContained(frame, input, { width: 1000, height: 1000 });
  const bent = stops([[76, 8], [79, 12], [76.01, 8.01]]);
  const fitted = frameJourneyMap(bent, viewport);
  assert.ok(fitted.extent.east >= 79 && fitted.extent.north >= 12);
  assert.equal(fitted.projection, 'globe'); assertContained(fitted, bent);
});

test('single and physically coincident stops receive finite local framing without invented legs', () => {
  for (const coordinates of [[[76, 8]], [[76, 8], [76, 8]], [[180, 0], [-180, 0]], [[10, 90], [150, 90]]]) {
    const frame = frameJourneyMap(stops(coordinates), viewport);
    assert.equal(frame.camera.zoomLevel, 14);
    assert.equal(frame.extent.west, frame.extent.east);
    assert.deepEqual(frame.route.geometry.coordinates, []);
    assert.ok(frame.camera.centerCoordinate.every(Number.isFinite));
    if (coordinates[0][1] === 90) { assert.equal(frame.latitudeClamped, true); assert.equal(frame.fitsViewport, false); }
  }
  assert.deepEqual(frameJourneyMap(stops([[0, 0]]), viewport).camera.centerCoordinate, [0, 0]);
});

test('missing and invalid coordinates split curves and isolated markers still contribute to framing', () => {
  const input = stops([[0, 0], [1, 1], [null, null], [30, 20], [31, 21], [NaN, 1], [179, 0]]);
  const frame = frameJourneyMap(input, { width: 1200, height: 1200 });
  assert.equal(frame.markerCount, 5); assert.equal(frame.missingCount, 2);
  assert.deepEqual(frame.route, travelLine([[[0, 0], [1, 1]], [[30, 20], [31, 21]]]));
  assertContained(frame, input, { width: 1200, height: 1200 });
  const isolated = stops([[179, 10], [null, null], [-179, 10]]);
  const fit = frameJourneyMap(isolated, viewport);
  near(fit.extent.east - fit.extent.west, 2);
  assert.deepEqual(fit.route.geometry.coordinates, []); assertContained(fit, isolated);
});

test('empty/unmapped itineraries and invalid viewports have no fabricated target', () => {
  for (const input of [[], stops([[null, null], [181, 0], [0, 91], [0, Infinity], ['76', 8], [NaN, 8]])])
    assert.equal(frameJourneyMap(input, viewport), null);
  for (const size of [{width:0,height:500}, {width:390,height:-1}, {width:NaN,height:400}, {width:Infinity,height:500}, {width:0.5,height:500}, {width:Number.MAX_VALUE,height:500}])
    assert.equal(frameJourneyMap(stops([[0, 0]]), size), null);
});

test('dateline crossings frame the short occupied arc and preserve split route geometry', () => {
  for (const coordinates of [[[179.8, 10], [-179.8, 10.2]], [[-179.8, 10], [179.8, 10.2]]]) {
    const input = stops(coordinates), frame = frameJourneyMap(input, viewport);
    assert.equal(frame.extent.crossesAntimeridian, true);
    assert.ok(frame.extent.east > 180);
    assert.ok(frame.extent.east - frame.extent.west < 1);
    assert.ok(Math.abs(frame.camera.centerCoordinate[0]) > 179);
    assert.equal(frame.route.geometry.coordinates.length, 2);
    assert.equal(frame.projection, 'globe'); assertContained(frame, input);
  }
});

test('longitude cuts never discard a connected edge or turn a complete equatorial circuit into a short arc', () => {
  const input = stops([[0, 0], [120, 0], [-120, 0], [0, 0]]);
  const frame = frameJourneyMap(input, {width:1200,height:1000});
  near(frame.extent.east - frame.extent.west, 360);
  assert.equal(frame.extent.west, -180);
  assert.equal(frame.projection, 'mercator'); assert.ok(frame.overviewReasons.includes('wide-route'));
  assertContained(frame, input, {width:1200,height:1000});
});

test('high-latitude curvature triggers a conservative polar overview before Mercator clipping', () => {
  const input = stops([[-60, 75], [60, 75]]), frame = frameJourneyMap(input, {width:1200,height:1200});
  assert.ok(frame.extent.north > 80);
  assert.equal(frame.projection, 'mercator'); assert.ok(frame.overviewReasons.includes('polar-route'));
  assert.equal(frame.latitudeClamped, false); assertContained(frame, input, {width:1200,height:1200});
  const local = frameJourneyMap(stops([[20, 70], [20.1, 70.1]]), viewport);
  assert.equal(local.projection, 'globe'); assert.equal(local.latitudeClamped, false);
});

test('polar and antipodal routes remain deterministic and explicitly report Mercator limitations', () => {
  for (const coordinates of [[[0, 89], [180, 89]], [[0, -90]], [[0, 0], [180, 0]], [[-70, 20], [110, -20]]]) {
    const input = stops(coordinates), frame = frameJourneyMap(input, viewport);
    assert.deepEqual(frame, frameJourneyMap(input, viewport));
    assert.equal(frame.projection, 'mercator');
    assert.ok(frame.camera.centerCoordinate.every(Number.isFinite));
    assert.ok(Number.isFinite(frame.camera.zoomLevel));
    assert.ok(Math.abs(frame.camera.centerCoordinate[1]) <= 85.051128779807);
    if (frame.extent.north > 85.051128779807 || frame.extent.south < -85.051128779807) {
      assert.equal(frame.latitudeClamped, true); assert.equal(frame.fitsViewport, false);
    }
  }
});

test('very short routes have bounded zoom and stable centered extents', () => {
  const input = stops([[76, 8], [76.0000001, 8.0000001]]), frame = frameJourneyMap(input, viewport);
  assert.equal(frame.camera.zoomLevel, 16); assert.equal(frame.projection, 'globe');
  assertContained(frame, input);
});

test('widespread journeys identify overview mode and minimum-zoom overflow rather than claiming a fit', () => {
  const input = stops([[0, 0], [120, 0], [-120, 0], [0, 0]]);
  const frame = frameJourneyMap(input, {width:320,height:64});
  assert.equal(frame.projection, 'mercator'); assert.equal(frame.camera.zoomLevel, 0);
  assert.ok(frame.overviewReasons.includes('wide-route'));
  assert.ok(frame.overviewReasons.includes('viewport-too-small'));
  assert.equal(frame.fitsViewport, false);
});

test('Story padding respects actual viewport and asymmetric overlays; larger insets reduce zoom', () => {
  const input = stops([[76, 8], [78, 10]]);
  const base = frameJourneyMap(input, viewport);
  const inset = frameJourneyMap(input, viewport, {paddingBottom:250, paddingLeft:70});
  assert.equal(inset.camera.padding.paddingBottom, 250); assert.equal(inset.camera.padding.paddingLeft, 70);
  assert.ok(inset.camera.zoomLevel < base.camera.zoomLevel); assertContained(inset, input);
  for (const size of [{width:320,height:64},{width:1,height:1},viewport]) {
    const frame = frameJourneyMap(input, size, {paddingTop:Number.MAX_VALUE,paddingBottom:Number.MAX_VALUE,paddingLeft:500,paddingRight:500});
    const p = frame.camera.padding;
    assert.equal(frame.paddingClamped, true);
    assert.ok(Object.values(p).every(value => Number.isFinite(value) && value >= 0));
    assert.ok(p.paddingTop + p.paddingBottom < size.height);
    assert.ok(p.paddingLeft + p.paddingRight < size.width);
    assert.ok(Number.isFinite(frame.camera.zoomLevel));
  }
  const malformed = frameJourneyMap(input, viewport, {paddingTop:NaN,paddingBottom:-1,paddingLeft:Infinity});
  assert.equal(malformed.paddingClamped, true);
  assert.equal(malformed.camera.padding.paddingTop, base.camera.padding.paddingTop);
});

test('framing is deterministic, honors sequence, and does not mutate frozen journey data or options', () => {
  const input = stops([[76, 8], [77, 9], [78, 8]]).reverse(); input.forEach(Object.freeze); Object.freeze(input);
  const size = Object.freeze({...viewport}), padding = Object.freeze({paddingTop:30});
  const before = JSON.stringify(input), frame = frameJourneyMap(input, size, padding);
  assert.deepEqual(frame.route, travelLine(buildMapData(input).line.geometry.coordinates));
  assert.deepEqual(frame, frameJourneyMap(input, size, padding));
  assert.equal(JSON.stringify(input), before);
  assert.equal(frame.camera.heading, 0); assert.equal(frame.camera.pitch, 0);
});


test('distinct sub-millimetre stops retain their extents rather than collapsing to singleton zoom', () => {
  const input = stops([[76, 8], [76.000000001, 8.000000001]]), frame = frameJourneyMap(input, viewport);
  assert.ok(frame.extent.east > frame.extent.west); assert.ok(frame.extent.north > frame.extent.south);
  assert.equal(frame.camera.zoomLevel, 16); assertContained(frame, input);
});

test('deterministic regional fixtures keep every sampled curve inside the computed fit', () => {
  let state = 37;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  for (let i = 0; i < 80; i++) {
    const longitude = random() * 360 - 180, latitude = random() * 100 - 50;
    const input = stops(Array.from({length:5}, () => [wrap(longitude + random() * 20 - 10), latitude + random() * 20 - 10]));
    const frame = frameJourneyMap(input, viewport);
    assert.equal(frame.projection, 'globe'); assertContained(frame, input);
  }
});
