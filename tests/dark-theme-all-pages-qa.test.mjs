import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { loadPilotTheme } from './helpers/dark-pilot-harness.mjs';

const tokens = {};
new Function('exports', ts.transpileModule(readFileSync('src/theme/mobile-theme.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(tokens);
const { theme } = tokens;
const adapter = loadPilotTheme();
const colors = { paper: theme.background, ink: theme.text, muted: theme.muted, green: theme.accent, line: theme.border, white: theme.white, pale: theme.lavender };

// Evaluate actual stylesheet initializers and their declared constant dependencies.
// Component/network hooks never execute; this tests computed colours, not source-string presence.
function styles(file, name) {
  const source = readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = new Map();
  for (const statement of ast.statements) if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name) && declaration.initializer) declarations.set(declaration.name.text, declaration.initializer);
  }
  const scope = { ...tokens, ...adapter, colors, Platform: { OS: 'android' }, StyleSheet: { create: x => x, flatten: x => x } };
  function resolve(name) {
    if (name in scope) return scope[name];
    assert.ok(declarations.has(name), file + ' declares ' + name);
    const expression = declarations.get(name);
    function dependencies(node) {
      if (ts.isIdentifier(node) && declarations.has(node.text) && node.text !== name && !(node.text in scope)) resolve(node.text);
      ts.forEachChild(node, dependencies);
    }
    dependencies(expression);
    const exports = {};
    const output = ts.transpileModule('exports.value = ' + expression.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    new Function('exports', ...Object.keys(scope), output)(exports, ...Object.values(scope));
    return scope[name] = exports.value;
  }
  return resolve(name);
}
function luminance(hex) {
  assert.match(hex ?? '', /^#[0-9a-f]{6}$/i);
  const [r, g, b] = hex.slice(1).match(/../g).map(value => {
    const c = parseInt(value, 16) / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  return .2126 * r + .7152 * g + .0722 * b;
}
function readable(foreground, background, label) {
  const a = luminance(foreground), b = luminance(background);
  const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  assert.ok(ratio >= 4.5, `${label}: ${foreground} on ${background} = ${ratio.toFixed(2)}:1`);
}
function copy(s, keys, background, label) {
  for (const key of keys) readable(s[key].color, background, label + ' ' + key);
}
function darkGradient(s, label) {
  const stops = s.experimental_backgroundImage?.match(/#[0-9a-f]{6}/gi) ?? [];
  assert.ok(stops.length > 0, label + ' gradient present');
  for (const stop of stops) assert.ok(luminance(stop) < .1, label + ' has no pale gradient stop ' + stop);
}

test('callback and legacy authentication surfaces retain readable dark presentation', () => {
  const callback = styles('src/app/auth/callback.tsx', 'styles');
  assert.equal(callback.page.backgroundColor, theme.background);
  readable(callback.text.color, callback.page.backgroundColor, 'OAuth callback');
  const legacy = styles('src/components/auth/legacy-ui.ts', 'ui');
  readable(legacy.heading.color, legacy.safe.backgroundColor, 'legacy auth heading');
  readable(legacy.actionLabel.color, legacy.action.backgroundColor, 'legacy auth inverse action');
});

test('memory editor and photo actions use readable text on dark panels, fields and shortcuts', () => {
  const memory = styles('src/components/create/memory-editor-sheet.tsx', 's');
  darkGradient(memory.panel, 'memory sheet');
  copy(memory, ['title', 'subtitle', 'label', 'note', 'link'], memory.panel.backgroundColor, 'memory');
  readable(memory.input.color, memory.input.backgroundColor, 'memory input');
  readable(memory.modeLabel.color, memory.modeButton.backgroundColor, 'memory shortcut');
  readable(memory.counter.color, memory.details.backgroundColor, 'memory detail counter');
  const photo = styles('src/components/create/photo-field.tsx', 's');
  readable(photo.memoryText.color, photo.memoryButton.backgroundColor, 'photo action');
  readable(photo.memoryIcon.color, photo.memoryButton.backgroundColor, 'photo action glyph');
});

test('Create settings and empty-state backgrounds have no remaining pale gradient behind light copy', () => {
  const create = styles('src/app/create.tsx', 'createStyles');
  darkGradient(create.settingsPanel, 'Create settings');
  darkGradient(create.emptyMemories, 'empty memories');
  readable(create.settingsTitle.color, create.settingsPanel.backgroundColor, 'settings title');
  readable(create.emptyTitle.color, create.emptyMemories.backgroundColor, 'empty memory title');
  readable(create.emptyBody.color, create.emptyMemories.backgroundColor, 'empty memory copy');
});

test('Account selected tabs, itinerary selection and profile errors preserve inverse/status contrast', () => {
  const account = styles('src/components/profile/profile-styles.ts', 'profileUIStyles');
  readable(account.activeTabText.color, account.activeTab.backgroundColor, 'selected Account tab');
  const itinerary = styles('src/components/journey/map-itinerary.tsx', 'lightStyles_styles');
  readable(itinerary.selectedText.color, itinerary.selectedNumber.backgroundColor, 'selected stop badge');
  const profile = styles('src/app/profile/edit.tsx', 's');
  readable(profile.error.color, theme.background, 'profile error');
});

test('every rendered traveler chip stays readable when selected or unselected, including inline accents', () => {
  const exports = {}, jsx = (type, props) => ({ type, props });
  const modules = {
    '@/theme/mobile-theme': tokens, '@/theme/dark-pilot': adapter,
    '@/hooks/use-buddy-geometry': { useBuddyProtectedBounds: () => ({}), useBuddyScroll: () => ({}) },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ScrollView: 'ScrollView', Pressable: 'Pressable', Text: 'Text', TextInput: 'TextInput', View: 'View', StyleSheet: { create: x => x } },
    '../discovery/ui': { Action: 'Action', colors }, './place-picker': { PlacePicker: 'PlacePicker', formStyles: { input: {} } },
  };
  const output = ts.transpileModule(readFileSync('src/components/create/quick-journey-setup.tsx', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', output)(id => { assert.ok(id in modules, id); return modules[id]; }, exports);
  const flatten = value => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
  function nodes(tree) {
    if (!tree || typeof tree !== 'object') return [];
    return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
  }
  for (const traveler of ['solo', 'couple', 'friends', 'family']) {
    const tree = exports.QuickJourneySetup({ form: { traveler, title: '', days: '1', description: '', destination: null }, disabled: false, onTitle() {}, onDestination() {}, onChange() {}, onStart() {} });
    const chips = nodes(tree).filter(node => node.type === 'Pressable' && node.props.accessibilityState && 'selected' in node.props.accessibilityState);
    assert.equal(chips.length, 4);
    for (const chip of chips) for (const text of nodes(chip).filter(node => node.type === 'Text')) {
      readable(flatten(text.props.style).color, flatten(chip.props.style).backgroundColor, traveler + ' chip ' + text.props.children);
    }
  }
});

test('scenic email action and branded Google button retain readable intentional colours', () => {
  const signup = styles('src/components/auth/signup-styles.ts', 'signupStyles');
  for (const stop of signup.emailButton.experimental_backgroundImage.match(/#[0-9a-f]{6}/gi)) readable(signup.emailLabel.color, stop, 'email CTA');
  readable(signup.googleLabel.color, signup.googleButton.backgroundColor, 'Google branded label');
  readable(signup.googleHint.color, signup.googleButton.backgroundColor, 'Google branded hint');
});

test('Customize included/skipped/warning copy and Travel confirmations are readable', () => {
  const customize = styles('src/components/journey/customize-stops.tsx', 'styles');
  readable(customize.status.color, customize.reviewStop.backgroundColor, 'included stop');
  readable(customize.skippedStatus.color, customize.skippedStop.backgroundColor, 'skipped stop');
  readable(customize.notice.color, customize.notice.backgroundColor, 'Customize warning');
  const arrival = styles('src/components/journey/arrival-prompt.tsx', 'styles');
  copy(arrival, ['title', 'note'], arrival.panel.backgroundColor, 'arrival');
  readable(arrival.dismissText.color, arrival.dismiss.backgroundColor, 'arrival dismiss');
  const confirm = styles('src/components/journey/trip-confirmation.tsx', 'styles');
  copy(confirm, ['title', 'body', 'cancelText'], confirm.panel.backgroundColor, 'trip confirmation');
});
