import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
function load(path, dependencies = {}) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(name => { assert.ok(name in dependencies, name); return dependencies[name]; }, module, module.exports);
  return module.exports;
}
const guidanceModel = load('src/lib/journey/turn-guidance.ts');
const element = (type, props) => ({ type, props });
const { ManeuverPanel } = load('src/components/journey/maneuver-panel.tsx', {
  'react/jsx-runtime': { jsx: element, jsxs: element },
  'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: value => value } },
  '@/theme/mobile-theme': { theme: { navigation: '#000' } },
  '@/components/discovery/ui': { colors: { white: '#fff' } },
  '@/lib/journey/turn-guidance': guidanceModel,
});
const text = node => node == null || node === false ? '' : Array.isArray(node) ? node.map(text).join(' ')
  : typeof node === 'object' ? text(node.props.children) : String(node);
test('confirmation hides stale instruction and distance visually and in accessibility while preserving the icon', () => {
  const guidance = { status: 'ready', maneuver: { type: 'turn', modifier: 'right', instruction: 'Turn right onto South Road' },
    distanceToManeuver: 30, remainingDistance: 230 };
  const approach = ManeuverPanel({ guidance, message: '' });
  assert.match(text(approach), /~30 m\s+to maneuver.*Turn right/);
  const pending = ManeuverPanel({ guidance: { ...guidance, confirmingTurn: true }, message: '' });
  assert.ok(text(pending).includes(guidanceModel.maneuverIcon(guidance.maneuver)));
  assert.match(text(pending), /Confirming turn/);
  assert.doesNotMatch(text(pending), /~30 m|to maneuver|Turn right onto/);
  assert.match(pending.props.accessibilityLabel, /Confirming turn/);
  assert.doesNotMatch(pending.props.accessibilityLabel, /~30 m|Turn right onto/);
  const confirmed = ManeuverPanel({ guidance: { ...guidance, confirmingTurn: false, distanceToManeuver: 81,
    maneuver: { type: 'turn', modifier: 'left', instruction: 'Turn left onto East Road' } }, message: '' });
  assert.match(text(confirmed), /~80 m\s+to maneuver.*Turn left onto East Road/);
  assert.doesNotMatch(confirmed.props.accessibilityLabel, /Confirming turn|~30 m/);
});
