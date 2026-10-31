import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { test } from 'node:test';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', source)(name => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}
const { createRegistrationEmailHandler } = load('backend/email-registration/handler.ts');
const model = load('src/lib/auth/model.ts');
function connection(lookup) {
  const handler = createRegistrationEmailHandler({ lookup, crypto: webcrypto, hashSecret: 'synthetic-independent-qa-secret-only-32' });
  const calls = [];
  const client = { functions: { invoke: async (name, options) => {
    calls.push({ name, options });
    const response = await handler(new Request('https://synthetic.example.test/functions/v1/' + name, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options.body),
    }));
    if (!response.ok) return { data: null, error: { context: response } };
    return { data: await response.json(), error: null };
  } } };
  return { calls, check: load('src/lib/auth/queries.ts', { '../supabase/client': { supabase: client }, './model': model }).checkRegistrationEmail };
}

test('QA cross-layer contract returns known/new booleans with normalized server input and no signup', async () => {
  const lookupCalls = [];
  const { check, calls } = connection(async (email, hash) => {
    lookupCalls.push({ email, hash });
    return { allowed: true, exists: email === 'known@example.test' };
  });
  assert.equal(await check(' Known@Example.test '), true);
  assert.equal(await check('known@example.test'), true);
  assert.equal(await check('new@example.test'), false);
  assert.equal(lookupCalls[0].email, 'known@example.test');
  assert.equal(lookupCalls[0].hash, lookupCalls[1].hash);
  assert.match(lookupCalls[0].hash, /^[a-f0-9]{64}$/);
  assert.deepEqual(calls.map(call => call.name), Array(3).fill('registration-email-check'));
});

test('QA cross-layer contract never interprets quota denial, outage or malformed backend as a new email', async () => {
  const cases = [
    [async () => ({ allowed: false, retry_after: 30, exists: false }), /Too many email checks/],
    [async () => { throw new Error('synthetic private server details'); }, /could not check/],
    [async () => ({ allowed: true, exists: 'false' }), /could not check/],
    [async () => ({ exists: false }), /could not check/],
  ];
  for (const [lookup, message] of cases) {
    const { check } = connection(lookup);
    await assert.rejects(() => check('person@example.test'), error => message.test(error.message) && !error.message.includes('private server'));
  }
});
