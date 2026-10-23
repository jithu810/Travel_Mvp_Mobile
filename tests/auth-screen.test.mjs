import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
// Execute the actual dependency-free shared theme in the component harness.
const mobileTheme = {};
new Function('exports', ts.transpileModule(readFileSync('src/theme/mobile-theme.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mobileTheme);


const jsx = (type, props) => ({ type, props });
const compile = path => ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
function load(path, modules) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compile(path))(name => { if (name === '@/theme/mobile-theme') return mobileTheme; if (name === '@/components/auth/legacy-ui') return load('src/components/auth/legacy-ui.ts', { 'react-native': native });
    if (name.endsWith('.png')) return name;
    assert.ok(name in modules, `Unexpected dependency ${name}`);
    return modules[name];
  }, module, module.exports);
  return module.exports;
}
const authModel = load('src/lib/auth/model.ts', {});
const native = { StyleSheet: { create: x => x, absoluteFillObject: {} }, Platform: { OS: 'android' }, useWindowDimensions: () => ({ height: 640, width: 320, fontScale: 1.5 }) };
for (const name of ['ActivityIndicator', 'Image', 'KeyboardAvoidingView', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View']) native[name] = name;
const { signupStyles } = load('src/components/auth/signup-styles.ts', { 'react-native': native });
function harness({ result = 'confirmation', canGoBack = true, pending = null, height = 640, width = 360, fontScale = 1, keyboard = false, platform = 'android', failure = null, context = undefined } = {}) {
  const slots = []; let index = 0; const calls = [], navigation = [], effects = []; let keyboardVisible = keyboard;
  const keyboardScrolls = [], resets = [];
  const scrollMock = { scrollResponderScrollNativeHandleToKeyboard: (...args) => keyboardScrolls.push(args), scrollTo: args => resets.push(args) };
  const hooks = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = value; }]; },
    useRef(value) { const i = index++; return slots[i] ??= { current: value }; },
    useMemo(factory) { const i = index++; return slots[i] ??= factory(); },
    useCallback(fn) { index++; return fn; },
    useEffect(fn) { index++; effects.push(fn); },
  };
  const screen = load('src/app/auth.tsx', {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { ...native, Platform: { OS: platform }, useWindowDimensions: () => ({ height, width, fontScale }), Keyboard: { isVisible: () => keyboardVisible } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-router': { useRouter: () => ({ canGoBack: () => canGoBack, back: () => navigation.push('back'), replace: route => navigation.push(route) }), useLocalSearchParams: () => ({ context }), useFocusEffect: fn => fn() },
    '@/components/discovery/ui': { colors: { ink: '#153E35', white: '#FFFFFF' }, ScreenHeader: 'ScreenHeader', ui: {} },
    '@/components/auth/signup-styles': { signupStyles },
    '@/hooks/session-context': { useSessionState: () => ({ loading: false, session: null }) },
    '@/hooks/action-intent': { useActionIntent: () => ({ pending, cancel() {} }) },
    '@/lib/auth/model': authModel,
    '@/lib/auth/queries': { authenticate: async (mode, values) => { calls.push({ mode, values }); if (failure) throw failure; return result; } },
  }).default;
  return { calls, navigation, keyboardScrolls, resets, setKeyboard(value) { keyboardVisible = value; }, render() {
    index = 0; effects.length = 0; const tree = screen();
    const scroll = nodes(tree).find(n => n.type === 'ScrollView');
    scroll.props.ref.current = scrollMock;
    effects.splice(0).forEach(fn => fn());
    return tree;
  } };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
const text = tree => typeof tree === 'string' ? tree : !tree || typeof tree !== 'object' ? '' : [tree.props?.children].flat(Infinity).map(text).join('');
const button = (tree, label) => nodes(tree).find(n => n.type === 'Pressable' && (n.props.accessibilityLabel === label || text(n) === label));
const field = (tree, label) => nodes(tree).find(n => n.type === 'TextInput' && n.props.accessibilityLabel === label);
function register(h) { button(h.render(), 'New here? Create an account').props.onPress(); return h.render(); }
function fill(h, password = 'password123') {
  const tree = h.render();
  field(tree, 'Display name').props.onChangeText(' Traveler ');
  field(tree, 'Email address').props.onChangeText(' traveler@example.org ');
  field(tree, 'Password').props.onChangeText(password);
  return h.render();
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('Google is registration-only, disabled and has no authentication handler', () => {
  const h = harness();
  assert.equal(button(h.render(), 'Continue with Google'), undefined);
  const tree = register(h), google = button(tree, 'Continue with Google');
  assert.equal(google.props.disabled, true);
  assert.deepEqual(google.props.accessibilityState, { disabled: true });
  assert.equal(google.props.onPress, undefined);
  assert.match(google.props.accessibilityHint, /not available yet/);
  assert.equal(h.calls.length, 0);
  assert.ok(nodes(tree).some(n => n.type === 'Image' && n.props.source.endsWith('google-g.png')));
  assert.equal(nodes(tree).find(n => n.type === 'ScrollView').props.keyboardShouldPersistTaps, 'handled');
});

test('registration preserves validation, payload and confirmation-required sign-in navigation', async () => {
  const h = harness(); register(h);
  button(fill(h, 'short'), 'Register with email').props.onPress(); await settle();
  assert.equal(h.calls.length, 0);
  assert.match(text(h.render()), /at least 8/);
  button(fill(h), 'Register with email').props.onPress(); await settle();
  assert.deepEqual(h.calls, [{ mode: 'register', values: { email: 'traveler@example.org', password: 'password123', name: 'Traveler' } }]);
  const tree = h.render();
  assert.match(text(tree), /You are not signed in yet/);
  assert.equal(button(tree, 'Continue with Google'), undefined);
  assert.equal(field(tree, 'Password').props.value, '');
  assert.deepEqual(h.navigation, []);
});

test('successful registration preserves back, pending journey and account destinations', async () => {
  for (const [canGoBack, pending, expected] of [[true, null, 'back'], [false, { journeyId: 'journey-123' }, { pathname: '/journey/[id]', params: { id: 'journey-123' } }], [false, null, '/account']]) {
    const h = harness({ result: 'signed-in', canGoBack, pending }); register(h);
    button(fill(h), 'Register with email').props.onPress(); await settle();
    assert.deepEqual(h.navigation, [expected]);
  }
});

test('switching back to sign-in clears the password and retains the shared header', () => {
  const h = harness(); register(h); fill(h);
  button(h.render(), 'Already registered? Sign in').props.onPress();
  const tree = h.render();
  assert.equal(field(tree, 'Password').props.value, '');
  assert.equal(field(tree, 'Display name'), undefined);
  assert.ok(nodes(tree).some(n => n.type === 'Text' && text(n) === 'Sign in'));
  assert.ok(button(tree, 'Go back'));
  assert.match(text(tree), /Welcome back/);
  assert.equal(button(tree, 'Continue with Google'), undefined);
});

test('registration back button preserves discover fallback', () => {
  const h = harness({ canGoBack: false });
  button(register(h), 'Go back').props.onPress();
  assert.deepEqual(h.navigation, ['/discover']);
});

test('scrolling follows measured content and the safe-area viewport, including resize and error content', () => {
  for (const mode of ['signin', 'register']) for (const height of [640, 720, 800, 915]) {
    const h = harness({ height });
    let tree = mode === 'register' ? register(h) : h.render();
    let scroll = nodes(tree).find(n => n.type === 'ScrollView');
    const available = height - 24 - 24 - 52;
    scroll.props.onLayout({ nativeEvent: { layout: { height: available } } });
    scroll.props.onContentSizeChange(360, available);
    tree = h.render(); scroll = nodes(tree).find(n => n.type === 'ScrollView');
    assert.equal(scroll.props.scrollEnabled, false);
    assert.equal(scroll.props.bounces, false);
    assert.equal(scroll.props.overScrollMode, 'never');
    scroll.props.onContentSizeChange(360, available + 60);
    assert.equal(nodes(h.render()).find(n => n.type === 'ScrollView').props.scrollEnabled, true, 'errors/large text must stay reachable');
    scroll.props.onContentSizeChange(360, available);
    assert.equal(nodes(h.render()).find(n => n.type === 'ScrollView').props.scrollEnabled, false);
    assert.deepEqual(h.resets.at(-1), { y: 0, animated: false });
  }
});

test('keyboard resize reveals the focused input with room for the primary action', () => {
  for (const mode of ['signin', 'register']) for (const platform of ['android', 'ios']) {
    const h = harness({ platform });
    let tree = mode === 'register' ? register(h) : h.render();
    const keyboardView = nodes(tree).find(n => n.type === 'KeyboardAvoidingView');
    assert.equal(keyboardView.props.behavior, platform === 'ios' ? 'padding' : 'height');
    assert.equal(keyboardView.props.keyboardVerticalOffset, 24);
    field(tree, 'Password').props.onFocus({ nativeEvent: { target: 42 } });
    assert.equal(h.keyboardScrolls.length, 0);
    h.setKeyboard(true);
    const scroll = nodes(tree).find(n => n.type === 'ScrollView');
    scroll.props.onLayout({ nativeEvent: { layout: { height: 260 } } });
    scroll.props.onContentSizeChange(360, 539);
    tree = h.render();
    assert.equal(nodes(tree).find(n => n.type === 'ScrollView').props.scrollEnabled, true);
    assert.deepEqual(h.keyboardScrolls.at(-1), [42, 72, true]);
    assert.equal(button(tree, mode === 'register' ? 'Register with email' : 'Sign in with email').props.disabled, false);
    if (mode === 'register') assert.equal(button(tree, 'Continue with Google').props.disabled, true);
    else assert.equal(button(tree, 'Continue with Google'), undefined);
    field(tree, 'Password').props.onBlur();
    const count = h.keyboardScrolls.length; h.render();
    assert.equal(h.keyboardScrolls.length, count);
  }
});

test('sign-in preserves validation, password whitespace and all successful return destinations', async () => {
  for (const [canGoBack, pending, expected] of [[true, null, 'back'], [false, { journeyId: 'journey-123' }, { pathname: '/journey/[id]', params: { id: 'journey-123' } }], [false, null, '/account']]) {
    const h = harness({ result: 'signed-in', canGoBack, pending });
    button(h.render(), 'Sign in with email').props.onPress(); await settle();
    assert.equal(h.calls.length, 0);
    assert.match(text(h.render()), /Enter your email and password/);
    let tree = h.render();
    field(tree, 'Email address').props.onChangeText(' traveler@example.org ');
    field(tree, 'Password').props.onChangeText(' password with spaces ');
    tree = h.render();
    field(tree, 'Password').props.onSubmitEditing(); await settle();
    assert.deepEqual(h.calls, [{ mode: 'signin', values: { email: 'traveler@example.org', password: ' password with spaces ', name: '' } }]);
    assert.deepEqual(h.navigation, [expected]);
    assert.equal(field(h.render(), 'Password').props.value, '');
  }
});

test('sign-in error remains readable and never navigates or reports success', async () => {
  const h = harness({ failure: { code: 'invalid_credentials' } });
  let tree = h.render();
  field(tree, 'Email address').props.onChangeText('traveler@example.org');
  field(tree, 'Password').props.onChangeText('bad-password');
  tree = h.render(); button(tree, 'Sign in with email').props.onPress(); await settle();
  tree = h.render();
  assert.match(text(nodes(tree).find(n => n.props.accessibilityRole === 'alert')), /incorrect/);
  assert.deepEqual(h.navigation, []);
  assert.equal(button(tree, 'Sign in with email').props.disabled, false);
  assert.equal(button(tree, 'Continue with Google'), undefined);
});

test('sign-in keeps context copy, scenic assets and the bidirectional mode links', () => {
  for (const [options, copy] of [[{}, 'Keep journeys for later'], [{ context: 'create' }, 'Sign in to create your journey'], [{ pending: { journeyId: 'journey-123' } }, 'Sign in to continue with your selected journey']]) {
    const h = harness(options); let tree = h.render();
    assert.match(text(tree), new RegExp(copy));
    assert.ok(nodes(tree).some(n => n.type === 'Image' && n.props.source.endsWith('sunset-road.png')));
    assert.equal(field(tree, 'Display name'), undefined);
    assert.equal(field(tree, 'Password').props.autoComplete, 'current-password');
    button(tree, 'New here? Create an account').props.onPress(); tree = h.render();
    assert.ok(field(tree, 'Display name'));
    assert.equal(field(tree, 'Password').props.autoComplete, 'new-password');
    assert.equal(button(tree, 'Continue with Google').props.disabled, true);
    button(tree, 'Already registered? Sign in').props.onPress();
    assert.match(text(h.render()), /Welcome back/);
  }
});
