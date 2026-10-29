import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(file, modules = {}, clock = globalThis) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', code)(name => {
    if (name.endsWith('.png')) return name;
    assert.ok(name in modules, name); return modules[name];
  }, exports, clock.setTimeout, clock.clearTimeout, clock.setInterval, clock.clearInterval);
  return exports;
}
const model = load('src/lib/buddy/model.ts');
const geometry = load('src/lib/buddy/geometry.ts', { './model': model });
const { createBuddyStore } = load('src/lib/buddy/store.ts', { './model': model });
const { createBuddyPositionCapture } = load('src/lib/buddy/position.ts');
const { createBuddyPreference, BUDDY_PREFERENCE_KEY } = load('src/lib/buddy/preference.ts');
const animations = load('src/lib/buddy/animations.ts');
const tick = () => new Promise(setImmediate);
function zoomedBuddyGeometry() {
  const obstacles = [[-8,327.3333435058594,376,461.9999694824219],[8,691.3333129882812,344,74],[-8,36,376,72],
    [8,625.3333129882812,344,70],[4,263.3333435058594,68,68],[152.44546313737123,257.68098804925785,80,80],
    [163.25604684830878,205.21882964243912,80,80],[181.55453686264147,98.31901434198744,80,80],
    [4,112,112,48],[108,112,56,56],[292,112,64,64]];
  return geometry.createBuddyGeometry({ x: 0, y: 0, width: 360, height: 781.3333129882812 },
    { top: 40, bottom: 16, left: 0, right: 0 }, obstacles.map(([x,y,width,height]) => ({ x: x + 8, y: y + 8, width: width - 16, height: height - 16 })));
}
test('bubble placement stays clear, flips below near the top, and relocates beside protected controls', () => {
  const g = geometry.createBuddyGeometry({ x: 0, y: 0, width: 360, height: 800 }, { top: 24, bottom: 24, left: 0, right: 0 }, []);
  const top = geometry.placeBuddyBubble({ x: 150, y: 30 }, g, 252, 240);
  assert.equal(top.above, false); assert.deepEqual(top.buddy, { x: 150, y: 30 });
  const bottom = geometry.placeBuddyBubble({ x: 280, y: 700 }, g, 252, 240);
  assert.equal(bottom.above, true); assert.equal(geometry.buddyOverlayClear(bottom.rect, g), true);
  assert.ok(bottom.tailX >= 18 && bottom.tailX <= 234);
  const blocked = geometry.createBuddyGeometry({ x: 0, y: 0, width: 360, height: 800 }, { top: 0, bottom: 0, left: 0, right: 0 }, [{ x: 100, y: 350, width: 200, height: 200 }]);
  const moved = geometry.placeBuddyBubble({ x: 280, y: 700 }, blocked, 252, 240);
  assert.ok(moved); assert.equal(geometry.buddyOverlayClear(moved.rect, blocked), true); assert.equal(geometry.buddyPositionClear(moved.buddy, blocked), true);
  assert.equal(geometry.placeBuddyBubble({ x: 0, y: 0 }, g, 999, 240), null);
  const preferred = geometry.placeBuddyBubble({ x: 150, y: 30 }, g, 252, 240, 'above');
  assert.ok(preferred); assert.equal(preferred.above, true, 'Above preference relocates Buddy before falling below him');
});
test('Home bubble finds clear space between branding, map pins and the discovery rail', () => {
  const controls = [
    { x: 0, y: 40, width: 360, height: 60 }, { x: 0, y: 380, width: 360, height: 420 },
    { x: 12, y: 112, width: 96, height: 32 }, { x: 116, y: 112, width: 40, height: 40 },
    { x: 300, y: 112, width: 48, height: 48 },
    { x: 289, y: 181, width: 64, height: 64 }, { x: 113, y: 312, width: 64, height: 64 },
    { x: 273, y: 303, width: 64, height: 64 },
  ];
  const g = geometry.createBuddyGeometry({ x: 0, y: 0, width: 360, height: 800 }, { top: 24, bottom: 24, left: 0, right: 0 }, controls);
  // There is room, but none of the five generic samples in each Buddy area finds it.
  assert.equal(geometry.buddyPositionClear({ x: 4, y: 294 }, g), true);
  assert.equal(geometry.buddyOverlayClear({ x: 4, y: 160, width: 252, height: 134 }, g), true);
  const parked = geometry.nearestBuddyPosition({ x: 300, y: 600 }, g);
  const placement = geometry.placeBuddyBubble(parked, g, 252, 124);
  assert.ok(placement, 'A tap must find the available bubble and tail space');
  assert.equal(geometry.buddyPositionClear(placement.buddy, g), true);
  assert.equal(geometry.buddyOverlayClear({ ...placement.rect, y: placement.above ? placement.rect.y : placement.rect.y - 10, height: placement.rect.height + 10 }, g), true);
  for (const offset of [1 / 3, 0.5]) {
    const fractional = geometry.createBuddyGeometry({ x: 0, y: 0, width: 360, height: 781 + 1 / 3 },
      { top: 24, bottom: 24, left: 0, right: 0 }, controls.map(rect => ({ ...rect, y: rect.y + offset })));
    const result = geometry.placeBuddyBubble(geometry.nearestBuddyPosition({ x: 300, y: 600 }, fractional), fractional, 252, 124);
    assert.ok(result, 'Fractional Android measurements retain the available placement');
    assert.equal(geometry.buddyPositionClear(result.buddy, fractional), true);
    assert.equal(geometry.buddyOverlayClear({ ...result.rect, y: result.above ? result.rect.y : result.rect.y - 10, height: result.rect.height + 10 }, fractional), true);
  }
});

test('store reaction cooldown spans actor remounts and route visits; tour survives navigation until exit', () => {
  const store = createBuddyStore(); store.environment('/discover', true);
  assert.equal(store.reactOnce('story:a', 0), true); assert.equal(store.reactOnce('story:a', 31000), false);
  assert.equal(store.reactOnce('travel:a', 29000), false); assert.equal(store.reactOnce('travel:a', 30000), true);
  store.environment('/discover', false); store.environment('/discover', true); assert.equal(store.reactOnce('story:a', 61000), false);
  store.setTour(1); store.environment('/create', true); assert.equal(store.getTour(), 1);
  assert.equal(store.reactOnce('story:a', 31000), false); assert.equal(store.reactOnce('story:a', 61000), true);
  store.setTour(null); assert.equal(store.getTour(), null);
});
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

test('Buddy preference starts hidden, ignores old key/invalid data, and survives remount', async () => {
  const values = new Map([['travel-companion-enabled', 'true']]), reads = [];
  const storage = { getItem: async key => { reads.push(key); return values.get(key) ?? null; }, setItem: async (key, value) => values.set(key, value) };
  const preference = createBuddyPreference(storage);
  assert.deepEqual(preference.get(), { enabled: false, loaded: false, chosen: false, error: null });
  await preference.load(); assert.equal(preference.get().enabled, false); assert.deepEqual(reads, [BUDDY_PREFERENCE_KEY]);
  assert.equal(preference.get().chosen, false, 'A fresh install has made no Buddy choice yet');
  await preference.setEnabled(true); assert.equal(preference.get().chosen, true);
  const reopened = createBuddyPreference(storage); await reopened.load(); assert.equal(reopened.get().enabled, true); assert.equal(reopened.get().chosen, true);
  values.set(BUDDY_PREFERENCE_KEY, 'garbage'); const invalid = createBuddyPreference(storage); await invalid.load(); assert.equal(invalid.get().enabled, false);
});
test('first-use choice: a stored off keeps Buddy hidden and counts as chosen; a failed read never prompts', async () => {
  const values = new Map(), storage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => values.set(key, value) };
  const fresh = createBuddyPreference(storage); await fresh.load(); assert.equal(fresh.get().chosen, false);
  await fresh.setEnabled(false); assert.deepEqual(fresh.get(), { loaded: true, enabled: false, chosen: true, error: null });
  const reopened = createBuddyPreference(storage); await reopened.load(); assert.equal(reopened.get().chosen, true, 'Explore myself is remembered');
  const broken = createBuddyPreference({ getItem: async () => { throw Error('read'); }, setItem: async () => {} }); await broken.load();
  assert.equal(broken.get().chosen, true); assert.equal(broken.get().enabled, false);
});
test('late preference hydration cannot revive a newer toggle; writes are serialized in last-choice order', async () => {
  const read = deferred(), first = deferred(), calls = [];
  const preference = createBuddyPreference({ getItem: () => read.promise, setItem: async (_, value) => { calls.push(value); if (calls.length === 1) await first.promise; } });
  const loaded = preference.load();
  const on = preference.setEnabled(true), off = preference.setEnabled(false), again = preference.setEnabled(true);
  read.resolve('false'); await loaded; await tick();
  assert.equal(preference.get().enabled, true); assert.deepEqual(calls, ['true']);
  first.resolve(); await Promise.all([on, off, again]); assert.deepEqual(calls, ['true', 'false', 'true']);
});
test('preference failures fail closed, notify subscribers and allow a later explicit retry', async () => {
  let fail = true, notifications = 0;
  const preference = createBuddyPreference({ getItem: async () => { throw Error('read'); }, setItem: async () => { if (fail) throw Error('write'); } });
  const unsubscribe = preference.subscribe(() => notifications++);
  await preference.load(); assert.equal(preference.get().loaded, true); assert.equal(preference.get().enabled, false); assert.ok(preference.get().error);
  await preference.setEnabled(true); assert.equal(preference.get().enabled, false); assert.ok(preference.get().error);
  fail = false; await preference.setEnabled(true); assert.equal(preference.get().enabled, true); assert.equal(preference.get().error, null);
  unsubscribe(); assert.ok(notifications >= 4);
});
test('a synchronous native storage failure is contained and Buddy stays hidden', async () => {
  const preference = createBuddyPreference({ getItem() { throw Error('native unavailable'); }, setItem: async () => {} });
  await preference.load(); assert.equal(preference.get().enabled, false); assert.equal(preference.get().loaded, true); assert.ok(preference.get().error);
});
test('an older failed write cannot override the latest setting', async () => {
  const first = deferred(); let calls = 0;
  const preference = createBuddyPreference({ getItem: async () => null, setItem: () => ++calls === 1 ? first.promise : Promise.resolve() });
  const earlier = preference.setEnabled(true); await tick(); const later = preference.setEnabled(true);
  first.reject(Error('old')); await Promise.all([earlier, later]);
  assert.equal(preference.get().enabled, true); assert.equal(preference.get().error, null);
});

test('corridors intersect actual host/insets, reject insufficient space and clamp the entire touch canvas', () => {
  const host = { x: 12, y: 20, width: 360, height: 800 }, insets = { top: 24, bottom: 24, left: 0, right: 0 };
  const rect = model.clearCorridor({ x: 10, y: 100, width: 400, height: 72 }, host, insets);
  assert.deepEqual(rect, { x: 4, y: 80, width: 352, height: 72 });
  assert.deepEqual(model.clampBuddy({ x: -99, y: 999 }, rect), { x: 4, y: 88 });
  assert.equal(model.clearCorridor({ x: 12, y: 21, width: 40, height: 200 }, host, insets), null);
  assert.equal(model.clearCorridor({ x: NaN, y: 100, width: 300, height: 72 }, host, insets), null);
  const resized = { x: 4, y: 70, width: 100, height: 64 };
  assert.deepEqual(model.clampBuddy({ x: 292, y: 88 }, resized), { x: 40, y: 70 });
});
test('short walks stay in the same safe corridor, turn at edges, and distinguish drag from tap at 8dp', () => {
  const rect = { x: 8, y: 200, width: 300, height: 72 };
  assert.deepEqual(model.walkTarget({ x: 244, y: 208 }, rect, () => 0.9), { x: 148, y: 208 });
  for (let x = 8; x <= 244; x += 13) for (const rand of [0, 1]) {
    const next = model.walkTarget({ x, y: 208 }, rect, () => rand);
    assert.ok(next.x >= 8 && next.x <= 244); assert.equal(next.y, 208); assert.ok(Math.abs(next.x - x) <= 96);
  }
  assert.equal(model.buddyDragged(7, 0), false); assert.equal(model.buddyDragged(0, 8), true); assert.equal(model.buddyDragged(6, 6), true);
});
test('route policy excludes authentication, profile editing and unknown routes', () => {
  for (const path of ['/discover', '/search', '/account', '/create', '/draft/id', '/journey/id', '/customized/id', '/travel/id', '/profile/explorer']) assert.equal(model.isBuddyRoute(path), true, path);
  for (const path of ['/auth', '/profile/edit', '/customize/id', '/customized', '/customized/id/edit', '/unknown']) assert.equal(model.isBuddyRoute(path), false, path);

});

test('screen ownership composes parent suppression with child actions without leaking across focus or routes', () => {
  const store = createBuddyStore(), parent = {}, child = {}, modal = {}, region = {}; let old = 0, fresh = 0;
  store.environment('/create', true);
  store.screen(child, { path: '/create', state: { floating: true, canAddMemory: true }, act: () => old++ });
  store.screen(parent, { path: '/create', state: {}, act() {} });
  assert.equal(store.current().state.canAddMemory, true, 'Parent commit order does not mask editor capability');
  const owner = store.actionOwner();
  store.screen(child, { path: '/create', state: { floating: true, canAddMemory: true }, act: () => fresh++ });
  assert.equal(store.act(owner, '/create', 'addMemory'), true); assert.equal(old, 0); assert.equal(fresh, 1);
  store.block(modal, '/create', true); assert.equal(store.act(owner, '/create', 'addMemory'), false);
  store.block(modal, '/create', false); store.screen(parent, { path: '/create', state: { suppressed: true }, act() {} });
  assert.equal(store.current().suppressed, true); assert.equal(store.act(owner, '/create', 'addMemory'), false);
  store.screen(parent, { path: '/create', state: {}, act() {} });
  store.region(region, '/create', { x: 0, y: 600, width: 300, height: 72 }); assert.equal(store.current().regions.length, 1);
  store.environment('/search', true); assert.equal(store.current().regions.length, 0); assert.equal(store.act(owner, '/create', 'addMemory'), false);
  store.removeScreen(child); store.environment('/create', true); assert.equal(store.act(owner, '/create', 'addMemory'), false);
  store.environment('/create', false); assert.equal(store.current().suppressed, true);
  store.removeRegion(region); assert.equal(store.current().regions.length, 0);
});
test('identical semantic registration does not publish on timer renders; action closures still refresh', () => {
  const store = createBuddyStore(), token = {}; let events = 0, called = 0;
  store.environment('/create', true); store.subscribe(() => events++);
  store.screen(token, { path: '/create', state: { floating: true, canAddMemory: true }, act() {} });
  store.screen(token, { path: '/create', state: { floating: true, canAddMemory: true }, act: () => called++ });
  assert.equal(events, 1); store.act(token, '/create', 'addMemory'); assert.equal(called, 1);
  store.removeScreen({}); assert.equal(events, 1, 'Unrelated cleanup cannot remove another owner');
});
test('parent/child registration order preserves travel semantics and editor capability in either order', () => {
  const travel = { journeyId: 'trip', status: 'active', nextStop: 'Hill', gpsAvailable: true, guidance: 'Continue', arrival: false, completed: 0 };
  for (const childFirst of [true, false]) {
    for (const state of [{ travel }, { canAddMemory: true }]) {
      const store = createBuddyStore(), parent = {}, child = {}; store.environment('/create', true);
      const addParent = () => store.screen(parent, { path: '/create', state: {}, act() {} });
      const addChild = () => store.screen(child, { path: '/create', state, act() {} });
      if (childFirst) { addChild(); addParent(); } else { addParent(); addChild(); }
      assert.deepEqual(store.current().state, state);
      store.screen(parent, { path: '/create', state: { suppressed: true }, act() {} }); assert.equal(store.current().suppressed, true);
    }
  }
});
test('travel reactions are once per event, cooldown limited, quiet for maneuver/arrival and do not replay after resume', () => {
  let now = 0; const reactions = model.createBuddyReactions(() => now);
  const travel = { journeyId: 'trip', status: 'active', nextStop: 'Beach', gpsAvailable: true, guidance: null, arrival: false, completed: 0 };
  reactions.reset(travel); now = 31000;
  assert.equal(reactions.read(travel), null);
  assert.ok(reactions.read({ ...travel, completed: 1 })); assert.equal(reactions.read({ ...travel, completed: 1 }), null);
  now += 31000; assert.equal(reactions.read({ ...travel, arrival: true, completed: 1 }), null);
  assert.equal(reactions.read({ ...travel, nextStop: 'Hill', guidance: 'Turn left', completed: 1 }), null);
  assert.ok(reactions.read({ ...travel, status: 'completed', nextStop: null, completed: 2 }));
  reactions.reset(travel); now += 16000; assert.equal(reactions.read(travel), null);
});

test('bundled sprites match manifest frame geometry and optional future animations fall back to idle', () => {
  for (const [name, fps] of [['idle', 4], ['walk', 10], ['sleep', 4]]) {
    const animation = animations.resolveBuddyAnimation(name), png = readFileSync('assets/journey-buddy/' + (name === 'idle' ? 'idle-curious' : name) + '.png');
    assert.equal(png.toString('ascii', 1, 4), 'PNG'); assert.equal(png.readUInt32BE(16), animation.sheetWidth); assert.equal(png.readUInt32BE(20), animation.sheetHeight);
    assert.equal(animation.frames, name === 'idle' ? 16 : 8); assert.equal(animation.fps, fps); assert.equal(animation.anchor.y, 1);
    assert.deepEqual(animations.spriteFrame(animation, 7), name === 'idle' ? { width: 256, height: 256, left: -192, top: -64 } : { width: 512, height: 64, left: -448, top: -0 });
    for (let frame = 0; frame < animation.frames; frame++) {
      const crop = animations.spriteFrame(animation, frame);
      assert.ok(-crop.left + 64 <= crop.width && -crop.top + 64 <= crop.height, 'Every frame stays inside the sheet');
    }
  }
  assert.equal(animations.resolveBuddyAnimation('missing'), animations.resolveBuddyAnimation('idle'));
  const ref = readFileSync('assets/journey-buddy/reference.png'); assert.equal(ref.readUInt32BE(16), 128); assert.equal(ref.readUInt32BE(20), 128);
});

function hooks() {
  const slots = []; let cursor = 0, effects = [];
  const react = {
    memo: fn => fn,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback: (fn, deps) => react.useMemo(() => fn, deps),
    useEffect: (fn, deps) => { const i = cursor++; if (!slots[i] || !deps || deps.some((v, j) => v !== slots[i].deps?.[j])) { slots[i]?.cleanup?.(); const slot = slots[i] = { deps }; effects.push(() => { slot.cleanup = fn(); }); } },
  };
  return { react, render(fn, props) { cursor = 0; effects = []; const result = fn(props); effects.forEach(fn => fn()); return result; }, dispose() { slots.forEach(s => s?.cleanup?.()); } };
}
function clock() {
  const jobs = new Map(); let serial = 0;
  return { jobs, setTimeout: (fn, ms) => { jobs.set(++serial, { fn, ms, interval: false }); return serial; }, clearTimeout: id => jobs.delete(id),
    setInterval: (fn, ms) => { jobs.set(++serial, { fn, ms, interval: true }); return serial; }, clearInterval: id => jobs.delete(id),
    fire() { for (const [id, job] of [...jobs]) { if (!job.interval) jobs.delete(id); job.fn(); } } };
}
const jsx = (type, props) => ({ type, props });
const runtime = { jsx, jsxs: jsx, Fragment: 'Fragment' };
function all(tree, type) { if (!tree || typeof tree !== 'object') return []; return [...(type === undefined || tree.type === type ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(n => all(n, type))]; }
test('actual isolated sprite clock crops Walk, freezes for reduced/paused motion, falls back on image errors and cleans unmount', () => {
  const h = hooks(), timers = clock();
  const { BuddySprite } = load('src/components/buddy/buddy-sprite.tsx', { react: h.react, 'react/jsx-runtime': runtime, 'react-native': { Image: 'Image', View: 'View', Text: 'Text' }, '@/lib/buddy/animations': animations }, timers);
  let props = { animation: 'walk', animate: true, facing: 'right' }, tree = h.render(BuddySprite, props);
  assert.equal(timers.jobs.size, 1); assert.equal([...timers.jobs.values()][0].ms, 100); timers.fire();
  tree = h.render(BuddySprite, props); assert.equal(all(tree, 'Image')[0].props.style.left, -64); assert.equal(tree.props.style.transform[0].scaleX, -1);
  props = { ...props, animate: false }; tree = h.render(BuddySprite, props); assert.equal(timers.jobs.size, 0); assert.equal(tree.props.source, animations.buddyReference);
  props = { ...props, animate: true }; tree = h.render(BuddySprite, props); all(tree, 'Image')[0].props.onError();
  tree = h.render(BuddySprite, props); assert.equal(timers.jobs.size, 0); assert.equal(tree.props.source, animations.buddyReference);
  tree.props.onError(); assert.equal(h.render(BuddySprite, props), null); h.dispose(); assert.equal(timers.jobs.size, 0);
});
test('future non-looping sprites stop their frame clock at the final frame', () => {
  const h = hooks(), timers = clock(), clip = { ...animations.resolveBuddyAnimation('idle'), frames: 3, loop: false, fps: 10 };
  const { BuddySprite } = load('src/components/buddy/buddy-sprite.tsx', { react: h.react, 'react/jsx-runtime': runtime, 'react-native': { Image: 'Image', View: 'View', Text: 'Text' }, '@/lib/buddy/animations': { ...animations, resolveBuddyAnimation: () => clip } }, timers);
  const props = { animation: 'wave', animate: true }; h.render(BuddySprite, props); timers.fire(); timers.fire();
  const tree = h.render(BuddySprite, props); assert.equal(timers.jobs.size, 0); assert.equal(all(tree, 'Image')[0].props.style.left, -128); h.dispose();
});

test('original Jump and Run PNG geometry uses exact cells and Jump clips without neighboring-frame bleed', () => {
  const jump = animations.resolveBuddyAnimation('jump'), run = animations.resolveBuddyAnimation('run');
  for (const [name, clip, width, height, cell] of [['jump', jump, 1440, 189, 180], ['run', run, 1024, 128, 128]]) {
    const png = readFileSync('assets/journey-buddy/' + (name === 'idle' ? 'idle-curious' : name) + '.png');
    assert.equal(png.readUInt32BE(16), width); assert.equal(png.readUInt32BE(20), height);
    assert.equal(png[25], 6, 'Original RGBA remains intact'); assert.equal(clip.frameWidth, cell); assert.equal(clip.frames, 8);
  }
  assert.equal(jump.loop, false); assert.equal(jump.fps, 4); assert.equal(run.loop, true);
  assert.equal(animations.buddyCelebrationDuration('jump'), 2000); assert.equal(animations.buddyCelebrationDuration('run'), 3000);
  const h = hooks(), timers = clock();
  const { BuddySprite } = load('src/components/buddy/buddy-sprite.tsx', { react: h.react, 'react/jsx-runtime': runtime, 'react-native': { Image: 'Image', View: 'View', Text: 'Text' }, '@/lib/buddy/animations': animations }, timers);
  const props = { animation: 'jump', animate: true };
  let tree = h.render(BuddySprite, props);
  assert.equal([...timers.jobs.values()][0].ms, 250, 'One slower cycle displays each of the eight frames');
  assert.equal(tree.props.style.width, 64 * 180 / 189); assert.equal(tree.props.style.alignSelf, 'center');
  for (let i = 0; i < 7; i++) timers.fire();
  tree = h.render(BuddySprite, props); assert.equal(all(tree, 'Image')[0].props.style.left, -7 * 180 * (64 / 189));
  assert.equal(timers.jobs.size, 0); h.dispose();
});

test('success events deduplicate operation identities, reject overlap and clear on new touch/background/navigation/dialog', () => {
  const store = createBuddyStore(); store.environment('/create', true);
  const first = {}; assert.equal(store.celebrate('/create', 'jump', first, 0), true);
  assert.equal(store.celebrate('/create', 'jump', first, 1), false);
  assert.equal(store.celebrate('/create', 'run', {}, 1), false);
  const id = store.getCelebration(1).id;
  assert.ok(store.claimCelebration(id, 2)); assert.equal(store.claimCelebration(id, 3), null);
  store.interaction(true); assert.equal(store.getCelebration(3), null);
  assert.equal(store.celebrate('/create', 'jump', {}, 10), true); assert.ok(store.getCelebration(10)); store.environment('/create', false); assert.equal(store.getCelebration(11), null);
  assert.equal(store.celebrate('/create', 'jump', {}, 11), false);
  store.environment('/create', true); assert.equal(store.celebrate('/create', 'jump', {}, 20), true); assert.ok(store.getCelebration(20)); store.environment('/discover', true); assert.equal(store.getCelebration(21), null);
  assert.equal(store.celebrate('/discover', 'run', {}, 30), true); assert.ok(store.getCelebration(30)); store.block({}, '/discover', true); assert.equal(store.getCelebration(31), null);
  assert.equal(store.celebrate('/discover', 'run', {}, 31), false, 'Run never queues behind a dialog or keyboard');
  assert.equal(store.celebrate('/discover', 'jump', {}, 40), true); assert.ok(store.getCelebration(40)); store.screen({}, { path: '/discover', state: { suppressed: true }, act() {} }); assert.equal(store.getCelebration(41), null);
  store.celebrate('/discover', 'jump', {}, 50); const stale = store.getCelebration(50).id;
  assert.equal(store.claimCelebration(stale, 6050), null);
  assert.equal(store.celebrate('/discover', 'jump', {}, 6051), true);
  store.clearCelebration(stale); assert.ok(store.getCelebration(6052), 'Old completion cannot clear a newer event');
});
test('actual anchored helper offers two contextual actions and never saves automatically', () => {
  const h = hooks(); let creates = 0, drafts = 0, adds = 0;
  const { BuddyHelpSheet } = load('src/components/buddy/buddy-help-sheet.tsx', { react: h.react, 'react/jsx-runtime': runtime, 'react-native': { BackHandler: { addEventListener: () => ({ remove() {} }) }, Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: v => v } }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/lib/buddy/model': model });
  const props = { canAddMemory: false, onAddMemory: () => adds++, onCreate: () => creates++, onDrafts: () => drafts++, onClose() {} };
  let tree = h.render(BuddyHelpSheet, props); assert.equal(creates + drafts + adds, 0);
  // Components remain function-valued in this small JSX harness.
  const findAction = label => { const visit = node => !node || typeof node !== 'object' ? null : typeof node.type === 'function' && node.props.label === label ? node : [node.props?.children].flat(Infinity).map(visit).find(Boolean); return visit(tree); };
  findAction('Open my drafts').props.onPress(); assert.equal(drafts, 1); assert.equal(adds, 0);
  assert.equal(all(tree, 'Modal').length, 0); assert.equal(tree.props.testID, 'buddy-speech-bubble');
  assert.equal(all(all(tree, 'ScrollView')[0], 'Pressable').length, 0, 'Actions never scroll away with the message');
  assert.equal(all(tree, 'View').find(n => n.props.testID === 'buddy-bubble-actions').props.style.flexShrink, 0, 'Both actions keep their space in a124dp bubble');
  tree = h.render(BuddyHelpSheet, { ...props, canAddMemory: true }); findAction('Capture a moment').props.onPress(); assert.equal(adds, 1);
  assert.equal(creates, 0); assert.ok(findAction('Show me around')); h.dispose();
});

test('manual help dialog is visible without measurement, retains actions and dismisses via close or Android Back', () => {
  const h = hooks(); let closes = 0, drafts = 0, back;
  const { BuddyHelpSheet } = load('src/components/buddy/buddy-help-sheet.tsx', {
    react: h.react, 'react/jsx-runtime': runtime, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react-native': { BackHandler: { addEventListener: (_, callback) => { back = callback; return { remove() {} }; } },
      Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: value => value, absoluteFill: {} } },
    '@/lib/buddy/model': model,
  });
  const tree = h.render(BuddyHelpSheet, { fallback: true, canAddMemory: false, onClose: () => closes++, onDrafts: () => drafts++, onCreate() {}, onAddMemory() {} });
  assert.equal(tree.type, 'Modal'); assert.equal(tree.props.visible, true);
  const surface = all(tree, 'View').find(n => n.props.testID === 'buddy-speech-bubble');
  assert.equal(surface.props.pointerEvents, 'auto'); assert.equal(surface.props.accessibilityViewIsModal, true);
  assert.equal(surface.props.accessibilityElementsHidden, false); assert.equal(surface.props.onLayout, undefined);
  assert.equal(surface.props.style[1].opacity, 1);
  const draftAction = all(tree, undefined).find(n => n.props?.label === 'Open my drafts');
  draftAction.props.onPress(); assert.equal(drafts, 1);
  tree.props.onRequestClose(); assert.equal(closes, 1);
  assert.equal(back(), true); assert.equal(closes, 2);
  all(tree, 'Pressable').find(n => n.props.accessibilityLabel === 'Close Journey Buddy help').props.onPress(); assert.equal(closes, 3);
  h.dispose();
});

async function hostHarness(openSpace = false, contextual = false) {
  const hostHooks = hooks(); let actorHooks = hooks(); const timers = clock(); let currentHooks = hostHooks;
  const react = Object.fromEntries(Object.keys(hostHooks.react).map(name => [name, (...args) => currentHooks.react[name](...args)]));
  react.useSyncExternalStore = (_, get) => get();
  const api = { store: createBuddyStore(), preference: createBuddyPreference({ getItem: async () => null, setItem: async () => {} }) };
  await api.preference.load(); await api.preference.setEnabled(true);
  let path = '/create'; api.store.environment(path, true);
  const owner = {}, region = {}; let adds = 0;
  api.store.screen(owner, { path, state: { floating: true, canAddMemory: true }, act: () => adds++ });
  api.store.protect(region, path, openSpace ? [] : [{ x: 0, y: 0, width: 360, height: 592 }, { x: 0, y: 680, width: 360, height: 120 }]);
  api.store.onMeasure(() => api.store.protect(region, path, api.store.current().protectedRects));
  const native = {
    delayCaptures: false, pendingCaptures: [], nativePoint: null,
    View: 'View', Pressable: 'Pressable', Text: 'Text', StyleSheet: { create: v => v, absoluteFill: {} }, AppState: { currentState: 'active', addEventListener: (_, fn) => { native.appState = fn; return { remove() {} }; } },
    useWindowDimensions: () => ({ width: 360, height: 800 }),
    AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: (_, fn) => { native.motion = fn; return { remove() {} }; } },
    PanResponder: { create: config => ({ panHandlers: config }) },
    Animated: { View: 'AnimatedView', ValueXY: class {
      constructor(value) { this.value = value; const stop = axis => fn => { if (!fn) return; const next = (native.nativePoint ?? this.value)[axis]; if (native.delayCaptures) native.pendingCaptures.push(() => fn(next)); else fn(next); }; this.x = { stopAnimation: stop('x') }; this.y = { stopAnimation: stop('y') }; }
      stopAnimation(fn) { fn?.(this.value); }
      setValue(value) { this.value = value; }
      getTranslateTransform() { return [{ translateX: this.value.x }, { translateY: this.value.y }]; }
    }, timing: (value, config) => ({ start(fn) { native.animation = { value, config, finish: () => { value.setValue(config.toValue); fn({ finished: true }); } }; } }) },
  };
  const routes = []; let placementCalls = 0;
  const module = load('src/components/buddy/journey-buddy-host.tsx', {
    react, 'react/jsx-runtime': runtime, 'react-native': native,
    'expo-router': { usePathname: () => path, useRouter: () => ({ navigate: route => routes.push(route) }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 4, right: 4 }) },
    '@/hooks/use-journey-buddy': { useBuddyApi: () => api }, '@/lib/buddy/model': model,
    '@/hooks/use-buddy-sleep': load('src/hooks/use-buddy-sleep.ts', { react, 'react-native': native }, timers),
    '@/lib/buddy/position': { createBuddyPositionCapture }, '@/lib/buddy/geometry': { ...geometry,
      placeBuddyBubble(...args) { placementCalls++; return geometry.placeBuddyBubble(...args); } },
    '@/lib/buddy/animations': animations,
    '@/lib/buddy/contextual-lines': { ...load('src/lib/buddy/contextual-lines.ts'), ...(!contextual ? { buddyContextLine: () => undefined } : {}) },
    '@/lib/buddy/help-actions': load('src/lib/buddy/help-actions.ts'),
    './buddy-sprite': { BuddySprite: 'BuddySprite' }, './buddy-help-sheet': { BuddyHelpSheet: 'BuddyHelpSheet' },
    './map-buddy-help': { MapBuddyHelp: 'MapBuddyHelp' },
  }, timers);
  const hostElement = module.JourneyBuddyHost(); let actorElement;
  const renderHost = () => {
    currentHooks = hostHooks;
    let tree = hostHooks.render(hostElement.type, hostElement.props);
    tree.props.ref.current = { measureInWindow: fn => fn(0, 0, 360, 800) }; tree.props.onLayout();
    tree = hostHooks.render(hostElement.type, hostElement.props); actorElement = tree.props.children;
    return tree;
  };
  const renderActor = overrides => {
    currentHooks = actorHooks;
    return actorHooks.render(actorElement.type, { ...actorElement.props, ...overrides });
  };
  return { api, native, timers, routes, owner, region, renderHost, renderActor, get placementCalls() { return placementCalls; }, get actorHooks() { return actorHooks; }, hostHooks, adds: () => adds,
    remountActor() { actorHooks.dispose(); actorHooks = hooks(); return renderActor(); },
    path: value => { path = value; api.store.environment(value, true); } };
}

function fireDelay(h, milliseconds) {
  for (const [id, job] of [...h.timers.jobs]) if (job.ms === milliseconds) { h.timers.jobs.delete(id); job.fn(); }
}
function fireRoaming(h) {
  for (const [id, job] of [...h.timers.jobs]) if (job.ms >= 15000 && job.ms <= 30000) { h.timers.jobs.delete(id); job.fn(); }
}
function settleActor(h) { h.renderHost(); h.renderActor(); h.renderHost(); h.renderActor(); return h.renderActor(); }
test('actual floating host yields to registered map Buddy, returns for successful animation and preserves modal help access', async () => {
  const h = await hostHarness(true), map = {};
  h.api.store.mapPresentation(map, '/create', true);
  assert.equal(h.renderHost().props.children, false, 'Only the map character is presented');
  h.api.store.celebrate('/create', 'jump', {}); h.renderHost(); h.renderActor(); await tick();
  let tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'jump');
  fireDelay(h, 2000); assert.equal(h.renderHost().props.children, false, 'Map ownership resumes after feedback');
  assert.equal(h.api.store.openMapHelp('/create'), true);
  assert.equal(h.renderHost().props.children.type, 'MapBuddyHelp', 'Help remains available without an empty floating corridor');
  h.api.store.closeMapHelp(); h.actorHooks.dispose(); h.hostHooks.dispose();
});
test('actual actor plays Jump once, restores Idle, and cannot replay consumed success after remount', async () => {
  const h = await hostHarness(true); h.renderHost(); h.renderActor(); await tick(); settleActor(h);
  const operation = {}, before = all(h.renderActor(), 'AnimatedView')[0].props.style[1].transform;
  assert.equal(h.api.store.celebrate('/create', 'jump', operation), true);
  let tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'jump');
  assert.deepEqual(all(tree, 'AnimatedView')[0].props.style[1].transform, before);
  assert.equal(h.api.store.celebrate('/create', 'run', {}), false);
  assert.equal(h.api.store.celebrate('/create', 'jump', operation), false);
  fireDelay(h, 800); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'jump', 'Jump stays visible beyond the old short duration');
  fireDelay(h, 2000); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle');
  h.remountActor(); await tick(); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle');
  h.actorHooks.dispose(); h.hostHooks.dispose(); assert.equal(h.timers.jobs.size, 0);
});
test('actual actor waits through initiating interaction, runs in place briefly and cancels for guidance or new touch', async () => {
  const h = await hostHarness(true);
  const travel = { journeyId: 'trip', status: 'active', nextStop: 'Hill', gpsAvailable: false, guidance: null, arrival: false, completed: 0 };
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true, travel }, act() {} });
  h.renderHost(); h.renderActor(); await tick(); settleActor(h);
  h.api.store.interaction(true); h.api.store.celebrate('/create', 'run', {});
  let tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle');
  h.api.store.interaction(false); const before = all(tree, 'AnimatedView')[0].props.style[1].transform;
  tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'run');
  assert.deepEqual(all(tree, 'AnimatedView')[0].props.style[1].transform, before); assert.equal(h.native.animation, undefined);
  fireDelay(h, 1000); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'run', 'Run stays visible beyond one second');
  fireDelay(h, 3000); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle');
  h.api.store.celebrate('/create', 'run', {}); settleActor(h);
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true, travel: { ...travel, guidance: 'Turn left' } }, act() {} });
  tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle'); assert.equal(h.api.store.getCelebration(), null);
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true, travel }, act() {} }); settleActor(h);
  h.api.store.celebrate('/create', 'run', {}); settleActor(h);
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true, travel: { ...travel, arrival: true } }, act() {} });
  tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle'); assert.equal(h.api.store.getCelebration(), null);
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true, travel }, act() {} }); settleActor(h);
  h.api.store.celebrate('/create', 'run', {}); settleActor(h); h.api.store.interaction(true);
  tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle'); assert.equal(h.api.store.getCelebration(), null);
  h.actorHooks.dispose(); h.hostHooks.dispose();
});
test('actual actor discards reduced-motion, help and arrival celebrations and cleans playback on suppression', async () => {
  const h = await hostHarness(true); h.renderHost(); h.renderActor(); await tick(); settleActor(h);
  h.native.motion(true); h.api.store.celebrate('/create', 'jump', {});
  let tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false); assert.equal(h.api.store.getCelebration(), null);
  h.native.motion(false); tree = settleActor(h);
  all(tree, 'View').find(node => node.props.accessibilityLabel === 'Journey Buddy').props.onAccessibilityTap();
  h.api.store.celebrate('/create', 'jump', {}); tree = settleActor(h);
  assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle'); assert.equal(h.api.store.getCelebration(), null);
  all(tree, 'BuddyHelpSheet')[0].props.onClose(); settleActor(h);
  h.api.store.celebrate('/create', 'jump', {}); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'jump');
  h.api.store.block({}, '/create', true); assert.equal(h.renderHost().props.children, false);
  h.actorHooks.dispose(); h.hostHooks.dispose(); assert.equal(h.api.store.getCelebration(), null); assert.equal(h.timers.jobs.size, 0);
});
test('actual global host requires enabled/foreground/allowed route/measured clearance and passes through all empty space', async () => {
  const h = await hostHarness(); let tree = h.renderHost(); assert.equal(tree.props.pointerEvents, 'box-none'); assert.ok(tree.props.children);
  const hostLayer = tree.props.style[1];
  assert.equal(hostLayer.zIndex, 30); assert.equal(hostLayer.elevation, 20, 'The global overlay itself rises above native maps/screens');
  assert.ok(hostLayer.zIndex > 25, 'Layering is on the root host, not only the nested actor');
  const loadingSource = ts.createSourceFile('branded-loading.tsx', readFileSync('src/components/branded-loading.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let startupLayer;
  const visitLayer = node => {
    if (ts.isPropertyAssignment(node) && node.name.getText(loadingSource) === 'overlay' && ts.isObjectLiteralExpression(node.initializer)) startupLayer = node.initializer;
    ts.forEachChild(node, visitLayer);
  };
  visitLayer(loadingSource); assert.ok(startupLayer);
  const startup = new Function('return (' + startupLayer.getText(loadingSource) + ');')();
  assert.ok(startup.zIndex > hostLayer.zIndex && startup.elevation > hostLayer.elevation, 'Startup overlay retains visual priority');
  assert.equal(tree.props.onStartShouldSetResponder, undefined); assert.equal(tree.props.onStartShouldSetResponderCapture, undefined, 'Transparent host never captures app-control touches');
  await h.api.preference.setEnabled(false); assert.equal(h.renderHost().props.children, false);
  await h.api.preference.setEnabled(true); h.api.store.environment('/create', false); assert.equal(h.renderHost().props.children, false);
  h.api.store.environment('/create', true); h.api.store.protect(h.region, '/create', [{ x: 0, y: 0, width: 360, height: 800 }]); assert.equal(h.renderHost().props.children, false);
  h.path('/auth'); assert.equal(h.renderHost().props.children, false); h.hostHooks.dispose();
});
test('actual actor walks on low-frequency schedule, pauses interaction, clamps drag, parks and never turns a drag back to origin into a tap', async () => {
  const h = await hostHarness(); h.renderHost(); let tree = h.renderActor(); await tick(); tree = h.renderActor();
  assert.equal(h.timers.jobs.size, 2); const wait = [...h.timers.jobs.values()].find(job => job.ms !== 60000).ms; assert.ok(wait >= 15000 && wait <= 30000);
  fireRoaming(h); tree = h.renderActor(); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'walk');
  assert.equal(h.native.animation.config.useNativeDriver, true); assert.equal(h.native.animation.config.isInteraction, false);
  h.native.animation.finish(); tree = h.renderActor(); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle');
  tree = h.renderActor({ interacting: true }); assert.equal([...h.timers.jobs.values()].filter(job => job.ms !== 60000).length, 0); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false);
  tree = h.renderActor(); const responder = all(tree, 'View').find(n => n.props.onPanResponderGrant).props;
  responder.onPanResponderGrant(); responder.onPanResponderMove(null, { dx: -9999, dy: 9999 }); responder.onPanResponderMove(null, { dx: 0, dy: 0 }); responder.onPanResponderRelease(null, { dx: 0, dy: 0 });
  tree = h.renderActor(); assert.equal(all(tree, 'BuddyHelpSheet').length, 0); assert.equal([...h.timers.jobs.values()].filter(job => job.ms !== 60000).length, 0);
  const transform = all(tree, 'AnimatedView')[0].props.style[1].transform;
  assert.ok(transform[0].translateX >= 8); assert.ok(transform[1].translateY <= 608);
  h.actorHooks.dispose(); h.hostHooks.dispose(); assert.equal(h.timers.jobs.size, 0);
});
test('one bounded accessible View owns native Buddy gestures; drag cannot trigger a competing press and ordinary tap opens help once', async () => {
  const h = await hostHarness(); h.renderHost(); let tree = h.renderActor(); await tick(); tree = h.renderActor();
  let owner = all(tree, 'View').find(n => n.props.accessibilityLabel === 'Journey Buddy');
  assert.ok(owner); assert.equal(owner.props.pointerEvents, 'box-only'); assert.equal(owner.props.collapsable, false);
  assert.equal(owner.props.accessible, true); assert.equal(owner.props.focusable, true); assert.equal(owner.props.accessibilityRole, 'button');
  assert.equal(all(tree, 'Pressable').length, 0, 'No child Pressable can claim the responder or dispatch onPress after a drag');
  assert.equal(owner.props.onPress, undefined); assert.equal(owner.props.onStartShouldSetPanResponder(), true); assert.equal(owner.props.onStartShouldSetPanResponderCapture(), true);
  const onlyOwners = all(tree, 'View').filter(n => n.props.onPanResponderGrant); assert.equal(onlyOwners.length, 1); assert.equal(onlyOwners[0], owner);
  assert.equal(owner.props.style.width, 64); assert.equal(owner.props.style.height, 64);
  owner.props.onPanResponderGrant(); owner.props.onPanResponderMove(null, { dx: -70, dy: 0 }); owner.props.onPanResponderRelease(null, { dx: -70, dy: 0 });
  tree = h.renderActor(); assert.equal(all(tree, 'BuddyHelpSheet').length, 0); assert.equal(all(tree, 'AnimatedView')[0].props.style[1].transform[0].translateX, 218);
  owner = all(tree, 'View').find(n => n.props.accessibilityLabel === 'Journey Buddy');
  owner.props.onPanResponderGrant(); owner.props.onPanResponderRelease(null, { dx: 2, dy: 1 }); tree = h.renderActor(); assert.equal(all(tree, 'BuddyHelpSheet').length, 1);
  all(tree, 'BuddyHelpSheet')[0].props.onClose(); tree = h.renderActor(); owner = all(tree, 'View').find(n => n.props.accessibilityLabel === 'Journey Buddy');
  assert.deepEqual(owner.props.accessibilityActions, [{ name: 'activate', label: 'Open journey help' }]);
  owner.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } }); tree = h.renderActor(); assert.equal(all(tree, 'BuddyHelpSheet').length, 1);
  h.actorHooks.dispose(); h.hostHooks.dispose();
});
test('actual actor helper actions reject stale route, disabled preference and removed owner; reduced motion is static', async () => {
  const h = await hostHarness(); h.renderHost(); let tree = h.renderActor(); await tick(); h.renderActor();
  h.native.motion(true); tree = h.renderActor(); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false); assert.equal([...h.timers.jobs.values()].filter(job => job.ms !== 60000).length, 0);
  all(tree, 'View').find(n => n.props.accessibilityLabel === 'Journey Buddy').props.onAccessibilityTap(); tree = h.renderActor(); const help = all(tree, 'BuddyHelpSheet')[0]; assert.ok(help); assert.equal(help.props.canAddMemory, true);
  await h.api.preference.setEnabled(false); help.props.onAddMemory(); assert.equal(h.adds(), 0);
  await h.api.preference.setEnabled(true); h.api.store.removeScreen(h.owner); help.props.onAddMemory(); assert.equal(h.adds(), 0);
  h.path('/search'); help.props.onCreate(); assert.deepEqual(h.routes, []);
  h.actorHooks.dispose(); help.props.onDrafts(); assert.deepEqual(h.routes, []); h.hostHooks.dispose(); assert.equal(h.timers.jobs.size, 0);
});

async function integrationHarness(sharedApi = null) {
  const h = hooks(), timers = clock(), api = sharedApi ?? { store: createBuddyStore(), preference: createBuddyPreference({ getItem: async () => null, setItem: async () => {} }) };
  await api.preference.load(); let path = '/create';
  const appListeners = new Set(), keyboard = new Map();
  const native = { View: 'View',
    AppState: { currentState: 'active', addEventListener: (_, fn) => { appListeners.add(fn); return { remove: () => appListeners.delete(fn) }; } },
    Keyboard: { isVisible: () => true, addListener: (name, fn) => { keyboard.set(name, fn); return { remove: () => keyboard.delete(name) }; } },
  };
  const react = { ...h.react, createContext: () => ({}), useContext: () => api, useSyncExternalStore: (_, get) => get() };
  const module = load('src/hooks/use-journey-buddy.tsx', { react, 'react/jsx-runtime': runtime, 'react-native': native,
    '@react-native-async-storage/async-storage': { getItem: async () => null, setItem: async () => {} },
    'expo-router': { usePathname: () => path, useFocusEffect: fn => h.react.useEffect(fn, [fn]) },
    '@/lib/buddy/store': { createBuddyStore }, '@/lib/buddy/preference': { createBuddyPreference } }, timers);
  return { h, timers, api, module, native, appListeners, keyboard, path: value => { path = value; } };
}
test('actual touch boundary initializes keyboard suppression, never captures responders, and cancels all cooldowns when disabled/backgrounded/unmounted', async () => {
  const x = await integrationHarness(), render = () => x.h.render(x.module.BuddyTouchBoundary, { children: 'app' });
  let tree = render(); assert.equal(tree.props.onStartShouldSetResponder, undefined); assert.equal(x.api.store.current().suppressed, true, 'Already open keyboard suppresses Buddy');
  x.keyboard.get('keyboardDidHide')(); assert.equal(x.api.store.current().suppressed, false);
  tree.props.onTouchStart(); tree.props.onTouchEnd(); assert.equal(x.timers.jobs.size, 0, 'Disabled means no interaction timer');
  await x.api.preference.setEnabled(true); tree.props.onTouchStart(); assert.equal(x.api.store.current().interacting, true); tree.props.onTouchEnd(); assert.equal(x.timers.jobs.size, 1);
  tree.props.onTouchEnd({ nativeEvent: { touches: [{}] } }); assert.equal(x.timers.jobs.size, 0, 'Remaining pinch finger keeps walking paused'); assert.equal(x.api.store.current().interacting, true);
  tree.props.onTouchEnd({ nativeEvent: { touches: [] } }); assert.equal(x.timers.jobs.size, 1);
  await x.api.preference.setEnabled(false); assert.equal(x.timers.jobs.size, 0); assert.equal(x.api.store.current().interacting, false);
  await x.api.preference.setEnabled(true); tree.props.onTouchEnd(); assert.equal(x.timers.jobs.size, 1);
  x.native.AppState.currentState = 'background'; x.appListeners.forEach(fn => fn('background')); assert.equal(x.timers.jobs.size, 0); assert.equal(x.api.store.current().suppressed, true);
  x.native.AppState.currentState = 'active'; x.appListeners.forEach(fn => fn('active')); tree.props.onTouchEnd(); assert.equal(x.timers.jobs.size, 1);
  x.h.dispose(); assert.equal(x.timers.jobs.size, 0); assert.equal(x.appListeners.size, 0); assert.equal(x.keyboard.size, 0);
});

test('confirmed Jump and Run skip only released-touch cooldown; held/new input and completion overlays retain priority', async () => {
  const h = await hostHarness(true), boundary = await integrationHarness(h.api);
  const touch = boundary.h.render(boundary.module.BuddyTouchBoundary, { children: 'app' }).props;
  touch.onTouchStart();
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true, suppressed: true }, act() {} });
  assert.equal(h.api.store.getCelebration(), null, 'Save touch itself has no success animation');
  touch.onTouchEnd({ nativeEvent: { touches: [] } });
  h.api.store.celebrate('/create', 'jump', {});
  assert.equal(h.api.store.current().touchCooldown, true);
  assert.equal(h.renderHost().props.children, false, 'Editor/keyboard suppression remains absolute');
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true }, act() {} });
  assert.equal(h.renderHost().props.children, false, 'Keyboard alone still suppresses Buddy');
  boundary.keyboard.get('keyboardDidHide')();
  h.renderHost(); h.renderActor(); await tick();
  let tree = settleActor(h);
  assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'jump', 'No cooldown timer advances before Jump');
  assert.ok([...boundary.timers.jobs.values()].some(job => job.ms === 3000));
  assert.equal(h.api.store.current().interacting, true, 'Ambient roaming keeps its original cooldown');
  touch.onTouchStart(); tree = settleActor(h);
  assert.equal(h.api.store.getCelebration(), null); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle');
  h.api.store.celebrate('/create', 'jump', {}); tree = settleActor(h);
  assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle', 'Actual held finger still suppresses Jump');
  assert.equal(h.api.store.current().touchCooldown, false);
  touch.onTouchEnd({ nativeEvent: { touches: [] } }); tree = settleActor(h);
  assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'jump', 'Release unblocks success without a cooldown delay');
  touch.onTouchStart();
  touch.onTouchEnd({ nativeEvent: { touches: [] } }); h.api.store.celebrate('/create', 'run', {});
  tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'run', 'Successful Run starts without waiting three seconds');
  assert.ok([...boundary.timers.jobs.values()].some(job => job.ms === 3000), 'Roaming cooldown remains scheduled');
  touch.onTouchStart(); tree = settleActor(h); assert.equal(h.api.store.getCelebration(), null);
  h.api.store.celebrate('/create', 'run', {}); tree = settleActor(h);
  assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle', 'Run never overrides a held finger');
  touch.onTouchEnd({ nativeEvent: { touches: [] } }); tree = settleActor(h);
  assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'run', 'Run starts promptly once the held touch releases');
  h.actorHooks.dispose(); h.hostHooks.dispose(); boundary.h.dispose();
});
test('actual focused screen registration refreshes committed actions, rejects removed owners and isolates old cleanup tokens', async () => {
  const x = await integrationHarness(); x.api.store.environment('/create', true); let actions = 0;
  const render = props => x.h.render(() => { x.module.useBuddyScreen(props.state, props.actions); return null; });
  render({ state: { floating: true, canAddMemory: true }, actions: { addMemory: () => actions++ } }); const owner = x.api.store.actionOwner();
  x.api.store.act(owner, '/create', 'addMemory'); assert.equal(actions, 1);
  render({ state: { floating: true, canAddMemory: true }, actions: { addMemory: () => { actions += 10; } } });
  x.api.store.act(owner, '/create', 'addMemory'); assert.equal(actions, 11);
  x.path('/search'); x.api.store.environment('/search', true); render({ state: {}, actions: {} });
  assert.equal(x.api.store.act(owner, '/create', 'addMemory'), false); x.h.dispose(); assert.equal(x.api.store.actionOwner(), null);
});

test('parked pose survives keyboard/modal/background actor remounts on the same route and clears on actual navigation', async () => {
  const h = await hostHarness(); h.renderHost(); let tree = h.renderActor(); await tick(); tree = h.renderActor();
  const responder = all(tree, 'View').find(n => n.props.onPanResponderGrant).props;
  responder.onPanResponderGrant(); responder.onPanResponderMove(null, { dx: -100, dy: 0 }); responder.onPanResponderRelease(null, { dx: -100, dy: 0 }); tree = h.renderActor();
  const before = all(tree, 'AnimatedView')[0].props.style[1].transform;
  tree = h.remountActor(); await tick(); tree = h.renderActor();
  assert.deepEqual(all(tree, 'AnimatedView')[0].props.style[1].transform, before); assert.equal([...h.timers.jobs.values()].filter(job => job.ms !== 60000).length, 0, 'Remounted parked Buddy has only the inactivity clock');
  h.api.store.environment('/create', false); h.api.store.environment('/create', true); assert.equal(h.api.store.getPose('/create').parked, true);
  h.actorHooks.dispose(); h.path('/search'); assert.equal(h.api.store.getPose('/search'), null); h.hostHooks.dispose();
});
test('native scalar capture ignores stale JS cache, buffers deltas until both coordinates arrive and rejects obsolete callbacks', async () => {
  const pending = [], value = { x: { stopAnimation: fn => { if (fn) pending.push(() => fn(140)); } }, y: { stopAnimation: fn => { if (fn) pending.push(() => fn(600)); } } };
  const capture = createBuddyPositionCapture(value); let old = null, latest = null;
  capture.read(point => { old = point; }); capture.read(point => { latest = point; });
  pending[0](); pending[1](); assert.equal(old, null); pending[3](); assert.equal(latest, null); pending[2](); assert.deepEqual(latest, { x: 140, y: 600 });
  const h = await hostHarness(); h.renderHost(); let tree = h.renderActor(); await tick(); tree = h.renderActor(); fireRoaming(h); tree = h.renderActor();
  h.native.nativePoint = { x: 150, y: 608 }; h.native.delayCaptures = true;
  const responder = all(tree, 'View').find(n => n.props.onPanResponderGrant).props;
  responder.onPanResponderGrant(); h.renderActor(); responder.onPanResponderMove(null, { dx: 20, dy: 0 }); responder.onPanResponderRelease(null, { dx: 20, dy: 0 }); tree = h.renderActor();
  h.native.pendingCaptures.shift()(); assert.notEqual(all(h.renderActor(), 'AnimatedView')[0].props.style[1].transform[0].translateX, 170);
  h.native.pendingCaptures.shift()(); tree = h.renderActor(); assert.equal(all(tree, 'AnimatedView')[0].props.style[1].transform[0].translateX, 170, 'Uses actual native x150 plus buffered20, not JS endpoint');
  assert.equal(all(tree, 'BuddyHelpSheet').length, 0); assert.equal([...h.timers.jobs.values()].filter(job => job.ms !== 60000).length, 0);
  h.actorHooks.dispose(); h.native.pendingCaptures.forEach(fn => fn()); h.hostHooks.dispose();
});
test('Travel Walk is a bounded stationary progress reaction, never an active-status loop or replay', async () => {
  const h = await hostHarness(), travel = { journeyId: 'trip', status: 'active', nextStop: 'Beach', gpsAvailable: true, guidance: null, arrival: false, completed: 0 };
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true, travel }, act() {} }); h.renderHost(); h.renderActor(); await tick(); let tree = h.renderActor(); assert.equal(h.timers.jobs.size, 0);
  const before = all(tree, 'AnimatedView')[0].props.style[1].transform;
  const progress = { ...travel, nextStop: 'Hill', completed: 1 };
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true, travel: progress }, act() {} }); h.renderHost(); tree = h.renderActor();
  assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'walk'); assert.deepEqual(all(tree, 'AnimatedView')[0].props.style[1].transform, before);
  assert.equal([...h.timers.jobs.values()][0].ms, 800); h.timers.fire(); tree = h.renderActor(); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle');
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true, travel: progress }, act() {} }); assert.equal(h.timers.jobs.size, 0, 'Repeated snapshot never replays');
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true, travel: { ...progress, completed: 2, guidance: 'Turn left' } }, act() {} }); assert.equal(h.timers.jobs.size, 0, 'Maneuver priority suppresses reaction');
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true, travel: { ...progress, completed: 3, nextStop: 'Lake' } }, act() {} }); h.renderHost(); tree = h.renderActor(); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'walk');
  h.native.motion(true); tree = h.renderActor(); assert.equal(h.timers.jobs.size, 0); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false);
  h.actorHooks.dispose(); h.hostHooks.dispose();
});

test('actual bubble tour visits screens, survives actor remount, exits and guards stale callbacks', async () => {
  const h = await hostHarness(true); h.renderHost(); let tree = h.renderActor(); await tick(); tree = h.renderActor();
  all(tree, 'View').find(n => n.props.accessibilityLabel === 'Journey Buddy').props.onAccessibilityTap(); tree = h.renderActor();
  let bubble = all(tree, 'BuddyHelpSheet')[0]; bubble.props.onMeasure(240); tree = h.renderActor(); bubble = all(tree, 'BuddyHelpSheet')[0];
  assert.ok(bubble.props.placement); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false);
  bubble.props.onTour(); tree = h.renderActor(); bubble = all(tree, 'BuddyHelpSheet')[0]; assert.equal(bubble.props.tour, 0); assert.ok(bubble.props.placement, 'Starting tour retains measured placement without another native onLayout');
  bubble.props.onNext(); tree = h.renderActor(); bubble = all(tree, 'BuddyHelpSheet')[0]; assert.equal(bubble.props.tour, 1); assert.ok(bubble.props.placement, 'Same-height Next remains visible without another onMeasure');
  h.api.store.setTour(0); tree = h.renderActor(); bubble = all(tree, 'BuddyHelpSheet')[0];
  bubble.props.onTour(); assert.deepEqual(h.routes, ['/discover']);
  h.path('/discover'); h.api.store.screen(h.owner, { path: '/discover', state: { floating: true }, act() {} }); h.api.store.protect(h.region, '/discover', []); h.renderHost(); tree = h.remountActor();
  bubble = all(tree, 'BuddyHelpSheet')[0]; assert.equal(bubble.props.tour, 0); bubble.props.onNext(); tree = h.renderActor(); bubble = all(tree, 'BuddyHelpSheet')[0]; assert.equal(bubble.props.tour, 1);
  bubble.props.onTour(); assert.deepEqual(h.routes, ['/discover', '/create']);
  const stale = bubble.props.onNext; await h.api.preference.setEnabled(false); stale(); assert.equal(h.api.store.getTour(), 1);
  await h.api.preference.setEnabled(true); bubble.props.onClose(); assert.equal(h.api.store.getTour(), null);
  h.actorHooks.dispose(); h.hostHooks.dispose();
});

test('actual own-story reaction appears once and never replays after geometry remount', async () => {
  const h = await hostHarness(true); const state = { floating: true, ownStory: { id: 'mine', title: 'A little adventure' } };
  h.api.store.screen(h.owner, { path: '/create', state, act() {} }); h.renderHost(); h.renderActor(); let tree = h.renderActor();
  let bubble = all(tree, 'BuddyHelpSheet')[0]; assert.ok(bubble.props.reaction.includes('applause'));
  bubble.props.onMeasure(130); tree = h.renderActor(); assert.ok(all(tree, 'BuddyHelpSheet')[0].props.placement);
  tree = h.remountActor(); assert.equal(all(tree, 'BuddyHelpSheet').length, 0);
  h.actorHooks.dispose(); h.hostHooks.dispose();
});

test('bubble placement searches stay idle while closed and reuse a measured no-fit result', async () => {
  const h = await hostHarness(true); h.renderHost(); let tree = h.renderActor(); await tick();
  for (let i = 0; i < 20; i++) tree = h.renderActor();
  assert.equal(h.placementCalls, 0, 'Closed Buddy must not scan for bubble space on ordinary renders');
  const stripes = [116, 240, 364, 488, 612, 736].map(y => ({ x: 0, y, width: 390, height: 28 }));
  const cramped = geometry.createBuddyGeometry({ x: 0, y: 0, width: 390, height: 844 }, { top: 0, bottom: 0, left: 0, right: 0 }, stripes);
  tree = h.renderActor({ geometry: cramped });
  all(tree, 'View').find(n => n.props.accessibilityLabel === 'Journey Buddy').props.onAccessibilityTap();
  tree = h.renderActor({ geometry: cramped });
  const searched = h.placementCalls; assert.ok(searched > 0);
  for (let i = 0; i < 20; i++) tree = h.renderActor({ geometry: cramped });
  assert.equal(h.placementCalls, searched, 'Unchanged open geometry reuses the height search');
  all(tree, 'BuddyHelpSheet')[0].props.onMeasure(124);
  tree = h.renderActor({ geometry: cramped });
  assert.equal(h.placementCalls, searched, 'Measurement reuses the known no-fit result');
  assert.equal(all(tree, 'BuddyHelpSheet')[0].props.fallback, true);
  all(tree, 'BuddyHelpSheet')[0].props.onClose(); tree = h.renderActor({ geometry: cramped });
  assert.equal(all(tree, 'View').find(n => n.props.accessibilityLabel === 'Journey Buddy').props.onStartShouldSetPanResponder(), true);
  h.actorHooks.dispose(); h.hostHooks.dispose();
});

test('manual help uses the dialog when only a below-Buddy bubble would fit', async () => {
  const h = await hostHarness(true); h.renderHost();
  const belowOnly = geometry.createBuddyGeometry({ x: 0, y: 0, width: 360, height: 300 },
    { top: 0, bottom: 0, left: 0, right: 0 }, [{ x: 0, y: 0, width: 180, height: 100 }]);
  assert.equal(geometry.placeBuddyBubble({ x: 292, y: 40 }, belowOnly, 252, 124).above, false);
  assert.equal(geometry.placeBuddyBubble({ x: 292, y: 40 }, belowOnly, 252, 124, 'above'), null);
  let tree = h.renderActor({ geometry: belowOnly }); await tick(); tree = h.renderActor({ geometry: belowOnly });
  all(tree, 'View').find(n => n.props.accessibilityLabel === 'Journey Buddy').props.onAccessibilityTap();
  tree = h.renderActor({ geometry: belowOnly });
  assert.equal(all(tree, 'BuddyHelpSheet')[0].props.fallback, true);
  assert.equal(all(tree, 'BuddyHelpSheet')[0].props.placement, undefined);
  h.actorHooks.dispose(); h.hostHooks.dispose();
});

test('exact zoomed-map geometry opens manual help, retains tour and guards stale actions', async () => {
  const h = await hostHarness(true); h.renderHost(); const zoom = zoomedBuddyGeometry();
  assert.equal(geometry.placeBuddyBubble({ x: 292, y: 250 }, zoom, 252, 124), null);
  let tree = h.renderActor({ geometry: zoom }); await tick(); tree = h.renderActor({ geometry: zoom });
  all(tree, 'View').find(n => n.props.accessibilityLabel === 'Journey Buddy').props.onAccessibilityTap();
  tree = h.renderActor({ geometry: zoom }); let dialog = all(tree, 'BuddyHelpSheet')[0];
  assert.equal(dialog.props.fallback, true); assert.ok(dialog.props.width >= 252); assert.ok(dialog.props.maxHeight > 124);
  assert.equal(all(tree, 'BuddySprite')[0].props.animate, false);
  dialog.props.onTour(); tree = h.renderActor({ geometry: zoom }); dialog = all(tree, 'BuddyHelpSheet')[0];
  assert.equal(dialog.props.tour, 0); assert.equal(dialog.props.fallback, true);
  dialog.props.onNext(); tree = h.renderActor({ geometry: zoom }); dialog = all(tree, 'BuddyHelpSheet')[0]; assert.equal(dialog.props.tour, 1);
  const staleAdd = dialog.props.onAddMemory, staleDrafts = dialog.props.onDrafts;
  await h.api.preference.setEnabled(false); staleAdd(); staleDrafts(); assert.equal(h.adds(), 0); assert.deepEqual(h.routes, []);
  await h.api.preference.setEnabled(true); dialog.props.onClose(); tree = h.renderActor({ geometry: zoom });
  assert.equal(all(tree, 'BuddyHelpSheet').length, 0); assert.equal(h.api.store.getTour(), null);
  h.actorHooks.dispose(); h.hostHooks.dispose();
});

test('automatic own-story reactions never open a dialog when map space disappears', async () => {
  const h = await hostHarness(true);
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true, ownStory: { id: 'mine' } }, act() {} });
  h.renderHost(); let tree = h.renderActor(); tree = h.renderActor();
  assert.ok(all(tree, 'BuddyHelpSheet')[0].props.reaction);
  tree = h.renderActor({ geometry: zoomedBuddyGeometry() }); const reaction = all(tree, 'BuddyHelpSheet')[0];
  assert.equal(reaction.props.fallback, false); assert.equal(reaction.props.placement, undefined);
  reaction.props.onMeasure(124); tree = h.renderActor({ geometry: zoomedBuddyGeometry() });
  assert.equal(all(tree, 'BuddyHelpSheet').length, 0);
  h.actorHooks.dispose(); h.hostHooks.dispose();
});

test('a measured no-fit bubble stays usable in a manual dialog and closes before dragging', async () => {
  const h = await hostHarness(true); h.renderHost(); const stripes = [116,240,364,488,612,736].map(y => ({ x: 0, y, width: 390, height: 28 }));
  const cramped = geometry.createBuddyGeometry({ x:0,y:0,width:390,height:844 }, { top:0,bottom:0,left:0,right:0 }, stripes);
  assert.ok(cramped.areas.length); assert.equal(geometry.placeBuddyBubble({x:300,y:40},cramped,252,124),null);
  let tree = h.renderActor({ geometry: cramped }); await tick(); tree = h.renderActor({ geometry: cramped });
  all(tree,'View').find(n=>n.props.accessibilityLabel==='Journey Buddy').props.onAccessibilityTap(); tree = h.renderActor({ geometry: cramped });
  all(tree,'BuddyHelpSheet')[0].props.onMeasure(124); h.renderActor({ geometry: cramped }); tree = h.renderActor({ geometry: cramped });
  assert.equal(all(tree,'BuddyHelpSheet')[0].props.fallback,true);
  assert.equal(all(tree,'BuddySprite')[0].props.animate,false);
  all(tree,'BuddyHelpSheet')[0].props.onClose(); tree=h.renderActor({geometry:cramped});
  let buddy = all(tree,'View').find(n=>n.props.accessibilityLabel==='Journey Buddy');
  assert.equal(buddy.props.onStartShouldSetPanResponder(),true);
  buddy.props.onPanResponderGrant(); buddy.props.onPanResponderMove(null,{dx:-50,dy:0}); buddy.props.onPanResponderRelease(null,{dx:-50,dy:0});
  tree = h.renderActor(); buddy = all(tree,'View').find(n=>n.props.accessibilityLabel==='Journey Buddy'); buddy.props.onAccessibilityTap(); tree = h.renderActor();
  all(tree,'BuddyHelpSheet')[0].props.onMeasure(200); tree = h.renderActor(); assert.ok(all(tree,'BuddyHelpSheet')[0].props.placement);
  all(tree,'BuddyHelpSheet')[0].props.onClose(); tree=h.renderActor(); assert.equal(all(tree,'BuddyHelpSheet').length,0);
  h.actorHooks.dispose();h.hostHooks.dispose();
});


test('actual floating Buddy sleeps without resetting on roaming, first touch only wakes and next opens help', async () => {
  const h = await hostHarness(true); let tree = settleActor(h); await tick(); tree = settleActor(h);
  const sleepTimer = [...h.timers.jobs].find(([, job]) => job.ms === 60000)[0];
  fireRoaming(h); h.native.animation?.finish(); tree = settleActor(h);
  assert.equal(h.timers.jobs.has(sleepTimer), true, 'Automatic walking preserves the original inactivity deadline');
  fireDelay(h, 60000); tree = settleActor(h);
  assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'sleep');
  assert.equal([...h.timers.jobs.values()].some(job => job.ms >= 15000 && job.ms <= 30000), false);
  const touch = () => all(tree, 'View').find(node => node.props.onPanResponderGrant).props;
  h.api.store.interaction(true); tree = settleActor(h);
  touch().onPanResponderGrant(); touch().onPanResponderRelease(null, { dx: 0, dy: 0 }); tree = settleActor(h);
  assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle'); assert.equal(all(tree, 'BuddyHelpSheet').length, 0);
  h.api.store.interaction(false); tree = settleActor(h);
  touch().onPanResponderGrant(); touch().onPanResponderRelease(null, { dx: 0, dy: 0 }); tree = settleActor(h);
  assert.equal(all(tree, 'BuddyHelpSheet').length, 1);
  h.actorHooks.dispose(); h.hostHooks.dispose(); assert.equal(h.timers.jobs.size, 0);
});

test('static reduced-motion Sleep uses its real first frame without a sprite clock', () => {
  const h = hooks(), timers = clock();
  const { BuddySprite } = load('src/components/buddy/buddy-sprite.tsx', { react: h.react, 'react/jsx-runtime': runtime, 'react-native': { Image: 'Image', View: 'View', Text: 'Text' }, '@/lib/buddy/animations': animations }, timers);
  const tree = h.render(BuddySprite, { animation: 'sleep', animate: false });
  assert.equal(all(tree, 'Image')[0].props.source, animations.resolveBuddyAnimation('sleep').source);
  assert.equal(all(tree, 'Image')[0].props.style.left, -0); assert.equal(timers.jobs.size, 0);
  assert.equal(all(tree, 'Text')[0].props.children, 'Zzz'); h.dispose();
});


test('sleep interrupts an unfinished roam and accessibility wake returns to idle without help', async () => {
  const h = await hostHarness(true); let tree = settleActor(h); await tick(); tree = settleActor(h);
  fireRoaming(h); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'walk');
  const staleFinish = h.native.animation.finish;
  fireDelay(h, 60000); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'sleep');
  all(tree, 'View').find(node => node.props.onAccessibilityTap).props.onAccessibilityTap(); tree = settleActor(h);
  assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle'); assert.equal(all(tree, 'BuddyHelpSheet').length, 0);
  staleFinish(); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle', 'Canceled roam cannot restore walking');
  h.actorHooks.dispose(); h.hostHooks.dispose(); assert.equal(h.timers.jobs.size, 0);
});


test('contextual bubbles animate once, dismiss after five seconds, preserve sleep deadline and never reopen on remount', async () => {
  const h = await hostHarness(true, true); let tree = settleActor(h); await tick(); tree = settleActor(h);
  const idleTimer = [...h.timers.jobs].find(([, job]) => job.ms === 60000)[0];
  fireDelay(h, 8000); tree = settleActor(h);
  let bubble = all(tree, 'BuddyHelpSheet')[0]; assert.match(bubble.props.reaction, /next chapter/); assert.equal(bubble.props.fallback, false);
  assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'curious'); assert.equal(all(tree, 'BuddySprite')[0].props.animate, true);
  assert.equal(h.timers.jobs.has(idleTimer), true, 'Passive talking does not renew the inactivity clock');
  bubble.props.onMeasure(124); tree = settleActor(h); bubble = all(tree, 'BuddyHelpSheet')[0]; assert.ok(bubble.props.placement);
  fireDelay(h, 5000); tree = settleActor(h); assert.equal(all(tree, 'BuddyHelpSheet').length, 0);
  h.remountActor(); await tick(); tree = settleActor(h); fireDelay(h, 8000); tree = settleActor(h); assert.equal(all(tree, 'BuddyHelpSheet').length, 0);
  h.actorHooks.dispose(); h.hostHooks.dispose(); assert.equal(h.timers.jobs.size, 0);
});

test('Explore greets with Wave and manual Account help keeps contextual copy plus normal actions', async () => {
  const h = await hostHarness(true, true); h.path('/discover'); h.api.store.screen(h.owner, { path: '/discover', state: { floating: true }, act() {} });
  let tree = settleActor(h); await tick(); tree = settleActor(h); fireDelay(h, 8000); tree = settleActor(h);
  assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'wave'); assert.match(all(tree, 'BuddyHelpSheet')[0].props.reaction, /Hello, explorer/);
  h.actorHooks.dispose(); h.path('/account'); h.api.store.screen(h.owner, { path: '/account', state: { floating: true }, act() {} }); h.renderHost(); tree = h.remountActor(); await tick(); tree = settleActor(h);
  all(tree, 'View').find(node => node.props.onAccessibilityTap).props.onAccessibilityTap(); tree = settleActor(h);
  const bubble = all(tree, 'BuddyHelpSheet')[0]; assert.match(bubble.props.contextualLine, /stories, all together/); assert.equal(bubble.props.reaction, undefined);
  h.actorHooks.dispose(); h.hostHooks.dispose();
});

test('automatic contextual bubbles skip cramped geometry, Travel and asleep Buddy', async () => {
  const cramped = await hostHarness(false, true); let tree = settleActor(cramped); await tick(); tree = settleActor(cramped); fireDelay(cramped, 8000); tree = settleActor(cramped);
  assert.equal(all(tree, 'BuddyHelpSheet').length, 0); cramped.actorHooks.dispose(); cramped.hostHooks.dispose();
  const h = await hostHarness(true, true); h.api.store.screen(h.owner, { path: '/create', state: { floating: true, travel: { status: 'ready', journeyId: 'trip' } }, act() {} });
  tree = settleActor(h); await tick(); tree = settleActor(h); assert.equal([...h.timers.jobs.values()].some(job => job.ms === 8000), false); fireDelay(h, 8000); tree = settleActor(h); assert.equal(all(tree, 'BuddyHelpSheet').length, 0);
  h.api.store.screen(h.owner, { path: '/create', state: { floating: true }, act() {} }); tree = settleActor(h);
  fireDelay(h, 60000); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'sleep'); assert.equal(all(tree, 'BuddyHelpSheet').length, 0);
  fireDelay(h, 8000); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'sleep'); assert.equal(all(tree, 'BuddyHelpSheet').length, 0);
  h.actorHooks.dispose(); h.hostHooks.dispose();
});

test('interaction cancels a contextual bubble immediately and reduced motion leaves novelty still', async () => {
  const h = await hostHarness(true, true); let tree = settleActor(h); await tick(); tree = settleActor(h); h.native.motion(true); tree = settleActor(h);
  fireDelay(h, 8000); tree = settleActor(h); assert.equal(all(tree, 'BuddyHelpSheet').length, 1); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false);
  h.api.store.interaction(true); tree = settleActor(h); assert.equal(all(tree, 'BuddyHelpSheet').length, 0); assert.equal([...h.timers.jobs.values()].some(job => job.ms === 5000), false);
  h.api.store.interaction(false); tree = settleActor(h); fireDelay(h, 8000); tree = settleActor(h); assert.equal(all(tree, 'BuddyHelpSheet').length, 0);
  h.actorHooks.dispose(); h.hostHooks.dispose(); assert.equal(h.timers.jobs.size, 0);
});

test('Wave and Curious assets use eight exact non-looping cells and stop at their last frame', () => {
  for (const name of ['wave', 'curious']) {
    const clip = animations.resolveBuddyAnimation(name), png = readFileSync('assets/journey-buddy/' + name + '.png');
    assert.equal(png.readUInt32BE(16), 512); assert.equal(png.readUInt32BE(20), 256); assert.equal(clip.columns, 4); assert.equal(clip.frames, 8); assert.equal(clip.fps, 4); assert.equal(clip.loop, false);
    assert.deepEqual(animations.spriteFrame(clip, 7), { width: 256, height: 128, left: -192, top: -64 });
    const h = hooks(), timers = clock(); const { BuddySprite } = load('src/components/buddy/buddy-sprite.tsx', { react: h.react, 'react/jsx-runtime': runtime, 'react-native': { Image: 'Image', View: 'View', Text: 'Text' }, '@/lib/buddy/animations': animations }, timers);
    h.render(BuddySprite, { animation: name, animate: true }); for (let i = 0; i < 10; i++) timers.fire();
    const tree = h.render(BuddySprite, { animation: name, animate: true }); assert.equal(timers.jobs.size, 0); assert.equal(all(tree, 'Image')[0].props.style.top, -64); assert.equal(all(tree, 'Image')[0].props.style.left, -192); h.dispose();
  }
});


test('Home tap opens help on release even when native capture is late and render effects run between grant and release', async () => {
  const h = await hostHarness(true, true); h.path('/discover'); h.api.store.screen(h.owner, { path: '/discover', state: { floating: true }, act() {} });
  let tree = settleActor(h); await tick(); tree = settleActor(h); h.native.delayCaptures = true;
  const touch = () => all(tree, 'View').find(node => node.props.onPanResponderGrant).props;
  touch().onPanResponderGrant(); tree = settleActor(h); touch().onPanResponderRelease(null, { dx: 0, dy: 0 }); tree = settleActor(h);
  assert.equal(all(tree, 'BuddyHelpSheet').length, 1, 'Help must not await native stopAnimation callbacks');
  while (h.native.pendingCaptures.length) h.native.pendingCaptures.shift()(); tree = settleActor(h);
  assert.equal(all(tree, 'BuddyHelpSheet').length, 1); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false);
  h.actorHooks.dispose(); h.hostHooks.dispose();
});

test('manual help reuses measured automatic bubble and falls back visibly if a first measurement never arrives', async () => {
  const h = await hostHarness(true, true); let tree = settleActor(h); await tick(); tree = settleActor(h); fireDelay(h, 8000); tree = settleActor(h);
  all(tree, 'BuddyHelpSheet')[0].props.onMeasure(124); tree = settleActor(h);
  all(tree, 'View').find(node => node.props.onAccessibilityTap).props.onAccessibilityTap(); tree = settleActor(h);
  assert.ok(all(tree, 'BuddyHelpSheet')[0].props.placement, 'Same-sized native View may not emit onLayout again');
  h.actorHooks.dispose(); h.hostHooks.dispose();
  const fresh = await hostHarness(true); tree = settleActor(fresh); await tick(); tree = settleActor(fresh);
  all(tree, 'View').find(node => node.props.onAccessibilityTap).props.onAccessibilityTap(); tree = settleActor(fresh); fireDelay(fresh, 500); tree = settleActor(fresh);
  assert.equal(all(tree, 'BuddyHelpSheet')[0].props.fallback, true, 'Manual message remains reachable even if native layout never replies');
  fresh.actorHooks.dispose(); fresh.hostHooks.dispose(); assert.equal(fresh.timers.jobs.size, 0);
});


test('Home card browsing keeps the actual idle sprite clock through held touches and cooldown, while positional roaming stays paused', async () => {
  const h = await hostHarness(true); h.path('/discover'); h.api.store.screen(h.owner, { path: '/discover', state: { floating: true }, act() {} });
  let tree = settleActor(h); await tick(); tree = settleActor(h);
  const leaf = hooks(), spriteTimers = clock(); const { BuddySprite } = load('src/components/buddy/buddy-sprite.tsx', { react: leaf.react, 'react/jsx-runtime': runtime, 'react-native': { Image: 'Image', View: 'View', Text: 'Text' }, '@/lib/buddy/animations': animations }, spriteTimers);
  const spriteProps = () => all(tree, 'BuddySprite')[0].props;
  leaf.render(BuddySprite, spriteProps()); spriteTimers.fire(); let sprite = leaf.render(BuddySprite, spriteProps()); assert.equal(all(sprite, 'Image')[0].props.style.left, -64);
  h.api.store.interaction(true); tree = settleActor(h); assert.equal(spriteProps().animation, 'idle'); assert.equal(spriteProps().animate, true);
  sprite = leaf.render(BuddySprite, spriteProps()); assert.equal(all(sprite, 'Image')[0].props.style.left, -64, 'Card touch does not swap to the static reference or reset frame');
  assert.equal([...h.timers.jobs.values()].some(job => job.ms >= 15000 && job.ms <= 30000), false, 'Position never roams across held card gestures');
  h.api.store.touchEnded(); tree = settleActor(h); assert.equal(spriteProps().animate, true); spriteTimers.fire(); sprite = leaf.render(BuddySprite, spriteProps()); assert.equal(all(sprite, 'Image')[0].props.style.left, -128, 'Idle clock advances during cooldown');
  h.api.store.interaction(false); tree = settleActor(h); sprite = leaf.render(BuddySprite, spriteProps()); assert.equal(all(sprite, 'Image')[0].props.style.left, -128);
  leaf.dispose(); h.actorHooks.dispose(); h.hostHooks.dispose(); assert.equal(h.timers.jobs.size, 0); assert.equal(spriteTimers.jobs.size, 0);
});

test('Home ambient animation still yields to own drag, help, reduced motion, success, background and navigation', async () => {
  const h = await hostHarness(true); h.path('/discover'); h.api.store.screen(h.owner, { path: '/discover', state: { floating: true }, act() {} });
  let tree = settleActor(h); await tick(); tree = settleActor(h); h.api.store.interaction(true); tree = settleActor(h);
  const touch = () => all(tree, 'View').find(node => node.props.onPanResponderGrant).props;
  touch().onPanResponderGrant(); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false, 'Actual Buddy touch stays quiet');
  touch().onPanResponderRelease(null, { dx: 0, dy: 0 }); tree = settleActor(h); assert.equal(all(tree, 'BuddyHelpSheet').length, 1); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false);
  all(tree, 'BuddyHelpSheet')[0].props.onClose(); tree = settleActor(h); h.native.motion(true); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false);
  h.native.motion(false); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animate, true);
  h.api.store.celebrate('/discover', 'jump', {}); tree = settleActor(h); assert.equal(all(tree, 'BuddySprite')[0].props.animation, 'idle'); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false, 'Held screen touch still blocks success playback');
  h.api.store.clearCelebration(); h.native.AppState.currentState = 'background'; h.api.store.environment('/discover', false); tree = h.renderActor(); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false);
  h.native.AppState.currentState = 'active'; h.path('/account'); tree = h.renderActor(); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false, 'Old Home actor cannot keep ambient animation after navigation');
  h.actorHooks.dispose(); h.hostHooks.dispose();
  const other = await hostHarness(true); tree = settleActor(other); await tick(); tree = settleActor(other); other.api.store.interaction(true); tree = settleActor(other); assert.equal(all(tree, 'BuddySprite')[0].props.animate, false, 'Non-Home touch behavior remains unchanged'); other.actorHooks.dispose(); other.hostHooks.dispose();
});
test('first-use intro: offered once on a fresh install; Guide me turns Buddy on with tour step 1, Explore myself keeps it hidden', async () => {
  const x = await integrationHarness(); let intro;
  const render = () => x.h.render(() => { intro = x.module.useBuddyIntro(); return null; });
  render(); assert.equal(intro.visible, true, 'No stored choice: offer the introduction');
  intro.guide(); render();
  assert.equal(intro.visible, false); assert.equal(x.api.preference.get().enabled, true); assert.equal(x.api.store.getTour(), 0, 'Guide me starts the existing three-step tour');
  const y = await integrationHarness(); let other; y.h.render(() => { other = y.module.useBuddyIntro(); return null; });
  other.skip(); y.h.render(() => { other = y.module.useBuddyIntro(); return null; });
  assert.equal(other.visible, false); assert.equal(y.api.preference.get().enabled, false); assert.equal(y.api.store.getTour(), null);
  const stored = { store: createBuddyStore(), preference: createBuddyPreference({ getItem: async () => 'false', setItem: async () => {} }) };
  const z = await integrationHarness(stored); let returning; z.h.render(() => { returning = z.module.useBuddyIntro(); return null; });
  assert.equal(returning.visible, false, 'A remembered choice never repeats the introduction');
});
test('first-use intro card waits for a focused, loaded Home and session restore, offers both choices with labels matching their text, and Back means Explore myself', () => {
  const calls = []; let visible = true, sessionLoading = true;
  const { BuddyIntro } = load('src/components/buddy/buddy-intro.tsx', { 'react/jsx-runtime': runtime,
    'react-native': { Modal: 'Modal', Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: x => x } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/theme/mobile-theme': { primaryControl: {} }, '@/components/discovery/ui': { colors: {} },
    '@/hooks/use-journey-buddy': { useBuddyIntro: () => ({ visible, guide: () => calls.push('guide'), skip: () => calls.push('skip') }) }, './buddy-sprite': { BuddySprite: 'BuddySprite' },
    '@/hooks/session-context': { useSessionState: () => ({ loading: sessionLoading }) } });
  assert.equal(BuddyIntro({ ready: false }), null, 'Never before Home is focused and loaded');
  assert.equal(BuddyIntro({ ready: true }), null, 'Never while session restore keeps the startup loader up');
  sessionLoading = false;
  const tree = BuddyIntro({ ready: true }), nodes = all(tree);
  const press = label => nodes.find(n => n.type === 'Pressable' && n.props.accessibilityLabel === label);
  const texts = nodes.filter(n => n.type === 'Text').map(n => n.props.children);
  assert.ok(texts.includes('Guide me') && texts.includes('Explore myself'));
  assert.ok(texts.some(t => /anytime in Account/.test(t)), 'Explains where to change it later');
  press('Guide me').props.onPress(); press('Explore myself').props.onPress(); tree.props.onRequestClose();
  assert.deepEqual(calls, ['guide', 'skip', 'skip']);
  assert.equal(nodes.find(n => n.type === 'BuddySprite').props.animate, false, 'Static sprite: no motion in the introduction');
  visible = false; assert.equal(BuddyIntro({ ready: true }), null);
});
test('turning Buddy off, including a failed save after Guide me, drops the pending tour so it cannot reopen later', async () => {
  let api = null, fail = true; const store = createBuddyStore(); const h = hooks();
  const module = load('src/hooks/use-journey-buddy.tsx', { react: { ...h.react, createContext: () => ({}), useContext: () => api, useSyncExternalStore: (_, get) => get() }, 'react/jsx-runtime': runtime,
    'react-native': { View: 'View', AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) }, Keyboard: { isVisible: () => false, addListener: () => ({ remove() {} }) } },
    '@react-native-async-storage/async-storage': { getItem: async () => null, setItem: async () => { if (fail) throw Error('disk full'); } },
    'expo-router': { usePathname: () => '/discover', useFocusEffect: fn => h.react.useEffect(fn, [fn]) },
    '@/lib/buddy/store': { createBuddyStore: () => store }, '@/lib/buddy/preference': { createBuddyPreference: storage => (api = { store, preference: createBuddyPreference(storage) }).preference } });
  h.render(module.JourneyBuddyProvider, { children: null }); await tick(); await tick();
  let intro; h.render(() => { intro = module.useBuddyIntro(); return null; }); assert.equal(intro.visible, true);
  intro.guide(); assert.equal(store.getTour(), 0); await tick(); await tick();
  assert.equal(api.preference.get().enabled, false, 'The failed save reverts Buddy to off'); assert.ok(api.preference.get().error);
  assert.equal(store.getTour(), null, 'No stale tour waits for a later Account switch-on');
  fail = false; store.setTour(1); await api.preference.setEnabled(true); assert.equal(store.getTour(), 1); await api.preference.setEnabled(false); assert.equal(store.getTour(), null, 'Switching off mid-tour ends the tour');
  h.dispose();
});
test('B1a: task-specific help actions lead to another relevant screen and never act on the current one', () => {
  const { buddyHelpPrimary, buddyHelpLine } = load('src/lib/buddy/help-actions.ts');
  for (const path of ['/', '/index', '/discover']) assert.deepEqual(buddyHelpPrimary(path), { label: 'Find a journey', route: '/search' });
  assert.deepEqual(buddyHelpPrimary('/search'), { label: 'Start my own journey', route: '/create' });
  assert.deepEqual(buddyHelpPrimary('/account'), { label: 'Start a new journey', route: '/create' }, 'Account no longer offers drafts, which it already shows');
  for (const path of ['/create', '/journey/a', '/customized/a', '/travel/a', '/profile/someone']) assert.equal(buddyHelpPrimary(path), null, path + ' keeps its existing action');
  for (const path of ['/', '/discover', '/search', '/account']) assert.notEqual(buddyHelpPrimary(path).route, path === '/' ? '/discover' : path);
  assert.match(buddyHelpLine('/journey/a'), /Swipe to start uses every stop.*Make it yours/);
  assert.match(buddyHelpLine('/customized/a'), /Nothing is saved/); assert.doesNotMatch(buddyHelpLine('/customized/a'), /saved to|in your account/);
  assert.equal(buddyHelpLine('/journey/a/extra'), undefined); assert.equal(buddyHelpLine('/account'), undefined);
});
test('B1a: the bubble uses a screen-specific first action only when there is no memory to capture', () => {
  const h = hooks(); let drafts = 0, primary = 0, adds = 0;
  const { BuddyHelpSheet } = load('src/components/buddy/buddy-help-sheet.tsx', { react: h.react, 'react/jsx-runtime': runtime, 'react-native': { BackHandler: { addEventListener: () => ({ remove() {} }) }, Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: v => v } }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/lib/buddy/model': model });
  const props = { canAddMemory: false, onAddMemory: () => adds++, onCreate() {}, onDrafts: () => drafts++, onClose() {}, primary: { label: 'Start a new journey', onPress: () => primary++ } };
  const action = (tree, label) => all(tree, undefined).find(n => n.props?.label === label);
  let tree = h.render(BuddyHelpSheet, props); assert.equal(action(tree, 'Open my drafts'), undefined);
  action(tree, 'Start a new journey').props.onPress(); assert.equal(primary, 1); assert.equal(drafts, 0); assert.ok(action(tree, 'Show me around'));
  tree = h.render(BuddyHelpSheet, { ...props, canAddMemory: true }); assert.equal(action(tree, 'Start a new journey'), undefined); action(tree, 'Capture a moment').props.onPress(); assert.equal(adds, 1);
  tree = h.render(BuddyHelpSheet, { ...props, tour: 0 }); assert.equal(action(tree, 'Start a new journey'), undefined, 'The tour keeps its own steps');
  tree = h.render(BuddyHelpSheet, { ...props, contextualLine: 'Swipe to start uses every stop.' }); assert.match(JSON.stringify(all(tree, 'Text').map(n => n.props.children)), /Swipe to start/);
  h.dispose();
});
test('B1a: actual host offers Account a Create action through the guarded navigate and keeps Create unchanged', async () => {
  const h = await hostHarness(); h.renderHost(); let tree = h.renderActor(); await tick(); h.renderActor();
  all(tree, 'View').find(n => n.props.accessibilityLabel === 'Journey Buddy').props.onAccessibilityTap(); tree = h.renderActor();
  assert.equal(all(tree, 'BuddyHelpSheet')[0].props.primary, undefined, 'Create keeps Capture a moment / Open my drafts');
  h.actorHooks.dispose(); h.hostHooks.dispose();
  const a = await hostHarness(); a.path('/account');
  a.api.store.screen({}, { path: '/account', state: { floating: true }, act() {} });
  a.api.store.protect(a.region, '/account', [{ x: 0, y: 0, width: 360, height: 592 }, { x: 0, y: 680, width: 360, height: 120 }]);
  a.renderHost();
  tree = a.renderActor(); await tick(); tree = settleActor(a);
  all(tree, 'View').find(n => n.props.accessibilityLabel === 'Journey Buddy').props.onAccessibilityTap(); tree = a.renderActor();
  const help = all(tree, 'BuddyHelpSheet')[0]; assert.equal(help.props.primary.label, 'Start a new journey');
  await a.api.preference.setEnabled(false); help.props.primary.onPress(); assert.deepEqual(a.routes, [], 'Disabled Buddy cannot navigate');
  await a.api.preference.setEnabled(true); help.props.primary.onPress(); assert.deepEqual(a.routes, ['/create']);
  a.actorHooks.dispose(); a.hostHooks.dispose();
});
