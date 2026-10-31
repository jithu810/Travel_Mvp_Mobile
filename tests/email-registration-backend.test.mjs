import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync, mkdirSync, mkdtempSync, realpathSync } from 'node:fs';
import { join, sep } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import net from 'node:net';
import ts from 'typescript';
const source = readFileSync('backend/email-registration/handler.ts', 'utf8');
const exports = {};
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);
const secret = 'synthetic-test-only-secret-32-characters';
const request = (email = 'Person@Example.test') => new Request('https://example.test/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
test('handler normalizes emails, HMACs stable keys and returns boolean only without logging', async () => {
  const calls = [];
  const handler = exports.createRegistrationEmailHandler({ crypto: webcrypto, hashSecret: secret, lookup: async (...args) => { calls.push(args); return { allowed: true, exists: calls.length === 1 }; } });
  const first = await handler(request(' Person@Example.test '));
  assert.equal(first.status, 200); assert.equal(first.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await first.json(), { exists: true });
  assert.deepEqual(await (await handler(request('person@example.test'))).json(), { exists: false });
  assert.equal(calls[0][0], 'person@example.test'); assert.match(calls[0][1], /^[a-f0-9]{64}$/);
  assert.equal(calls[0][1], calls[1][1]); assert.equal(calls[0][2].aborted, false);
  assert.equal(source.includes('console.'), false);
});
test('handler rejects malformed, excessive and unsupported input without a lookup', async () => {
  let calls = 0;
  const handler = exports.createRegistrationEmailHandler({ hashSecret: secret, lookup: async () => { calls++; return { allowed: true, exists: false }; } });
  for (const email of ['', 'bad', 'two words@example.test', 'x'.repeat(255) + '@example.test', 5]) assert.equal((await handler(request(email))).status, 400);
  assert.equal((await handler(new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }))).status, 400);
  assert.equal((await handler(new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ' '.repeat(1025) }))).status, 400);
  assert.equal((await handler(new Request('https://example.test'))).status, 405);
  assert.equal((await handler(new Request('https://example.test', { method: 'OPTIONS' }))).status, 200);
  assert.equal(calls, 0);
});
test('handler fails closed for missing secret, outages, malformed RPC results and timeouts', async () => {
  let calls = 0;
  const unavailable = exports.createRegistrationEmailHandler({ lookup: async () => { calls++; return { allowed: true, exists: false }; } });
  assert.equal((await unavailable(request())).status, 503); assert.equal(calls, 0);
  for (const result of [null, {}, { allowed: true }, { allowed: true, exists: 'false' }, { allowed: false, retry_after: -1 }]) {
    const handler = exports.createRegistrationEmailHandler({ crypto: webcrypto, hashSecret: secret, lookup: async () => result });
    assert.deepEqual(await (await handler(request())).json(), { error: 'unavailable' });
  }
  const failed = exports.createRegistrationEmailHandler({ crypto: webcrypto, hashSecret: secret, lookup: async () => { throw new Error('synthetic private detail'); } });
  assert.deepEqual(await (await failed(request())).json(), { error: 'unavailable' });
  let signal;
  const timeout = exports.createRegistrationEmailHandler({ crypto: webcrypto, hashSecret: secret, timeoutMs: 5, lookup: async (_email, _hash, currentSignal) => { signal = currentSignal; return new Promise(() => {}); } });
  assert.equal((await timeout(request())).status, 503); assert.equal(signal.aborted, true);
});
test('handler returns bounded Retry-After and exposes no account result on quota denial', async () => {
  const handler = exports.createRegistrationEmailHandler({ crypto: webcrypto, hashSecret: secret, lookup: async () => ({ allowed: false, exists: true, retry_after: 42 }) });
  const response = await handler(request());
  assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '42');
  assert.deepEqual(await response.json(), { error: 'rate_limited' });
});

const bin = 'D:/Travel_Mvp/.local-tests/customize-stops-pg/pgsql/bin';
const exe = name => join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
const available = ['initdb', 'pg_ctl', 'psql'].every(name => existsSync(exe(name)));
test('isolated PG enforces grants, providers, atomic quotas, window expiry and bounded counters', { skip: !available, timeout: 120000 }, async () => {
  const workspace = realpathSync(process.cwd());
  assert.match(workspace.replaceAll('\\', '/'), /\/Travel_Mvp_Mobile$/i);
  const outputs = join(workspace, '.local-tests'); mkdirSync(outputs, { recursive: true });
  const directory = mkdtempSync(join(outputs, 'email-registration-'));
  assert.ok(realpathSync(directory).startsWith(workspace + sep));
  const data = join(directory, 'data'); assert.equal(existsSync(data), false);
  const socket = net.createServer(); await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
  function run(name, args, input, allowedFailure = false) {
    const result = spawnSync(exe(name), args, { input, encoding: 'utf8', windowsHide: true, timeout: 40000 });
    if (!allowedFailure) assert.equal(result.status, 0, `${name}: ${result.stderr || result.error || result.stdout}`);
    return result;
  }
  const args = ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', 'postgres', '-qAt', '-v', 'ON_ERROR_STOP=1'];
  const sql = (value, fail = false) => run('psql', args, value, fail);
  const lookup = (email, hash = 'a'.repeat(64)) => `select public.registration_email_check('${email}','${hash}');`;
  const asService = value => 'set role service_role;' + value;
  let started = false;
  try {
    run('initdb', ['-D', data, '-U', 'postgres', '-A', 'trust', '--no-locale', '-E', 'UTF8']);
    run('pg_ctl', ['-D', data, '-l', join(directory, 'server.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']); started = true;
    sql(`create role anon nologin; create role authenticated nologin; create role service_role nologin; create schema auth; create table auth.users(email text,is_sso_user boolean); insert into auth.users values ('known@example.test',false),('sso@example.test',true),(' Mixed@Example.test ',false);`);
    sql(readFileSync('backend/email-registration/rollout-proposal.sql', 'utf8'));
    for (const role of ['anon', 'authenticated']) {
      assert.notEqual(sql(`set role ${role};` + lookup('known@example.test'), true).status, 0);
      assert.notEqual(sql(`set role ${role}; select * from private.registration_email_limits;`, true).status, 0);
      assert.notEqual(sql(`set role ${role}; select * from auth.users;`, true).status, 0);
    }
    for (const [email, expected] of [['known@example.test', true], ['sso@example.test', true], ['mixed@example.test', true], ['new@example.test', false]]) {
      sql('truncate private.registration_email_limits;');
      assert.deepEqual(JSON.parse(sql(asService(lookup(email))).stdout), { allowed: true, exists: expected });
    }
    assert.notEqual(sql(asService(lookup('bad')), true).status, 0);
    assert.notEqual(sql(asService(lookup('known@example.test', 'raw-email')), true).status, 0);
    sql('truncate private.registration_email_limits;');
    for (let i = 0; i < 3; i++) assert.equal(JSON.parse(sql(asService(lookup('new@example.test'))).stdout).allowed, true);
    const limited = JSON.parse(sql(asService(lookup('new@example.test'))).stdout);
    assert.equal(limited.allowed, false); assert.ok(limited.retry_after > 0); assert.equal('exists' in limited, false);
    assert.equal(sql('select count(*) from private.registration_email_limits;').stdout.trim(), '3');
    sql("update private.registration_email_limits set expires_at=now()-interval '1 second';");
    assert.equal(JSON.parse(sql(asService(lookup('new@example.test'))).stdout).allowed, true);
    sql("update private.registration_email_limits set attempts=30 where key='global:minute';");
    assert.equal(JSON.parse(sql(asService(lookup('another@example.test', 'b'.repeat(64)))).stdout).allowed, false);
    sql("update private.registration_email_limits set attempts=1 where key='global:minute'; update private.registration_email_limits set attempts=1000 where key='global:day';");
    assert.equal(JSON.parse(sql(asService(lookup('another@example.test', 'b'.repeat(64)))).stdout).allowed, false);
    sql('truncate private.registration_email_limits;');
    const concurrent = await Promise.all(Array.from({ length: 8 }, () => new Promise((resolve, reject) => {
      const child = spawn(exe('psql'), args, { windowsHide: true }); let out = '', err = '';
      child.stdout.on('data', data => { out += data; }); child.stderr.on('data', data => { err += data; });
      child.on('error', reject); child.on('close', code => code === 0 ? resolve(JSON.parse(out)) : reject(new Error(err)));
      child.stdin.end(asService(lookup('new@example.test')));
    })));
    assert.equal(concurrent.filter(result => result.allowed).length, 3);
    assert.equal(sql('select count(*) from auth.users;').stdout.trim(), '3');
    assert.equal(sql('select bool_and(relrowsecurity) from pg_class where oid=\'private.registration_email_limits\'::regclass;').stdout.trim(), 't');
  } finally { if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']); }
});
