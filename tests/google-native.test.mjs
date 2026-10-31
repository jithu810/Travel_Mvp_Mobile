import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(path, modules = {}) {
  const output = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => {
    assert.ok(name in modules, `Unexpected dependency ${name}`);
    if (modules[name] instanceof Error) throw modules[name];
    return modules[name];
  }, module, module.exports);
  return module.exports;
}
const model = load('src/lib/auth/google-model.ts');
function adapter({ moduleMissing = false, session = true, authError = null, browserResults = [], flowIds = [] } = {}) {
  const calls = [], storage = new Map(); let authorizations = 0, browserOpens = 0;
  const google = load('src/lib/auth/google.native.ts', {
    '@react-native-async-storage/async-storage': { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => storage.set(key, value), removeItem: async key => storage.delete(key) },
    '../supabase/client': { supabase: { auth: {
      async signInWithOAuth(input) { calls.push(['authorize', input]); return { data: { url: 'https://example.supabase.co/auth/v1/authorize?provider=google', flowId: flowIds[authorizations++] ?? 'flow-specific-id' }, error: authError }; },
      async exchangeCodeForSession(...args) { calls.push(['exchange', ...args]); return { data: { session: session ? {} : null, user: session ? { id: 'user' } : null }, error: null }; },
    } } },
    './google-model': model,
    'expo-web-browser': moduleMissing ? new Error('private native module details') : { async openAuthSessionAsync(...args) { calls.push(['browser', ...args]); return browserResults[browserOpens++] ?? { type: 'success', url: `${model.googleRedirect}?code=synthetic-code` }; } },
  });
  return { google, calls, storage };
}
test('native adapter requests Google PKCE browser redirect and exchanges with the returned flow ID', async () => {
  const h = adapter();
  assert.equal(h.google.googleSignInSupported, true);
  assert.deepEqual(await h.google.signInWithGoogle(null), { journeyId: null });
  assert.deepEqual(h.calls[0], ['authorize', { provider: 'google', options: { redirectTo: model.googleRedirect, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } }]);
  assert.deepEqual(h.calls[1], ['browser', 'https://example.supabase.co/auth/v1/authorize?provider=google', model.googleRedirect]);
  assert.deepEqual(h.calls[2], ['exchange', 'synthetic-code', { flowId: 'flow-specific-id' }]);
  assert.equal(h.storage.size, 0); assert.equal(h.google.isGoogleSignInPending(), false);
});
test('every Google attempt requests account selection after cancellation and after an earlier successful sign-in', async () => {
  const h = adapter({ browserResults: [{ type: 'cancel' }], flowIds: ['cancelled-flow', 'retry-flow', 'next-signin-flow'] });
  assert.equal(await h.google.signInWithGoogle(null), null);
  assert.deepEqual(await h.google.signInWithGoogle(null), { journeyId: null });
  assert.deepEqual(await h.google.signInWithGoogle(null, 'create'), { journeyId: null, returnTo: 'create' });
  const authorizations = h.calls.filter(call => call[0] === 'authorize');
  assert.equal(authorizations.length, 3);
  for (const [, request] of authorizations) {
    assert.equal(request.provider, 'google');
    assert.deepEqual(request.options.queryParams, { prompt: 'select_account' });
    assert.equal(request.options.redirectTo, model.googleRedirect);
    assert.equal(request.options.skipBrowserRedirect, true);
  }
  assert.notEqual(authorizations[0][1], authorizations[1][1]);
  assert.deepEqual(h.calls.filter(call => call[0] === 'exchange'), [
    ['exchange', 'synthetic-code', { flowId: 'retry-flow' }],
    ['exchange', 'synthetic-code', { flowId: 'next-signin-flow' }],
  ]);
  assert.equal(h.calls.filter(call => call[0] === 'browser').length, 3);
  assert.equal(h.storage.size, 0); assert.equal(h.google.isGoogleSignInPending(), false);
});
test('missing native module and session-less exchanges fail safely and clear the pending marker', async () => {
  for (const options of [{ moduleMissing: true }, { session: false }, { authError: new Error('provider secret details') }]) {
    const h = adapter(options);
    await assert.rejects(h.google.signInWithGoogle(null), error => /could not complete Google/.test(error.message) && !/private|secret/.test(error.message));
    assert.equal(h.storage.size, 0); assert.equal(h.google.isGoogleSignInPending(), false);
  }
});
test('web adapter does not import native dependencies or claim Google authentication', async () => {
  const web = load('src/lib/auth/google.ts');
  assert.equal(web.googleSignInSupported, false); assert.equal(web.isGoogleSignInPending(), false);
  await assert.rejects(web.signInWithGoogle(null), /mobile app/);
  await assert.rejects(web.completeGoogleSignIn(model.googleRedirect), /mobile app/);
});
test('Create destination survives warm completion and persisted cold callback, while legacy markers still return to account', async () => {
  const warm = adapter();
  assert.deepEqual(await warm.google.signInWithGoogle(null, 'create'), { journeyId: null, returnTo: 'create' });
  for (const destination of [{ returnTo: 'create' }, {}]) {
    const cold = adapter();
    cold.storage.set('journey-google-oauth-pending-v1', JSON.stringify({ startedAt: Date.now(), flowId: 'cold-flow', journeyId: null, ...destination }));
    assert.deepEqual(await cold.google.completeGoogleSignIn(`${model.googleRedirect}?code=cold-code`), { journeyId: null, ...destination });
    assert.deepEqual(cold.calls, [['exchange', 'cold-code', { flowId: 'cold-flow' }]]);
    assert.equal(cold.storage.size, 0);
  }
});
test('arbitrary persisted or initiation return paths are rejected before exchanging or authorizing', async () => {
  const cold = adapter();
  cold.storage.set('journey-google-oauth-pending-v1', JSON.stringify({ startedAt: Date.now(), flowId: 'cold-flow', journeyId: null, returnTo: 'https://untrusted.example' }));
  await assert.rejects(cold.google.completeGoogleSignIn(`${model.googleRedirect}?code=cold-code`), /could not complete/);
  assert.deepEqual(cold.calls, []); assert.equal(cold.storage.size, 0);
  const warm = adapter();
  await assert.rejects(warm.google.signInWithGoogle(null, '/untrusted'), /could not complete/);
  assert.deepEqual(warm.calls, []); assert.equal(warm.storage.size, 0);
});
