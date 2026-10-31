import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const jsx = (type, props) => ({ type, props });
const all = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(all)];
function load(file, modules = {}) {
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(name => { assert.ok(name in modules, name); return modules[name]; }, exports);
  return exports;
}
const native = Object.fromEntries(['Modal','ScrollView','Pressable','Text','View'].map(x => [x,x]));
native.StyleSheet = { create: x => x };
function chooser() {
  let visible = true;
  const calls = [];
  const { BuddyIntro } = load('src/components/buddy/buddy-intro.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/theme/mobile-theme': { primaryControl: {} },
    '@/components/discovery/ui': { colors: {} }, './buddy-sprite': { BuddySprite: 'BuddySprite' },
    '@/hooks/session-context': { useSessionState: () => ({ loading: false }) },
    '@/hooks/use-journey-buddy': { useBuddyIntro: () => ({ visible, guide: tour => calls.push(['guide',tour]), skip: () => calls.push(['skip']) }) },
  });
  return { calls, stored: () => { visible = false; }, render: props => BuddyIntro({ ready: true, ...props }) };
}
test('U8 Guide me opens a choice before enabling Buddy; outcome enables without a forced tour', () => {
  const h = chooser(); const selected = [];
  let tree = h.render({ onGuide: () => selected.push('choose') });
  all(tree).find(x => x.props?.accessibilityLabel === 'Guide me').props.onPress();
  assert.deepEqual(selected, ['choose']); assert.deepEqual(h.calls, []);
  tree = h.render({ choosing: true, onChoose: goal => selected.push(goal) });
  all(tree).find(x => x.props?.accessibilityLabel === 'Find a journey').props.onPress();
  assert.deepEqual(h.calls, [['guide',false]]); assert.equal(selected.at(-1), 'find');
  assert.ok(all(tree).some(x => x.type === 'ScrollView'), 'Choices scroll at large text');
});
test('U8 replay and Android Back retain stored Buddy preference; memory choice uses existing Create route', () => {
  const h = chooser(); h.stored(); let selected, closed = 0;
  let tree = h.render({ choosing: true, onChoose: goal => { selected = goal; }, onClose: () => closed++ });
  all(tree).find(x => x.props?.accessibilityLabel === 'Keep a memory').props.onPress();
  tree.props.onRequestClose();
  assert.equal(selected, 'memory'); assert.equal(closed, 1); assert.deepEqual(h.calls, []);
  const { firstOutcomeRoute } = load('src/lib/first-outcome.ts');
  assert.deepEqual(firstOutcomeRoute('memory'), { pathname: '/create', params: { guide: 'memory' } });
  assert.deepEqual(firstOutcomeRoute('find'), { pathname: '/search', params: { guide: 'find' } });
});
test('U8 contextual guidance dismisses without navigation, persistence or permission actions', () => {
  let dismissed = false;
  const { FirstOutcomeHint } = load('src/components/first-outcome-hint.tsx', {
    react: { useState: () => [dismissed, value => { dismissed = value; }] },
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native,
    '@/hooks/use-buddy-geometry': { useBuddyProtectedBounds: () => ({}) }, '@/components/discovery/ui': { colors: {} },
  });
  const render = (visible = true) => FirstOutcomeHint({ title: 'Next step', children: 'Choose a destination.', visible });
  assert.equal(render(false), null, 'Saved can hide guidance without removing its component state');
  const close = all(render()).find(x => x.props?.accessibilityLabel === 'Dismiss guidance');
  assert.equal(close.props.children.props.children, 'Close', 'Readable native close control');
  close.props.onPress();
  assert.equal(render(false), null);
  assert.equal(render(true), null, 'Returning to All retains dismissal');
});
