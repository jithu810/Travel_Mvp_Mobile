import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(path, modules = {}) {
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => modules[name] ?? {}, exports);
  return exports;
}
const travel = load('src/lib/discovery/travel.ts');
const { createMemoryBuddyTour } = load('src/lib/profile/memory-buddy-tour.ts', { '../discovery/travel': travel });
const pin = (key, longitude = 76, latitude = 8) => ({ key, longitude, latitude, journeyId: key, stopId: key, stopIndex: 0, stopName: key, journeyTitle: key, photo: null, photoThumbnail: null, art: { seed: key, stops: [] } });
function clock() {
  let now = 0, id = 0;const requests = new Map();
  return { now: () => now, request: callback => { requests.set(++id, callback);return id; }, cancel: key => requests.delete(key),
    pending: () => requests.size, captured: () => { const entry = [...requests.entries()][0];return entry ? () => { requests.delete(entry[0]);entry[1](); } : undefined; }, advance(milliseconds) { now += milliseconds;const batch = [...requests.values()];requests.clear();batch.forEach(callback => callback()); } };
}

test('tour follows published order, holds photos, runs for1.8seconds and keeps coordinate ticks outside metadata subscribers', () => {
  const time = clock(), tour = createMemoryBuddyTour([pin('a'), pin('b', 77), pin('c', 78)], time);
  let positions = 0, metadata = 0;tour.subscribe(() => positions++);tour.subscribeMeta(() => metadata++);
  tour.configure(true, true);assert.equal(tour.get().key, 'a');assert.equal(tour.get().bubble, true);assert.equal(tour.get().playing, true);
  time.advance(3500);assert.equal(tour.get().key, 'b');assert.equal(tour.get().animation, 'run');assert.equal(tour.get().bubble, false);
  const before = metadata;time.advance(900);assert.equal(metadata, before);assert.ok(positions > 1);assert.ok(tour.get().coordinate[0] > 76 && tour.get().coordinate[0] < 77);
  time.advance(900);assert.deepEqual(tour.get().coordinate, [77, 8]);assert.equal(tour.get().bubble, true);assert.equal(tour.get().animation, 'idle');
  time.advance(3500);assert.equal(tour.get().key, 'c');tour.dispose();assert.equal(time.pending(), 0);
});

test('manual selection immediately jumps and holds longer; superseded clocks cannot win and paused selection never starts autoplay', () => {
  const time = clock(), tour = createMemoryBuddyTour([pin('a'), pin('b', 77), pin('c', 78)], time);
  tour.configure(true, true);time.advance(3500);time.advance(400);const stale = time.captured();
  tour.select('c');assert.equal(tour.get().animation, 'jump');assert.deepEqual(tour.get().coordinate, [78, 8]);assert.equal(tour.get().bubble, true);
  stale();assert.equal(tour.get().key, 'c');time.advance(600);time.advance(5999);assert.equal(tour.get().key, 'c');time.advance(1);assert.equal(tour.get().key, 'a');
  tour.pause();tour.select('b');assert.equal(tour.get().playing, false);time.advance(600);assert.equal(tour.get().animation, 'idle');assert.equal(tour.get().key, 'b');assert.equal(time.pending(), 0);tour.dispose();
});

test('gesture/pause midleg freezes Buddy and never projects the target photo as if Buddy had arrived', () => {
  const time = clock(), tour = createMemoryBuddyTour([pin('a'), pin('b', 77)], time);
  tour.configure(true, true);time.advance(3500);time.advance(800);const midway = [...tour.get().coordinate], stale = time.captured();
  tour.pause();assert.equal(tour.get().bubble, false);stale();assert.deepEqual(tour.get().coordinate, midway);assert.equal(time.pending(), 0);
  tour.resume();time.advance(1000);assert.deepEqual(tour.get().coordinate, [77, 8]);assert.equal(tour.get().bubble, true);tour.dispose();
});

test('background/blur permission is synchronous and cancels all work; unknown/reduced motion remains static with manual Next', () => {
  const time = clock();let permitted = true;const tour = createMemoryBuddyTour([pin('a'), pin('b', 77)], time, () => permitted);
  tour.configure(true, false);assert.equal(time.pending(), 0);tour.next();assert.equal(tour.get().key, 'b');assert.equal(tour.get().animation, 'idle');
  tour.resume();tour.configure(true, true);assert.equal(time.pending(), 1);const stale = time.captured();permitted = false;stale();assert.equal(tour.get().key, 'b');
  tour.configure(false, true);assert.equal(time.pending(), 0);permitted = true;tour.configure(true, true);assert.equal(time.pending(), 1);
  tour.configure(true, false);assert.equal(time.pending(), 0);assert.equal(tour.get().bubble, true);tour.dispose();
});

test('great-circle run crosses the date line without taking the long way; coincident/single/empty inputs remain bounded', () => {
  const time = clock(), tour = createMemoryBuddyTour([pin('east', 179.9, 0), pin('west', -179.9, 0)], time);
  tour.configure(true, true);time.advance(3500);time.advance(900);assert.ok(Math.abs(tour.get().coordinate[0]) >= 179.9);assert.ok(tour.get().coordinate.every(Number.isFinite));tour.dispose();
  for (const pins of [[], [pin('a')], [pin('a'), pin('b')]]) {
    const t = clock(), model = createMemoryBuddyTour(pins, t);model.configure(true, true);
    if (pins.length < 2) assert.equal(t.pending(), 0);else { t.advance(3500);assert.equal(model.get().animation, 'idle');assert.equal(model.get().key, 'b'); }
    model.dispose();assert.equal(t.pending(), 0);
  }
});

test('input normalization rejects malformed/duplicate coordinates; photo-only refresh does not reset and membership removes stale selected keys', () => {
  const time = clock(), a = pin('a'), tour = createMemoryBuddyTour([a, pin('bad', NaN), pin('bad-lat', 0, 91), pin('bad-lon', 181, 0), pin(''), a, pin('b', 77)], time);
  tour.configure(true, true);time.advance(3500);assert.equal(tour.get().key, 'b');const snapshot = tour.get();
  tour.update([{ ...a, photo: 'https://photo/a' }, { ...pin('b', 77), photo: 'https://photo/b' }]);assert.equal(tour.get(), snapshot);
  tour.pause();const stale = time.captured();tour.update([pin('c', 78)]);assert.equal(tour.get().key, 'c');assert.equal(tour.get().playing, false);assert.equal(time.pending(), 0);stale?.();assert.equal(tour.get().key, 'c');
  tour.update([pin('invalid', 0, 100)]);assert.equal(tour.get().key, null);assert.equal(tour.get().coordinate, null);tour.dispose();
});
