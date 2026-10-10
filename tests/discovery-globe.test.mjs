import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const output = mkdtempSync(join(tmpdir(), 'discovery-globe-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/discovery/map.ts'], {
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
