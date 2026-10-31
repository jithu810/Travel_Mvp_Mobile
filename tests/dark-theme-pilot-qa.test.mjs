import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { loadPilotTheme } from './helpers/dark-pilot-harness.mjs';

function evaluate(source, modules = {}) {
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText)(id => { assert.ok(id in modules, id); return modules[id]; }, exports);
  return exports;
}
const { theme, lightTheme, primaryControl } = evaluate(readFileSync('src/theme/mobile-theme.ts', 'utf8'));
const colors = { paper: theme.background, ink: theme.text, muted: theme.muted, green: theme.accent, line: theme.border, white: theme.white, pale: theme.lavender };
function luminance(hex) {
  const [r, g, b] = hex.slice(1).match(/../g).map(c => {
    const s = parseInt(c, 16) / 255;
    return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
  });
  return .2126 * r + .7152 * g + .0722 * b;
}
function readable(foreground, background, label) {
  assert.match(foreground ?? '', /^#[0-9a-f]{6}$/i, label + ' has an explicit colour');
  const a = luminance(foreground), b = luminance(background);
  assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, label);
}
function declaredStyles(file) {
  const source = readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'lightStyles_s') expression = node.initializer.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(expression, 'actual stylesheet found');
  return new Function('StyleSheet', 'colors', 'primaryControl', 'darkPilotStyles', 'return ' + expression)(
    { create: x => x }, colors, primaryControl, loadPilotTheme().darkPilotStyles);
}

test('Home help modal keeps actual title, body, secondary action and note readable in app-wide dark mode', () => {
  const declared = declaredStyles('src/components/buddy/buddy-intro.tsx');
  const pilot = loadPilotTheme('/discover');
  const styles = pilot.darkPilotStyles(declared);
  for (const key of ['title', 'body', 'secondaryText', 'note']) readable(styles[key].color, styles.card.backgroundColor, 'dark help ' + key);
});

function shareTree(path) {
  const jsx = (type, props) => ({ type, props });
  const { JourneyShareSheet } = evaluate(readFileSync('src/components/journey/journey-share-sheet.tsx', 'utf8'), {
    '@/theme/mobile-theme': { theme, lightTheme }, '@/theme/dark-pilot': loadPilotTheme(path),
    react: { useRef: value => ({ current: value }), useState: value => [value, () => {}], useEffect() {} },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Image: 'Image', Text: 'Text', View: 'View', Platform: { OS: 'android' }, useWindowDimensions: () => ({ width: 360 }) },
    './story-sheet': { StorySheet: 'StorySheet' }, '../discovery/ui': { Action: 'Action' },
    '@/lib/social/share-image': { shareArtworkImage() {} }, '../../../assets/journey-creator-logo.png': 1,
  });
  return JourneyShareSheet({ artwork: { title: 'Test', location: 'Place', url: 'https://example.test/journey/test', photo: null }, onClose() {}, onShareLink() {}, message: 'Ready to share' });
}
test('Share modal surrounding instructions and feedback are readable while export canvas stays light', () => {
  for (const path of ['/journey/test', '/search']) {
    const tree = shareTree(path), children = tree.props.children.flat(Infinity).filter(Boolean);
    const canvas = children.find(node => node.type === 'View' && node.props.collapsable === false);
    assert.equal(canvas.props.style.backgroundColor, lightTheme.background, 'fixed light export palette preserved');
    const background = theme.background;
    for (const node of children.filter(node => node.type === 'Text')) {
      const style = Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
      readable(style.color, background, path + ' share copy: ' + node.props.children);
    }
  }
});
