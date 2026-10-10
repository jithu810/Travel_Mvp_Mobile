import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const output = mkdtempSync(join(tmpdir(), 'journey-story-test-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/journey/snapshot.ts', 'src/lib/discovery/model.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, types: ['node'],
  outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
const diagnostics = ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const require = createRequire(import.meta.url);
const { storySnapshot, hasStory } = require(join(output, 'lib/journey/snapshot.js'));
const model = require(join(output, 'lib/discovery/model.js'));
const id = '11111111-1111-4111-8111-111111111111';
const card = model.normalizePublicJourney({ id, title: 'Public story', destination_slug: 'goa', is_demo: false, traveler_type: 'solo', duration_days: 99, stops: [] });
const stop = (index, patch = {}) => ({ id: String(index), name: 'Stop ' + index, sequence: index, dayNumber: 1, description: '', photo: null, rating: null, ...patch });
const journey = stops => ({ ...card, stops });

test('public ratings keep zero, fractions and five, omit unknown/out-of-range values', () => {
  const values = [0, 3.5, 5, null, undefined, -1, 5.1, NaN, Infinity, '', '4'];
  const stops = model.normalizeStops(values.map((rating, sequence) => ({ id: String(sequence), name: 'Stop', sequence, rating })), true);
  assert.deepEqual(stops.map(s => s.rating), [0, 3.5, 5, null, null, null, null, null, null, null, null]);
});
test('detail ratings are gated by published status and private fields stay discarded', () => {
  const row = { id, status: 'published', is_demo: false, stops: [{ id: 's', name: 'Stop', sequence: 1, rating: 4, travel_session: 'private', latitude: 10 }], gps_track: 'private' };
  const detail = model.normalizePublicDetail(row, card);
  assert.equal(detail.stops[0].rating, 4);
  assert.equal(detail.stops[0].travel_session, undefined);
  assert.equal(detail.stops[0].latitude, 10); // Public planned stop, never a GPS track.
  assert.equal(detail.gps_track, undefined);
  assert.equal(model.normalizePublicDetail({ ...row, status: 'draft' }, card), null);
});
test('timeline normalization keeps stored order and stable ties instead of name or day sorting', () => {
  const stops = model.normalizeStops([
    { id: 'z', name: 'Zulu', sequence: 2, day_number: 3 },
    { id: 'a', name: 'Alpha', sequence: 2, day_number: 1 },
    { id: 'b', name: 'First', sequence: 0, day_number: 4 },
  ], true);
  assert.deepEqual(stops.map(s => s.id), ['b', 'z', 'a']);
  assert.deepEqual(stops.map(s => s.dayNumber), [4, 3, 1]);
});
test('pace is unknown with partial day assignments even if advertised duration is set', () => {
  const result = storySnapshot(journey([stop(1), stop(2, { dayNumber: null })]));
  assert.equal(result.dayCount, null);
  assert.equal(result.pace, null);
  assert.equal(result.averageStopsPerDay, null);
});
test('pace uses exact web thresholds: up to 2 relaxed, up to 4 balanced, above 4 packed', () => {
  for (const [size, expected] of [[2, 'Relaxed'], [3, 'Balanced'], [4, 'Balanced'], [5, 'Packed']]) {
    assert.equal(storySnapshot(journey(Array.from({ length: size }, (_, i) => stop(i)))).pace, expected);
  }
  const result = storySnapshot(journey([stop(1, { dayNumber: 2 }), stop(2, { dayNumber: 9 })]));
  assert.equal(result.dayCount, 2); // Distinct active days, not elapsed days or highest day.
  assert.equal(result.pace, 'Relaxed');
});
test('photo/detail signals follow web minimum-two and majority-coverage rules', () => {
  const rich = { photo: 'https://example.org/photo.jpg', description: 'A public note.' };
  assert.deepEqual(storySnapshot(journey([stop(1, rich)])).signals, []);
  assert.deepEqual(storySnapshot(journey([stop(1, rich), stop(2, rich), stop(3), stop(4)])).signals, ['Photo-rich', 'Detailed stops']);
  assert.deepEqual(storySnapshot(journey([stop(1, rich), stop(2, rich), stop(3), stop(4), stop(5)])).signals, []);
});
test('snapshot discards duplicate/invalid stops, leaves creator order and input untouched', () => {
  const stops = [stop(3), stop(1), stop(1), stop(2, { sequence: -1 }), stop(4, { name: ' ' })];
  const before = JSON.stringify(stops);
  assert.equal(storySnapshot(journey(stops)).stopCount, 2);
  assert.equal(JSON.stringify(stops), before);
});
test('blank story and empty itinerary yield no invented story or snapshot signals', () => {
  assert.equal(hasStory({ ...card, description: ' \n ' }), false);
  assert.equal(hasStory({ ...card, description: 'A real public story.' }), true);
  const result = storySnapshot(card);
  assert.equal(result.stopCount, 0);
  assert.equal(result.pace, null);
  assert.deepEqual(result.signals, []);
  assert.equal(result.geographicSpanMeters, undefined);
});

