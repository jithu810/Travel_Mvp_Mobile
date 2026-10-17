import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const output = mkdtempSync(join(tmpdir(), 'journey-map-test-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/journey/map-data.ts', 'src/lib/discovery/model.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, types: ['node'],
  outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
const diagnostics = ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const require = createRequire(import.meta.url);
const { buildMapData, hasCoordinates } = require(join(output, 'lib/journey/map-data.js'));
const { normalizeStops } = require(join(output, 'lib/discovery/model.js'));
const stop = (id, sequence, latitude = null, longitude = null) => ({ id, sequence, name: id, latitude, longitude });

test('points, original timeline numbering and planned line follow stable creator order', () => {
  const input = [stop('third', 30, 3, 103), stop('second', 20, 2, 102), stop('first', 10, 1, 101), stop('tie', 20, 4, 104)];
  const before = JSON.stringify(input);
  const data = buildMapData(input);
  assert.deepEqual(data.markers.map(m => [m.id, m.number, m.coordinate]), [
    ['first', 1, [101, 1]], ['second', 2, [102, 2]], ['tie', 3, [104, 4]], ['third', 4, [103, 3]],
  ]);
  assert.deepEqual(data.line.geometry.coordinates, [[[101, 1], [102, 2], [104, 4], [103, 3]]]);
  assert.deepEqual(data.bounds, { ne: [104, 4], sw: [101, 1] });
  assert.equal(JSON.stringify(input), before);
});
test('missing coordinates break lines; no invented leg bridges an unknown stop', () => {
  const input = [stop('a', 0, 1, 1), stop('b', 1, 2, 2), stop('missing', 2),
    stop('d', 3, 4, 4), stop('e', 4, 5, 5)];
  const data = buildMapData(input);
  assert.deepEqual(data.markers.map(m => m.number), [1, 2, 4, 5]);
  assert.equal(data.missing, 1);
  assert.deepEqual(data.line.geometry.coordinates, [[[1, 1], [2, 2]], [[4, 4], [5, 5]]]);
  assert.equal(input.length, 5); // Timeline still receives every stored stop.
});
test('finite numeric geographic ranges only; zero and boundaries are real coordinates', () => {
  for (const [lat, lon] of [[null, 1], [1, null], [undefined, 0], ['1', 1], [NaN, 1], [1, Infinity], [91, 1], [1, -181]]) {
    assert.equal(hasCoordinates(stop('bad', 0, lat, lon)), false);
  }
  for (const [lat, lon] of [[0, 0], [90, 180], [-90, -180]]) assert.equal(hasCoordinates(stop('valid', 0, lat, lon)), true);
});
test('empty, invalid and singleton itineraries never invent a route or origin marker', () => {
  for (const input of [[], [stop('missing', 0)], [stop('bad', 0, 99, 999)]]) {
    const data = buildMapData(input);
    assert.deepEqual(data.markers, []);
    assert.deepEqual(data.line.geometry.coordinates, []);
    assert.equal(data.bounds, null);
  }
  const data = buildMapData([stop('only', 0, 8, 76)]);
  assert.equal(data.markers.length, 1);
  assert.deepEqual(data.line.geometry.coordinates, []);
  assert.deepEqual(data.bounds, { ne: [76, 8], sw: [76, 8] });
});
test('separated singleton coordinates produce markers but no fabricated segments', () => {
  const data = buildMapData([stop('a', 0, 8, 76), stop('missing', 1), stop('b', 2, 9, 77)]);
  assert.equal(data.markers.length, 2);
  assert.deepEqual(data.line.geometry.coordinates, []);
});
test('public detail normalization retains planned coords and rejects coercion/private payloads', () => {
  const data = normalizeStops([
    { ...stop('valid', 0, 0, 0), gps_track: [[5, 5]], travel_session: 'private' },
    stop('invalid', 1, '8', 76), stop('out-of-range', 2, 8, 200),
  ], true);
  assert.equal(data[0].latitude, 0);
  assert.equal(data[0].longitude, 0);
  assert.equal(data[0].gps_track, undefined);
  assert.equal(data[0].travel_session, undefined);
  assert.equal(data[1].latitude, null);
  assert.equal(data[2].longitude, null);
  assert.equal(buildMapData(data).markers.length, 1);
  assert.equal(normalizeStops([{ id: 'card', name: 'Card', position: 0, latitude: 1, longitude: 2 }])[0].latitude, null);
});
test('web fallback is isolated from the native SDK and Story places an interactive map before story and the paged deck', () => {
  const web = readFileSync('src/components/journey/map/journey-map.tsx', 'utf8');
  assert.equal(web.includes('@rnmapbox/maps'), false);
  assert.equal(web.includes('./native-map'), false);
  const story = readFileSync('src/app/journey/[id].tsx', 'utf8');
  assert.equal(story.includes('ScrollView'), true);
  assert.equal(story.includes('<StoryHeader '), false);
  assert.ok(story.includes('presentation="expanded"'));
  assert.ok(story.includes("scrollable={panel !== 'map'}"));
  const positions = ['accessibilityLabel="About this journey"', 'presentation="expanded"', '<StopTimeline horizontal stacked ', '<SocialActions ', '<JourneyOptions '].map(s => story.indexOf(s));
  assert.ok(positions.every(p => p >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});
