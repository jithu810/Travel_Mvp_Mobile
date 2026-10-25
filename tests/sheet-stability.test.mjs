import { buddyGeometryStub } from './helpers/buddy-geometry-stub.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Stateful render/effect harness: unlike one-render doubles, this executes
// the actual panel AND hook through touch, spring completion and onLayout.
// Native Android event dispatch and visual compositing still need device QA.
function harness() {
  const slots = [], effects = [], springs = [], heights = [], interactions = [];
  let cursor = 0, dirty = true, tree, additions = 0, measured = 0, interaction = false;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) { const slot = { value: typeof initial === 'function' ? initial() : initial }; slot.set = next => { const value = typeof next === 'function' ? next(slot.value) : next; if (!Object.is(value, slot.value)) { slot.value = value; dirty = true; } }; slots[index] = slot; } return [slots[index].value, slots[index].set]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useMemo(factory, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) slots[index] = { deps, value: factory() }; return slots[index].value; },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(effect, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) { const previous = slots[index]; slots[index] = { deps, cleanup: previous?.cleanup }; effects.push(() => { slots[index].cleanup?.(); slots[index].cleanup = effect(); }); } },
  };
  class Value {
    constructor(value) { this.value = value; this.listeners = new Map(); this.active = null; this.writes = []; }
    addListener(callback) { const id = this.listeners.size + 1; this.listeners.set(id, callback); return id; }
    removeListener(id) { this.listeners.delete(id); }
    setValue(value) { this.writes.push(value); this.value = value; this.listeners.forEach(callback => callback({ value })); }
    stopAnimation() { const active = this.active; this.active = null; active?.({ finished: false }); }
  }
  const rn = { StyleSheet: { create: value => value }, Animated: { View: 'AnimatedView', Value,
    add: (value, clearance) => ({ value, clearance, id: ++additions }),
    spring(value, config) { return { start(callback) { value.active = callback; springs.push({ config, callback, finish() { value.active = null; value.setValue(config.toValue); callback({ finished: true }); } }); } }; },
  }, PanResponder: { create: handlers => ({ panHandlers: handlers }) } };
  for (const name of ['View', 'Pressable', 'Text', 'FlatList', 'ActivityIndicator']) rn[name] = name;
  const jsx = (type, props, key) => ({ type, props, key });
  function load(path, dependencies = {}) {
  dependencies={'@/hooks/use-buddy-geometry':buddyGeometryStub,...dependencies};
    const exports = {};
    const compiled = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('require', 'exports', compiled)(name => {
      if (name === 'react') return react;
      if (name === 'react-native') return rn;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name in dependencies) return dependencies[name];
      throw Error(name);
    }, exports);
    return exports;
  }
  const presentation = load('src/lib/discovery/presentation.ts');
  const model = load('src/lib/discovery/sheet.ts', { './presentation': presentation });
  const hook = load('src/hooks/use-discovery-sheet.ts', { '@/lib/discovery/sheet': model });
  const panel = load('src/components/discovery/discovery-panel.tsx', {
    '@/lib/discovery/presentation': presentation, '@/hooks/use-discovery-sheet': hook,
    './home-journey-card': { HomeJourneyCard: 'Card' }, './ui': { colors: {} },
  });
  const props = { journeys: [{ id: 'real-id' }], availableHeight: 700, availableWidth: 360, bottomClearance: 140,
    selectedId: null, onClear() {}, onRefresh() {}, onOpen() {}, onLocate() {},
    onHeight(value) { heights.push(value); if (measured !== value) { measured = value; dirty = true; } },
    onInteraction(value) { interactions.push(value); if (interaction !== value) { interaction = value; dirty = true; } },
  };
  function render(force = false) {
    if (force) dirty = true;
    for (let rounds = 0; dirty; rounds++) {
      assert.ok(rounds < 30, 'Render/layout feedback must settle'); dirty = false; cursor = 0;
      tree = panel.DiscoveryPanel(props); effects.splice(0).forEach(effect => effect());
    }
    return tree;
  }
  function nodes(node = tree) { return !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(child => nodes(child ?? null))]; }
  function layout(height) { nodes().find(node => node.type === 'View' && node.props.onLayout).props.onLayout({ nativeEvent: { layout: { height } } }); render(); }
  function handle() { return nodes().find(node => node.props?.accessibilityHint === 'Double tap to change panel size'); }
  function responder() { return nodes().find(node => node.props?.onPanResponderGrant).props; }
  render(); layout(110);
  return { render, layout, handle, responder, nodes, props, springs, heights, interactions,
    get tree() { return tree; }, get value() { return tree.props.style[1].height.value; } };
}

test('touch rerenders retain the animated height node, responder and list keys', () => {
  const h = harness(), node = h.tree.props.style[1].height, responder = h.responder().onPanResponderGrant;
  const keys = () => h.nodes().filter(n => n.key !== undefined).map(n => n.key);
  const lists = keys();
  assert.deepEqual(lists, ['false', 'true']);
  for (let i = 0; i < 8; i++) { h.tree.props.onTouchStart(); h.render(); h.tree.props.onTouchEnd(); h.render(); }
  assert.equal(h.tree.props.style[1].height, node);
  assert.equal(h.responder().onPanResponderGrant, responder);
  assert.deepEqual(keys(), lists);
  assert.equal(h.springs.length, 0);
});

test('short viewport and wrapped compact chrome settle within navigation clearance without repeated resets', () => {
  const h = harness();
  for (const [width, height, chrome] of [[320, 450, 148], [360, 620, 110], [412, 760, 110]]) {
    h.props.availableWidth = width; h.props.availableHeight = height; h.render(true); h.layout(chrome);
    assert.ok(h.heights.at(-1) <= height);
    assert.ok(h.value.value >= chrome + 142 + 14, 'Complete compact card fits above reserved controls');
    const writes = h.value.writes.length;
    h.layout(chrome); h.render(true);
    assert.equal(h.value.writes.length, writes);
    assert.equal(h.tree.props.style[1].height.clearance, 140);
  }
});

test('expanded chrome cannot redefine collapsed height and cause a second post-collapse jump', () => {
  const h = harness(), collapsed = h.value.value;
  h.handle().props.onPress(); h.render(); h.springs.at(-1).finish(); h.render();
  h.layout(164); // Additional expanded description and multiline notice.
  h.handle().props.onPress(); h.render();
  assert.equal(h.springs.at(-1).config.toValue, collapsed);
  h.springs.at(-1).finish(); h.render();
  const writes = h.value.writes.length;
  h.layout(110);
  assert.equal(h.value.value, collapsed);
  assert.equal(h.value.writes.length, writes, 'No corrective height write after collapse');
});

test('rapid taps reverse pending intent and ignore superseded spring completions', () => {
  const h = harness(), collapsed = h.value.value;
  h.handle().props.onPress(); h.render(); const first = h.springs.at(-1);
  h.handle().props.onPress(); h.render(); const second = h.springs.at(-1);
  assert.equal(second.config.toValue, collapsed);
  first.callback({ finished: true }); h.render();
  second.finish(); h.render();
  assert.equal(h.handle().props.accessibilityState.expanded, false);
  assert.equal(h.interactions.at(-1), false);
});

test('short vertical drags settle; horizontal cards never claim the sheet', () => {
  const h = harness(), initial = h.value.value;
  for (let i = 0; i < 5; i++) {
    const responder = h.responder();
    assert.equal(responder.onMoveShouldSetPanResponderCapture(null, { dx: 80, dy: 3, numberActiveTouches: 1 }), false);
    assert.equal(responder.onMoveShouldSetPanResponderCapture(null, { dx: 0, dy: 14, numberActiveTouches: 1 }), true);
    responder.onPanResponderGrant(); h.render();
    responder.onPanResponderMove(null, { dy: 14 });
    h.render(true); assert.equal(h.value.value, initial - 14);
    responder.onPanResponderRelease(null, { vy: 0 }); h.springs.at(-1).finish(); h.render();
    assert.equal(h.value.value, initial);
  }
});

test('X retains its existing clear-selection action and is disabled when there is no located journey', () => {
  const h = harness(); let clears = 0; h.props.onClear = () => clears++;
  h.render(true);
  let close = h.nodes().find(n => n.props?.accessibilityLabel === 'Clear located journey');
  assert.ok(close); assert.equal(close.props.disabled, true);
  h.props.selectedId = 'real-id'; h.render(true);
  close = h.nodes().find(n => n.props?.accessibilityLabel === 'Clear located journey');
  assert.equal(close.props.disabled, false); close.props.onPress(); assert.equal(clears, 1);
});

test('deliberate slow upward swipe opens journeys instead of bouncing to the nearer collapsed snap', () => {
  const h = harness(), collapsed = h.value.value, handle = h.responder();
  handle.onPanResponderGrant(); handle.onPanResponderMove(null, { dy: -40 });
  handle.onPanResponderRelease(null, { dy: -40, vy: 0 });
  assert.ok(h.springs.at(-1).config.toValue > collapsed);
  h.springs.at(-1).finish(); h.render();
  assert.equal(h.handle().props.accessibilityState.expanded, true);
  assert.equal(h.nodes().find(n => n.key === 'true').props.style[1].display, 'flex');
  const content = h.nodes().filter(n => n.props?.onPanResponderGrant)[1].props;
  content.onStartShouldSetPanResponderCapture();
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, { dx: 0, dy: -80, numberActiveTouches: 1 }), false, 'Upward scrolling belongs to the open journey list');
  const list = h.nodes().find(n => n.type === 'FlatList' && !n.props.horizontal);
  list.props.onScroll({ nativeEvent: { contentOffset: { y: 180 } } });
  content.onStartShouldSetPanResponderCapture();
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, { dx: 0, dy: 40, numberActiveTouches: 1 }), false);
  h.render(true); assert.equal(h.handle().props.accessibilityState.expanded, true);
});

test('short screen can enter scrollable expanded mode even when both height snaps coincide', () => {
  const h = harness(); h.props.availableHeight = 400; h.render(true);
  const height = h.value.value, handle = h.responder();
  handle.onPanResponderGrant(); handle.onPanResponderMove(null, { dy: -40 });
  assert.equal(h.value.value, height, 'Height is already clamped to available space');
  handle.onPanResponderRelease(null, { dy: -40, vy: 0 }); h.springs.at(-1).finish(); h.render();
  assert.equal(h.handle().props.accessibilityState.expanded, true);
  assert.equal(h.nodes().find(n => n.key === 'true').props.style[1].display, 'flex');
});

test('small upward movement still returns to collapsed without accidentally opening the list', () => {
  const h = harness(), initial = h.value.value, handle = h.responder();
  handle.onPanResponderGrant(); handle.onPanResponderMove(null, { dy: -14 });
  handle.onPanResponderRelease(null, { dy: -14, vy: 0 }); h.springs.at(-1).finish(); h.render();
  assert.equal(h.value.value, initial); assert.equal(h.handle().props.accessibilityState.expanded, false);
});

test('late card measurement cannot reset the dragged sheet or replace the active content responder', () => {
  const h = harness();
  const content = () => h.nodes().filter(n => n.props?.onPanResponderGrant)[1].props;
  const active = content();
  active.onPanResponderGrant(); active.onPanResponderMove(null, { dy: -70 }); h.render();
  const draggedHeight = h.value.value;
  const list = h.nodes().find(n => n.type === 'FlatList' && n.props.horizontal);
  list.props.renderItem({ item: { id: 'real-id' } }).props.onHeight(170);
  h.render();
  assert.equal(h.value.value, draggedHeight, 'A card layout update must not reset to the last collapsed snap');
  assert.equal(content().onPanResponderMove, active.onPanResponderMove, 'Responder must survive measurement updates');
  assert.equal(h.interactions.at(-1), true);
  active.onPanResponderMove(null, { dy: -90 });
  assert.equal(h.value.value, draggedHeight + 20);
  active.onPanResponderRelease(null, { dy: -90, vy: 0 }); h.springs.at(-1).finish(); h.render();
  assert.equal(h.handle().props.accessibilityState.expanded, true);
});

test('header or clearance changes cannot cancel an expanding spring back to collapsed', () => {
  const h = harness();
  h.handle().props.onPress(); h.render(); const opening = h.springs.at(-1);
  h.value.setValue(350); // Halfway through the native spring.
  h.layout(126);
  assert.equal(h.value.value, 350);
  assert.equal(h.value.active, opening.callback);
  h.props.bottomClearance = 150; h.render(true);
  assert.equal(h.value.value, 350);
  opening.finish(); h.render();
  const retarget = h.springs.at(-1);
  assert.notEqual(retarget, opening, 'New safe-area bounds are applied with a settling animation');
  retarget.finish(); h.render();
  assert.equal(h.handle().props.accessibilityState.expanded, true);
  assert.equal(h.heights.at(-1), h.props.availableHeight - 96);
  assert.equal(h.interactions.at(-1), false);
});
