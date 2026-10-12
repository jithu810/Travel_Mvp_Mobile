import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
function harness(runEffects = true) {
  const slots = [];
  let cursor = 0, effects = [], disposed = false, lateUpdates = 0;
  const changed = (previous, deps) => !previous || deps.some((dep, i) => dep !== previous[i]);
  const memo = (factory, deps) => {
    const i = cursor++;
    if (changed(slots[i]?.deps, deps)) slots[i] = { deps, value: factory() };
    return slots[i].value;
  };
  const hooks = {
    memo: component => component, useCallback: (callback, deps) => memo(() => callback, deps), useMemo: memo,
    useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
    useSyncExternalStore: (_subscribe, get) => get(),
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { if (disposed) lateUpdates++; slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useEffect: (callback, deps) => {
      const i = cursor++;
      if (!runEffects) return;
      if (changed(slots[i]?.deps, deps)) {
        slots[i]?.cleanup?.(); slots[i] = { deps };
        effects.push(() => { slots[i].cleanup = callback(); });
      }
    },
  };
  return { hooks, lateUpdates: () => lateUpdates,
    render: (component, props) => { cursor = 0; effects = []; const tree = component(props); effects.forEach(effect => effect()); return tree; },
    dispose: () => { disposed = true; slots.forEach(slot => slot?.cleanup?.()); },
  };
}
function load(path, modules, hooks = harness(false).hooks, timers = globalThis) {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const require = name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') return hooks;
    if (Object.hasOwn(modules, name)) return modules[name];
    throw new Error('Unexpected component dependency: ' + name);
  };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', source)(require, module, module.exports, timers.setTimeout, timers.clearTimeout);
  return module.exports;
}
function find(tree, type) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === type) return tree;
  for (const child of [tree.props?.children].flat(Infinity)) {
    const match = find(child, type);
    if (match) return match;
  }
  return null;
}
function all(tree, type) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(tree.type === type ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => all(child, type))];
}
const native = {
  StyleSheet: { create: value => value }, View: 'View', Text: 'Text', Pressable: 'Pressable', FlatList: 'FlatList',
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(true), addEventListener: () => ({ remove() {} }) },
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  ActivityIndicator: 'ActivityIndicator', useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  Platform: { OS: 'android' }, Linking: { openSettings: async () => {} },
};
const ui = { colors: {}, ui: {}, Message: 'Message', ScreenHeader: 'ScreenHeader' };
const layout = load('src/lib/journey/story-layout.ts', {});
const mapData = load('src/lib/journey/map-data.ts', {});
const travel = load('src/lib/discovery/travel.ts', { '../journey/map-data': mapData });
const framing = load('src/lib/journey/map-camera.ts', { '../discovery/travel': travel, './map-data': mapData });
const presentation = { globeAtmosphere: { spaceColor: '#080F1E' }, spaceColor: '#080F1E' };
const stylePolicy = { nextGlobeStyle: style => style === 'satellite' ? 'outdoors' : 'failed' };
const stop = id => ({ id, name: id, description: 'A story', dayNumber: null, photo: null, rating: null });
const journeyId = '11111111-1111-4111-8111-111111111111';
const eligibility = load('src/lib/journey/travel-preview.ts', {
  '../discovery/model': { isJourneyId: id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) },
});
const sessionModel = load('src/lib/journey/trip-session.ts', { './travel-preview': eligibility });
const locationModel = load('src/lib/journey/foreground-location.ts', {});
const sessionMocks = store => ({
  '@/lib/journey/foreground-location': locationModel,
  '@/hooks/use-trip-location': { useTripLocation: (journey, session) => ({ status: session.status === 'active' ? 'unavailable' : session.status, position: null, canAskAgain: true,
    begin: () => store.transition(journey, 'begin', session), retry: () => {} }) },
  '@/components/journey/trip-confirmation': { TripConfirmation: 'TripConfirmation' },
  '@/hooks/use-trip-session': { useTripSnapshot: id => store.get(id), useTripElapsed: session => sessionModel.elapsedTime(session, store.now()) },
  '@/lib/journey/trip-session': { ...sessionModel, tripStore: store },
});

test('selection keeps valid stops, recovers after refresh removal, and has no invented empty stop', () => {
  const stops = [stop('first'), stop('second')];
  assert.equal(layout.selectedStopId(stops, null), 'first');
  assert.equal(layout.selectedStopId(stops, 'second'), 'second');
  assert.equal(layout.selectedStopId(stops.slice(0, 1), 'second'), 'first');
  assert.equal(layout.selectedStopId([], 'second'), null);
  assert.equal(layout.stopIndexAtOffset(-50, 300, 3), 0);
  assert.equal(layout.stopIndexAtOffset(600, 300, 3), 2);
  assert.equal(layout.stopIndexAtOffset(9999, 300, 3), 2);
});

test('measured short/tall layouts leave space for stop browsing after reserving controls and footer', () => {
  for (const [height, controls, footer] of [[548, 44, 116], [640, 44, 66], [810, 44, 66], [548, 60, 116]]) {
    const value = layout.storyLayout(height, controls, footer);
    const remaining = height - controls - footer - 40 - value.cover - value.map;
    assert.ok(value.cover >= 112 && value.cover <= 210);
    assert.ok(value.map >= 64 && value.map <= 150);
    assert.ok(remaining >= 150, 'Room for thumbnail rail, progress and compact card');
  }
});

test('Story synchronizes carousel and map, preserves selection on close, and Use opens the read-only map', () => {
  const h = harness();
  const journey = { id: journeyId, title: 'Public journey', stops: [{ ...stop('first'), sequence: 0 }, { ...stop('second'), sequence: 1 }], description: '' };
  const routes = []; let focus;
  const { JourneyStoryContent: Screen } = load('src/app/journey/[id].tsx', {
    'expo-router': { useRouter: () => ({ push: route => routes.push(route) }), useFocusEffect: callback => { focus = callback; } }, 'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/components/discovery/ui': ui,
    '@/components/journey/stop-story-viewer': { StopStoryViewer: 'StopStoryViewer' },
    '@/components/journey/journey-options': { JourneyOptions: 'JourneyOptions' },
    '@/components/journey/social-actions': { SocialActions: 'SocialActions' },
    '@/components/journey/story-header': { StoryHeader: 'StoryHeader', StoryCreator: 'StoryCreator' },
    '@/components/journey/stop-timeline': { StopTimeline: 'StopTimeline' },
    '@/components/journey/story-extras': { StorySnapshot: 'StorySnapshot' },
    '@/components/journey/story-sheet': { StorySheet: 'StorySheet' },
    '@/components/journey/map/journey-map': { JourneyMap: 'JourneyMap' },
    '@/components/journey/map-itinerary': { MapItinerary: 'MapItinerary' },
    '@/lib/journey/travel-preview': eligibility,
    '@/hooks/use-load': {}, '@/lib/discovery/queries': {}, '@/lib/discovery/model': { travelerLabel: () => 'Solo' },
    '@/lib/journey/map-data': { hasCoordinates: () => false, buildMapData: () => ({ missing: 2 }) },
    '@/lib/journey/snapshot': { hasStory: () => false }, '@/lib/journey/story-layout': layout,
  }, h.hooks);
  const props = { journey, refresh: () => {}, refreshing: false, error: null };
  let tree = h.render(Screen, props);
  assert.equal(find(tree, 'ScrollView'), null);
  assert.equal(find(tree, 'StopTimeline').props.selectedId, 'first');
  find(tree, 'StopTimeline').props.onSelect('second');
  tree = h.render(Screen, props);
  assert.equal(find(tree, 'JourneyMap').props.selectedId, 'second');
  find(tree, 'JourneyOptions').props.onUse();
  tree = h.render(Screen, props);
  assert.equal(find(tree, 'StorySheet').props.visible, true);
  assert.equal(find(tree, 'StorySheet').props.scrollable, false);
  assert.equal(find(tree, 'JourneyMap').props.presentation, 'expanded');
  assert.equal(all(tree, 'JourneyMap').length, 1, 'Preview is not mounted behind the expanded map');
  assert.equal(find(tree, 'StorySheet').props.subtitle, '2 stops · Journey map');
  assert.equal(find(tree, 'MapItinerary').props.selectedId, 'second');
  find(tree, 'MapItinerary').props.onSelect('first');
  tree = h.render(Screen, props);
  assert.equal(find(tree, 'JourneyMap').props.selectedId, 'first');
  find(tree, 'JourneyMap').props.onSelect('second');
  tree = h.render(Screen, props);
  assert.equal(find(tree, 'MapItinerary').props.selectedId, 'second');
  find(tree, 'JourneyMap').props.onSelect('first');
  tree = h.render(Screen, props);
  find(tree, 'StorySheet').props.onClose();
  tree = h.render(Screen, props);
  assert.equal(find(tree, 'StorySheet').props.visible, false);
  assert.equal(find(tree, 'StopTimeline').props.selectedId, 'first');
  find(tree, 'StopTimeline').props.onDetails('second');
  tree = h.render(Screen, props);
  assert.equal(find(tree, 'StopStoryViewer').props.selectedId, 'second');
  assert.equal(find(tree, 'StorySheet').props.visible, false);
  assert.equal(all(tree, 'JourneyMap').length, 0, 'No map remains behind the fullscreen stop viewer');
  find(tree, 'StopStoryViewer').props.onSelect('first');
  tree = h.render(Screen, props);
  find(tree, 'StopStoryViewer').props.onClose();
  tree = h.render(Screen, props);
  assert.equal(find(tree, 'StopStoryViewer'), null);
  assert.equal(all(tree, 'JourneyMap').length, 1);
  find(tree, 'StoryHeader').props.onAbout();
  tree = h.render(Screen, props);
  assert.equal(all(tree, 'JourneyMap').length, 0, 'About also unmounts the preview');
  find(tree, 'StorySheet').props.onClose();
  tree = h.render(Screen, props);
  assert.equal(find(tree, 'JourneyMap').props.presentation, 'preview');
  assert.equal(find(tree, 'StopTimeline').props.selectedId, 'first');
  find(tree, 'StopTimeline').props.onSelect('unknown');
  tree = h.render(Screen, props);
  assert.equal(find(tree, 'StopTimeline').props.selectedId, 'first');
  assert.equal(all(tree, 'Pressable').some(item => item.props.accessibilityLabel === 'Start Journey'), false);
  find(tree, 'JourneyOptions').props.onUse(); tree = h.render(Screen, props);
  const start = all(tree, 'Pressable').find(item => item.props.accessibilityLabel === 'Start Journey');
  assert.ok(start);
  start.props.onPress(); tree = h.render(Screen, props);
  assert.deepEqual(routes, [{ pathname: '/travel/[id]', params: { id: journeyId } }]);
  assert.equal(find(tree, 'StorySheet').props.visible, false);
  assert.equal(all(tree, 'JourneyMap').length, 0, 'Story map unmounts before Travel map opens');
  focus(); tree = h.render(Screen, props);
  assert.equal(find(tree, 'JourneyMap').props.selectedId, 'first', 'Returning restores Story map and selection');
  find(tree, 'JourneyOptions').props.onUse();
  tree = h.render(Screen, { ...props, journey: { ...journey, stops: [] } });
  assert.equal(all(tree, 'Pressable').some(item => item.props.accessibilityLabel === 'Start Journey'), false);
});

test('Travel Mode eligibility refuses empty, invalid and duplicate itineraries without requiring GPS coordinates', () => {
  const valid = { id: journeyId, title: 'Public journey', stops: [{ ...stop('one'), sequence: 0, latitude: null, longitude: null }] };
  assert.equal(eligibility.canOpenTravelMode(valid), true);
  for (const value of [null, { ...valid, id: 'invalid' }, { ...valid, title: ' ' }, { ...valid, stops: [] },
    { ...valid, stops: [valid.stops[0], valid.stops[0]] }, { ...valid, stops: [{ ...valid.stops[0], sequence: -1 }] }]) {
    assert.equal(eligibility.canOpenTravelMode(value), false);
  }
});

test('Travel Mode reloads the route ID using existing queries and handles exit, hardware back, loading and invalid data', async () => {
  const h = harness(); const calls = []; let id = journeyId, back, removed = 0, canGoBack = true, loader;
  const store = sessionModel.createTripStore();
  const valid = { id: journeyId, title: 'Public journey', stops: [{ ...stop('first'), sequence: 0 }] };
  let state = { data: valid, loading: false, error: null, retry: () => {} };
  const router = { canGoBack: () => canGoBack, back: () => calls.push('back'), replace: route => calls.push(route) };
  const { default: Screen, TravelModeContent } = load('src/app/travel/[id].tsx', {
    ...sessionMocks(store),
    'expo-router': { useRouter: () => router, useLocalSearchParams: () => ({ id }), useFocusEffect: callback => h.hooks.useEffect(callback, [callback]) },
    'react-native': { ...native, ScrollView: 'ScrollView', BackHandler: { addEventListener: (event, cb) => { assert.equal(event, 'hardwareBackPress'); back = cb; return { remove: () => removed++ }; } } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/components/discovery/ui': ui,
    '@/components/journey/map/journey-map': { JourneyMap: 'JourneyMap' }, '@/components/journey/map-itinerary': { MapItinerary: 'MapItinerary' },
    '@/hooks/use-load': { useLoad: callback => { loader = callback; return state; } },
    '@/lib/discovery/queries': { loadPublicJourney: async (value, signal) => { calls.push({ value, signal }); return valid; } },
    '@/lib/discovery/model': { isJourneyId: value => value === journeyId }, '@/lib/journey/map-data': mapData,
    '@/lib/journey/story-layout': layout, '@/lib/journey/travel-preview': eligibility,
  }, h.hooks);
  let tree = h.render(Screen, {});
  assert.ok(find(tree, 'SafeAreaView'));
  assert.equal(find(tree, TravelModeContent).props.journey, valid);
  const signal = new AbortController().signal;
  assert.equal(await loader(signal), valid);
  assert.deepEqual(calls.pop(), { value: journeyId, signal });
  find(tree, TravelModeContent).props.onExit(); assert.equal(calls.pop(), 'back');
  assert.equal(back(), true); assert.equal(calls.pop(), 'back');
  canGoBack = false; back(); assert.deepEqual(calls.pop(), { pathname: '/journey/[id]', params: { id: journeyId } });
  store.transition(valid, 'begin', store.get(journeyId)); tree = h.render(Screen, {});
  back(); tree = h.render(Screen, {});
  assert.match(find(tree, 'TripConfirmation').props.body, /timer keeps running/);
  assert.equal(calls.length, 0, 'Hardware back waits for confirmation');
  find(tree, 'TripConfirmation').props.onCancel(); tree = h.render(Screen, {});
  assert.equal(find(tree, 'TripConfirmation'), null); assert.equal(store.get(journeyId).status, 'active');
  find(tree, TravelModeContent).props.onExit(); tree = h.render(Screen, {});
  find(tree, 'TripConfirmation').props.onConfirm(); tree = h.render(Screen, {});
  assert.deepEqual(calls.pop(), { pathname: '/journey/[id]', params: { id: journeyId } });
  assert.equal(store.get(journeyId).status, 'active', 'Leaving does not reset or pause');
  store.transition(valid, 'pause', store.get(journeyId)); tree = h.render(Screen, {});
  back(); tree = h.render(Screen, {});
  assert.match(find(tree, 'TripConfirmation').props.body, /stays paused/);
  find(tree, 'TripConfirmation').props.onConfirm(); tree = h.render(Screen, {}); calls.pop();
  assert.equal(store.get(journeyId).status, 'paused');
  state = { ...state, data: null, error: 'Offline' }; tree = h.render(Screen, {});
  assert.equal(find(tree, TravelModeContent).props.journey, store.get(journeyId).journey, 'Failed reload retains local session controls');
  store.transition(valid, 'finish', store.get(journeyId)); store.transition(valid, 'new', store.get(journeyId));
  state = { ...state, error: null };
  state = { ...state, data: null, loading: true }; tree = h.render(Screen, {});
  assert.equal(find(tree, TravelModeContent), null); assert.ok(find(tree, 'ActivityIndicator'));
  state = { ...state, loading: false, error: 'Connection failed' }; tree = h.render(Screen, {});
  assert.equal(find(tree, 'Message').props.retry, state.retry);
  for (const data of [null, { ...valid, stops: [] }]) {
    state = { ...state, data, error: null }; tree = h.render(Screen, {});
    assert.equal(find(tree, TravelModeContent), null); assert.ok(find(tree, 'Message'));
  }
  id = ['invalid', journeyId]; tree = h.render(Screen, {});
  back(); assert.equal(calls.pop(), '/discover');
  h.dispose(); assert.ok(removed >= 1);
});

test('session clock hook clears foreground work on pause, finish, blur/unmount, and recalculates elapsed after background', () => {
  const h = harness(); let time = 0, listener, removed = 0, next = 0;
  const store = sessionModel.createTripStore(() => time), pending = new Map();
  const app = { currentState: 'active', addEventListener: (_, callback) => { listener = callback; return { remove: () => removed++ }; } };
  const timers = { setInterval: callback => { pending.set(++next, callback); return next; }, clearInterval: id => pending.delete(id) };
  const { useTripElapsed } = load('src/hooks/use-trip-session.ts', {
    'expo-router': { useFocusEffect: callback => h.hooks.useEffect(callback, [callback]) }, 'react-native': { AppState: app },
    '@/lib/journey/trip-session': { ...sessionModel, tripStore: store, observeTripTimer: (state, update) => sessionModel.observeTripTimer(state, update, timers) },
  }, h.hooks);
  const journey = { id: journeyId, title: 'Trip', stops: [{ ...stop('one'), sequence: 0 }] };
  const render = () => h.render(useTripElapsed, store.get(journeyId));
  const act = action => store.transition(journey, action, store.get(journeyId));
  assert.equal(render(), 0); assert.equal(pending.size, 0);
  act('begin'); render(); assert.equal(pending.size, 1);
  time = 1500; pending.values().next().value(); assert.equal(render(), 1500);
  listener('background'); assert.equal(pending.size, 0);
  time = 9000; listener('active'); assert.equal(render(), 9000);
  act('pause'); render(); assert.equal(pending.size, 0); assert.equal(removed, 1);
  time = 12000; assert.equal(render(), 9000); act('resume'); render(); assert.equal(pending.size, 1);
  time = 13000; act('finish'); assert.equal(render(), 10000); assert.equal(pending.size, 0);
  act('new'); render(); act('begin'); render(); const lateTick = pending.values().next().value;
  h.dispose(); assert.equal(pending.size, 0); lateTick(); assert.equal(h.lateUpdates(), 0);
});

test('confirmation Cancel and Android back cancel without invoking the destructive action', () => {
  let cancelled = 0, confirmed = 0;
  const { TripConfirmation } = load('src/components/journey/trip-confirmation.tsx', {
    'react-native': { ...native, Modal: 'Modal' }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/components/discovery/ui': ui,
  });
  const tree = TripConfirmation({ title: 'Finish this trip?', body: 'Freeze local time.', confirmLabel: 'Confirm finish', onConfirm: () => confirmed++, onCancel: () => cancelled++ });
  const button = label => all(tree, 'Pressable').find(item => item.props.accessibilityLabel === label);
  assert.ok(find(tree, 'SafeAreaView')); assert.ok(button('Confirm finish').props.style.minHeight >= 44);
  find(tree, 'Modal').props.onRequestClose(); button('Cancel').props.onPress(); assert.equal(cancelled, 2); assert.equal(confirmed, 0);
  button('Confirm finish').props.onPress(); assert.equal(confirmed, 1);
});

test('Travel session preserves map data and requires confirmation to finish or deliberately reset', () => {
  const h = harness(); let exited = 0, height = 844;
  let time = 0; const store = sessionModel.createTripStore(() => time);
  const { TravelModeContent } = load('src/app/travel/[id].tsx', {
    ...sessionMocks(store),
    'expo-router': {}, 'react-native': { ...native, ScrollView: 'ScrollView', useWindowDimensions: () => ({ height }) },
    'react-native-safe-area-context': {}, '@/components/discovery/ui': ui,
    '@/components/journey/map/journey-map': { JourneyMap: 'JourneyMap' }, '@/components/journey/map-itinerary': { MapItinerary: 'MapItinerary' },
    '@/hooks/use-load': {}, '@/lib/discovery/queries': {}, '@/lib/discovery/model': {}, '@/lib/journey/map-data': mapData,
    '@/lib/journey/story-layout': layout, '@/lib/journey/travel-preview': eligibility,
  }, h.hooks);
  const journey = { id: journeyId, title: 'Coastal trip', stops: [{ ...stop('first'), sequence: 0, dayNumber: 3, latitude: 8, longitude: 76 }, { ...stop('second'), sequence: 1, latitude: null, longitude: null }] };
  const before = JSON.stringify(journey), props = { journey, onExit: () => exited++ };
  let tree = h.render(TravelModeContent, props);
  const text = tree => all(tree, 'Text').map(item => [item.props.children].flat(Infinity).join('')).join(' ');
  assert.equal(all(tree, 'JourneyMap').length, 1);
  assert.equal(find(tree, 'JourneyMap').props.stops, journey.stops);
  assert.equal(find(tree, 'JourneyMap').props.selectedId, 'first');
  assert.match(text(tree), /Ready to start/); assert.match(text(tree), /Stop 1 of 2/); assert.match(text(tree), /Day 3/);
  find(tree, 'MapItinerary').props.onSelect('second'); tree = h.render(TravelModeContent, props);
  assert.equal(find(tree, 'JourneyMap').props.selectedId, 'second'); assert.match(text(tree), /no map coordinates/);
  find(tree, 'JourneyMap').props.onSelect('first'); tree = h.render(TravelModeContent, props);
  assert.equal(find(tree, 'MapItinerary').props.selectedId, 'first');
  all(tree, 'Pressable').find(item => item.props.accessibilityLabel === 'Begin Trip').props.onPress(); tree = h.render(TravelModeContent, props);
  assert.match(text(tree), /Trip in progress/); assert.match(text(tree), /No travel verification/); assert.match(text(tree), /Location unavailable/);
  const button = label => all(tree, 'Pressable').find(item => item.props.accessibilityLabel === label);
  time = 2500; button('Pause').props.onPress(); tree = h.render(TravelModeContent, props);
  assert.match(text(tree), /Trip paused/); time = 50000;
  button('Resume').props.onPress(); tree = h.render(TravelModeContent, props);
  time = 51500; button('Finish').props.onPress(); tree = h.render(TravelModeContent, props);
  assert.equal(store.get(journeyId).status, 'active');
  find(tree, 'TripConfirmation').props.onCancel(); tree = h.render(TravelModeContent, props);
  assert.equal(find(tree, 'TripConfirmation'), null);
  button('Finish').props.onPress(); tree = h.render(TravelModeContent, props);
  const finish = find(tree, 'TripConfirmation').props.onConfirm; finish(); finish(); tree = h.render(TravelModeContent, props);
  assert.match(text(tree), /Trip finished/); assert.match(text(tree), /2 planned stops/); assert.match(text(tree), /Final duration 00:04/);
  assert.equal(button('Resume'), undefined); assert.equal(button('Begin Trip'), undefined);
  button('Start a new trip').props.onPress(); tree = h.render(TravelModeContent, props);
  find(tree, 'TripConfirmation').props.onCancel(); tree = h.render(TravelModeContent, props);
  assert.match(text(tree), /Trip finished/);
  button('Start a new trip').props.onPress(); tree = h.render(TravelModeContent, props);
  find(tree, 'TripConfirmation').props.onConfirm(); tree = h.render(TravelModeContent, props);
  assert.match(text(tree), /Ready to start/); assert.ok(button('Begin Trip'));
  height = 568; tree = h.render(TravelModeContent, props);
  assert.equal(all(tree, 'Text').find(item => item.props.children === journey.title).props.numberOfLines, 1);
  assert.ok(find(tree, 'ScrollView').props.style.maxHeight <= 48, 'Description stays in a bounded panel');
  const exit = [tree.props.children].flat(Infinity).flatMap(node => node?.props?.children ?? []).find(node => typeof node?.type === 'function');
  exit.type(exit.props).props.onPress(); assert.equal(exited, 1);
  assert.equal(JSON.stringify(journey), before);
});

test('Travel renders permission, weak-fix and unavailable states honestly without disturbing itinerary selection', () => {
  const h = harness(); const store = sessionModel.createTripStore();
  const journey = { id: journeyId, title: 'Coast', stops: [{ ...stop('first'), sequence: 0 }, { ...stop('second'), sequence: 1 }] };
  let gps = { status: 'ready', position: null, canAskAgain: true }, begins = 0, retries = 0, settings = 0;
  const { TravelModeContent } = load('src/app/travel/[id].tsx', {
    ...sessionMocks(store),
    '@/hooks/use-trip-location': { useTripLocation: () => ({ ...gps, begin: () => begins++, retry: () => retries++ }) },
    'expo-router': {}, 'react-native': { ...native, ScrollView: 'ScrollView', useWindowDimensions: () => ({ height: 568 }), Linking: { openSettings: async () => { settings++; } } },
    'react-native-safe-area-context': {}, '@/components/discovery/ui': ui,
    '@/components/journey/map/journey-map': { JourneyMap: 'JourneyMap' }, '@/components/journey/map-itinerary': { MapItinerary: 'MapItinerary' },
    '@/hooks/use-load': {}, '@/lib/discovery/queries': {}, '@/lib/discovery/model': {}, '@/lib/journey/map-data': mapData,
    '@/lib/journey/story-layout': layout, '@/lib/journey/travel-preview': eligibility,
  }, h.hooks);
  const render = () => h.render(TravelModeContent, { journey, onExit() {} });
  const text = tree => all(tree, 'Text').map(item => [item.props.children].flat(Infinity).join('')).join(' ');
  const button = (tree, label) => all(tree, 'Pressable').find(item => item.props.accessibilityLabel === label);
  let tree = render(); assert.match(text(tree), /Ready to request location/);
  button(tree, 'Begin Trip').props.onPress(); assert.equal(begins, 1); assert.equal(store.get(journeyId).status, 'ready', 'UI delegates permission flow before transition');
  gps.status = 'requesting'; tree = render(); assert.equal(button(tree, 'Begin Trip').props.disabled, true);
  gps = { status: 'denied', canAskAgain: false, position: null }; tree = render();
  assert.match(text(tree), /permission denied/); button(tree, 'Open location settings').props.onPress(); assert.equal(settings, 1);
  store.transition(journey, 'begin', store.get(journeyId)); gps = { status: 'unavailable', canAskAgain: true, position: null }; tree = render();
  assert.match(text(tree), /Trip in progress/); assert.match(text(tree), /Location unavailable/); button(tree, 'Retry location').props.onPress(); assert.equal(retries, 1);
  find(tree, 'MapItinerary').props.onSelect('second');
  gps = { status: 'weak', canAskAgain: true, position: { latitude: 8, longitude: 76, accuracy: 250, timestamp: 100 } }; tree = render();
  assert.match(text(tree), /signal weak/); assert.match(text(tree), /250 m/);
  assert.equal(find(tree, 'JourneyMap').props.currentPosition, gps.position);
  assert.equal(find(tree, 'JourneyMap').props.selectedId, 'second'); assert.equal(find(tree, 'MapItinerary').props.selectedId, 'second');
  gps = { status: 'finished', canAskAgain: true, position: null }; store.transition(journey, 'finish', store.get(journeyId)); tree = render();
  assert.match(text(tree), /Trip finished · Location updates stopped/); assert.equal(find(tree, 'JourneyMap').props.currentPosition, null);
  h.dispose();
});

test('Travel location hook gates Begin, stops synchronously on store transitions, and disposes on exit', async () => {
  const h = harness(); const store = sessionModel.createTripStore();
  const journey = { id: journeyId, title: 'Coast', stops: [{ ...stop('first'), sequence: 0 }] };
  let callback, appListener, removed = 0, requests = [], watches = 0;
  const app = { currentState: 'active', addEventListener: (_, listener) => { appListener = listener; return { remove() { appListener = null; } }; } };
  const { useTripLocation } = load('src/hooks/use-trip-location.ts', {
    'expo-router': { useFocusEffect: callback => h.hooks.useEffect(callback, [callback]) },
    'react-native': { AppState: app }, '@/lib/journey/trip-session': { tripStore: store },
    '@/lib/journey/foreground-location': locationModel,
    '@/lib/journey/location-port': { locationPort: {
      async permission(request) { requests.push(request); return { granted: true, canAskAgain: true }; },
      async services() { return true; },
      async watch(update) { watches++; callback = update; return { remove() { removed++; } }; },
    } },
  }, h.hooks);
  const render = () => h.render(() => useTripLocation(journey, store.get(journeyId)), {});
  const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
  let value = render(); assert.deepEqual(requests, []); assert.equal(store.get(journeyId).status, 'ready');
  await value.begin(); await flush(); value = render();
  assert.equal(store.get(journeyId).status, 'active'); assert.equal(watches, 1); assert.equal(value.position, null);
  callback({ latitude: 8, longitude: 76, accuracy: 10, timestamp: Date.now() }); value = render(); assert.equal(value.status, 'tracking');
  store.transition(journey, 'pause', store.get(journeyId)); assert.equal(removed, 1, 'Pause cleans up before rerender');
  value = render(); assert.equal(value.status, 'paused'); assert.equal(value.position, null);
  store.transition(journey, 'resume', store.get(journeyId)); await flush(); assert.equal(watches, 2); assert.equal(requests.at(-1), false);
  app.currentState = 'background'; appListener('background'); assert.equal(removed, 2);
  app.currentState = 'active'; appListener('active'); await flush(); assert.equal(watches, 3);
  store.transition(journey, 'finish', store.get(journeyId)); assert.equal(removed, 3);
  assert.equal(render().status, 'finished'); h.dispose(); assert.equal(appListener, null); assert.equal(h.lateUpdates(), 0);
});

test('expanded itinerary preserves creator order, optional days and gaps across many virtualized stops', () => {
  const h = harness();
  const { MapItinerary } = load('src/components/journey/map-itinerary.tsx', {
    'react-native': native, '@/components/discovery/ui': ui, '@/lib/journey/map-data': mapData,
  }, h.hooks);
  const stops = Array.from({ length: 100 }, (_, i) => ({ ...stop('stop-' + i), sequence: i,
    name: i === 0 ? 'Zulu' : 'Alpha ' + i, dayNumber: i % 2 ? null : 100 - i,
    latitude: i === 65 ? null : 8, longitude: i === 65 ? null : 76 }));
  const before = JSON.stringify(stops), selected = [];
  const props = { stops, selectedId: 'stop-0', onSelect: id => selected.push(id) };
  let tree = h.render(MapItinerary, props);
  const list = find(tree, 'FlatList');
  assert.deepEqual(list.props.data.map(s => s.id), stops.map(s => s.id));
  assert.equal(list.props.horizontal, true);
  assert.equal(list.props.initialNumToRender, 4);
  assert.ok(list.props.windowSize < stops.length);
  const row = i => list.props.renderItem({ item: stops[i], index: i });
  assert.equal(find(row(0), 'Pressable').props.accessibilityLabel, 'Stop 1: Zulu, Day 100');
  assert.equal(find(row(1), 'Pressable').props.accessibilityLabel, 'Stop 2: Alpha 1');
  assert.equal(find(row(65), 'Pressable').props.accessibilityLabel, 'Stop 66: Alpha 65, No map coordinates');
  find(row(65), 'Pressable').props.onPress();
  assert.deepEqual(selected, ['stop-65']);
  const offsets = [];
  list.props.ref.current = { scrollToOffset: value => offsets.push(value) };
  props.selectedId = 'stop-65'; tree = h.render(MapItinerary, props);
  const updated = find(tree, 'FlatList');
  assert.equal(updated.props.extraData, 'stop-65');
  assert.equal(find(updated.props.renderItem({ item: stops[65], index: 65 }), 'Pressable').props.accessibilityState.selected, true);
  assert.equal(find(updated.props.renderItem({ item: stops[65], index: 65 }), 'Pressable').props['aria-selected'], true);
  assert.equal(offsets.at(-1).offset, updated.props.getItemLayout(null, 65).offset);
  assert.equal(mapData.buildMapData(stops).markers.some(marker => marker.id === 'stop-65'), false);
  assert.equal(JSON.stringify(stops), before);
  props.stops = []; props.selectedId = null;
  assert.equal(h.render(MapItinerary, props), null);
  h.dispose();
});

test('map header remains safe-area bounded and Close and Android back share dismissal', () => {
  let closed = 0;
  const { StorySheet } = load('src/components/journey/story-sheet.tsx', {
    'react-native': { ...native, Modal: 'Modal', ScrollView: 'ScrollView' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/components/discovery/ui': ui,
  });
  const tree = StorySheet({ visible: true, title: 'A very long journey title '.repeat(10), subtitle: '100 stops · Journey map', scrollable: false, onClose: () => closed++, children: 'Map' });
  assert.ok(find(tree, 'SafeAreaView'));
  assert.equal(find(tree, 'ScrollView'), null, 'Map is not inside the itinerary scroll surface');
  assert.equal(find(tree, 'Text').props.numberOfLines, 2);
  assert.equal(find(tree, 'Pressable').props.style.minHeight, 44);
  find(tree, 'Pressable').props.onPress();
  find(tree, 'Modal').props.onRequestClose();
  assert.equal(closed, 2);
  const about = StorySheet({ visible: true, title: 'About this journey', onClose: () => {}, children: 'About' });
  assert.ok(find(about, 'ScrollView'), 'Other sheets keep their existing scrolling');
  assert.equal(find(about, 'Pressable').props.accessibilityLabel, 'Close About this journey');
});

test('compact itinerary stays below the map and uses bounded cards instead of map overlays', () => {
  const { MapItinerary } = load('src/components/journey/map-itinerary.tsx', {
    'react-native': native, '@/components/discovery/ui': ui, '@/lib/journey/map-data': mapData,
  });
  const tree = MapItinerary({ stops: [{ ...stop('one'), latitude: null, longitude: null }], selectedId: 'one', onSelect: () => {} });
  assert.equal(tree.props.style.flexShrink, 0);
  assert.equal(tree.props.style.height, 82);
  assert.equal(tree.props.style.position, undefined);
  const list = find(tree, 'FlatList');
  for (const width of [320, 360, 390, 412]) {
    assert.ok(list.props.getItemLayout(null, 0).length < width - 32, 'Card fits narrow content width');
  }
  const row = list.props.renderItem({ item: list.props.data[0], index: 0 });
  assert.ok(find(row, 'Pressable').props.style[0].minHeight >= 44);
  assert.equal(find(row, 'Pressable').props.style[0].position, undefined);
  const story = readFileSync('src/app/journey/[id].tsx', 'utf8');
  assert.ok(story.indexOf('presentation="expanded"') < story.indexOf('<MapItinerary'));
  assert.ok(story.includes('No live navigation or recorded GPS track'));
  assert.ok(story.includes('not on the map; lines break at these stops.'));
});

test('horizontal cards snap to external selections; momentum and idle scrolling select once', async () => {
  const h = harness(); const selections = []; const details = [];
  const { StopTimeline } = load('src/components/journey/stop-timeline.tsx', {
    'react-native': native, '@/components/discovery/journey-photo': { JourneyPhoto: 'JourneyPhoto' },
    '@/components/discovery/ui': ui, '@/lib/journey/story-layout': layout,
  }, h.hooks);
  const props = { horizontal: true, stops: [stop('first'), stop('second'), stop('third')], selectedId: 'first', onSelect: id => selections.push(id), onDetails: id => details.push(id) };
  const horizontal = StopTimeline(props).type;
  let tree = h.render(horizontal, props);
  tree.props.onLayout({ nativeEvent: { layout: { width: 360 } } });
  tree = h.render(horizontal, props);
  let [thumbs, cards] = all(tree, 'FlatList');
  const offsets = [];
  cards.props.ref.current = { scrollToOffset: value => offsets.push(value) };
  thumbs.props.ref.current = { scrollToOffset: () => {} };
  find(thumbs.props.renderItem({ item: props.stops[1], index: 1 }), 'Pressable').props.onPress();
  assert.deepEqual(details, ['second']);
  assert.deepEqual(selections, [], 'Photo taps open the viewer through one parent selection handler');
  props.selectedId = 'second';
  tree = h.render(horizontal, props);
  assert.equal(offsets.at(-1).offset, 317);
  cards = all(tree, 'FlatList')[1];
  cards.props.onScrollBeginDrag();
  cards.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 634 } } });
  assert.equal(selections.at(-1), 'third');
  const count = selections.length;
  cards.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 634 } } });
  assert.equal(selections.length, count, 'Duplicate momentum events do not repeat selection');
  cards.props.onScroll({ nativeEvent: { contentOffset: { x: 0 } } });
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(selections.at(-1), 'first', 'Idle scrolling works without native momentum callbacks');
  assert.equal(find(cards.props.renderItem({ item: props.stops[2], index: 2 }), 'JourneyPhoto').props.uri, null);
});

function nativeMapHarness(stops, extraNative = {}, timers = globalThis) {
  const h = harness();
  const mapbox = Object.fromEntries(['MapView', 'Camera', 'ShapeSource', 'CircleLayer', 'SymbolLayer', 'LineLayer', 'Atmosphere'].map(key => [key, key]));
  mapbox.StyleURL = { Outdoors: 'outdoors', SatelliteStreet: 'satellite' };
  const { NativeJourneyMap: Component } = load('src/components/journey/map/native-map.tsx', {
    '@rnmapbox/maps': mapbox, 'react-native': {...native, ...extraNative}, '@/components/discovery/ui': ui,
    '@/lib/discovery/presentation': presentation, '@/lib/discovery/globe-style': stylePolicy,
    '@/lib/journey/map-camera': framing, './map-frame': { MapFallback: 'MapFallback' },
  }, h.hooks, timers);
  const props = { data: mapData.buildMapData(stops), stops, selectedId: stops[0]?.id, retry: () => {}, presentation: 'expanded' };
  const render = () => h.render(Component, props);
  const measure = (width = 390, height = 500) => {
    let tree = render();
    all(tree, 'View').find(item => item.props.onLayout).props.onLayout({nativeEvent:{layout:{width,height}}});
    tree = render(); return tree;
  };
  return { ...h, props, render, measure };
}
const mappedStop = (id, sequence, longitude, latitude) => ({...stop(id), sequence, longitude, latitude});
const source = (tree, id) => all(tree, 'ShapeSource').find(item => item.props.id === id);

test('cinematic Story map highlights ordered stops, rejects unknown markers, and expands only preview taps', () => {
  const stops = [mappedStop('second', 2, 77, 9), mappedStop('first', 1, 76, 8)];
  const h = nativeMapHarness(stops); const selections = []; let expanded = 0;
  Object.assign(h.props, {presentation:'preview', selectedId:'second', onSelect:id=>selections.push(id), onExpand:()=>expanded++});
  let tree = h.render(); assert.equal(find(tree, 'MapView'), null, 'No unframed World flash before viewport measurement');
  tree = h.measure();
  let markers = source(tree, 'planned-stops').props;
  assert.deepEqual(markers.shape.features.map(feature => [feature.id, feature.properties.number, feature.properties.selected]), [['first','1',false],['second','2',true]]);
  markers.onPress({features:[{properties:{id:'first'}}]}); markers.onPress({features:[{properties:{id:'unknown'}}]}); markers.onPress({features:[]});
  assert.deepEqual(selections, ['first']); assert.equal(expanded, 1);
  assert.equal(find(tree, 'MapView').props.scrollEnabled, false);
  assert.equal(find(tree, 'MapView').props.projection, 'globe'); assert.equal(find(tree, 'MapView').props.styleURL, 'satellite');
  assert.equal(find(tree, 'Atmosphere').props.style, presentation.globeAtmosphere);
  assert.equal(all(tree, 'LineLayer').length, 2); assert.equal(all(tree, 'LineLayer')[0].props.style.lineColor, '#FFFFFF');
  const expected = framing.frameJourneyMap(stops, {width:390,height:500}, {paddingTop:14,paddingBottom:24,paddingLeft:24,paddingRight:80});
  assert.deepEqual(source(tree, 'planned-line').props.shape, expected.route);
  assert.deepEqual(find(tree, 'Camera').props.defaultSettings, expected.camera);
  h.props.presentation='expanded'; tree=h.render();
  source(tree, 'planned-stops').props.onPress({features:[{properties:{id:'second'}}]});
  assert.equal(expanded, 1); assert.equal(selections.at(-1), 'second');
  const map = find(tree, 'MapView').props;
  assert.equal(map.scrollEnabled, true); assert.equal(map.zoomEnabled, true); assert.equal(map.rotateEnabled, true);
  assert.equal(map.logoEnabled, true); assert.equal(map.attributionEnabled, true); assert.equal(map.scaleBarEnabled, false);
  assert.equal(find(tree, 'Camera').props.defaultSettings.padding.paddingTop, 72);
  h.dispose();
});

test('Travel current-position overlay is distinct, updates without camera changes and never selects a stop', () => {
  const h = nativeMapHarness([mappedStop('first', 0, 76, 8)]); let selections = 0;
  h.props.onSelect = () => selections++;
  let tree = h.measure(); const commands = [];
  find(tree, 'Camera').props.ref.current = { setCamera: command => commands.push(command) };
  find(tree, 'MapView').props.onDidFinishLoadingMap(); tree = h.render(); commands.length = 0;
  assert.equal(source(tree, 'travel-current-position'), undefined, 'Story has no GPS overlay');
  h.props.currentPosition = { latitude: 9, longitude: 77 }; tree = h.render();
  let overlay = source(tree, 'travel-current-position');
  assert.deepEqual(overlay.props.shape.geometry.coordinates, [77, 9]); assert.equal(overlay.props.onPress, undefined);
  assert.equal(all(overlay, 'CircleLayer')[1].props.style.circleColor, '#2677D9');
  h.props.currentPosition = { latitude: 10, longitude: 78 }; tree = h.render();
  assert.deepEqual(source(tree, 'travel-current-position').props.shape.geometry.coordinates, [78, 10]);
  assert.equal(selections, 0); assert.deepEqual(commands, [], 'GPS does not recenter camera');
  assert.equal(source(tree, 'planned-stops').props.shape.features[0].properties.id, 'first');
  h.props.currentPosition = { latitude: NaN, longitude: 76 }; assert.equal(source(h.render(), 'travel-current-position'), undefined);
  h.props.currentPosition = null; assert.equal(source(h.render(), 'travel-current-position'), undefined); h.dispose();
});

test('Story renderer uses spherical dateline splits, preserves coordinate gaps and applies projection decisions', () => {
  const fixtures = [
    [mappedStop('a',0,179.8,10),mappedStop('b',1,-179.8,10.1)],
    [mappedStop('a',0,76,8),mappedStop('gap',1,null,null),mappedStop('b',2,77,9)],
    [mappedStop('a',0,0,0),mappedStop('b',1,120,0),mappedStop('c',2,-120,0),mappedStop('d',3,0,0)],
    [mappedStop('pole',0,0,90)],
  ];
  for (const stops of fixtures) {
    const h = nativeMapHarness(stops), tree = h.measure();
    const expected = framing.frameJourneyMap(stops,{width:390,height:500},{paddingTop:72,paddingBottom:32,paddingLeft:28,paddingRight:28});
    assert.equal(find(tree,'MapView').props.projection,expected.projection);
    assert.deepEqual(find(tree,'Camera').props.defaultSettings,expected.camera);
    const line = source(tree,'planned-line');
    if (expected.route.geometry.coordinates.length) assert.deepEqual(line.props.shape,expected.route);
    else assert.equal(line,undefined,'No route invented across missing coordinates');
    if (expected.latitudeClamped) assert.ok(all(tree,'Text').some(item=>String(item.props.children).includes('polar')));
    h.dispose();
  }
});

test('Story camera fits after loading, selection only recenters, Fit restores the journey, and resize refits', () => {
  const stops = [mappedStop('a',0,76,8),mappedStop('b',1,77,9)];
  const h = nativeMapHarness(stops); let tree=h.measure(); const commands=[];
  find(tree,'Camera').props.ref.current={setCamera:command=>commands.push(command)};
  find(tree,'MapView').props.onDidFinishLoadingMap(); tree=h.render();
  assert.equal(commands.length,1); assert.equal(commands[0].zoomLevel,find(tree,'Camera').props.defaultSettings.zoomLevel);
  const count=commands.length; h.props.selectedId='b'; tree=h.render();
  assert.equal(commands.length,count+1,'Selection does not repeat the full route fit');
  assert.deepEqual(commands.at(-1).centerCoordinate,[77,9]); assert.equal(commands.at(-1).zoomLevel,undefined);
  assert.equal(commands.at(-1).animationDuration,0,'Conservative Reduce Motion default');
  all(tree,'Pressable').find(item=>item.props.accessibilityLabel==='Fit journey and reset map orientation').props.onPress();
  assert.deepEqual(commands.at(-1).padding,find(tree,'Camera').props.defaultSettings.padding);
  h.measure(320,150); assert.deepEqual(commands.at(-1).padding,find(h.render(),'Camera').props.defaultSettings.padding);
  h.dispose();
});

test('satellite errors coalesce to Outdoors, stale events cannot affect replacement, and failure keeps retry', () => {
  let retries=0;
  const h=nativeMapHarness([mappedStop('a',0,76,8)]); h.props.retry=()=>retries++;
  let tree=h.measure(); const satellite=find(tree,'MapView').props;
  satellite.onMapLoadingError(); satellite.onMapLoadingError(); tree=h.render();
  assert.equal(find(tree,'MapView').props.styleURL,'outdoors');
  satellite.onDidFinishLoadingMap(); tree=h.render();
  assert.equal(all(tree,'Pressable').find(item=>item.props.accessibilityLabel==='Fit journey and reset map orientation').props.disabled,true);
  const outdoors=find(tree,'MapView').props; outdoors.onDidFinishLoadingMap(); tree=h.render();
  satellite.onMapLoadingError(); tree=h.render(); assert.equal(find(tree,'MapView').props.styleURL,'outdoors');
  outdoors.onMapLoadingError(); tree=h.render();
  assert.equal(find(tree,'MapView'),null); assert.ok(find(tree,'MapFallback'));
  find(tree,'MapFallback').props.retry(); assert.equal(retries,1); h.dispose();
});

test('stop stories navigate in order, disable ends, use shared photos and keep long notes separate from gestures', () => {
  const h = harness(); let gesture; const selected = []; let closed = 0;
  const { StopStoryViewer } = load('src/components/journey/stop-story-viewer.tsx', {
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'react-native': { ...native, Modal: 'Modal', ScrollView: 'ScrollView', PanResponder: { create: config => { gesture = config; return { panHandlers: {} }; } } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/discovery/journey-photo': { JourneyPhoto: 'JourneyPhoto' }, '@/components/discovery/ui': ui,
  }, h.hooks);
  const props = { journey: { title: 'Trip', destination: 'Kochi', stops: [stop('first'), {...stop('second'), description: 'Long notes. '.repeat(300), dayNumber: 2}] }, selectedId: 'first', onSelect: id => selected.push(id), onClose: () => closed++, onMap: () => {} };
  const button = (tree, label) => all(tree, 'Pressable').find(item => item.props.accessibilityLabel === label);
  let tree = h.render(StopStoryViewer, props);
  assert.equal(button(tree, 'Previous stop').props.disabled, true);
  assert.equal(find(tree, 'JourneyPhoto').props.uri, null);
  assert.equal(find(tree, 'JourneyPhoto').props.fill, true);
  assert.equal(all(tree, 'View').filter(item => item.props.testID?.startsWith('story-segment-')).length, 2);
  button(tree, 'Next stop').props.onPress(); assert.deepEqual(selected, ['second']);
  props.selectedId = 'second'; tree = h.render(StopStoryViewer, props);
  assert.equal(button(tree, 'Next stop').props.disabled, true);
  const progress = all(tree, 'View').find(item => item.props.accessibilityRole === 'progressbar'); assert.equal(progress.props.accessibilityValue.now, 2);
  assert.equal(gesture.onMoveShouldSetPanResponder(null, {dx: 60, dy: 80}), false);
  gesture.onPanResponderRelease(null, {dx: 100, dy: 0}); assert.equal(selected.at(-1), 'first');
  gesture.onPanResponderRelease(null, {dx: -100, dy: 0}); assert.equal(selected.length, 2, 'Last stop cannot advance');
  button(tree, 'Read full description for second').props.onPress(); tree = h.render(StopStoryViewer, props);
  assert.ok(find(tree, 'ScrollView'));
  assert.equal(gesture.onMoveShouldSetPanResponder(null, {dx: 100, dy: 0}), false);
  assert.equal(all(tree, 'Text').some(item => item.props.children === props.journey.stops[1].description && item.props.selectable), true);
  find(tree, 'Modal').props.onRequestClose(); tree = h.render(StopStoryViewer, props);
  assert.equal(find(tree, 'ScrollView'), null); assert.equal(closed, 0);
  find(tree, 'Modal').props.onRequestClose(); assert.equal(closed, 1);
  props.journey.stops = [stop('first')]; props.selectedId = 'first'; tree = h.render(StopStoryViewer, props);
  assert.equal(button(tree, 'Previous stop').props.disabled, true); assert.equal(button(tree, 'Next stop').props.disabled, true);
  props.journey.stops = []; props.selectedId = null; tree = h.render(StopStoryViewer, props);
  assert.equal(find(tree, 'JourneyPhoto'), null); assert.ok(button(tree, 'Close stop stories'));
});


test('map load timeouts advance one style at a time and unmount clears pending work', () => {
  const pending=new Map(); let sequence=0;
  const timers={setTimeout:(callback,delay)=>{assert.equal(delay,20000);const id=++sequence;pending.set(id,callback);return id;},clearTimeout:id=>pending.delete(id)};
  const h=nativeMapHarness([mappedStop('a',0,76,8)],{},timers);
  let tree=h.measure(); assert.equal(pending.size,1);
  pending.values().next().value(); tree=h.render();
  assert.equal(find(tree,'MapView').props.styleURL,'outdoors'); assert.equal(pending.size,1);
  pending.values().next().value(); tree=h.render();
  assert.ok(find(tree,'MapFallback')); assert.equal(pending.size,0); h.dispose();
  const other=nativeMapHarness([mappedStop('b',0,77,9)],{},timers); other.measure();
  assert.equal(pending.size,1); other.dispose(); assert.equal(pending.size,0);
});

test('camera transitions follow Reduce Motion and remove their accessibility subscription', async () => {
  let listener; let removed=0;
  const h=nativeMapHarness([mappedStop('a',0,76,8)], {AccessibilityInfo:{
    isReduceMotionEnabled:()=>Promise.resolve(false),addEventListener:(_,callback)=>{listener=callback;return {remove:()=>removed++};},
  }});
  let tree=h.measure(); const commands=[];
  find(tree,'Camera').props.ref.current={setCamera:command=>commands.push(command)};
  await Promise.resolve(); tree=h.render(); find(tree,'MapView').props.onDidFinishLoadingMap(); tree=h.render();
  assert.equal(commands.at(-1).animationDuration,450);
  const count = commands.length;
  listener(true); tree=h.render();
  assert.equal(commands.length,count,'Changing Reduce Motion does not refit a panned map');
  all(tree,'Pressable').find(item=>item.props.accessibilityLabel==='Fit journey and reset map orientation').props.onPress();
  assert.equal(commands.at(-1).animationDuration,0); h.dispose(); assert.equal(removed,1);
});


test('background pauses load deadlines, suppresses camera requests, and cleans late native events', async () => {
  const pending = new Map(); let sequence=0, listener, removed=0;
  const timers={setTimeout:callback=>{const id=++sequence;pending.set(id,callback);return id;},clearTimeout:id=>pending.delete(id)};
  const app={currentState:'active',addEventListener:(_,callback)=>{listener=callback;return {remove:()=>removed++};}};
  const h=nativeMapHarness([mappedStop('a',0,76,8),mappedStop('b',1,77,9)],{AppState:app,AccessibilityInfo:{
    isReduceMotionEnabled:()=>Promise.resolve(false),addEventListener:()=>({remove(){}}),
  }},timers);
  let tree=h.measure(); assert.equal(pending.size,1);
  app.currentState='background'; listener('background'); tree=h.render(); assert.equal(pending.size,0);
  const paused=find(tree,'MapView').props; paused.onMapLoadingError(); tree=h.render();
  assert.equal(find(tree,'MapView').props.styleURL,'satellite');
  app.currentState='active'; listener('active'); tree=h.render(); assert.equal(pending.size,1);
  await Promise.resolve(); tree=h.render(); const commands=[];
  find(tree,'Camera').props.ref.current={setCamera:command=>commands.push(command)};
  find(tree,'MapView').props.onDidFinishLoadingMap(); tree=h.render(); assert.equal(pending.size,0);
  const pose={center:[76.4,8.4],zoom:7,heading:12,pitch:0};
  find(tree,'MapView').props.onCameraChanged({properties:pose,gestures:{isGestureActive:false}});
  app.currentState='background'; listener('background'); tree=h.render();
  assert.deepEqual(commands.at(-1),{centerCoordinate:pose.center,zoomLevel:7,heading:12,pitch:0,animationMode:'easeTo',animationDuration:0});
  const count=commands.length;
  all(tree,'Pressable').find(item=>item.props.accessibilityLabel==='Fit journey and reset map orientation').props.onPress();
  h.props.selectedId='b'; tree=h.render(); assert.equal(commands.length,count);
  app.currentState='active'; listener('active'); tree=h.render(); assert.equal(commands.length,count,'Foreground does not reset the camera');
  const stale=find(tree,'MapView').props; const layoutEvent=all(tree,'View').find(item=>item.props.onLayout).props.onLayout; h.dispose();
  layoutEvent({nativeEvent:{layout:{width:200,height:200}}});
  stale.onDidFinishLoadingMap(); stale.onMapLoadingError(); listener('active');
  assert.equal(h.lateUpdates(),0,'Late native and app callbacks cannot update disposed state');
  tree=h.render(); assert.equal(find(tree,'MapView').props.styleURL,'satellite'); assert.equal(removed,1); assert.equal(pending.size,0);
});

test('a gesture prevents background cancellation from overriding the traveler camera', async () => {
  let listener;
  const h=nativeMapHarness([mappedStop('a',0,76,8)],{AppState:{currentState:'active',addEventListener:(_,callback)=>{listener=callback;return {remove(){}};}},
    AccessibilityInfo:{isReduceMotionEnabled:()=>Promise.resolve(false),addEventListener:()=>({remove(){}})}});
  let tree=h.measure(); await Promise.resolve(); tree=h.render(); const commands=[];
  find(tree,'Camera').props.ref.current={setCamera:command=>commands.push(command)};
  find(tree,'MapView').props.onDidFinishLoadingMap(); tree=h.render();
  find(tree,'MapView').props.onCameraChanged({properties:{center:[76,8],zoom:10,heading:0,pitch:0},gestures:{isGestureActive:true}});
  listener('background'); assert.equal(commands.length,1,'Native gesture interruption needs no replacement command'); h.dispose();
});

test('new accessibility events win over an older asynchronous Reduce Motion query', async () => {
  let resolve, listener;
  const h=nativeMapHarness([mappedStop('a',0,76,8)],{AccessibilityInfo:{isReduceMotionEnabled:()=>new Promise(done=>{resolve=done;}),addEventListener:(_,callback)=>{listener=callback;return {remove(){}};}}});
  let tree=h.measure(); listener(true); resolve(false); await Promise.resolve(); tree=h.render(); const commands=[];
  find(tree,'Camera').props.ref.current={setCamera:command=>commands.push(command)};
  find(tree,'MapView').props.onDidFinishLoadingMap(); h.render(); assert.equal(commands.at(-1).animationDuration,0); h.dispose();
});

test('native import loader abandons unmounted and timed-out work and pauses background deadlines', async () => {
  const original=process.env.EXPO_PUBLIC_MAPBOX_TOKEN; process.env.EXPO_PUBLIC_MAPBOX_TOKEN='pk.test';
  try {
    for (const mode of ['unmount','timeout','background','success']) {
      const wrapper=harness(), loader=harness(); let current=wrapper, listener, configured=0, removed=0;
      const pending=new Map(); let sequence=0;
      const timers={setTimeout:callback=>{const id=++sequence;pending.set(id,callback);return id;},clearTimeout:id=>pending.delete(id)};
      const app={currentState:'active',addEventListener:(_,callback)=>{listener=callback;return {remove:()=>removed++};}};
      const hooks={Component:class {},...Object.fromEntries(Object.keys(wrapper.hooks).map(key=>[key,(...args)=>current.hooks[key](...args)]))};
      const {JourneyMap}=load('src/components/journey/map/journey-map.native.tsx',{
        'expo-constants':{default:{executionEnvironment:'bare'},ExecutionEnvironment:{StoreClient:'store'}},
        'react-native':{...native,AppState:app},'@/lib/journey/map-data':mapData,'./map-frame':{MapFrame:'MapFrame',MapFallback:'MapFallback'},
        './native-map':{configureMap:async()=>{configured++;},NativeJourneyMap:'NativeJourneyMap'},
      },hooks,timers);
      const outer=wrapper.render(JourneyMap,{stops:[mappedStop('a',0,76,8)]});
      const element=outer.props.children.props.children; current=loader;
      let tree=loader.render(element.type,element.props); assert.equal(pending.size,1);
      if(mode==='unmount') loader.dispose();
      if(mode==='timeout') pending.values().next().value();
      if(mode==='background') {app.currentState='background';listener('background');assert.equal(pending.size,0);}
      await new Promise(done=>setImmediate(done));
      assert.equal(loader.lateUpdates(),0);
      tree=loader.render(element.type,element.props);
      assert.equal(configured,mode==='unmount'||mode==='timeout'?0:1);
      if(mode==='timeout') assert.ok(find(tree,'MapFallback'));
      if(mode==='success'||mode==='background') assert.ok(find(tree,'NativeJourneyMap'));
      if(mode!=='unmount') loader.dispose(); assert.equal(pending.size,0); assert.equal(removed,1); wrapper.dispose();
    }
  } finally {if(original===undefined) delete process.env.EXPO_PUBLIC_MAPBOX_TOKEN; else process.env.EXPO_PUBLIC_MAPBOX_TOKEN=original;}
});


test('unmount cancels an observed transition and newer selection supersedes the previous target', async () => {
  const h=nativeMapHarness([mappedStop('a',0,76,8),mappedStop('b',1,77,9)],{AccessibilityInfo:{isReduceMotionEnabled:()=>Promise.resolve(false),addEventListener:()=>({remove(){}})}});
  let tree=h.measure(); await Promise.resolve(); tree=h.render(); const commands=[];
  find(tree,'Camera').props.ref.current={setCamera:command=>commands.push(command)};
  find(tree,'MapView').props.onDidFinishLoadingMap(); tree=h.render();
  h.props.selectedId='b'; tree=h.render(); assert.equal(commands.length,2); assert.deepEqual(commands.at(-1).centerCoordinate,[77,9]);
  const stale=find(tree,'MapView').props;
  stale.onCameraChanged({properties:{center:[76.5,8.5],zoom:8,heading:0,pitch:0},gestures:{isGestureActive:false}});
  h.dispose(); assert.equal(commands.length,3); assert.equal(commands.at(-1).animationDuration,0);
  assert.deepEqual(commands.at(-1).centerCoordinate,[76.5,8.5]);
  stale.onDidFinishLoadingMap(); stale.onMapLoadingError(); assert.equal(h.lateUpdates(),0);
});
