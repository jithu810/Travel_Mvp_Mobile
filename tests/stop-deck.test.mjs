import { buddyGeometryStub } from './helpers/buddy-geometry-stub.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
// Execute the actual dependency-free shared theme in the component harness.
const mobileTheme = {};
new Function('exports', ts.transpileModule(readFileSync('src/theme/mobile-theme.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mobileTheme);

const jsx = (type, props) => ({ type, props });
function hooksHarness() {
  const slots = []; let cursor = 0, layout = [], effects = [], disposed = false, lateUpdates = 0;
  const changed = (previous, deps) => !deps || !previous || deps.some((dep, i) => dep !== previous[i]);
  const memo = (factory, deps) => { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { deps, value: factory() }; return slots[i].value; };
  const effect = (list, kind) => (callback, deps) => { const i = cursor++; if (changed(slots[i]?.deps, deps)) { const previous = slots[i]; slots[i] = { deps, kind, callback }; list().push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); }); } };
  const hooks = {
    useCallback: (callback, deps) => memo(() => callback, deps), useMemo: memo,
    useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { if (disposed) lateUpdates++; slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useEffect: effect(() => effects, 'passive'), useLayoutEffect: effect(() => layout, 'layout'),
    useImperativeHandle: (ref, factory) => { cursor++; if (ref) ref.current = factory(); },
  };
  return { hooks, lateUpdates: () => lateUpdates,
    render: (component, props) => { cursor = 0; layout = []; effects = []; const tree = component(props); layout.forEach(run => run()); effects.forEach(run => run()); return tree; },
    dispose: () => { disposed = true; slots.forEach(slot => slot?.cleanup?.()); },
    // StrictMode dev replay: every effect cleans up, then every effect runs again.
    replay: () => { const effectSlots = slots.filter(slot => slot?.kind); effectSlots.forEach(slot => slot.cleanup?.()); for (const kind of ['layout', 'passive']) effectSlots.filter(slot => slot.kind === kind).forEach(slot => { slot.cleanup = slot.callback(); }); },
  };
}
function load(path, modules, hooks) {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const require = name => {
    if (name === '@/theme/mobile-theme') return mobileTheme;
    if (name === '@/hooks/use-buddy-geometry') return buddyGeometryStub;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react') return hooks;
    if (Object.hasOwn(modules, name)) return modules[name];
    throw new Error('Unexpected dependency: ' + name);
  };
  new Function('require', 'module', 'exports', source)(require, module, module.exports);
  return module.exports;
}
function all(tree, type) { if (!tree || typeof tree !== 'object') return []; return [...(tree.type === type ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => all(child, type))]; }
const byTest = (tree, id) => [...all(tree, 'View'), ...all(tree, 'AnimatedView')].filter(node => node.props.testID === id);
function native(reduce, os = 'ios') {
  const pending = [], springs = [], announcements = []; let background, preference;
  class Value { constructor(v) { this.value = v; } setValue(v) { this.value = v; } stopAnimation() {} interpolate(config) { return { interpolated: config, source: this }; } }
  class ValueXY { constructor(v) { this.x = new Value(v.x); this.y = new Value(v.y); } setValue(v) { this.x.setValue(v.x); this.y.setValue(v.y); } stopAnimation() {} }
  const animation = (kind, detail) => ({ kind, detail, start: fn => pending.push({ kind, detail, fn }), stop() {} });
  const rn = { View: 'View', Text: 'Text', StyleSheet: { create: v => v }, Platform: { OS: os },
    Animated: { Value, ValueXY, View: 'AnimatedView', multiply: (a, b) => ({ multiply: [a, b] }), timing: (value, options) => ({ kind: 'timing', value, options }), delay: ms => ({ kind: 'delay', ms }),
      parallel: list => animation('parallel', list), sequence: list => animation('sequence', list), spring: (value, options) => ({ start: () => springs.push(options) }) },
    PanResponder: { create: v => ({ panHandlers: v }) },
    AccessibilityInfo: { isReduceMotionEnabled: async () => reduce, addEventListener: (_, fn) => { preference = fn; return { remove() {} }; }, announceForAccessibility: text => announcements.push(text) },
    AppState: { currentState: 'active', addEventListener: (_, fn) => { background = fn; return { remove() {} }; } },
  };
  return { rn, pending, springs, announcements, background: () => background('background'), reduce: value => preference(value) };
}
const stops = ['a', 'b', 'c'].map((id, i) => ({ id, name: 'Stop ' + id, sequence: i + 1, photo: null, description: '', dayNumber: null, latitude: 1, longitude: 1, rating: null }));
async function setup({ reduce = false, intro = true, strict = false, os = 'ios' } = {}) {
  const h = hooksHarness(), env = native(reduce, os), calls = [], ref = { current: null };
  const { StopDeck } = load('src/components/remix/stop-deck.tsx', { 'react-native': env.rn, './deck-buddy': { DeckBuddy: 'DeckBuddy' } }, h.hooks);
  const props = { ref, stops, cursor: 0, decisions: {}, disabled: false, onDecide: (keep, id) => calls.push([keep, id]), card: { type: 'Card', props: {} }, empty: { type: 'Ready', props: {} } };
  let tree = h.render(StopDeck, props); if (strict) h.replay(); await Promise.resolve(); await Promise.resolve();
  tree = h.render(StopDeck, props);
  tree.props.onLayout({ nativeEvent: { layout: { width: 360, height: 480 } } });
  const t = { h, env, calls, ref, props, render: () => (tree = h.render(StopDeck, props)), tree: () => tree, card: () => byTest(tree, 'deck-top-card')[0]?.props,
    decide: (keep, id) => { props.decisions = { ...props.decisions, [id]: keep }; props.cursor++; t.render(); } };
  t.render();
  if (intro && !reduce) { const run = env.pending.shift(); assert.equal(run.kind, 'sequence', 'Intro plays after layout'); run.fn({ finished: true }); t.render(); }
  return t;
}

test('deck intro fans and gathers on open; Reduce Motion skips it entirely', async () => {
  const t = await setup({ intro: false });
  const run = t.env.pending[0];
  assert.equal(run.kind, 'sequence'); assert.equal(byTest(t.tree(), 'deck-fan').length, 3); assert.equal(t.calls.length, 0);
  // A press during the intro finishes it immediately and still animates the decision.
  assert.equal(t.ref.current.play(true), true); assert.equal(t.env.pending.at(-1).kind, 'parallel');
  run.fn({ finished: true }); assert.equal(t.calls.length, 0, 'Stale intro completion never decides');
  t.h.dispose();
  const reduced = await setup({ reduce: true });
  assert.equal(reduced.env.pending.length, 0, 'No intro under Reduce Motion');
  assert.equal(reduced.ref.current.play(false), true); assert.deepEqual(reduced.calls, [[false, 'a']]); assert.equal(reduced.env.pending.length, 0, 'Decision is immediate under Reduce Motion');
  reduced.decide(false, 'a');
  assert.equal(reduced.ref.current.restore(false, 'a'), true); reduced.props.cursor = 0; reduced.props.decisions = {}; reduced.render();
  assert.equal(reduced.env.pending.length, 0, 'Undo is instant under Reduce Motion'); reduced.h.dispose();
});

test('swipe up selects and swipe down discards only after the fly-off; short or horizontal drags never decide', async () => {
  const t = await setup();
  let card = t.card();
  assert.equal(card.onMoveShouldSetPanResponder(null, { dx: 40, dy: 20 }), false, 'Horizontal drags are not claimed');
  assert.equal(card.onMoveShouldSetPanResponder(null, { dx: 3, dy: 30 }), true);
  card.onPanResponderMove(null, { dx: 10, dy: -40 });
  card.onPanResponderRelease(null, { dx: 10, dy: -40, vy: -0.2 }); assert.equal(t.env.springs.length, 1, 'Release before threshold springs back'); assert.equal(t.calls.length, 0);
  card.onPanResponderRelease(null, { dx: 0, dy: -160, vy: -0.4 }); assert.equal(t.calls.length, 0, 'Selection waits for the fly-off');
  const flight = t.env.pending.pop(); assert.equal(flight.kind, 'parallel');
  const [move] = flight.detail; assert.ok(move.options.toValue.x > 0 && move.options.toValue.y > 0, 'Select flies to the hand pile bottom-right');
  assert.equal(card.onMoveShouldSetPanResponder(null, { dx: 0, dy: 40 }), false, 'Gestures ignored while animating');
  assert.equal(t.ref.current.play(false), false, 'Buttons ignored while animating'); assert.equal(t.ref.current.restore(true, 'a'), false, 'Undo ignored while animating');
  flight.fn({ finished: true }); assert.deepEqual(t.calls, [[true, 'a']]);
  t.decide(true, 'a'); assert.equal(find(t.tree(), 'DeckBuddy').props.mood, 'select');
  card = t.card(); card.onPanResponderRelease(null, { dx: 0, dy: 160, vy: 0.3 });
  const fall = t.env.pending.pop(); const [drop] = fall.detail; assert.ok(drop.options.toValue.x < 0 && drop.options.toValue.y > 0, 'Discard falls to the pile bottom-left');
  fall.fn({ finished: true }); assert.deepEqual(t.calls.at(-1), [false, 'b']);
  t.decide(false, 'b'); assert.equal(find(t.tree(), 'DeckBuddy').props.mood, 'discard');
  const labels = all(t.tree(), 'View').map(node => node.props.accessibilityLabel).filter(Boolean);
  assert.ok(labels.includes('Discard pile, 1 stop')); assert.ok(labels.includes('Your hand, 1 stop'));
  t.h.dispose(); assert.equal(t.h.lateUpdates(), 0);
});
function find(tree, type) { return all(tree, type)[0]; }

test('stale fly-offs are dropped after unmount, background, lock, route blur, Reduce Motion or stop identity change', async () => {
  for (const cancel of ['unmount', 'background', 'lock', 'unfocused', 'reduce', 'identity', 'interrupted']) {
    const t = await setup();
    assert.equal(t.ref.current.play(true), true); const completion = t.env.pending.pop().fn;
    if (cancel === 'unmount') t.h.dispose();
    if (cancel === 'background') t.env.background();
    if (cancel === 'lock') { t.props.disabled = true; t.render(); assert.equal(t.card().onMoveShouldSetPanResponder(null, { dx: 0, dy: 40 }), false); assert.equal(t.ref.current.play(true), false); }
    if (cancel === 'unfocused') { t.props.active = false; t.render(); assert.equal(t.card().onMoveShouldSetPanResponder(null, { dx: 0, dy: 40 }), false); assert.equal(t.ref.current.play(false), false); assert.equal(t.ref.current.restore(true, 'a'), false); }
    if (cancel === 'reduce') { t.env.reduce(true); t.render(); }
    if (cancel === 'identity') { t.props.cursor = 1; t.render(); }
    completion({ finished: cancel !== 'interrupted' });
    assert.deepEqual(t.calls, [], cancel);
    if (cancel !== 'unmount') t.h.dispose();
    assert.equal(t.h.lateUpdates(), 0, cancel);
  }
});

test('undo returns the last card from its pile and the buddy narrates; finished deck shows the completion prompt', async () => {
  const t = await setup();
  for (const [keep, id] of [[true, 'a'], [false, 'b'], [true, 'c']]) { t.ref.current.play(keep); t.env.pending.pop().fn({ finished: true }); t.decide(keep, id); }
  assert.deepEqual(t.calls, [[true, 'a'], [false, 'b'], [true, 'c']]);
  assert.equal(t.card(), undefined); assert.ok(find(t.tree(), 'Ready'), 'Finish state renders the completion prompt');
  assert.equal(find(t.tree(), 'DeckBuddy').props.mood, 'done');
  assert.equal(t.ref.current.restore(true, 'c'), true); t.props.cursor = 2; t.props.decisions = { a: true, b: false }; t.render();
  const back = t.env.pending.pop(); assert.equal(back.kind, 'parallel'); assert.deepEqual(back.detail[0].options.toValue, { x: 0, y: 0 });
  assert.equal(find(t.tree(), 'DeckBuddy').props.mood, 'undo');
  assert.equal(t.ref.current.play(true), false, 'Return animation blocks new decisions');
  back.fn({ finished: true }); assert.equal(t.ref.current.play(true), true); t.h.dispose();
});

test('deck buddy speaks each beat politely, animates only with motion and never takes touches', () => {
  const h = hooksHarness(), env = native(false);
  const { DeckBuddy, deckBuddyLines } = load('src/components/remix/deck-buddy.tsx', { 'react-native': env.rn, '@/components/buddy/buddy-sprite': { BuddySprite: 'BuddySprite' } }, h.hooks);
  assert.deepEqual(deckBuddyLines, { idle: 'Build your hand!', discard: 'Discarded!', select: 'Selected!', undo: 'Back in the deck!', done: 'That’s your hand! Let’s explore.' });
  let tree = h.render(DeckBuddy, { mood: 'select', beat: 1, reduced: false });
  assert.equal(tree.props.pointerEvents, 'none');
  const line = find(tree, 'Text'); assert.equal(line.props.numberOfLines, 3, 'Long lines wrap instead of truncating'); assert.equal(line.props.adjustsFontSizeToFit, true); assert.equal(line.props.maxFontSizeMultiplier, 1.3);
  assert.equal(line.props.accessibilityLiveRegion, undefined, 'Decisions are announced once, by the progress line'); assert.equal(line.props.children, 'Selected!');
  assert.deepEqual(env.announcements, []); assert.equal(env.pending.length, 1, 'Select hops');
  assert.equal(find(tree, 'BuddySprite').props.animation, 'jump');
  tree = h.render(DeckBuddy, { mood: 'discard', beat: 2, reduced: true });
  assert.equal(find(tree, 'Text').props.children, 'Discarded!'); assert.equal(env.pending.length, 1, 'No motion under Reduce Motion');
  assert.equal(find(tree, 'BuddySprite').props.animate, false); assert.deepEqual(env.announcements, []);
  tree = h.render(DeckBuddy, { mood: 'undo', beat: 3, reduced: false }); assert.equal(find(tree, 'Text').props.children, 'Back in the deck!');
  tree = h.render(DeckBuddy, { mood: 'done', beat: 3, reduced: false }); assert.equal(env.pending.length, 2, 'Finished hand hops');
  assert.deepEqual(env.announcements, ['Back in the deck!', 'That’s your hand! Let’s explore.']);
  h.dispose();
});

test('an Undo that leaves the same stop on top disarms the return; the next card never replays a return', async () => {
  const t = await setup();
  // Review restore → Revisit → Undo: history cursor 0 equals the current cursor, identity unchanged.
  assert.equal(t.ref.current.restore(false, 'a'), true); t.props.decisions = {}; t.render();
  assert.equal(t.env.pending.length, 0, 'No return animation without an identity change');
  assert.equal(t.ref.current.play(true), true); t.env.pending.pop().fn({ finished: true }); assert.deepEqual(t.calls, [[true, 'a']]);
  t.decide(true, 'a'); assert.equal(t.env.pending.length, 0, 'The next card does not come back from a pile');
  assert.equal(t.ref.current.play(false), true, 'Input is not blocked by a stale return'); t.env.pending.pop().fn({ finished: true });
  assert.deepEqual(t.calls.at(-1), [false, 'b']);
  // An armed return for a different stop is cleared, not carried to a later identity.
  t.decide(false, 'b'); assert.equal(t.ref.current.restore(true, 'a'), true); t.props.cursor = 1; t.render();
  assert.equal(t.env.pending.length, 0, 'Only the armed stop animates back'); t.props.cursor = 0; t.render();
  assert.equal(t.env.pending.length, 0, 'The flag was cleared by the previous identity'); t.h.dispose();
});

test('rapid double-tap under Reduce Motion reports once until the deck moves on', async () => {
  const t = await setup({ reduce: true });
  assert.equal(t.ref.current.play(true), true); assert.equal(t.ref.current.play(true), false); assert.equal(t.ref.current.play(false), false);
  assert.deepEqual(t.calls, [[true, 'a']]);
  t.decide(true, 'a'); assert.equal(t.ref.current.play(false), true); assert.deepEqual(t.calls, [[true, 'a'], [false, 'b']]); t.h.dispose();
});

test('a terminated gesture springs back without a decision', async () => {
  const t = await setup();
  const card = t.card();
  card.onPanResponderGrant(); card.onPanResponderMove(null, { dx: 0, dy: -200 }); card.onPanResponderTerminate();
  assert.equal(t.env.springs.length, 1); assert.deepEqual(t.calls, []); assert.equal(t.env.pending.length, 0);
  assert.equal(t.ref.current.play(true), true, 'Deck stays usable'); t.h.dispose();
});

test('StrictMode effect replay still plays the intro; fan cards unmount once it completes', async () => {
  const t = await setup({ strict: true, intro: false });
  const run = t.env.pending.shift(); assert.equal(run?.kind, 'sequence', 'Intro survives the dev replay');
  assert.equal(byTest(t.tree(), 'deck-fan').length, 3);
  run.fn({ finished: true }); t.render(); assert.equal(byTest(t.tree(), 'deck-fan').length, 0); assert.equal(byTest(t.tree(), 'deck-peek').length, 2);
  t.h.dispose();
});

test('stamps follow the finger only: a select flight down to the hand never shows DISCARD', async () => {
  const t = await setup();
  const stamps = () => all(t.tree(), 'AnimatedView').filter(node => all(node, 'Text').some(text => text.props.children === 'SELECT' || text.props.children === 'DISCARD') && !node.props.testID);
  const [select, discard] = stamps().map(node => node.props.style.at(-1).opacity);
  const transform = t.card().style.at(-1).transform, panY = transform[1].translateY, fly = transform.at(-1).scale.source;
  for (const opacity of [select, discard]) {
    const [drag, gate] = opacity.multiply;
    assert.equal(drag.source, panY, 'Stamp reads the drag offset'); assert.equal(gate.source, fly, 'Stamp is gated by the flight value');
    assert.deepEqual(gate.interpolated.inputRange, [0, 0.2]); assert.deepEqual(gate.interpolated.outputRange, [1, 0], 'Stamp fades out as soon as the card flies');
  }
  assert.ok(discard.multiply[0].interpolated.outputRange.at(-1) === 1 && select.multiply[0].interpolated.outputRange[0] === 1);
  assert.equal(select.multiply[1].source, discard.multiply[1].source, 'Both stamps are gated by the same flight value');
  t.h.dispose();
});

test('iOS announces each decision once with the stop name; Android leaves it to the single progress live region', async () => {
  const ios = await setup();
  ios.ref.current.play(true); assert.deepEqual(ios.env.announcements, [], 'Nothing is announced before the decision commits');
  ios.env.pending.pop().fn({ finished: true }); assert.deepEqual(ios.env.announcements, ['Selected Stop a']);
  ios.decide(true, 'a'); ios.card().onPanResponderRelease(null, { dx: 0, dy: 160, vy: 0 }); ios.env.pending.pop().fn({ finished: true });
  assert.deepEqual(ios.env.announcements, ['Selected Stop a', 'Discarded Stop b']); ios.h.dispose();
  const reduced = await setup({ reduce: true }); reduced.ref.current.play(false); reduced.ref.current.play(false);
  assert.deepEqual(reduced.env.announcements, ['Discarded Stop a'], 'Immediate decisions announce once'); reduced.h.dispose();
  const android = await setup({ os: 'android' }); android.ref.current.play(true); android.env.pending.pop().fn({ finished: true });
  assert.deepEqual(android.calls, [[true, 'a']]); assert.deepEqual(android.env.announcements, []); android.h.dispose();
});

test('fan views unmount after Reduce Motion, an interrupted intro or backgrounding mid-intro', async () => {
  const reduced = await setup({ reduce: true }); assert.equal(byTest(reduced.tree(), 'deck-fan').length, 0); reduced.h.dispose();
  const interrupted = await setup({ intro: false }); assert.equal(byTest(interrupted.tree(), 'deck-fan').length, 3);
  interrupted.env.pending.shift().fn({ finished: false }); interrupted.render(); assert.equal(byTest(interrupted.tree(), 'deck-fan').length, 0); interrupted.h.dispose();
  const background = await setup({ intro: false }); background.env.background(); background.render();
  assert.equal(byTest(background.tree(), 'deck-fan').length, 0); background.h.dispose();
  const turnedOn = await setup({ intro: false }); turnedOn.env.reduce(true); turnedOn.render();
  assert.equal(byTest(turnedOn.tree(), 'deck-fan').length, 0, 'Reduce Motion turned on mid-intro'); turnedOn.h.dispose();
});
