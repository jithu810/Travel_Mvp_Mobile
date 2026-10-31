import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function fixture(name, query) {
  const slots = []; let cursor = 0, effects = [], disposed = false, late = 0, listener, removed = 0;
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { if (disposed) late++; slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((value, j) => value !== slots[i].deps[j])) { slots[i]?.cleanup?.(); const slot = { deps }; slots[i] = slot; effects.push(() => { slot.cleanup = fn(); }); } },
    useMemo(fn) { cursor++; return fn(); }, useCallback(fn) { cursor++; return fn; },
  };
  const native = Object.fromEntries(['View', 'Text', 'Pressable', 'Modal', 'ScrollView', 'KeyboardAvoidingView', 'TextInput'].map(key => [key, key]));
  native.StyleSheet = { create: value => value };
  native.useWindowDimensions = () => ({ height: 844, width: 390, fontScale: 1 });
  native.PanResponder = { create: () => ({ panHandlers: {} }) };
  native.AccessibilityInfo = { isReduceMotionEnabled: query, addEventListener(event, callback) { assert.equal(event, 'reduceMotionChanged'); listener = callback; return { remove() { removed++; } }; } };
  const modules = {
    react: hooks, 'react-native': native,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) },
    '@/theme/mobile-theme': { theme: {} }, '@/components/discovery/ui': { colors: {} },
    '@/components/discovery/journey-photo': { JourneyPhoto: 'JourneyPhoto' },
    '@/components/art/journey-art': { StopArt: 'StopArt' },
    '@/components/art/circle-map': { CircleMap: 'CircleMap', circleMapFootprint: 104, circleMapUri: () => null },
    '@/lib/art/journey-art': { artSeed: () => 'seed' },
    '../discovery/ui': { Action: 'Action' }, './place-picker': { PlacePicker: 'PlacePicker' },
    '@/hooks/use-memory-location': { useMemoryLocation: () => ({ busy: false, error: null, start() {}, cancel() {}, isBusy: () => false }) },
  };
  const file = name === 'StopStoryViewer' ? 'src/components/journey/stop-story-viewer.tsx' : 'src/components/create/memory-editor-sheet.tsx';
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', source)(key => { assert.ok(key in modules, key); return modules[key]; }, exports);
  const props = name === 'StopStoryViewer'
    ? { journey: { title: 'Trip', destination: 'Goa', stops: [] }, selectedId: null, onSelect() {}, onClose() {}, onMap() {} }
    : { value: { name: '', description: '', latitude: null, longitude: null, day: '', rating: '' }, isNew: true, busy: false, blocked: false, proximity: null, error: null, onChange() {}, onClose() {}, onSave() {} };
  return {
    render() { cursor = 0; effects = []; const tree = exports[name](props); effects.forEach(fn => fn()); return tree; },
    change(value) { listener(value); },
    dispose() { disposed = true; slots.forEach(slot => slot?.cleanup?.()); },
    removed: () => removed, late: () => late,
  };
}

for (const [name, normal] of [['StopStoryViewer', 'fade'], ['MemoryEditorSheet', 'slide']]) {
  test(`${name} observes live motion changes and rejects a stale initial query`, async () => {
    let resolve; const h = fixture(name, () => new Promise(done => { resolve = done; }));
    assert.equal(h.render().props.animationType, 'none');
    h.change(false); assert.equal(h.render().props.animationType, normal);
    resolve(true); await Promise.resolve();
    assert.equal(h.render().props.animationType, normal);
    h.change(true); assert.equal(h.render().props.animationType, 'none');
    h.dispose(); h.change(false);
    assert.equal(h.removed(), 1); assert.equal(h.late(), 0);
  });
  test(`${name} enables normal motion only after the platform preference resolves`, async () => {
    const h = fixture(name, async () => false);
    assert.equal(h.render().props.animationType, 'none'); await Promise.resolve();
    assert.equal(h.render().props.animationType, normal); h.dispose();
  });
  test(`${name} keeps a safe fallback when the platform query fails`, async () => {
    const h = fixture(name, async () => { throw Error('Unavailable'); });
    h.render(); await Promise.resolve(); await Promise.resolve();
    assert.equal(h.render().props.animationType, 'none'); h.dispose();
  });
  test(`${name} ignores a query resolving after unmount`, async () => {
    let resolve; const h = fixture(name, () => new Promise(done => { resolve = done; }));
    h.render(); h.dispose(); resolve(false); await Promise.resolve();
    assert.equal(h.late(), 0); assert.equal(h.removed(), 1);
  });
}
