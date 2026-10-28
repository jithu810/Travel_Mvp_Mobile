import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const output = mkdtempSync(join(tmpdir(), 'journey-auth-remix-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/auth/model.ts', 'src/lib/auth/intent.ts', 'src/lib/auth/session.ts', 'src/lib/auth/queries.ts', 'src/lib/remix/model.ts', 'src/lib/remix/queries.ts', 'src/lib/social/model.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, types: ['node'], esModuleInterop: true,
  outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
const diagnostics = ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const require = createRequire(import.meta.url);
const authModel = require(join(output, 'lib/auth/model.js'));
const { createIntentStore } = require(join(output, 'lib/auth/intent.js'));
const { observeSession } = require(join(output, 'lib/auth/session.js'));
const { normalizeDraft, createRemixStore, RemixFailure } = require(join(output, 'lib/remix/model.js'));
const { createSocialController } = require(join(output, 'lib/social/model.js'));
const id = '11111111-1111-4111-8111-111111111111';
const uid = '22222222-2222-4222-8222-222222222222';
const copyId = '33333333-3333-4333-8333-333333333333';
const other = '44444444-4444-4444-8444-444444444444';
const values = { email: ' traveler@example.org ', password: ' secure password ', name: ' Traveler ' };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
test('authentication validates before any network call and preserves password whitespace', async () => {
  let calls = 0;
  const controller = authModel.createAuthController(async (mode, input) => {
    calls++; assert.equal(input.email, 'traveler@example.org'); assert.equal(input.password, values.password); assert.equal(input.name, 'Traveler'); return 'signed-in';
  });
  for (const patch of [{ email: '' }, { email: 'bad' }, { password: '' }]) assert.equal((await controller.submit('signin', { ...values, ...patch })).kind, 'error');
  for (const patch of [{ name: '' }, { password: 'short' }]) assert.equal((await controller.submit('register', { ...values, ...patch })).kind, 'error');
  assert.equal(calls, 0);
  assert.equal((await controller.submit('signin', values)).kind, 'signed-in'); assert.equal(calls, 1);
});
test('registration confirmation, friendly errors, and synchronous duplicate-tap locking', async () => {
  const pending = deferred(); let calls = 0;
  const controller = authModel.createAuthController(async () => { calls++; return pending.promise; });
  const first = controller.submit('register', values);
  assert.equal((await controller.submit('register', values)).kind, 'busy');
  pending.resolve('confirmation'); assert.equal((await first).kind, 'confirmation'); assert.equal(calls, 1);
  for (const code of ['invalid_credentials', 'email_not_confirmed', 'weak_password', 'over_request_rate_limit']) {
    assert.ok(authModel.authError({ code }, 'signin').length > 10);
  }
  const failing = authModel.createAuthController(async () => { throw { code: 'invalid_credentials' }; });
  assert.match((await failing.submit('signin', values)).message, /incorrect/);
});
test('session restoration restores a saved session and observes sign-out', async () => {
  let callback, unsubscribed = false; const updates = []; const saved = { user: { id: uid } };
  const cleanup = observeSession({ onAuthStateChange: cb => { callback = cb; return { data: { subscription: { unsubscribe: () => { unsubscribed = true; } } } }; },
    getSession: async () => ({ data: { session: saved }, error: null }) }, state => updates.push(state));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(updates[0], { session: saved, loading: false, error: null });
  callback('SIGNED_OUT', null); assert.equal(updates.at(-1).session, null);
  cleanup(); callback('SIGNED_IN', saved); assert.equal(updates.length, 2); assert.equal(unsubscribed, true);
});
test('late restoration success and rejection cannot overwrite a newer auth event', async () => {
  for (const reject of [false, true]) {
    const pending = deferred(); let callback; const updates = [];
    const cleanup = observeSession({ onAuthStateChange: cb => { callback = cb; return { data: { subscription: { unsubscribe() {} } } }; }, getSession: () => pending.promise }, state => updates.push(state));
    callback('SIGNED_IN', { user: { id: uid } });
    if (reject) pending.reject(new Error('old storage error')); else pending.resolve({ data: { session: null }, error: null });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(updates.length, 1); assert.equal(updates[0].session.user.id, uid); cleanup();
  }
});
test('failed restoration produces a usable signed-out error and cleanup ignores late completion', async () => {
  const updates = [];
  const cleanup = observeSession({ onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), getSession: async () => { throw new Error('offline'); } }, state => updates.push(state));
  await new Promise(resolve => setImmediate(resolve)); assert.equal(updates[0].loading, false); assert.match(updates[0].error, /restore/); cleanup();
});
test('trusted in-memory auth intents lock repeated taps, consume once and cancel safely', () => {
  const store = createIntentStore();
  assert.equal(store.begin('invalid', 'remix'), false);
  assert.equal(store.begin(id, 'remix'), true); assert.equal(store.begin(id, 'save'), false);
  const token = store.getSnapshot().token;
  assert.equal(store.consume(token + 1), null); assert.equal(store.consume(token).journeyId, id);
  assert.equal(store.consume(token), null);
  store.begin(id, 'like'); store.cancel(); assert.equal(store.getSnapshot(), null);
});
test('resuming authenticated Like/Save enables desired state without toggling existing preferences off', async () => {
  let writes = 0; const state = { liked: true, saved: true, likes: 2 };
  const controller = createSocialController({ read: async () => state, write: async () => { writes++; return state; } }, 2);
  await controller.load(); await controller.act('like', true); await controller.act('save', true);
  assert.equal(writes, 0); assert.deepEqual(controller.getSnapshot().state, state);
});
const original = { id, creator_id: other, status: 'published', is_demo: false, title: 'Original', description: 'Story', stops: [
  { id: 'old-b', name: 'Second', sequence: 2, latitude: 11, longitude: 22, rating: 4, description: 'Second note', day_number: 2 },
  { id: 'old-a', name: 'First', sequence: 1, latitude: 10, longitude: 21, rating: 0, description: 'First note', day_number: 1 },
] };
const draftRow = { ...structuredClone(original), id: copyId, creator_id: uid, status: 'draft', copied_from_journey_id: id,
  cover_image_path: 'journey-media/owner/cover.jpg', stops: original.stops.map((stop, index) => ({ ...stop, id: 'new-' + index, photo_path: 'journey-media/owner/stop.jpg' })), liked: true, saved: true, likes_count: 99 };
test('private draft normalization enforces owner, draft status and lineage; preserves content and stored order', () => {
  const before = JSON.stringify(draftRow);
  const draft = normalizeDraft(draftRow, copyId, uid);
  assert.equal(draft.sourceId, id); assert.deepEqual(draft.stops.map(stop => stop.name), ['First', 'Second']);
  assert.deepEqual(draft.stops.map(stop => [stop.latitude, stop.longitude, stop.rating, stop.description, stop.dayNumber]), [[10,21,0,'First note',1],[11,22,4,'Second note',2]]);
  assert.equal(draft.likes_count, undefined); assert.equal(draft.liked, undefined); assert.equal(draft.creator_id, undefined);
  for (const patch of [{ creator_id: other }, { status: 'published' }, { is_demo: true }, { id }]) assert.equal(normalizeDraft({ ...draftRow, ...patch }, copyId, uid), null);
  assert.equal(JSON.stringify(draftRow), before);
});
test('Remix locks across repeated calls and reuses the completed copy', async () => {
  const store = createRemixStore(); const pending = deferred(); let calls = 0;
  const port = async () => { calls++; return pending.promise; };
  const first = store.run('source:owner', port); await store.run('source:owner', port); assert.equal(calls, 1);
  pending.resolve(copyId); assert.equal(await first, copyId);
  assert.equal(await store.run('source:owner', port), copyId); assert.equal(calls, 1);
});
test('uncertain copies block retries, known SQL failures permit retry, and known copy IDs remain accessible', async () => {
  const store = createRemixStore(); let calls = 0;
  await store.run('uncertain', async () => { calls++; throw new RemixFailure('Unconfirmed', true); });
  await store.run('uncertain', async () => { calls++; return copyId; }); assert.equal(calls, 1);
  assert.equal(store.get('uncertain').blocked, true);
  await store.run('retry', async () => { throw new RemixFailure('Rolled back'); });
  assert.equal(await store.run('retry', async () => copyId), copyId);
  await store.run('known', async () => { throw new RemixFailure('Read failed', true, copyId); });
  assert.equal(store.get('known').copyId, copyId); assert.equal(store.get('known').error, 'Read failed');
});
const calls = []; let viewer = uid; let currentDraft = draftRow; let copyError = null; let confirmation = true; let authError = null;
const client = {
  auth: {
    getUser: async () => ({ data: { user: viewer ? { id: viewer } : null }, error: null }),
    signInWithPassword: async args => { calls.push(['signin', args]); return { data: { session: authError ? null : { user: { id: uid } } }, error: authError }; },
    signUp: async args => { calls.push(['register', args]); return { data: { session: confirmation ? null : { user: { id: uid } } }, error: authError }; },
    signOut: async args => { calls.push(['signout', args]); return { error: authError }; },
  },
  rpc: (name, args) => ({ abortSignal: async signal => {
    assert.equal(signal.aborted, false); calls.push([name, args]);
    return { data: name === 'copy_journey' ? copyId : name === 'get_account_journeys' ? [currentDraft, { ...currentDraft, creator_id: other }, { ...currentDraft, status: 'published' }] : currentDraft, error: name === 'copy_journey' ? copyError : null };
  } }),
  storage: { from: bucket => ({ createSignedUrls: async paths => { calls.push(['signed', bucket, paths]); return { data: paths.map(() => ({ signedUrl: 'https://example.org/private-photo', error: null })) }; } }) },
};
require.cache[join(output, 'lib/supabase/client.js')] = { exports: { supabase: client } };
require.cache[join(output, 'lib/discovery/queries.js')] = { exports: { loadPublicJourney: async sourceId => { calls.push(['public-source', sourceId]); return original; } } };
const authQueries = require(join(output, 'lib/auth/queries.js'));
const queries = require(join(output, 'lib/remix/queries.js'));
test('auth uses existing SDK methods and treats confirmation-required registration as signed out', async () => {
  calls.length = 0; authError = null; confirmation = true;
  assert.equal(await authQueries.authenticate('register', values), 'confirmation');
  assert.deepEqual(calls[0], ['register', { email: values.email, password: values.password, options: { data: { display_name: values.name } } }]);
  confirmation = false; assert.equal(await authQueries.authenticate('register', values), 'signed-in');
  assert.equal(await authQueries.authenticate('signin', values), 'signed-in');
  await authQueries.signOutAccount(); assert.deepEqual(calls.at(-1), ['signout', { scope: 'local' }]);
  authError = { code: 'invalid_credentials' }; await assert.rejects(() => authQueries.authenticate('signin', values)); authError = null;
});
test('successful Remix sends only source ID, verifies private ownership/lineage, and never changes original', async () => {
  calls.length = 0; currentDraft = draftRow; viewer = uid; copyError = null;
  const before = JSON.stringify(original);
  assert.equal(await queries.remixJourney(id, uid), copyId);
  assert.deepEqual(calls.find(call => call[0] === 'copy_journey'), ['copy_journey', { source_id: id }]);
  assert.deepEqual(calls.find(call => call[0] === 'get_journey_detail'), ['get_journey_detail', { target_id: copyId }]);
  assert.equal(JSON.stringify(original), before);
  assert.equal(calls.some(call => ['publish', 'update', 'journey_likes', 'saved_journeys'].includes(call[0])), false);
});
test('Remix refuses missing/different authentication before writing and never claims invalid copy success', async () => {
  for (viewer of [null, other]) {
    calls.length = 0; await assert.rejects(() => queries.remixJourney(id, uid));
    assert.equal(calls.some(call => call[0] === 'copy_journey'), false);
  }
  viewer = uid; currentDraft = { ...draftRow, status: 'published' };
  await assert.rejects(() => queries.remixJourney(id, uid), error => error.copyId === copyId && error.uncertain);
  currentDraft = { ...draftRow, copied_from_journey_id: other };
  await assert.rejects(() => queries.remixJourney(id, uid), error => error.uncertain);
  currentDraft = draftRow;
});
test('transport copy errors are uncertain while SQL transaction failures are retryable', async () => {
  for (const [code, uncertain] of [['', true], ['PGRST000', true], ['42501', false]]) {
    copyError = { code }; await assert.rejects(() => queries.remixJourney(id, uid), error => error.uncertain === uncertain);
  }
  copyError = null;
});
test('owner drafts use authenticated detail/list/media contracts and reject other owners', async () => {
  calls.length = 0; viewer = uid;
  const result = await queries.loadPrivateDraft(copyId, uid, new AbortController().signal);
  assert.equal(result.cover, 'https://example.org/private-photo');
  assert.ok(calls.some(call => call[0] === 'signed' && call[1] === 'journey-media'));
  const drafts = await queries.loadPrivateDrafts(uid, new AbortController().signal);
  assert.deepEqual(drafts, [{ id: copyId, title: 'Original' }]);
  assert.ok(calls.some(call => call[0] === 'get_account_journeys' && call[1].collection === 'drafts'));
  viewer = other; await assert.rejects(() => queries.loadPrivateDraft(copyId, uid, new AbortController().signal)); viewer = uid;
});
test('Use targets existing Travel Mode; authenticated returns consume intents once and copies open the guarded editor directly', () => {
  const story = readFileSync('src/app/journey/[id].tsx', 'utf8');
  assert.ok(story.includes('onUse={openTravel}') && story.includes("pathname: '/travel/[id]'"));
  assert.ok(story.includes("const openMap = useCallback(() => setPanel('map')") && story.includes('onExpand={openMap}'), 'Map browsing remains a separate entry point');
  const options = readFileSync('src/components/journey/journey-options.tsx', 'utf8');
  assert.ok(options.includes('accessibilityLabel="Use This Journey"') && options.includes('onPress={onUse}'));
  assert.ok(options.includes("pathname: '/create', params: { draft: copyId }"));
  assert.equal(options.includes("pathname: '/draft/[id]'"),false);
  assert.ok(options.includes('intent.consume(intent.pending.token)'));
  const auth = readFileSync('src/app/auth.tsx', 'utf8');
  assert.ok(auth.includes('router.canGoBack()')); assert.ok(auth.includes('if (!finished.current) cancelIntent()'));
  assert.ok(auth.includes('You are not signed in yet.'));
});
