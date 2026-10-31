import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const module = { exports: {} };
new Function('module', 'exports', ts.transpileModule(readFileSync('src/lib/auth/google-model.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(module, module.exports);
const { createGoogleSignIn, googleRedirect } = module.exports;
const journeyId = '11111111-1111-4111-8111-111111111111';
const callback = `${googleRedirect}?code=synthetic-code`;
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const settle = () => new Promise(done => setImmediate(done));

function harness() {
  const items = new Map(), calls = [];
  let timestamp = 1000000;
  const browser = deferred();
  const ports = {
    storage: {
      async getItem(key) { return items.get(key) ?? null; },
      async setItem(key, value) { items.set(key, value); },
      async removeItem(key) { items.delete(key); },
    },
    async authorize() { calls.push(['authorize']); return { url: 'https://example.org/synthetic-authorize', flowId: 'synthetic-flow' }; },
    async exchange(code, flowId) { calls.push(['exchange', code, flowId]); return true; },
    async open() { calls.push(['open']); return browser.promise; },
    now: () => timestamp,
  };
  return { ports, items, calls, browser, advance(ms) { timestamp += ms; }, create: () => createGoogleSignIn(ports) };
}

test('QA cold callback restores only the validated destination and flow-specific exchange', async () => {
  const h = harness(), warm = h.create();
  const opening = warm.start(journeyId);
  await settle();
  const persisted = [...h.items.values()].join('');
  assert.equal(persisted.includes('synthetic-code'), false);
  assert.equal(persisted.includes('access_token'), false);
  const cold = h.create();
  assert.deepEqual(await cold.complete(callback), { journeyId });
  assert.deepEqual(h.calls.filter(call => call[0] === 'exchange'), [['exchange', 'synthetic-code', 'synthetic-flow']]);
  assert.equal(h.items.size, 0);
  h.browser.resolve({ type: 'cancel' });
  await opening;
});

test('QA unsolicited callback and a callback after cancellation never exchange', async () => {
  const h = harness(), flow = h.create();
  await assert.rejects(flow.complete(callback), /could not complete/i);
  assert.equal(h.calls.length, 0);
  const opening = flow.start(null);
  await settle();
  h.browser.resolve({ type: 'cancel' });
  assert.equal(await opening, null);
  await assert.rejects(h.create().complete(callback), /could not complete/i);
  assert.equal(h.calls.some(call => call[0] === 'exchange'), false);
});

test('QA stale and future-dated callback transactions fail closed without exchange', async () => {
  for (const delta of [600001, -1]) {
    const h = harness(), flow = h.create();
    const opening = flow.start(journeyId);
    await settle();
    h.advance(delta);
    await assert.rejects(h.create().complete(callback), /could not complete/i);
    assert.equal(h.calls.some(call => call[0] === 'exchange'), false);
    assert.equal(h.items.size, 0);
    h.browser.resolve({ type: 'cancel' });
    await opening;
  }
});

test('QA browser and callback race shares a pending exchange and requires session success', async () => {
  const h = harness(), exchange = deferred();
  h.ports.exchange = (code, flowId) => { h.calls.push(['exchange', code, flowId]); return exchange.promise; };
  const flow = h.create(), opening = flow.start(journeyId);
  await settle();
  const first = flow.complete(callback), second = flow.complete(callback);
  h.browser.resolve({ type: 'success', url: callback });
  await settle();
  assert.equal(h.calls.filter(call => call[0] === 'exchange').length, 1);
  exchange.resolve(true);
  assert.deepEqual(await Promise.all([opening, first, second]), [{ journeyId }, { journeyId }, { journeyId }]);
  assert.equal(h.items.size, 0);
});

test('QA invalid destination is discarded and exchange failure cannot report signed in', async () => {
  const h = harness();
  h.ports.exchange = async () => false;
  const flow = h.create(), opening = flow.start('https://example.org/untrusted-return');
  await settle();
  assert.equal(JSON.parse([...h.items.values()][0]).journeyId, null);
  h.browser.resolve({ type: 'success', url: callback });
  await assert.rejects(opening, /could not complete/i);
  assert.equal(flow.isPending(), false);
  assert.equal(h.items.size, 0);
});

test('QA a delayed old browser holds the lock until cleanup and retry preserves its own marker', async () => {
  const h = harness(), secondBrowser = deferred();
  let opens = 0;
  h.ports.open = () => (++opens === 1 ? h.browser.promise : secondBrowser.promise);
  const flow = h.create(), firstOpening = flow.start(journeyId);
  await settle();
  assert.deepEqual(await flow.complete(callback), { journeyId });
  await assert.rejects(flow.start(null), /already in progress/i);
  assert.equal(opens, 1);
  h.browser.resolve({ type: 'cancel' });
  await firstOpening;
  assert.equal(flow.isPending(), false);
  const secondOpening = flow.start(null);
  await settle();
  assert.equal(h.items.size, 1);
  assert.equal(flow.isPending(), true);
  secondBrowser.resolve({ type: 'cancel' });
  assert.equal(await secondOpening, null);
  assert.equal(h.items.size, 0);
  assert.equal(flow.isPending(), false);
});

test('QA malformed, foreign, ambiguous and token-bearing callbacks never exchange', async () => {
  const invalid = [
    'https://auth/callback?code=synthetic',
    'journeycreator://other/callback?code=synthetic',
    'journeycreator://auth/callback/extra?code=synthetic',
    'journeycreator://auth/ignored/../callback?code=synthetic',
    'journeycreator://auth/./callback?code=synthetic',
    'journeycreator://auth:123/callback?code=synthetic',
    'journeycreator://someone@auth/callback?code=synthetic',
    `${googleRedirect}?code=first&code=second`,
    `${googleRedirect}?code=`,
    `${googleRedirect}?code=two%20words`,
    `${googleRedirect}?code=${'x'.repeat(4097)}`,
    `${googleRedirect}?code=synthetic&access_token=synthetic-token`,
    `${googleRedirect}?code=synthetic&refresh_token=synthetic-token`,
    `${googleRedirect}?code=synthetic#error=synthetic`,
    `${googleRedirect}?code=synthetic&error=access_denied`,
    `${googleRedirect}?code=synthetic&error_code=provider_failure`,
    `${googleRedirect}?state=synthetic`,
  ];
  for (const raw of invalid) {
    const h = harness(), flow = h.create(), opening = flow.start(null);
    await settle();
    await assert.rejects(flow.complete(raw), error => /could not complete/i.test(error.message) && !error.message.includes('synthetic'));
    assert.equal(h.calls.some(call => call[0] === 'exchange'), false);
    h.browser.resolve({ type: 'cancel' });
    await opening;
  }
});
