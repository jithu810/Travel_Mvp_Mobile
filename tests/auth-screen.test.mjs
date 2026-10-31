import { buddyGeometryStub } from './helpers/buddy-geometry-stub.mjs';
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
  modules={'@/hooks/use-buddy-geometry':buddyGeometryStub,...modules};
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
function harness({ result = 'confirmation', canGoBack = true, pending = null, height = 640, width = 360, fontScale = 1, keyboard = false, platform = 'android', failure = null, context = undefined, emailExists = false, emailFailure = null, googleResult = { journeyId: null }, googleFailure = null, googleSupported = true } = {}) {
  const slots = []; let index = 0; const calls = [], navigation = [], effects = []; let keyboardVisible = keyboard;
  const keyboardScrolls = [], resets = [], emailChecks = [], googleCalls = [], googleContexts = [], cancellations = []; let cleanup, focused = false, googlePending = false;
  const scrollMock = { scrollResponderScrollNativeHandleToKeyboard: (...args) => keyboardScrolls.push(args), scrollTo: args => resets.push(args) };
  const hooks = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = value; }]; },
    useRef(value) { const i = index++; return slots[i] ??= { current: value }; },
    useMemo(factory) { const i = index++; return slots[i] ??= factory(); },
    useCallback(fn) { index++; return fn; },
    useEffect(fn) { index++; effects.push(fn); },
  };
  const screen = load('src/app/auth.tsx', {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { ...native, Platform: { OS: platform }, useWindowDimensions: () => ({ height, width, fontScale }), Keyboard: { isVisible: () => keyboardVisible, dismiss() { keyboardVisible = false; } } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-router': { useRouter: () => ({ canGoBack: () => canGoBack, back: () => navigation.push('back'), replace: route => navigation.push(route) }), useLocalSearchParams: () => ({ context }), useFocusEffect: fn => { if (!focused) { focused = true; cleanup = fn(); } } },
    '@/components/discovery/ui': { colors: { ink: '#153E35', white: '#FFFFFF' }, ScreenHeader: 'ScreenHeader', ui: {} },
    '@/components/auth/signup-styles': { signupStyles },
    '@/hooks/session-context': { useSessionState: () => ({ loading: false, session: null }) },
    '@/hooks/action-intent': { useActionIntent: () => ({ pending, cancel() { cancellations.push(true); } }) },
    '@/lib/auth/model': authModel,
    '@/lib/auth/google': { googleSignInSupported: googleSupported, isGoogleSignInPending: () => googlePending, signInWithGoogle: async (journeyId, returnTo) => { googleCalls.push(journeyId); googleContexts.push(returnTo); googlePending = true; try { if (googleFailure) throw googleFailure; return await googleResult; } finally { googlePending = false; } } },
    '@/lib/auth/queries': { checkRegistrationEmail: async email => { emailChecks.push(email); if (emailFailure) throw emailFailure; return emailExists; }, authenticate: async (mode, values) => { calls.push({ mode, values }); if (failure) throw failure; return result; } },
  }).default;
  return { calls, emailChecks, googleCalls, googleContexts, cancellations, navigation, keyboardScrolls, resets, blur() { cleanup?.(); }, refocus() { focused = false; }, setKeyboard(value) { keyboardVisible = value; }, render() {
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
async function details(h, email = ' traveler@example.org ') {
  const tree = h.render();
  if (field(tree, 'Email address')) {
    field(tree, 'Email address').props.onChangeText(email);
    await button(h.render(), 'Continue').props.onPress();
  }
  return h.render();
}
async function fill(h, password = 'password123') {
  const tree = await details(h);
  field(tree, 'Display name').props.onChangeText(' Traveler ');
  field(tree, 'Password').props.onChangeText(password);
  return h.render();
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('Google is available in both auth modes without email validation or registration lookup', async () => {
  for (const registration of [false, true]) {
    const h = harness();
    const tree = registration ? register(h) : h.render();
    const google = button(tree, 'Continue with Google');
    assert.equal(google.props.disabled, false);
    assert.match(google.props.accessibilityHint, /browser/);
    google.props.onPress(); await settle();
    assert.deepEqual(h.googleCalls, [null]);
    assert.deepEqual(h.emailChecks, []); assert.deepEqual(h.calls, []);
    assert.deepEqual(h.navigation, ['back']);
    assert.ok(nodes(tree).some(n => n.type === 'Image' && n.props.source.endsWith('google-g.png')));
  }
});

test('Google locks both methods, preserves pending journey on browser blur, and ignores stale navigation', async () => {
  let resolve;
  const googleResult = new Promise(done => { resolve = done; });
  const journeyId = '11111111-1111-4111-8111-111111111111';
  const h = harness({ googleResult, pending: { journeyId }, canGoBack: false });
  const initial = h.render();
  const emailButton = button(initial, 'Sign in with email');
  const staleButton = button(initial, 'Continue with Google');
  staleButton.props.onPress(); staleButton.props.onPress();
  emailButton.props.onPress();
  assert.deepEqual(h.googleCalls, [journeyId]); assert.deepEqual(h.calls, []);
  assert.equal(button(h.render(), 'Continue with Google').props.disabled, true);
  h.blur(); assert.deepEqual(h.cancellations, []);
  resolve({ journeyId }); await settle();
  assert.deepEqual(h.navigation, []);
});

test('Google from Create passes a trusted Create return for either mode and restores the warm route', async () => {
  for (const registration of [false, true]) {
    for (const canGoBack of [false, true]) {
      const h = harness({ context: 'create', canGoBack, googleResult: { journeyId: null, returnTo: 'create' } });
      const tree = registration ? register(h) : h.render();
      button(tree, 'Continue with Google').props.onPress(); await settle();
      assert.deepEqual(h.googleCalls, [null]); assert.deepEqual(h.googleContexts, ['create']);
      assert.deepEqual(h.navigation, [canGoBack ? 'back' : '/create']);
      assert.deepEqual(h.emailChecks, []); assert.deepEqual(h.calls, []);
    }
  }
});

test('Google cancellation and errors keep email sign-in usable, and web explains native availability', async () => {
  const cancelled = harness({ googleResult: null });
  button(cancelled.render(), 'Continue with Google').props.onPress(); await settle();
  assert.deepEqual(cancelled.navigation, []);
  assert.equal(button(cancelled.render(), 'Sign in with email').props.disabled, false);
  const failed = harness({ googleFailure: new Error('private provider details') });
  button(failed.render(), 'Continue with Google').props.onPress(); await settle();
  assert.match(text(failed.render()), /could not complete Google/);
  assert.doesNotMatch(text(failed.render()), /private provider/);
  const web = harness({ googleSupported: false, platform: 'web' });
  assert.equal(button(web.render(), 'Continue with Google').props.disabled, true);
  assert.match(text(web.render()), /Available in the mobile app/);
  assert.equal(button(web.render(), 'Sign in with email').props.disabled, false);
});

test('registration preserves validation, payload and confirmation-required sign-in navigation', async () => {
  const h = harness(); register(h);
  button(await fill(h, 'short'), 'Register with email').props.onPress(); await settle();
  assert.equal(h.calls.length, 0);
  assert.match(text(h.render()), /at least 8/);
  button(await fill(h), 'Register with email').props.onPress(); await settle();
  assert.deepEqual(h.calls, [{ mode: 'register', values: { email: 'traveler@example.org', password: 'password123', name: 'Traveler' } }]);
  const tree = h.render();
  assert.match(text(tree), /You are not signed in yet/);
  assert.match(text(tree), /If this is a new email/);
  assert.match(text(tree), /Already registered\? Sign in with your existing password/);
  assert.equal(button(tree, 'Continue with Google').props.disabled, false);
  assert.equal(field(tree, 'Password').props.value, '');
  assert.deepEqual(h.navigation, []);
});

test('successful registration preserves back, pending journey and account destinations', async () => {
  for (const [canGoBack, pending, expected] of [[true, null, 'back'], [false, { journeyId: 'journey-123' }, { pathname: '/journey/[id]', params: { id: 'journey-123' } }], [false, null, '/account']]) {
    const h = harness({ result: 'signed-in', canGoBack, pending }); register(h);
    button(await fill(h), 'Register with email').props.onPress(); await settle();
    assert.deepEqual(h.navigation, [expected]);
  }
});

test('switching back to sign-in clears the password and retains the shared header', async () => {
  const h = harness(); register(h); await fill(h);
  button(h.render(), 'Already registered? Sign in').props.onPress();
  const tree = h.render();
  assert.equal(field(tree, 'Password').props.value, '');
  assert.equal(field(tree, 'Display name'), undefined);
  assert.ok(nodes(tree).some(n => n.type === 'Text' && text(n) === 'Sign in'));
  assert.ok(button(tree, 'Go back'));
  assert.match(text(tree), /Welcome back/);
  assert.equal(button(tree, 'Continue with Google').props.disabled, false);
});

test('registration back button preserves discover fallback', async () => {
  const h = harness({ canGoBack: false });
  button(register(h), 'Go back').props.onPress();
  assert.deepEqual(h.navigation, ['/discover']);
});

test('scrolling follows measured content and the safe-area viewport, including resize and error content', async () => {
  for (const mode of ['signin', 'register']) for (const height of [640, 720, 800, 915]) {
    const h = harness({ height });
    let tree = mode === 'register' ? (register(h), await details(h)) : h.render();
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

test('keyboard resize reveals the focused input with room for the primary action', async () => {
  for (const mode of ['signin', 'register']) for (const platform of ['android', 'ios']) {
    const h = harness({ platform });
    let tree = mode === 'register' ? (register(h), await details(h)) : h.render();
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
    assert.equal(button(tree, 'Continue with Google').props.disabled, false);
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
  assert.equal(button(tree, 'Continue with Google').props.disabled, false);
});

test('sign-in keeps context copy, scenic assets and the bidirectional mode links', async () => {
  for (const [options, copy] of [[{}, 'Keep journeys for later'], [{ context: 'create' }, 'Sign in to create your journey'], [{ pending: { journeyId: 'journey-123' } }, 'Sign in to continue with your selected journey']]) {
    const h = harness(options); let tree = h.render();
    assert.match(text(tree), new RegExp(copy));
    assert.ok(nodes(tree).some(n => n.type === 'Image' && n.props.source.endsWith('sunset-road.png')));
    assert.equal(field(tree, 'Display name'), undefined);
    assert.equal(field(tree, 'Password').props.autoComplete, 'current-password');
    button(tree, 'New here? Create an account').props.onPress(); tree = h.render();
    assert.equal(field(tree, 'Display name'), undefined);
    assert.equal(field(tree, 'Password'), undefined);
    tree = await details(h);
    assert.ok(field(tree, 'Display name'));
    assert.equal(field(tree, 'Password').props.autoComplete, 'new-password');
    assert.equal(button(tree, 'Continue with Google').props.disabled, false);
    button(tree, 'Already registered? Sign in').props.onPress();
    assert.match(text(h.render()), /Welcome back/);
  }
});

test('registration starts with email only and validates before checking email with Continue or keyboard progression', async () => {
  for (const keyboard of [false, true]) {
    const h = harness(); let tree = register(h);
    assert.equal(field(tree, 'Password'), undefined);
    assert.equal(field(tree, 'Display name'), undefined);
    const advance = async () => keyboard ? field(h.render(), 'Email address').props.onSubmitEditing() : await button(h.render(), 'Continue').props.onPress();
    for (const email of ['', 'invalid', 'a'.repeat(255) + '@example.org']) {
      field(h.render(), 'Email address').props.onChangeText(email); await advance();
      assert.match(text(h.render()), /Enter a valid email address/);
      assert.equal(field(h.render(), 'Display name'), undefined);
    }
    field(h.render(), 'Email address').props.onChangeText(' traveler@example.org '); await advance();
    tree = h.render();
    assert.ok(field(tree, 'Display name')); assert.ok(field(tree, 'Password'));
    assert.equal(field(tree, 'Email address'), undefined);
    assert.match(text(tree), /traveler@example.org/);
    assert.equal(h.calls.length, 0);
    assert.deepEqual(h.emailChecks, ['traveler@example.org']);
  }
});

test('Change email and details back return to email, clear passwords and never leave the screen', async () => {
  for (const action of ['Change email', 'Go back']) {
    const h = harness(); register(h); await fill(h);
    button(h.render(), action).props.onPress();
    let tree = h.render();
    assert.equal(field(tree, 'Email address').props.value, 'traveler@example.org');
    assert.equal(field(tree, 'Password'), undefined);
    tree = await details(h, 'second@example.org');
    assert.equal(field(tree, 'Password').props.value, '');
    assert.match(text(tree), /second@example.org/);
    assert.deepEqual(h.navigation, []); assert.equal(h.calls.length, 0);
  }
});

test('explicit duplicate signup errors direct existing users to sign in without confirmation claims', async () => {
  const h = harness({ failure: { code: 'user_already_exists' } }); register(h);
  field(await fill(h), 'Password').props.onSubmitEditing(); await settle();
  const tree = h.render();
  assert.match(text(tree), /already registered.*Sign in with your existing password/);
  assert.equal(text(tree).includes('check your inbox'), false);
  assert.equal(field(tree, 'Password').props.value, '');
  assert.deepEqual(h.navigation, []);
});

test('returning to registration after switching modes starts at email with no retained password', async () => {
  const h = harness(); register(h); await fill(h);
  button(h.render(), 'Already registered? Sign in').props.onPress();
  const tree = register(h);
  assert.ok(field(tree, 'Email address')); assert.equal(field(tree, 'Password'), undefined);
  assert.equal(field(await details(h), 'Password').props.value, '');
});

test('final registration locks rapid submissions and email changes until the request settles', async () => {
  let resolve;
  const result = new Promise(done => { resolve = done; });
  const h = harness({ result }); register(h); const tree = await fill(h);
  button(tree, 'Register with email').props.onPress();
  field(tree, 'Password').props.onSubmitEditing();
  let pending = h.render();
  assert.equal(h.calls.length, 1);
  assert.equal(button(pending, 'Change email').props.disabled, true);
  assert.equal(button(pending, 'Go back').props.disabled, true);
  button(pending, 'Change email').props.onPress();
  assert.equal(field(h.render(), 'Email address'), undefined);
  resolve('confirmation'); await settle();
  pending = h.render();
  assert.ok(button(pending, 'Sign in with email'));
  assert.equal(field(pending, 'Password').props.value, '');
  assert.deepEqual(h.navigation, []);
});

test('registration outage and rate-limit errors stay on details without promising email delivery', async () => {
  for (const code of ['over_email_send_rate_limit', 'unexpected_failure']) {
    const h = harness({ failure: { code } }); register(h);
    button(await fill(h), 'Register with email').props.onPress(); await settle();
    const tree = h.render();
    assert.ok(field(tree, 'Display name')); assert.ok(button(tree, 'Change email'));
    assert.ok(nodes(tree).find(n => n.props.accessibilityRole === 'alert'));
    assert.equal(text(tree).includes('If this is a new email'), false);
    assert.equal(field(tree, 'Password').props.value, '');
    assert.deepEqual(h.navigation, []);
  }
});

test('existing email goes directly to sign-in with the normalized email and no signup', async () => {
  const h = harness({ emailExists: true }); register(h);
  field(h.render(), 'Email address').props.onChangeText(' existing@example.org ');
  await button(h.render(), 'Continue').props.onPress();
  const tree = h.render();
  assert.ok(button(tree, 'Sign in with email'));
  assert.equal(field(tree, 'Email address').props.value, 'existing@example.org');
  assert.equal(field(tree, 'Password').props.value, '');
  assert.equal(field(tree, 'Display name'), undefined);
  assert.match(text(tree), /This email is already registered\. Sign in\./);
  assert.deepEqual(h.emailChecks, ['existing@example.org']);
  assert.equal(h.calls.length, 0); assert.deepEqual(h.navigation, []);
});

test('failed email check keeps email step retryable without registration', async () => {
  const h = harness({ emailFailure: new Error('We could not check this email. Please try again.') }); register(h);
  field(h.render(), 'Email address').props.onChangeText('traveler@example.org');
  await button(h.render(), 'Continue').props.onPress();
  let tree = h.render();
  assert.equal(field(tree, 'Display name'), undefined);
  assert.ok(field(tree, 'Email address')); assert.ok(button(tree, 'Continue'));
  assert.match(text(tree), /could not check/);
  await button(tree, 'Continue').props.onPress(); tree = h.render();
  assert.equal(h.emailChecks.length, 2); assert.equal(h.calls.length, 0);
  assert.equal(button(tree, 'Continue').props.disabled, false);
});

test('email lookup locks duplicate submissions and discards late results after blur/refocus', async () => {
  for (const exists of [false, true]) {
    let resolve;
    const emailExists = new Promise(done => { resolve = done; });
    const h = harness({ emailExists }); register(h);
    field(h.render(), 'Email address').props.onChangeText('traveler@example.org');
    const initial = h.render();
    const pending = button(initial, 'Continue').props.onPress();
    field(initial, 'Email address').props.onSubmitEditing();
    let tree = h.render();
    assert.equal(h.emailChecks.length, 1);
    assert.equal(field(tree, 'Email address').props.editable, false);
    assert.equal(button(tree, 'Already registered? Sign in').props.disabled, true);
    assert.equal(button(tree, 'Go back').props.disabled, true);
    button(tree, 'Already registered? Sign in').props.onPress();
    button(tree, 'Go back').props.onPress();
    assert.equal(field(h.render(), 'Password'), undefined);
    h.blur(); h.refocus(); h.render();
    resolve(exists); await pending;
    tree = h.render();
    assert.ok(button(tree, 'Continue')); assert.equal(field(tree, 'Password'), undefined);
    assert.equal(button(tree, 'Continue').props.disabled, false);
    assert.deepEqual(h.navigation, []); assert.equal(h.calls.length, 0);
  }
});
