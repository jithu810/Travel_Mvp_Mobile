import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
function load(path, modules = {}) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(name => modules[name] ?? {}, module, module.exports);
  return module.exports;
}
const { buddyContextLine, claimBuddyContext, BUDDY_CONTEXT_DELAY, BUDDY_CONTEXT_DURATION } = load('src/lib/buddy/contextual-lines.ts');
test('context lines are route-specific and omit navigation/live-position claims and unsupported screens', () => {
  for (const path of ['/discover', '/search', '/create', '/account']) {
    const line = buddyContextLine(path); assert.ok(line.text.length > 20); assert.match(line.animation, /^(wave|curious)$/); assert.doesNotMatch(line.text, /GPS|tracking|your location|turn left|arrived/i);
  }
  assert.equal(buddyContextLine('/'), buddyContextLine('/discover')); assert.equal(buddyContextLine('/index'), buddyContextLine('/discover'));
  for (const path of ['/travel/id', '/journey/id', '/customized/id', '/auth', '/profile/edit']) assert.equal(buddyContextLine(path), undefined);
  assert.equal(BUDDY_CONTEXT_DELAY, 8000); assert.equal(BUDDY_CONTEXT_DURATION, 5000);
});
test('context uses existing cooldown, marks only accepted lines and stays once per route for the store session', () => {
  const attempts = []; let allowed = false;
  const store = { reactOnce(key) { attempts.push(key); return allowed; } };
  assert.equal(claimBuddyContext(store, '/account'), false); allowed = true; assert.equal(claimBuddyContext(store, '/account'), true);
  assert.equal(claimBuddyContext(store, '/account'), false); assert.deepEqual(attempts, ['context:/account', 'context:/account']);
  assert.equal(claimBuddyContext(store, '/'), true); assert.equal(claimBuddyContext(store, '/index'), false); assert.equal(claimBuddyContext(store, '/discover'), false);
  assert.equal(claimBuddyContext(store, '/travel/id'), false); assert.equal(claimBuddyContext({ reactOnce: () => true }, '/account'), true, 'New app store gets a fresh session');
});
test('manual contextual copy preserves actions and yields to tour, explicit reactions and Travel messaging', () => {
  const jsx = (type, props) => ({ type, props });
  const { BuddyHelpSheet } = load('src/components/buddy/buddy-help-sheet.tsx', { react: { useEffect() {} }, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: value => value } }, '@/lib/buddy/model': { buddyTravelCopy: () => 'Travel state wins' } });
  const text = node => !node ? '' : typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children);
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  const props = { contextualLine: buddyContextLine('/account').text, placement: { x: 0, y: 0, above: false, tailX: 32 }, canAddMemory: false, onClose() {}, onAddMemory() {}, onCreate() {}, onDrafts() {} };
  let tree = BuddyHelpSheet(props); assert.match(text(tree), /stories, all together/); assert.ok(all(tree).some(node => node.props?.label === 'Open my drafts')); assert.ok(all(tree).some(node => node.props?.label === 'Show me around'));
  tree = BuddyHelpSheet({ ...props, tour: 0 }); assert.doesNotMatch(text(tree), /stories, all together/); assert.match(text(tree), /Find a journey/);
  tree = BuddyHelpSheet({ ...props, travel: { status: 'active' } }); assert.match(text(tree), /Travel state wins/); assert.doesNotMatch(text(tree), /stories, all together/);
  tree = BuddyHelpSheet({ ...props, reaction: 'Hello once' }); assert.match(text(tree), /Hello once/); assert.equal(all(tree).some(node => node.props?.label === 'Open my drafts'), false);
});
