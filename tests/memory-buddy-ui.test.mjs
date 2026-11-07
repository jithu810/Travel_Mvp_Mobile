import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const jsx = (type, props, key) => ({ type, props, key });
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const native = Object.fromEntries(['View', 'Text', 'Pressable', 'Image', 'FlatList', 'ActivityIndicator'].map(name => [name, name]));native.StyleSheet = { create: value => value };
function hooks() {
  const slots = [];let cursor = 0, effects = [];
  const changed = (prev, deps) => !prev || deps.some((value, index) => value !== prev[index]);
  const state = initial => { const i = cursor++;if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; };
  const h = { react: { memo: value => value, forwardRef: value => value, useState: state, useRef: value => { const i = cursor++;return slots[i] ??= { current: value }; },
    useMemo: (fn, deps) => { const i = cursor++;if (changed(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() };return slots[i].value; },
    useCallback: (fn, deps) => h.react.useMemo(() => fn, deps), useReducer: (fn, initial) => { const [value, set] = state(initial);return [value, event => set(prev => fn(prev, event))]; },
    useSyncExternalStore: (_subscribe, get) => get(), useImperativeHandle: (ref, factory) => { ref.current = factory(); },
    useEffect: (fn, deps) => { const i = cursor++;if (changed(slots[i]?.deps, deps)) { slots[i]?.cleanup?.();const slot = { deps };slots[i] = slot;effects.push(() => { slot.cleanup = fn(); }); } } },
  render(fn) { cursor = 0;effects = [];const tree = fn();effects.forEach(fn => fn());return tree; }, dispose() { slots.forEach(slot => slot?.cleanup?.()); } };
  h.react.useLayoutEffect = h.react.useEffect;return h;
}
function load(path, modules = {}, h = hooks()) {
  const result = {}, defaults = { react: h.react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native, '@/theme/mobile-theme': { theme: {}, lightTheme: {} },
    '@rnmapbox/maps': { __esModule: true, default: { MarkerView: 'MarkerView' } }, '@/components/buddy/buddy-sprite': { BuddySprite: 'BuddySprite' }, '@/components/art/journey-art': { StopArt: 'StopArt' } };
  new Function('require', 'exports', ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(name => modules[name] ?? defaults[name] ?? {}, result);return result;
}
const tick = () => new Promise(setImmediate);
const pin = (key, longitude = 76) => ({ key, longitude, latitude: 8, journeyId: 'journey-' + key, journeyTitle: 'Journey ' + key, stopName: 'Stop ' + key, stopId: key, stopIndex: 0, photo: null, photoThumbnail: null, featured: true, art: { seed: key, stops: [] } });

test('bubble projection is selection/owner/camera fenced, hides while pending/offscreen and stays inside the measured map', async () => {
  const h = hooks(), requests = [], opened = [], control = { current: null };let meta = { key: 'a', index: 0, bubble: true, playing: false };
  const { MemoryBuddyBubble } = load('src/components/profile/memory-buddy-presentation.tsx', {}, h);
  const tour = { subscribeMeta() {}, getMeta: () => meta };
  let props = { tour, pins: [pin('a'), pin('b')], viewport: { width: 360, height: 240 }, owner: 'one', membership: 'a|b', active: true,
    project: coordinate => new Promise(resolve => requests.push({ coordinate, resolve })), onOpen: value => opened.push(value.key) };
  const render = () => h.render(() => MemoryBuddyBubble(props, control));
  assert.equal(render(), null);meta = { ...meta, key: 'b' };assert.equal(render(), null);
  requests[0].resolve([100, 100]);await tick();assert.equal(render(), null, 'Old selected projection cannot replace the new photo');
  requests[1].resolve([359, 238]);await tick();assert.equal(render(), null, 'Offscreen/bottom attribution points do not fabricate a bubble location');
  control.current.settle();assert.equal(render(), null);requests.at(-1).resolve([359, 100]);await tick();let tree = render();assert.ok(tree);
  const style = Object.assign({}, ...tree.props.style);assert.ok(style.left >= 8 && style.left + style.width <= 352);assert.ok(style.top >= 4);
  const face = tree.props.children;face.props.onOpen();assert.deepEqual(opened, ['b']);
  control.current.hide();face.props.onOpen();assert.deepEqual(opened, ['b'], 'A captured old photo callback cannot open after camera invalidation');
  control.current.settle();render();const old = requests.at(-1);props = { ...props, owner: 'two', membership: 'new', pins: [pin('b', 77)] };render();old.resolve([20, 20]);await tick();assert.equal(render(), null, 'Owner/membership changes invalidate projections');
  requests.at(-1).resolve([-1, 20]);await tick();assert.equal(render(), null);
  props = { ...props, active: false };assert.equal(render(), null);h.dispose();
});

test('repeat same-stop settle recreates a bubble and stop photos precede existing journey covers, then honest art fallback', async () => {
  const h = hooks(), control = { current: null }, requests = [];const selected = { ...pin('a'), photoThumbnail: 'https://stop-thumb', photo: 'https://stop-full' };
  const { MemoryBuddyBubble } = load('src/components/profile/memory-buddy-presentation.tsx', {}, h);
  const props = { tour: { subscribeMeta() {}, getMeta: () => ({ key: 'a', bubble: true }) }, pins: [selected], covers: [{ id: selected.journeyId, coverThumbnail: 'https://journey-thumb', cover: 'https://journey-full' }], viewport: { width: 320, height: 160 }, owner: 'one', membership: 'a', active: true,
    project: () => new Promise(resolve => requests.push(resolve)), onOpen() {} };
  const render = () => h.render(() => MemoryBuddyBubble(props, control));render();requests[0]([100, 85]);await tick();let tree = render();assert.ok(tree);
  control.current.hide();control.current.settle();assert.equal(render(), null);requests.at(-1)([100, 85]);await tick();tree = render();assert.ok(tree, 'Same key can show its photo again without a metadata change');
  const face = tree.props.children, leaf = hooks();const renderFace = () => leaf.render(() => face.type(face.props));
  const parentState = h.react.useState;h.react.useState = leaf.react.useState;
  for (const expected of ['https://stop-thumb', 'https://stop-full', 'https://journey-thumb', 'https://journey-full']) {
    const photo = nodes(renderFace()).find(node => node.type === 'Image');assert.equal(photo.props.source.uri, expected);assert.equal(photo.props.onLoad, undefined);photo.props.onError();
  }
  let art = renderFace();assert.ok(nodes(art).some(node => node.type === 'StopArt'));assert.match(art.props.accessibilityLabel, /Journey a.*Stop a/);
  assert.equal(nodes(art).find(node => node.type === 'Text').props.numberOfLines, 1);assert.equal(nodes(art).find(node => node.type === 'Text').props.maxFontSizeMultiplier, 1.3);
  const newLeaf = hooks(), fresh = { ...face.props, pin: pin('other'), cover: { id: 'other', cover: 'http://unsafe' } };
  h.react.useState = newLeaf.react.useState;
  art = newLeaf.render(() => face.type(fresh));assert.ok(nodes(art).some(node => node.type === 'StopArt'));assert.equal(nodes(art).some(node => node.type === 'Image'), false, 'New owner/stop cannot retain prior photo errors or unsafe URLs');
  h.react.useState = parentState;h.dispose();leaf.dispose();newLeaf.dispose();
});

test('native map pin selects Buddy without opening Story; repeat tap reprojects, gestures pause, overlaps choose and lifecycle fences captured callbacks', async () => {
  const h = hooks(), calls = [], ownership = [];let foreground, blur, tour;
  let suppressed = false;const storeListeners = new Set();
  const api = { preference: { get: () => ({ enabled: true }), subscribe: () => () => {} }, store: {
    get: () => ({ path: '/account' }), current: () => ({ suppressed }), getMapHelp: () => null, getCelebration: () => null, getTour: () => null,
    subscribe: fn => { storeListeners.add(fn);return () => storeListeners.delete(fn); },
  } };
  let now = 0, serial = 0;const pending = new Map(), time = { now: () => now, request: cb => { pending.set(++serial, cb);return serial; }, cancel: id => pending.delete(id) };
  const advance = milliseconds => { now += milliseconds;const batch = [...pending.values()];pending.clear();batch.forEach(cb => cb()); };
  const travel = load('src/lib/discovery/travel.ts');const model = load('src/lib/profile/memory-buddy-tour.ts', { '../discovery/travel': travel });
  const memory = load('src/lib/profile/memory-map.ts');const pins = [pin('a'), pin('b', 77)];
  const { NativeMemoryMap } = load('src/components/profile/native-memory-map.tsx', {
    '@rnmapbox/maps': { __esModule: true, default: { MapView: 'MapView', Camera: 'Camera', MarkerView: 'MarkerView', Atmosphere: 'Atmosphere', ShapeSource: 'ShapeSource', CircleLayer: 'CircleLayer', StyleURL: { SatelliteStreet: 'satellite', Outdoors: 'outdoors' } } },
    'react-native': { ...native, AppState: { currentState: 'active', addEventListener: (_name, fn) => { foreground = fn;return { remove() { foreground = null; } }; } }, AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: () => ({ remove() {} }) } },
    'expo-router': { usePathname: () => '/account', useFocusEffect: fn => h.react.useEffect(() => { blur = fn();return blur; }, [fn]) },
    '@/hooks/use-map-buddy': { useMapBuddy: available => { ownership.push(available);return { visible: available && !suppressed, enabled: true, helping: false }; } }, '@/hooks/use-journey-buddy': { useBuddyApi: () => api },
    '@/hooks/use-buddy-map-pins': { buddyCameraPoseKey: props => JSON.stringify(props), equivalentBuddyCameraPose: (a, b) => a === b },
    '@/hooks/use-thumbnail-source': { useThumbnailSource: () => ({ uri: null }) }, '@/components/journey/journey-action-icon': { JourneyActionIcon: 'Icon' },
    '@/lib/profile/memory-buddy-tour': { createMemoryBuddyTour: (pins, _time, permitted) => (tour = model.createMemoryBuddyTour(pins, time, permitted)) },
    '@/lib/profile/memory-map': { ...memory, memoryMapFrame: () => ({ projection: 'mercator', camera: { centerCoordinate: [76.5, 8], zoomLevel: 10 } }), memoryPlacePress: (_pins, key, hits) => hits.length > 1 ? { kind: 'choose', keys: hits } : { kind: 'open', key } },
    './memory-map-notice': { MemoryMapNotice: 'MemoryMapNotice' }, './memory-buddy-presentation': { MemoryBuddyActor: 'MemoryBuddyActor', MemoryBuddyBubble: 'MemoryBuddyBubble' }, './memory-place-choices': { MemoryPlaceChoices: 'MemoryPlaceChoices' },
  }, h);
  const props = { pins, onOpen: pin => calls.push(pin.key), retry() {}, initialViewport: { width: 360, height: 240 }, deadline: Date.now() + 20000, cameraKey: 'one', onScreen: true };
  const render = () => h.render(() => NativeMemoryMap(props));
  try {
    let tree = render();await tick();tree = render();let map = nodes(tree).find(node => node.type === 'MapView');let cameraCalls = 0;
    nodes(tree).find(node => node.type === 'Camera').props.ref.current = { setCamera() { cameraCalls++; } };
    map.props.onDidFinishLoadingMap();tree = render();const initialCameraCalls = cameraCalls;
    const bubble = nodes(tree).find(node => node.type === 'MemoryBuddyBubble');let hides = 0, settles = 0;bubble.props.ref.current = { hide() { hides++; }, settle() { settles++; } };
    const marker = nodes(tree).find(node => typeof node.type === 'function' && node.type.name === 'MemoryPinFace');
    marker.props.onPress('b');assert.equal(tour.get().key, 'b');assert.equal(tour.get().animation, 'jump');assert.deepEqual(calls, []);const first = settles;marker.props.onPress('b');assert.ok(settles > first, 'Repeated same-key selection explicitly reprojects');
    advance(600);advance(6000);advance(800);map = nodes(render()).find(node => node.type === 'MapView');assert.equal(tour.get().bubble, false);
    map.props.onCameraChanged({ properties: { zoom: 10, center: [76.5, 8] }, gestures: { isGestureActive: true } });assert.equal(tour.get().playing, false);assert.equal(tour.get().bubble, false);assert.ok(hides > 0);
    assert.equal(cameraCalls, initialCameraCalls, 'Tour, taps and gestures never issue camera commands');assert.equal(map.props.onTouchStart, undefined, 'A simple pin touch does not erase the running intent');
    tree=render();const priorNext=nodes(tree).find(node=>node.props.accessibilityLabel==='Next shared memory'),priorFit=nodes(tree).find(node=>node.props.accessibilityLabel==='Fit all travel memories'),priorPhoto=nodes(tree).find(node=>node.type==='MemoryBuddyBubble');
    const openChoices=()=>nodes(render()).find(node=>node.type==='ShapeSource').props.onPress({features:[{properties:{key:'a'}},{properties:{key:'b'}}]});
    openChoices();tree=render();const chooser=nodes(tree).find(node=>node.type==='MemoryPlaceChoices');assert.equal(chooser.props.pins.length,2);
    const beforeChoice=tour.get().key;marker.props.onPress('b');priorNext.props.onPress();priorFit.props.onPress();priorPhoto.props.onOpen(pins[1]);assert.equal(tour.get().key,beforeChoice);assert.equal(cameraCalls,initialCameraCalls);assert.deepEqual(calls,[],'Captured pin/Next/fit/photo callbacks are rejected while chooser is open');
    suppressed=true;storeListeners.forEach(fn=>fn());chooser.props.onSelect('b');assert.equal(tour.get().key,beforeChoice,'An additional settings block also fences an owned chooser');render();suppressed=false;render();
    chooser.props.onClose();render();openChoices();tree=render();const reopened=nodes(tree).find(node=>node.type==='MemoryPlaceChoices');assert.notEqual(reopened.key,chooser.key);
    chooser.props.onSelect('b');assert.equal(tour.get().key,beforeChoice,'Closed chooser cannot select after a new chooser reopens identical keys');
    reopened.props.onSelect('a');tree=render();assert.equal(tour.get().key,'a');assert.deepEqual(calls,[]);
    const selectedBubble = nodes(tree).find(node => node.type === 'MemoryBuddyBubble');selectedBubble.props.onOpen(pins[0]);assert.deepEqual(calls, ['a']);
    suppressed = true;storeListeners.forEach(fn => fn());marker.props.onPress('b');selectedBubble.props.onOpen(pins[1]);assert.equal(tour.get().key, 'a');assert.deepEqual(calls, ['a']);assert.equal(pending.size, 0, 'Settings blocks captured pin/photo callbacks and stops clocks synchronously');render();suppressed = false;render();
    foreground('background');marker.props.onPress('b');selectedBubble.props.onOpen(pins[1]);assert.deepEqual(calls, ['a']);assert.equal(pending.size, 0);
    foreground('active');render();blur();marker.props.onPress('b');selectedBubble.props.onOpen(pins[1]);assert.deepEqual(calls, ['a']);assert.equal(pending.size, 0);assert.ok(ownership.includes(true));
  } finally { h.dispose();assert.equal(foreground, null);assert.equal(pending.size, 0); }
});

test('active overlap chooser virtualizes pages and keeps all 5000 memories selectable without opening stories itself', () => {
  const h=hooks(), selected=[];const {MemoryPlaceChoices}=load('src/components/profile/memory-place-choices.tsx',{
    '@/components/journey/story-sheet':{StorySheet:'StorySheet'},'@/lib/profile/memory-map':{memoryPinLabel:pin=>'Open '+pin.key},
  },h);
  const pins=Array.from({length:5000},(_,i)=>pin(String(i))), seen=[];
  for(let page=0;page<100;page++) {
    const tree=h.render(()=>MemoryPlaceChoices({pins,onSelect:key=>selected.push(key),onClose(){}}));assert.equal(tree.props.suppressBuddy,false,'Native map explicitly pauses its tour and retains strict external block guards');const list=nodes(tree).find(node=>node.type==='FlatList');
    assert.equal(list.props.data.length,50);assert.equal(list.props.initialNumToRender,6);seen.push(...list.props.data.map(pin=>pin.key));
    const next=nodes(tree).find(node=>node.props.accessibilityLabel==='Next memories page');assert.equal(next.props.disabled,page===99);
    if(page===99)list.props.renderItem({item:list.props.data[49]}).props.onPress();else next.props.onPress();
  }
  assert.equal(new Set(seen).size,5000);assert.deepEqual(selected,['4999']);h.dispose();
});
