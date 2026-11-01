import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// Self-contained legacy invalidation adapter versus the current query code.
// Counts are signing transport calls, not downloaded image bodies or native bytes.
function evaluate(source, modules = {}) {
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(name => { assert.ok(name in modules, name); return modules[name]; }, exports);
  return exports;
}
const read = path => readFileSync(path, 'utf8');
const { createRequestCache } = evaluate(read('src/lib/discovery/request-cache.ts'));
const model = evaluate(read('src/lib/discovery/model.ts'), {
  '../../types/journey': { travelerTypes: ['solo', 'couple', 'friends', 'family'] },
});
const id = n => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const rows = Array.from({ length: 14 }, (_, n) => ({
  id: id(n), title: `Journey ${n}`, is_demo: false, traveler_type: 'solo',
  cover_image_path: `journey-media/fixture/journey/cover-${n % 9}.jpg`, stops: [],
}));
function harness(source, { legacyInvalidation = false } = {}) {
  let now = 0, rpcCalls = 0;
  const signs = [], caches = [];
  const client = {
    rpc() { rpcCalls++; return { abortSignal: async () => ({ data: rows, error: null }) }; },
    storage: { from: () => ({ createSignedUrls: async paths => {
      signs.push(paths);
      return { data: paths.map(path => ({ signedUrl: `https://fixture.invalid/${path}?token=${signs.length}` })) };
    } }) },
  };
  const api = evaluate(source, {
    '../supabase/public': { publicSupabase: client }, './model': model,
    './request-cache': { createRequestCache: (max, ttl) => {
      const cache = createRequestCache(max, ttl, () => now);
      caches.push(cache);
      return cache;
    } },
    '../media/image-variants': { storedThumbnailsEnabled: () => false, thumbnailStoragePath: () => null },
  });
  if (legacyInvalidation) {
    const invalidateCollection = api.invalidatePublicJourneys;
    // Before optimization, refresh also cleared every cached signed URL.
    api.invalidatePublicJourneys = () => { invalidateCollection(); caches.forEach(cache => cache.clear()); };
  }
  return { api, signs, rpcCalls: () => rpcCalls, advance: value => { now = value; } };
}
const signal = () => new AbortController().signal;

test('QA legacy invalidation comparison: three refreshes retain ordering but eliminate repeated signing for nine reused covers', async t => {
  const results = [];
  for (const legacyInvalidation of [true, false]) {
    const h = harness(read('src/lib/discovery/queries.ts'), { legacyInvalidation });
    const first = await h.api.loadPublicJourneys(signal());
    let last;
    for (let refresh = 0; refresh < 3; refresh++) {
      h.api.invalidatePublicJourneys();
      last = await h.api.loadPublicJourneys(signal());
      assert.deepEqual(last.map(j => j.id), rows.map(j => j.id));
    }
    assert.equal(h.rpcCalls(), 4, 'Each deliberate refresh still reloads collection membership');
    results.push({ requests: h.signs.length, signedPaths: h.signs.flat().length, sameUrl: first[0].cover === last[0].cover });
  }
  assert.deepEqual(results, [
    { requests: 4, signedPaths: 36, sameUrl: false },
    { requests: 1, signedPaths: 9, sameUrl: true },
  ]);
  t.diagnostic(`Synthetic signing measurements: ${JSON.stringify(results)}. Image body bytes not measured.`);
});

test('QA return/metadata expiry preserves signatures; signed expiry still refreshes all deduplicated paths', async () => {
  const h = harness(read('src/lib/discovery/queries.ts'));
  const first = await h.api.loadPublicJourneys(signal());
  h.advance(45001);
  const returned = await h.api.loadPublicJourneys(signal());
  assert.equal(h.rpcCalls(), 2);
  assert.equal(h.signs.length, 1);
  assert.equal(first[0].cover, returned[0].cover);
  h.advance(3300001);
  const renewed = await h.api.loadPublicJourneys(signal());
  assert.equal(h.signs.length, 2);
  assert.equal(h.signs.flat().length, 18);
  assert.notEqual(first[0].cover, renewed[0].cover);
});
