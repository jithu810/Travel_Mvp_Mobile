import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const jsx = (type, props) => ({ type, props });
const settle = () => new Promise(resolve => setImmediate(resolve));
function harness({ url = 'journeycreator://auth/callback?code=synthetic', result = { journeyId: null }, error = null } = {}) {
  const effects = [], calls = [], navigation = [], state = []; let index = 0, cleanup;
  const router = { dismissTo: value => navigation.push(value) };
  const modules = {
    'expo-linking': { useLinkingURL: () => url },
    'expo-router': { useRouter: () => router },
    react: { useEffect: effect => effects.push(effect), useState: initial => { const slot = index++; if (!(slot in state)) state[slot] = initial; return [state[slot], value => { state[slot] = value; }]; } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: value => value } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/lib/auth/google': { async completeGoogleSignIn(raw) { calls.push(raw); if (error) throw error; return result; } },
  };
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync('src/app/auth/callback.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', output)(name => { assert.ok(name in modules); return modules[name]; }, module, module.exports);
  return { calls, navigation, render() { index = 0; effects.length = 0; const tree = module.exports.default(); if (!cleanup) cleanup = effects[0](); return tree; }, unmount() { cleanup?.(); } };
}
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)]; }
const text = tree => typeof tree === 'string' ? tree : !tree || typeof tree !== 'object' ? '' : [tree.props?.children].flat(Infinity).map(text).join('');
test('callback route delegates the exact received URL and returns to account or the trusted coordinator journey', async () => {
  for (const journeyId of [null, '11111111-1111-4111-8111-111111111111']) {
    const h = harness({ result: { journeyId } }); h.render(); await settle();
    assert.deepEqual(h.calls, ['journeycreator://auth/callback?code=synthetic']);
    assert.deepEqual(h.navigation, [journeyId ? { pathname: '/journey/[id]', params: { id: journeyId } } : '/account']);
  }
});
test('callback route restores the trusted Create destination without taking a return path from the URL', async () => {
  const h = harness({ url: 'journeycreator://auth/callback?code=synthetic&returnTo=https://untrusted.example', result: { journeyId: null, returnTo: 'create' } });
  h.render(); await settle(); assert.deepEqual(h.navigation, ['/create']);
  const journeyId = '11111111-1111-4111-8111-111111111111';
  const journey = harness({ result: { journeyId, returnTo: 'create' } });
  journey.render(); await settle(); assert.deepEqual(journey.navigation, [{ pathname: '/journey/[id]', params: { id: journeyId } }]);
});
test('missing and rejected callbacks expose a safe retry without tokens or provider details', async () => {
  for (const options of [{ url: null }, { error: new Error('private provider response') }]) {
    const h = harness(options); h.render(); await settle(); const tree = h.render();
    assert.match(text(tree), /could not complete Google sign-in/);
    assert.doesNotMatch(text(tree), /synthetic|private provider/);
    assert.deepEqual(h.navigation, []);
    nodes(tree).find(node => node.type === 'Pressable').props.onPress();
    assert.deepEqual(h.navigation, ['/auth']);
    if (options.url === null) assert.deepEqual(h.calls, []);
  }
});
test('callback completion after the route unmounts cannot navigate', async () => {
  let resolve; const result = new Promise(done => { resolve = done; });
  const h = harness({ result }); h.render(); h.unmount(); resolve({ journeyId: null }); await settle();
  assert.deepEqual(h.navigation, []);
});
