import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const output = mkdtempSync(join(tmpdir(), 'journey-discovery-test-'));
const program = ts.createProgram(['src/lib/discovery/model.ts', 'src/lib/discovery/queries.ts', 'src/types/journey.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  types: ['node'], outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
const emitted = program.emit();
const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitted.diagnostics);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const model = createRequire(import.meta.url)(join(output, 'lib/discovery/model.js'));
after(() => rmSync(output, { recursive: true, force: true }));
const id = '11111111-1111-4111-8111-111111111111';
const row = {
  id, title: 'Coastal weekend', is_demo: false, destination_slug: 'varkala',
  destination_name: 'Varkala', traveler_type: 'friends', duration_days: 2,
  creator_name: 'Public Traveler', creator_username: 'wanderer', likes_count: 4,
  cover_image_path: 'journey-media/user/journey/cover.jpg',
  stops: [{ id: 'second', name: 'Cliff Walk', position: 3 }, { id: 'first', name: 'Quiet Beach', position: 1 }],
  // Synthetic private fields must never leak through the normalized model.
  email: 'private@example.invalid', travel_session: { secret: true }, gps_track: [1, 2],
};
const card = model.normalizePublicJourney(row);

test('public projection excludes demos, explicit drafts, malformed IDs and unknown traveler types', () => {
  assert.ok(card);
  for (const patch of [{ is_demo: true }, { is_demo: undefined }, { status: 'draft' }, { id: 'bad' }, { traveler_type: 'unknown' }]) {
    assert.equal(model.normalizePublicJourney({ ...row, ...patch }), null);
  }
  assert.equal(card.email, undefined);
  assert.equal(card.travel_session, undefined);
  assert.equal(card.gps_track, undefined);
  assert.equal(card.creator_id, undefined);
});
test('detail gate fails closed on nonpublic status, withdrawn data and mismatched IDs', () => {
  for (const value of [null, {}, { ...row, status: 'draft' }, { ...row, status: 'published', is_demo: true }, { ...row, status: 'published', id: 'different' }]) {
    assert.equal(model.normalizePublicDetail(value, card), null);
  }
});
test('detail uses discovery destination when deployed detail RPC omits its display name', () => {
  const detail = model.normalizePublicDetail({ id, status: 'published', is_demo: false, stops: [] }, card);
  assert.equal(detail.destination, 'Varkala');
  assert.equal(detail.creatorName, 'Public Traveler');
});
test('search matches title, destination, stop, creator display name and username', () => {
  for (const query of ['COASTAL', 'varkala', 'cliff', 'public traveler', 'wanderer']) {
    assert.equal(model.searchJourneys([card], query).length, 1, query);
  }
  assert.equal(model.searchJourneys([card], 'no matching place').length, 0);
  assert.equal(model.searchJourneys([card], '  ').length, 1);
});
test('search follows NFKC normalization and a bounded 120-character term', () => {
  assert.equal(model.searchJourneys([card], 'ＣＯＡＳＴＡＬ').length, 1);
  const long = { ...card, title: 'x'.repeat(120) };
  assert.equal(model.searchJourneys([long], 'x'.repeat(120) + 'missing').length, 1);
});
test('stops use stored sequence rather than input array or day grouping', () => {
  const stops = model.normalizeStops([
    { id: 'b', name: 'Last', sequence: 9, day_number: 1 },
    { id: 'a', name: 'First', sequence: 2, day_number: 2, photo_path: 'https://example.org/a.jpg' },
    { id: 'bad', name: 'Bad sequence', sequence: -1 },
  ], true);
  assert.deepEqual(stops.map(stop => stop.name), ['First', 'Last']);
  assert.deepEqual(stops.map(stop => stop.dayNumber), [2, 1]);
  assert.deepEqual(card.stops.map(stop => stop.name), ['Quiet Beach', 'Cliff Walk']);
});
test('photos reject local web fallbacks, unsupported buckets, unsafe protocols and paths', () => {
  for (const path of ['/images/goa.jpg', 'http://example.org/a.jpg', 'file:///private.jpg', 'javascript:alert(1)', 'profile-avatars/private/avatar.jpg', 'journey-media/u/../private.jpg', 'https://user:password@example.org/a.jpg']) {
    assert.equal(model.safePhoto(path), null, path);
  }
  assert.ok(model.safePhoto('https://example.org/a.jpg'));
  assert.ok(model.safePhoto(row.cover_image_path));
});
test('unknown optional counts are omitted and no stops are invented', () => {
  const unknown = model.normalizePublicJourney({ ...row, duration_days: null, likes_count: null, stops: null });
  assert.equal(unknown.durationDays, null);
  assert.equal(unknown.likes, null);
  assert.deepEqual(unknown.stops, []);
  assert.equal(model.journeyFacts(unknown), '0 stops');
});


const requireCompiled = createRequire(import.meta.url);
const publicModulePath = join(output, 'lib/supabase/public.js');
let responses = [];
let requests = [];
let mediaFailure = false;
const fakeClient = {
  rpc(name, args) {
    requests.push({ name, args });
    return { abortSignal: async () => responses.shift() };
  },
  storage: { from(bucket) {
    assert.equal(bucket, 'journey-media');
    return { createSignedUrls: async paths => ({
      data: mediaFailure ? null : paths.map(path => ({ signedUrl: 'https://example.org/signed/' + path })),
      error: mediaFailure ? { message: 'media unavailable' } : null,
    }) };
  } },
};
requireCompiled.cache[publicModulePath] = { id: publicModulePath, filename: publicModulePath, loaded: true, exports: { publicSupabase: fakeClient } };
const queries = requireCompiled(join(output, 'lib/discovery/queries.js'));
function setup(values, failMedia = false) { queries.invalidatePublicJourneys(); responses = values; requests = []; mediaFailure = failMedia; }
const signal = () => new AbortController().signal;

test('discovery loader is bounded to the existing latest-100 RPC and filters demo/draft projections', async () => {
  setup([{ data: [{ ...row, is_demo: true }, { ...row, status: 'draft' }, ...Array.from({ length: 105 }, () => row)], error: null }]);
  const journeys = await queries.loadPublicJourneys(signal());
  assert.equal(journeys.length, 98);
  assert.deepEqual(requests, [{ name: 'get_public_journeys', args: {} }]);
  assert.ok(journeys.every(j => j.cover.startsWith('https://example.org/signed/')));
});
test('detail never queries owner-visible detail when public membership is absent', async () => {
  setup([{ data: [], error: null }]);
  assert.equal(await queries.loadPublicJourney(id, signal()), null);
  assert.equal(requests.length, 1);
  setup([]);
  assert.equal(await queries.loadPublicJourney('bad-id', signal()), null);
  assert.equal(requests.length, 0);
});
test('withdrawn journey detail cannot render and public loading errors remain retryable', async () => {
  setup([{ data: [row], error: null }, { data: { ...row, status: 'draft' }, error: null }]);
  assert.equal(await queries.loadPublicJourney(id, signal()), null);
  setup([{ data: null, error: { message: 'sensitive server diagnostic' } }]);
  await assert.rejects(queries.loadPublicJourneys(signal()), reason => {
    assert.match(reason.message, /try again/);
    assert.doesNotMatch(reason.message, /sensitive/);
    return true;
  });
  setup([{ data: [], error: null }]);
  assert.deepEqual(await queries.loadPublicJourneys(signal()), []);
});
test('unavailable media preserves the real journey and gives a neutral photo fallback', async () => {
  setup([{ data: [row], error: null }], true);
  const journeys = await queries.loadPublicJourneys(signal());
  assert.equal(journeys.length, 1);
  assert.equal(journeys[0].cover, null);
  assert.equal(journeys[0].title, row.title);
});
