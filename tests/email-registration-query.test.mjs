import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(client) {
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync('src/lib/auth/queries.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const model = { exports: {} };
  new Function('module', 'exports', ts.transpileModule(readFileSync('src/lib/auth/model.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(model, model.exports);
  new Function('require', 'module', 'exports', source)(name => {
    if (name === '../supabase/client') return { supabase: client };
    if (name === './model') return model.exports;
    throw new Error(`Unexpected dependency ${name}`);
  }, module, module.exports);
  return module.exports.checkRegistrationEmail;
}

test('email check calls only the named function with trimmed email and accepts explicit booleans', async () => {
  for (const exists of [true, false]) {
    const calls = [];
    const check = load({ functions: { invoke: async (...args) => { calls.push(args); return { data: { exists }, error: null }; } } });
    assert.equal(await check(' traveler@example.org '), exists);
    assert.deepEqual(calls, [['registration-email-check', { body: { email: 'traveler@example.org' } }]]);
  }
});

test('invalid input fails before network and malformed success never means new email', async () => {
  let calls = 0;
  const check = load({ functions: { invoke: async () => { calls++; return { data: { exists: false }, error: null }; } } });
  for (const email of ['', 'invalid', 'a'.repeat(255) + '@example.org']) await assert.rejects(() => check(email), /valid email/);
  assert.equal(calls, 0);
  for (const data of [null, undefined, {}, false, 'false', { exists: null }, { exists: 0 }, { exists: 'false' }]) {
    await assert.rejects(() => load({ functions: { invoke: async () => ({ data, error: null }) } })('traveler@example.org'), /could not check/);
  }
});

test('non-2xx, transport and missing client failures are sanitized and fail closed', async () => {
  for (const [status, expected] of [[400, /valid email/], [429, /Too many email checks/], [503, /could not check/], [401, /could not check/]]) {
    const check = load({ functions: { invoke: async () => ({ data: { exists: false }, error: { message: 'private internals', context: new Response('secret', { status }) } }) } });
    await assert.rejects(() => check('traveler@example.org'), error => expected.test(error.message) && !error.message.includes('secret') && !error.message.includes('private'));
  }
  const throwing = load({ functions: { invoke: async () => { throw new Error('private internals'); } } });
  await assert.rejects(() => throwing('traveler@example.org'), /could not check/);
  for (const result of [null, undefined]) await assert.rejects(() => load({ functions: { invoke: async () => result } })('traveler@example.org'), /could not check/);
  await assert.rejects(() => load(null)('traveler@example.org'), /could not check/);
});
