import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const module = { exports: {} };
new Function('require', 'module', 'exports', 'process', 'fetch', ts.transpileModule(readFileSync('src/lib/buddyChat.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(() => ({}), module, module.exports, { env: {} }, (...args) => globalThis.__fetch(...args));
const lib = module.exports;
const withEnv = (value, fn) => { const env = { EXPO_PUBLIC_BUDDY_CHAT_URL: value }; const m = { exports: {} };
  new Function('require', 'module', 'exports', 'process', 'fetch', ts.transpileModule(readFileSync('src/lib/buddyChat.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(() => ({}), m, m.exports, { env }, (...args) => globalThis.__fetch(...args));
  return fn(m.exports); };
const reply = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
const turns = [{ role: 'user', content: 'hi' }];

test('endpoint strips trailing slashes and is null when unset', () => {
  assert.equal(lib.buddyChatEndpoint(), null);
  withEnv('https://gw.example/', l => assert.equal(l.buddyChatEndpoint(), 'https://gw.example/v1/chat'));
});
test('unset URL or missing token never sends', async () => {
  globalThis.__fetch = () => { throw new Error('should not fetch'); };
  await assert.rejects(lib.sendBuddyChat('tok', turns), { kind: 'not_configured' });
  await withEnv('https://gw.example', l => assert.rejects(l.sendBuddyChat(null, turns), { kind: 'sign_in' }));
});
test('sends bearer token, no user_id, and returns the reply', async () => {
  let seen;
  globalThis.__fetch = async (url, init) => { seen = { url, init }; return reply(200, { reply: 'yo' }); };
  const result = await withEnv('https://gw.example', l => l.sendBuddyChat('tok', turns));
  assert.equal(result.reply, 'yo');
  assert.equal(seen.url, 'https://gw.example/v1/chat');
  assert.equal(seen.init.headers.Authorization, 'Bearer tok');
  assert.deepEqual(Object.keys(JSON.parse(seen.init.body)), ['messages']);
});
test('maps statuses to kinds and never exposes server text', async () => {
  const cases = [[401, {}, 'unauthorized'], [429, { error: 'limit_reached' }, 'limit'], [429, { error: 'slow_down' }, 'slow_down'], [503, {}, 'busy'], [504, {}, 'timeout'], [502, { error: 'upstream secret' }, 'generic']];
  for (const [status, body, kind] of cases) {
    globalThis.__fetch = async () => reply(status, body);
    await withEnv('https://gw.example', l => assert.rejects(l.sendBuddyChat('tok', turns), error => { assert.equal(error.kind, kind); assert.ok(!error.message.includes('secret')); return true; }));
  }
});
test('clamps to last 10 turns, 2000 chars each, 8000 total, keeping the last message', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(2500) }));
  many.push({ role: 'user', content: 'last' });
  const out = lib.clampBuddyMessages(many);
  assert.equal(out.at(-1).content, 'last');
  assert.ok(out.length <= 20);
  assert.ok(out.every(t => t.content.length <= 2000));
  assert.ok(out.reduce((n, t) => n + t.content.length, 0) <= 8000);
});

// ---- streaming ----
const sse = (...chunks) => ({ status: 200, ok: true, headers: { get: () => 'text/event-stream' }, body: { getReader: () => { const enc = new TextEncoder(); let i = 0; return { read: async () => { if (i >= chunks.length) return { done: true }; const v = chunks[i++]; if (v instanceof Error) throw v; return { done: false, value: enc.encode(v) }; }, cancel: async () => {} }; } } });
const ev = (name, obj) => 'event: ' + name + '\ndata: ' + JSON.stringify(obj) + '\n\n';
const stream = (fetchImpl, plain, onDelta = () => {}, signal) => withEnv('https://gw.example', l => {
  l.__setBuddyStreamFetchForTests(fetchImpl);
  globalThis.__fetch = plain ?? (() => { throw new Error('no plain call expected'); });
  return l.sendBuddyChatStream('tok', turns, onDelta, signal);
});

test('sse parser: split chunks, CRLF, comments, multi-line data, unknown events', () => {
  const p = lib.createSseParser();
  assert.deepEqual(p.feed(': ping\r\n\r\nevent: del'), []);
  assert.deepEqual(p.feed('ta\r\ndata: {"t":"a"}\r'), []);
  assert.deepEqual(p.feed('\n\r\nevent: x\ndata: l1\ndata: l2\n\ndata: bare\n\n'), [
    { event: 'delta', data: '{"t":"a"}' }, { event: 'x', data: 'l1\nl2' }, { event: 'message', data: 'bare' }]);
  assert.deepEqual(p.feed('event: orphan\n\n'), []);
});
test('stream: deltas accumulate, done replaces, request shape', async () => {
  let seen; const got = [];
  const result = await stream(async (url, init) => { seen = { url, init }; return sse(': ping\n\n' + ev('delta', { t: 'Hel' }) + 'event: delta\nda', 'ta: {"t":"lo"}\n\n', ev('done', { reply: 'Hello!' })); }, null, t => got.push(t));
  assert.deepEqual(got, ['Hel', 'Hello']);
  assert.equal(result.reply, 'Hello!');
  assert.equal(seen.url, 'https://gw.example/v1/chat/stream');
  assert.equal(seen.init.headers.Authorization, 'Bearer tok');
  assert.deepEqual(Object.keys(JSON.parse(seen.init.body)), ['messages']);
});
test('stream: pre-stream statuses map like the plain call', async () => {
  const cases = [[401, {}, 'unauthorized'], [429, { error: 'limit_reached' }, 'limit'], [429, { error: 'slow_down' }, 'slow_down'], [400, {}, 'generic'], [413, {}, 'generic']];
  for (const [status, body, kind] of cases) await assert.rejects(stream(async () => reply(status, body)), { kind });
});
test('stream: error events map to kinds and never fall back', async () => {
  for (const [code, kind] of [['limit_reached', 'limit'], ['busy', 'busy'], ['timeout', 'timeout'], ['upstream_error', 'generic'], ['too_large', 'generic']])
    await assert.rejects(stream(async () => sse(ev('error', { error: code }))), { kind });
});
test('stream: error after a delta does not fall back', async () => {
  await assert.rejects(stream(async () => sse(ev('delta', { t: 'a' }), ev('error', { error: 'busy' }))), { kind: 'busy' });
  await assert.rejects(stream(async () => sse(ev('delta', { t: 'a' }), new Error('net'))), { kind: 'generic' });
});
test('stream: once a 200 event-stream arrived, no failure falls back (no double charge)', async () => {
  for (const impl of [async () => sse(new Error('net')), async () => sse(), async () => sse(ev('delta', { t: 'a' })), async () => sse(': ping\n\n')])
    await assert.rejects(stream(impl), { kind: 'generic' });
});
test('stream: empty or blank reply is a generic error, never stored', async () => {
  await assert.rejects(stream(async () => sse(ev('done', { reply: '' }))), { kind: 'generic' });
  await assert.rejects(stream(async () => sse(ev('done', { reply: '  \n' }))), { kind: 'generic' });
  await assert.rejects(stream(async () => reply(200, { reply: '' })), { kind: 'generic' });
  globalThis.__fetch = async () => reply(200, { reply: ' ' });
  await withEnv('https://gw.example', l => assert.rejects(l.sendBuddyChat('tok', turns), { kind: 'generic' }));
});
test('clamp drops empty turns but keeps the last message', () => {
  const out = lib.clampBuddyMessages([{ role: 'user', content: 'a' }, { role: 'assistant', content: '' }, { role: 'user', content: ' ' }, { role: 'user', content: 'b' }]);
  assert.deepEqual(out.map(x => x.content), ['a', 'b']);
});
test('stream: falls back to the plain call on 404/405, fetch failure, no body reader', async () => {
  const plain = async () => reply(200, { reply: 'plain' });
  for (const impl of [async () => reply(404, {}), async () => reply(405, {}), async () => { throw new Error('net'); },
    async () => ({ status: 200, ok: true, headers: { get: () => 'text/event-stream' }, body: null })])
    assert.equal((await stream(impl, plain)).reply, 'plain');
});
test('base URL must be https (http only for 127.0.0.1, localhost, 10.0.2.2)', () => {
  const ok = ['https://gw.example', 'http://localhost:8080', 'http://127.0.0.1:8787/', 'http://10.0.2.2:8787'];
  const bad = ['http://gw.example', 'http://192.168.1.5:8787', 'ftp://gw.example', 'gw.example', 'http://localhost.evil.com', 'http://localhost@evil.com'];
  for (const url of ok) withEnv(url, l => { assert.ok(l.buddyChatEndpoint(), url); assert.equal(l.isBuddyConfigured(), true); });
  for (const url of bad) withEnv(url, l => { assert.equal(l.buddyChatEndpoint(), null, url); assert.equal(l.isBuddyConfigured(), false); });
});
test('getBuddyUsage: parses 200, returns null on 401, bad JSON or bad shape', async () => {
  const usage = () => withEnv('https://gw.example', l => l.getBuddyUsage('tok'));
  globalThis.__fetch = async () => reply(200, { used: 5, limit: 100, period: '2026-11', enforced: true, resetsAt: '2026-12-01T00:00:00Z' });
  assert.deepEqual(await usage(), { used: 5, limit: 100, period: '2026-11', enforced: true, resetsAt: '2026-12-01T00:00:00Z' });
  globalThis.__fetch = async () => reply(200, { used: 5, limit: null });
  assert.deepEqual(await usage(), { used: 5, limit: null, period: '', enforced: false, resetsAt: undefined });
  globalThis.__fetch = async () => reply(401, {});
  assert.equal(await usage(), null);
  globalThis.__fetch = async () => ({ status: 200, ok: true, json: async () => { throw new SyntaxError('bad'); } });
  assert.equal(await usage(), null);
  globalThis.__fetch = async () => reply(200, { used: 'x', limit: 1 });
  assert.equal(await usage(), null);
});
test('stream: falls back when streaming fetch is unavailable', async () => {
  const l = withEnv('https://gw.example', x => x);
  l.__setBuddyStreamFetchForTests(null);
  globalThis.__fetch = async () => reply(200, { reply: 'plain' });
  assert.equal((await l.sendBuddyChatStream('tok', turns, () => {})).reply, 'plain');
});
test('stream: unset URL or missing token never sends; external abort is not a fallback', async () => {
  await assert.rejects(lib.sendBuddyChatStream('tok', turns, () => {}), { kind: 'not_configured' });
  await assert.rejects(withEnv('https://gw.example', l => l.sendBuddyChatStream(null, turns, () => {})), { kind: 'sign_in' });
  const ac = new AbortController();
  await assert.rejects(stream(async () => { ac.abort(); throw Object.assign(new Error('x'), { name: 'AbortError' }); }, null, () => {}, ac.signal));
});
