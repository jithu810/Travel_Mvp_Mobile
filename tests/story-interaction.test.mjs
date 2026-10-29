import { buddyGeometryStub, buddyMapPinsStub } from './helpers/buddy-geometry-stub.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
// Execute the actual dependency-free shared theme in the component harness.
const mobileTheme = {};
new Function('exports', ts.transpileModule(readFileSync('src/theme/mobile-theme.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mobileTheme);


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
  modules={'@/lib/journey/customized-travel':{customizedTravel:()=>null},'@/hooks/use-buddy-geometry':buddyGeometryStub,...modules};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const require = name => {
    if(name==='@/hooks/use-journey-buddy')return {useBuddyCelebration:()=>()=>{},useBuddyScreen(){},useBuddySuppression(){},...modules[name]};
    if(name==='@/hooks/use-map-buddy')return modules[name] || {useMapBuddy:()=>({enabled:false,visible:false,openHelp(){}})};
    if(name==='@/hooks/use-buddy-map-image')return modules[name] || {useBuddyMapImage:()=>({ready:true,failed:false,version:0,ref:{current:null},onLoad(){},onError(){},onLayout(){},retry(){}})};
    if(name==='@/hooks/use-live-buddy-safety')return modules[name] || {useLiveBuddySafety:()=>({mapRef(){},moving(){},idle(){},clear:false,present:false})};
    if(name==='@/lib/buddy/animations')return {buddyReference:'buddy-reference'};
    if(name==='@/lib/buddy/map-image')return modules[name] || {buddyMapImageSource:{uri:'data:image/png;base64,buddy'}};
    if(name==='@/lib/buddy/map-presentation')return load('src/lib/buddy/map-presentation.ts',{});
    if(name==='./story-walking-buddy')return {StoryWalkingBuddy:'StoryWalkingBuddy'};
    if(name==='@/lib/journey/story-buddy-playback')return load('src/lib/journey/story-buddy-playback.ts',{'./map-data':mapData,'../discovery/travel':travel});
    if(name==='@/hooks/use-buddy-map-pins')return buddyMapPinsStub;
    if(name==='@/lib/buddy/map-controls')return load('src/lib/buddy/map-controls.ts',{'../discovery/globe-style':load('src/lib/discovery/globe-style.ts',{})});
    if(name==='@/lib/buddy/model')return load('src/lib/buddy/model.ts',{});
    if(name==='@/components/buddy/buddy-space')return {BuddySpace:'BuddySpace'};
    if (name === '@/theme/mobile-theme') return mobileTheme;
    if(name==='@/lib/journey/nearby')return load('src/lib/journey/nearby.ts',{}); if(name.endsWith('/nearby-locations'))return {NearbyLocations:'NearbyLocations'}; if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === '@/components/journey/swipe-journey-start') return { SwipeJourneyStart: 'SwipeJourneyStart', SwipeAction: 'SwipeAction' };
    if (name === '@/components/journey/journey-action-icon') return { JourneyActionIcon: 'JourneyActionIcon' };
    if (name === './journey-action-icon') return { JourneyActionIcon: 'JourneyActionIcon' };
    if (name === './stop-card-deck') return { StopCardDeck: 'StopCardDeck' };
    if (name === '@/components/remix/source-attribution') return { SourceAttribution: 'SourceAttribution' };
    if (name === '@/components/art/journey-art' && !Object.hasOwn(modules, name)) return { JourneyArt: 'JourneyArt', StopArt: 'StopArt' };
    if (name === '@/components/art/circle-map' && !Object.hasOwn(modules, name)) return { CircleMap: 'CircleMap', circleMapFootprint: 110, circleMapUri: point => typeof point?.latitude === 'number' && typeof point?.longitude === 'number' ? 'circle:' + point.latitude + ',' + point.longitude : null };
    if (name === '@/lib/art/journey-art' && !Object.hasOwn(modules, name)) return load('src/lib/art/journey-art.ts', {});
    if (name === 'expo-status-bar') return {StatusBar:'StatusBar'};
    if (name === 'react') return hooks;
    if (name === 'expo-router') return { useFocusEffect: fn => hooks.useEffect(fn, [fn]), ...modules[name] };
    if (name === 'react-native-safe-area-context') return { ...modules[name], useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) };
    if (name === '@/components/journey/itinerary-sheet') return { ItinerarySheet: 'ItinerarySheet' };
    if (name === '@/components/journey/maneuver-panel') return { ManeuverPanel: 'ManeuverPanel' };
    if (name === '@/components/journey/arrival-prompt') return { ArrivalPrompt: 'ArrivalPrompt' };
    if (Object.hasOwn(modules, name)) return modules[name];
    if(name==='@/components/branded-loading')return {BrandedLoading:'BrandedLoading'};
    throw new Error('Unexpected component dependency: ' + name);
  };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', source)(require, module, module.exports, timers.setTimeout, timers.clearTimeout, timers.setInterval ?? globalThis.setInterval, timers.clearInterval ?? globalThis.clearInterval);
  return module.exports;
}
function find(tree, type) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === type) return tree;
  for (const child of [tree.props?.children, tree.props?.footer, tree.props?.photoActions, tree.props?.optionsActions].flat(Infinity)) {
    const match = find(child, type);
    if (match) return match;
  }
  return null;
}
function all(tree, type) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(tree.type === type ? [tree] : []), ...[tree.props?.children, tree.props?.footer, tree.props?.photoActions, tree.props?.optionsActions].flat(Infinity).flatMap(child => all(child, type))];
}
const native = {
  StyleSheet: { create: value => value }, View: 'View', Text: 'Text', Pressable: 'Pressable', FlatList: 'FlatList',
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(true), addEventListener: () => ({ remove() {} }) },
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Modal: 'Modal', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator', useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  Alert: { alert() {} },
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
const guidanceModel = load('src/lib/journey/turn-guidance.ts', {});
const navigationModel = load('src/lib/journey/navigation.ts', { './turn-guidance': guidanceModel, './off-route': load('src/lib/journey/off-route.ts', { './turn-guidance': guidanceModel }) });
const arrivalModel = load('src/lib/journey/arrival.ts', { './navigation': navigationModel, './turn-guidance': guidanceModel });
const cameraModel = load('src/lib/journey/travel-camera.ts', { './navigation': navigationModel });
const sessionMocks = store => ({
  '@/lib/journey/navigation': navigationModel,
  '@/hooks/use-trip-arrival': { useTripArrival: () => ({ prompt: null, message: 'Arrival needs reliable GPS', confirm() {}, dismiss() {} }) },
  '@/hooks/use-trip-navigation': { useTripNavigation: (journey, session) => ({ destination: sessionModel.tripDestination(journey, session), status: 'idle', message: 'Waiting for GPS', route: null, retry() {} }) },
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

test('Story preserves map browsing while Use opens Travel directly and Remix remains separate', () => {
  const h = harness();
  const journey = { id: journeyId, title: 'Public journey', stops: [{ ...stop('first'), sequence: 0 }, { ...stop('second'), sequence: 1 }], description: '' };
  const routes = []; let focus, buddyState;
  let canGoBack = true, backCount = 0;
  const replacements = [];
  let buddyAuth = { loading: false, session: null, error: null };
  const { JourneyStoryContent: Screen } = load('src/app/journey/[id].tsx', {
    '@/hooks/session-context': { useSessionState: () => buddyAuth },
    '@/hooks/use-journey-buddy': { useBuddyScreen: value => { buddyState = value; } },
    'expo-router': { useRouter: () => ({ push: route => routes.push(route), canGoBack: () => canGoBack, back: () => { backCount++; }, replace: route => replacements.push(route) }), useFocusEffect: callback => { focus = callback; } }, 'react-native': native,
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
    '@/lib/journey/map-data': { ...mapData, hasCoordinates: () => false },
    '@/lib/journey/snapshot': { hasStory: () => false }, '@/lib/journey/story-layout': layout,
  }, h.hooks);
  const props = { journey, refresh: () => {}, refreshing: false, error: null };
  let tree = h.render(Screen, props);
  const back = all(tree, 'Pressable').find(item => item.props.accessibilityLabel === 'Go back');
  assert.ok(back, 'Regular Journey Story exposes a back button');
  back.props.onPress();
  assert.equal(backCount, 1);
  canGoBack = false;
  back.props.onPress();
  assert.deepEqual(replacements, ['/discover'], 'Direct entry falls back to Discover');
  assert.equal(backCount, 1);
  assert.equal(buddyState.ownStory, undefined, 'Anonymous viewer never owns an unidentified story');
  buddyAuth = { loading: false, session: { user: { id: journeyId } }, error: null };
  h.render(Screen, { ...props, journey: { ...journey, creatorId: journeyId } });
  assert.equal(buddyState.ownStory.id, journeyId);
  h.render(Screen, { ...props, journey: { ...journey, creatorId: 'other-owner' } });
  assert.equal(buddyState.ownStory, undefined);
  buddyAuth = { ...buddyAuth, loading: true }; h.render(Screen, { ...props, journey: { ...journey, creatorId: journeyId } });
  assert.equal(buddyState.ownStory, undefined, 'Auth restoration does not guess ownership');
  buddyAuth = { loading: false, session: null, error: null }; tree = h.render(Screen, props);
  assert.ok(find(tree, 'ScrollView'), 'Map and cards retain an accessible short-screen scroll fallback');
  assert.equal(find(find(tree, 'ScrollView'), 'SwipeJourneyStart'), null, 'Swipe stays below the card scroll area');
  assert.ok(find(tree, 'SwipeJourneyStart'));
  assert.equal(find(tree, 'StopTimeline').props.creator.type, 'StoryCreator');
  assert.equal(find(tree, 'StoryHeader'), null);
  assert.equal(find(tree, 'StopTimeline').props.stacked, true);
  assert.equal(find(tree,'StatusBar').props.style,'light');
  assert.equal(find(tree,'JourneyMap').props.controlTopInset,24);
  assert.equal(all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Expand journey map').props.style.at(-1).top,28);
  const shade=all(tree,'View').find(n=>n.props.testID==='journey-status-shade');assert.equal(shade.props.pointerEvents,'none');assert.equal(shade.props.style.at(-1).height,44);
  const sharedStoryBuddy = find(tree, 'JourneyMap').props.storyBuddy;
  assert.equal(typeof sharedStoryBuddy.select, 'function');
  assert.equal(find(tree, 'JourneyMap').props.storyBuddySize, 36);
  assert.equal(find(tree,'JourneyMap').props.storyBuddyMotion,'walk');
  assert.equal(find(tree, 'StopTimeline').props.selectedId, 'first');
  find(tree, 'StopTimeline').props.onSelect('second');
  tree = h.render(Screen, props);
  assert.equal(find(tree, 'JourneyMap').props.selectedId, 'second');
  assert.equal(find(tree, 'JourneyOptions').props.presentation, 'rail');
  assert.equal(all(tree, 'JourneyOptions').length, 1);
  assert.equal(all(tree, 'SocialActions').length, 1);
  assert.ok(!all(tree, 'Pressable').some(n => n.props.accessibilityLabel === 'Journey actions'));
  find(tree, 'JourneyOptions').props.onAbout();tree=h.render(Screen,props);
  assert.equal(find(tree, 'StorySheet').props.suppressBuddy, true, 'About keeps the existing global blocker');
  assert.equal(find(tree,'StorySheet').props.visible,true);assert.equal(find(tree,'StatusBar'),null);
  find(tree,'StorySheet').props.onClose();tree=h.render(Screen,props);
  find(tree, 'JourneyOptions').props.onUse();
  tree = h.render(Screen, props);
  assert.deepEqual(routes, [{ pathname: '/travel/[id]', params: { id: journeyId } }]);
  assert.equal(find(tree, 'StorySheet').props.visible, false, 'Use skips the intermediate map');
  assert.equal(all(tree, 'JourneyMap').length, 0);
  focus(); tree = h.render(Screen, props);
  find(tree, 'JourneyMap').props.onExpand(); tree = h.render(Screen, props);
  assert.equal(find(tree, 'StorySheet').props.visible, true);
  assert.equal(find(tree, 'StorySheet').props.scrollable, false);
  assert.equal(find(tree, 'StorySheet').props.suppressBuddy, false, 'Only the full Story map releases sheet suppression');
  assert.equal(find(tree, 'JourneyMap').props.presentation, 'expanded');
  assert.equal(find(tree, 'JourneyMap').props.storyBuddy, sharedStoryBuddy, 'Expansion keeps the shared walking position');
  assert.equal(find(tree, 'JourneyMap').props.storyBuddySize, 64);
  assert.equal(find(tree, 'JourneyMap').props.navigationMode, undefined, 'Story keeps its cinematic map style');
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
  find(tree,'JourneyOptions').props.onAbout();
  tree = h.render(Screen, props);
  assert.equal(all(tree, 'JourneyMap').length, 0, 'About also unmounts the preview');
  find(tree, 'StorySheet').props.onClose();
  tree = h.render(Screen, props);
  assert.equal(find(tree, 'JourneyMap').props.presentation, 'expanded');
  assert.equal(find(tree, 'StopTimeline').props.selectedId, 'first');
  find(tree, 'StopTimeline').props.onSelect('unknown');
  tree = h.render(Screen, props);
  assert.equal(find(tree, 'StopTimeline').props.selectedId, 'first');
  assert.ok(find(tree, 'SwipeJourneyStart'));
  assert.equal(find(tree, 'SwipeJourneyStart').props.active, true);
  find(tree, 'JourneyMap').props.onExpand(); tree = h.render(Screen, props);
  const start = all(tree, 'Pressable').find(item => item.props.accessibilityLabel === 'Start Journey');
  assert.ok(start);
  start.props.onPress(); tree = h.render(Screen, props);
  assert.deepEqual(routes, Array.from({ length: 2 }, () => ({ pathname: '/travel/[id]', params: { id: journeyId } })));
  assert.equal(find(tree, 'StorySheet').props.visible, false);
  assert.equal(all(tree, 'JourneyMap').length, 0, 'Story map unmounts before Travel map opens');
  focus(); tree = h.render(Screen, props);
  assert.equal(find(tree, 'JourneyMap').props.selectedId, 'first', 'Returning restores Story map and selection');
  find(tree, 'JourneyMap').props.onExpand();
  tree = h.render(Screen, { ...props, journey: { ...journey, stops: [] } });
  const routeCount = routes.length; find(tree, 'JourneyOptions').props.onUse(); assert.equal(routes.length, routeCount);
  assert.equal(all(tree, 'Pressable').some(item => item.props.accessibilityLabel === 'Start Journey'), false);

  // The identical Story presentation is safe for a synthetic temporary journey.
  const removed = [];let cardsBack=0;
  const temporary = { onBack:()=>{cardsBack++;}, onRemove: id => removed.push(id), editingBlocked: false, error: null };
  const selectedProps = { ...props, journey: { ...journey, creatorId: journeyId, sourceId: 'public-source' }, temporary };
  buddyAuth = { loading: false, session: { user: { id: journeyId } }, error: null };
  find(tree, 'StorySheet').props.onClose(); tree = h.render(Screen, selectedProps);
  assert.equal(find(tree, 'SocialActions'), null);assert.equal(find(tree, 'JourneyOptions'), null);assert.equal(find(tree, 'SourceAttribution'), null);
  assert.equal(buddyState.ownStory, undefined, 'Temporary IDs cannot become editable owned stories');
  assert.equal(find(tree,'JourneyMap').props.storyBuddyMotion,'run');
  all(tree,'Pressable').find(item=>item.props.accessibilityLabel==='Back to magic cards').props.onPress();assert.equal(cardsBack,1);
  const selectedBuddy=find(tree,'JourneyMap').props.storyBuddy;
  find(tree,'JourneyMap').props.onExpand();tree=h.render(Screen,selectedProps);
  assert.equal(find(tree,'JourneyMap').props.storyBuddyMotion,'run');assert.equal(find(tree,'JourneyMap').props.storyBuddy,selectedBuddy);
  find(tree,'StorySheet').props.onClose();tree=h.render(Screen,selectedProps);
  assert.equal(find(tree, 'SwipeJourneyStart'), null);assert.equal(find(tree, 'SwipeAction').props.label, 'Swipe to journey');
  const remove = () => all(tree, 'Pressable').find(item => item.props.accessibilityLabel?.startsWith('Remove '));
  remove().props.onPress();assert.deepEqual(removed, ['first']);
  tree=h.render(Screen,{...selectedProps,temporary:{...temporary,editingBlocked:true}});
  assert.equal(remove().props.disabled,true);remove().props.onPress();assert.equal(removed.length,1);
  tree=h.render(Screen,{...selectedProps,journey:{...journey,stops:[journey.stops[0]]}});
  assert.equal(remove().props.disabled,true);remove().props.onPress();assert.equal(removed.length,1);
  tree=h.render(Screen,selectedProps);find(tree,'SwipeAction').props.onStart();
  assert.deepEqual(routes.at(-1),{pathname:'/travel/[id]',params:{id:journeyId,customized:'1'}});
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
  const h = harness(); const calls = []; let id = journeyId, customized, localJourney = null, back, removed = 0, canGoBack = true, loader;
  const store = sessionModel.createTripStore();
  const valid = { id: journeyId, title: 'Public journey', stops: [{ ...stop('first'), sequence: 0 }] };
  let state = { data: valid, loading: false, error: null, retry: () => {} };
  const router = { canGoBack: () => canGoBack, back: () => calls.push('back'), replace: route => calls.push(route) };
  const { default: Screen, TravelModeContent } = load('src/app/travel/[id].tsx', {
    '@/lib/journey/customized-travel': { customizedTravel: () => localJourney },
    ...sessionMocks(store),
    'expo-router': { useRouter: () => router, useLocalSearchParams: () => ({ id, customized }), useFocusEffect: callback => h.hooks.useEffect(callback, [callback]) },
    'react-native': { ...native, ScrollView: 'ScrollView', BackHandler: { addEventListener: (event, cb) => { assert.equal(event, 'hardwareBackPress'); back = cb; return { remove: () => removed++ }; } } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/components/discovery/ui': ui,
    '@/components/journey/map/journey-map': { JourneyMap: 'JourneyMap' }, '@/components/journey/map-itinerary': { MapItinerary: 'MapItinerary' },
    '@/hooks/use-load': { useLoad: callback => { loader = callback; return state; } },
    '@/lib/discovery/queries': { loadPublicJourney: async (value, signal) => { calls.push({ value, signal }); return valid; } },
    '@/lib/discovery/model': { isJourneyId: value => value === journeyId }, '@/lib/journey/map-data': mapData,
    '@/lib/journey/story-layout': layout, '@/lib/journey/travel-preview': eligibility,
  }, h.hooks);
  let tree = h.render(Screen, {});
  assert.equal(find(tree, 'SafeAreaView'), null, 'Loaded Travel is full screen with safe-area-aware overlays');
  assert.equal(find(tree, TravelModeContent).props.journey, valid);
  const signal = new AbortController().signal;
  assert.equal(await loader(signal), valid);
  assert.deepEqual(calls.pop(), { value: journeyId, signal });
  customized = '1'; localJourney = { ...valid, stops: [valid.stops[0]] };
  tree = h.render(Screen, {}); assert.equal(find(tree, TravelModeContent).props.journey, localJourney);
  assert.equal(await loader(signal), localJourney); assert.equal(calls.length,0,'Custom preview does not fetch from backend');
  localJourney = null; tree = h.render(Screen, {});
  assert.equal(await loader(signal),null); assert.equal(find(tree, TravelModeContent),null,'Missing selection does not fall back to stale public data');
  assert.match(find(tree,'Message').props.body,/local selection is unavailable/);
  customized = ['1']; tree = h.render(Screen, {}); assert.equal(find(tree,TravelModeContent),null);
  customized = undefined; id = journeyId; tree = h.render(Screen, {});
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
  assert.match(find(tree, TravelModeContent).props.refreshNotice, /Original could not refresh/);
  store.transition(valid, 'finish', store.get(journeyId)); store.transition(valid, 'new', store.get(journeyId));
  state = { ...state, error: null };
  state = { ...state, data: null, loading: true }; tree = h.render(Screen, {});
  assert.equal(find(tree, TravelModeContent), null); assert.ok(find(tree, 'BrandedLoading'));
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
  const h = harness(), celebrations = []; let exited = 0, height = 844;
  let time = 0; const store = sessionModel.createTripStore(() => time);
  const { TravelModeContent } = load('src/app/travel/[id].tsx', {
    ...sessionMocks(store),
    '@/hooks/use-journey-buddy': { useBuddyCelebration: () => (animation, operation) => celebrations.push({ animation, operation }) },
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
  assert.match(text(tree), /Stop 1 of 2/); assert.match(text(tree), /No travel verification/); assert.match(text(tree), /GPS temporarily unavailable/);
  const button = label => all(tree, 'Pressable').find(item => item.props.accessibilityLabel === label);
  time = 2500; button('Pause').props.onPress(); tree = h.render(TravelModeContent, props);
  assert.deepEqual(celebrations, [], 'Pause does not emit Run');
  assert.match(text(tree), /Paused · Stop 1 of 2/); time = 50000;
  const resume = button('Resume').props.onPress; resume(); resume(); tree = h.render(TravelModeContent, props);
  assert.equal(celebrations.length, 1); assert.equal(celebrations[0].animation, 'run'); assert.equal(celebrations[0].operation, store.get(journeyId));
  time = 51500; button('Finish').props.onPress(); tree = h.render(TravelModeContent, props);
  assert.equal(store.get(journeyId).status, 'active');
  find(tree, 'TripConfirmation').props.onCancel(); tree = h.render(TravelModeContent, props);
  assert.equal(find(tree, 'TripConfirmation'), null);
  button('Finish').props.onPress(); tree = h.render(TravelModeContent, props);
  const finish = find(tree, 'TripConfirmation').props.onConfirm; finish(); finish(); tree = h.render(TravelModeContent, props);
  assert.match(text(tree), /Trip ended early/); assert.match(text(tree), /0\/2 completed/); assert.match(text(tree), /Final duration 00:04/);
  assert.equal(button('Resume'), undefined); assert.equal(button('Begin Trip'), undefined);
  button('Start a new trip').props.onPress(); tree = h.render(TravelModeContent, props);
  find(tree, 'TripConfirmation').props.onCancel(); tree = h.render(TravelModeContent, props);
  assert.match(text(tree), /Trip ended early/);
  button('Start a new trip').props.onPress(); tree = h.render(TravelModeContent, props);
  find(tree, 'TripConfirmation').props.onConfirm(); tree = h.render(TravelModeContent, props);
  assert.match(text(tree), /Ready to start/); assert.ok(button('Begin Trip'));
  height = 568; tree = h.render(TravelModeContent, props);
  assert.equal(all(tree, 'Text').find(item => item.props.children === journey.title).props.numberOfLines, 1);
  assert.ok(find(tree, 'ItinerarySheet'), 'Details live in a collapsible sheet');
  tree.props.onLayout({ nativeEvent: { layout: { height: 568 } } });
  tree = h.render(TravelModeContent, props);
  assert.equal(find(tree, 'ItinerarySheet').props.maxSheetHeight, 328, 'Sheet reserves safe areas, heading and map controls on short screens');
  assert.ok(all(find(tree, 'ItinerarySheet').props.footer, 'Pressable').some(item => item.props.accessibilityLabel === 'Begin Trip'), 'Primary controls are in the fixed sheet footer');
  const mapContainer = all(tree, 'View').find(item => item.props.style?.position === 'absolute' && item.props.style?.paddingHorizontal === undefined);
  assert.deepEqual(mapContainer.props.style, { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }, 'Map fills the screen edge to edge');
  assert.equal(find(tree, 'JourneyMap').props.navigationMode, true);
  assert.equal(find(tree, 'ScrollView'), null, 'Essential controls require no screen scrolling');
  const exit = all(tree, 'View').flatMap(node => [node.props?.children].flat(Infinity)).find(node => typeof node?.type === 'function');
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
  assert.equal(button(tree, 'Begin Trip').props.disabled, true);
  assert.ok(find(tree, 'JourneyMap'), 'Denied permission does not remove the road map');
  assert.equal(store.get(journeyId).status, 'ready');
  gps = { status: 'denied', canAskAgain: true, position: null }; tree = render();
  button(tree, 'Retry location').props.onPress(); assert.equal(retries, 1);
  assert.equal(store.get(journeyId).status, 'ready', 'Permission Retry does not begin the trip');
  store.transition(journey, 'begin', store.get(journeyId)); gps = { status: 'unavailable', canAskAgain: true, position: null }; tree = render();
  assert.match(text(tree), /Stop 1 of 2/); assert.match(text(tree), /GPS temporarily unavailable/); button(tree, 'Retry location').props.onPress(); assert.equal(retries, 2);
  find(tree, 'MapItinerary').props.onSelect('second');
  gps = { status: 'weak', canAskAgain: true, position: { latitude: 8, longitude: 76, accuracy: 250, timestamp: 100 } }; tree = render();
  assert.match(text(tree), /signal weak/); assert.match(text(tree), /250 m/);
  assert.equal(find(tree, 'JourneyMap').props.currentPosition, null, 'A weak/stale fix must not look like a precise current-position dot');
  assert.equal(find(tree, 'JourneyMap').props.selectedId, 'second'); assert.equal(find(tree, 'MapItinerary').props.selectedId, 'second');
  for (const [directionSource, direction, message] of [['compass', 90, /Arrow shows phone direction/], [null, null, /Direction unavailable/]]) {
    gps = { status: 'tracking', canAskAgain: true, position: { latitude: 8, longitude: 76, accuracy: 5, timestamp: Date.now(), directionSource, direction } };
    tree = render();
    // Status must appear in the collapsed footer, not solely inside expanded itinerary details.
    const footer = find(tree, 'ItinerarySheet').props.footer;
    assert.match(text(footer), message);
    assert.equal(find(tree, 'JourneyMap').props.currentPosition.direction, direction);
  }
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
    'react-native': { AppState: app, Platform: { OS: 'android' } }, '@/lib/journey/trip-session': { tripStore: store },
    '@/lib/journey/foreground-location': locationModel,
    '@/lib/journey/location-port': { locationPort: {
      async permission(request) { requests.push(request); return { granted: true, canAskAgain: true }; },
      async services() { return true; },
      async watch(update) { watches++; callback = update; return { remove() { removed++; } }; },
    } },
  }, h.hooks);
  const render = () => h.render(() => useTripLocation(journey, store.get(journeyId)), {});
  const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
  let value = render(); await flush(); value = render();
  assert.deepEqual(requests, [true]); assert.equal(store.get(journeyId).status, 'ready'); assert.equal(watches, 0); assert.equal(value.status, 'permitted');
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

test('actual Begin hook emits Run only when permission-gated trip transition succeeds', async () => {
  for (const granted of [true, false]) {
    const h = harness(), store = sessionModel.createTripStore(), celebrations = [];
    const journey = { id: journeyId, title: 'Trip', stops: [{ ...stop('only'), sequence: 1 }] };
    const app = { currentState: 'active', addEventListener: () => ({ remove() {} }) };
    const { useTripLocation } = load('src/hooks/use-trip-location.ts', {
      '@/hooks/use-journey-buddy': { useBuddyCelebration: () => (animation, operation) => celebrations.push({ animation, operation }) },
      'expo-router': { useFocusEffect: fn => h.hooks.useEffect(fn, [fn]) }, 'react-native': { AppState: app, Platform: { OS: 'android' } },
      '@/lib/journey/trip-session': { tripStore: store }, '@/lib/journey/foreground-location': locationModel,
      '@/lib/journey/location-port': { locationPort: { permission: async () => ({ granted, canAskAgain: true }), services: async () => true, watch: async () => ({ remove() {} }) } },
    }, h.hooks);
    const render = () => h.render(() => useTripLocation(journey, store.get(journeyId)), {});
    const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
    render(); await flush(); const before = render(); const pending = before.begin();
    assert.deepEqual(celebrations, []); await pending; await flush();
    assert.equal(celebrations.length, granted ? 1 : 0);
    if (granted) { assert.equal(celebrations[0].animation, 'run'); assert.equal(celebrations[0].operation, store.get(journeyId)); }
    await before.begin(); await flush(); assert.equal(celebrations.length, granted ? 1 : 0, 'Stale Begin cannot repeat Run');
    h.dispose();
  }
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
  assert.equal(updated.props.extraData[0], 'stop-65');
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

function nativeMapHarness(stops, extraNative = {}, timers = globalThis, store = sessionModel.createTripStore(), extraModules = {}) {
  const h = harness();
  const cameraHook = load('src/hooks/use-travel-camera.ts', {
    'expo-router': { useFocusEffect: fn => h.hooks.useEffect(fn, [fn]) },
    'react-native': { ...native, ...extraNative }, '@/lib/journey/travel-camera': cameraModel,
    '@/lib/journey/trip-session': { tripStore: store },
  }, h.hooks, timers);
  const mapbox = Object.fromEntries(['MapView', 'Camera', 'ShapeSource', 'CircleLayer', 'SymbolLayer', 'LineLayer', 'Atmosphere', 'Images', 'Image'].map(key => [key, key]));
  mapbox.StyleURL = { Outdoors: 'outdoors', SatelliteStreet: 'satellite', Street: 'streets' };
  const { NativeJourneyMap: Component } = load('src/components/journey/map/native-map.tsx', {
    '@rnmapbox/maps': mapbox, 'react-native': {...native, ...extraNative}, '@/components/discovery/ui': ui,
    '@/lib/discovery/presentation': presentation, '@/lib/discovery/globe-style': stylePolicy,
    '@/lib/journey/map-camera': framing, './map-frame': { MapFallback: 'MapFallback' },
    '@/hooks/use-travel-camera': cameraHook,
    '@/components/discovery/globe/journey-overlays': {JourneyOverlays:'JourneyOverlays'},
    ...(typeof extraModules === 'function' ? extraModules(h.hooks) : extraModules),
  }, h.hooks, timers);
  const props = { data: mapData.buildMapData(stops), stops, selectedId: stops[0]?.id, retry: () => {}, presentation: 'expanded' };
  const render = () => h.render(Component, props);
  const measure = (width = 390, height = 500) => {
    let tree = render();
    all(tree, 'View').find(item => item.props.onLayout).props.onLayout({nativeEvent:{layout:{width,height}}});
    tree = render(); return tree;
  };
  return { ...h, props, render, measure, store };
}
const mappedStop = (id, sequence, longitude, latitude) => ({...stop(id), sequence, longitude, latitude});
const source = (tree, id) => all(tree, 'ShapeSource').find(item => item.props.id === id);

test('immersive Travel frames and positions native controls above the measured sheet and highlights the real destination', () => {
  const h = nativeMapHarness([mappedStop('first', 0, 76, 8), mappedStop('second', 1, 77, 9)]);
  Object.assign(h.props, { navigationMode: true, navigationPadding: { top: 90, bottom: 240 }, destinationId: 'first', selectedId: 'second' });
  let tree = h.measure(390, 844);
  assert.equal(find(tree, 'Camera').props.defaultSettings.padding.paddingBottom, 240);
  assert.equal(find(tree, 'Camera').props.defaultSettings.padding.paddingTop, 90);
  assert.deepEqual(find(tree, 'MapView').props.logoPosition, { bottom: 248, left: 12 });
  assert.deepEqual(find(tree, 'MapView').props.attributionPosition, { bottom: 248, right: 12 });
  assert.equal(find(tree, 'MapView').props.compassPosition.bottom, 276);
  assert.equal(find(tree, 'View').props.style[1].borderRadius, 0);
  const points = source(tree, 'planned-stops').props.shape.features;
  assert.equal(points[0].properties.destination, true); assert.equal(points[1].properties.destination, false);
  assert.equal(points[1].properties.selected, true, 'Preview selection does not replace destination');
  h.props.navigationPadding = { top: 90, bottom: 400 }; tree = h.render();
  assert.equal(find(tree, 'MapView').props.logoPosition.bottom, 408); h.dispose();
});

test('expanded sheet reserves a fixed footer for active controls and budgets large-text measurements', () => {
  const h = harness(); let height;
  const { ItinerarySheet } = load('src/components/journey/itinerary-sheet.tsx', {
    'react-native': { ...native, ScrollView: 'ScrollView', PanResponder: { create: () => ({ panHandlers: {} }) } },
    '@/components/discovery/ui': ui,
  }, h.hooks);
  const footer = jsx('ActiveControls', {}), props = { title: 'Destination', subtitle: '12 km · 20 min', footer, children: jsx('Itinerary', {}), maxSheetHeight: 400, onHeightChange: value => { height = value; } };
  let tree = h.render(ItinerarySheet, props);
  assert.ok(![tree.props.children].flat().some(child => child?.type === 'ScrollView'), 'Story remains a fixed composition; only the popup scrolls'); assert.ok(find(tree, 'ActiveControls'));
  tree.props.onLayout({ nativeEvent: { layout: { height: 280 } } }); assert.equal(height, 280);
  const measured = all(tree, 'View').filter(node => node.props.onLayout && node !== tree);
  measured[0].props.onLayout({ nativeEvent: { layout: { height: 90 } } });
  measured[1].props.onLayout({ nativeEvent: { layout: { height: 180 } } });
  find(tree, 'Pressable').props.onPress(); tree = h.render(ItinerarySheet, props);
  assert.equal(find(tree, 'ScrollView').props.style.maxHeight, 130);
  assert.equal(find(find(tree, 'ScrollView'), 'ActiveControls'), null, 'Pause/Finish never enter the itinerary scroll surface');
  assert.ok(find(tree, 'ActiveControls'));
  measured[1].props.onLayout({ nativeEvent: { layout: { height: 320 } } }); tree = h.render(ItinerarySheet, props);
  assert.equal(find(tree, 'ScrollView').props.style.maxHeight, 0, 'Details yield to large essential controls');
  assert.ok(find(tree, 'ActiveControls')); h.dispose();
});

test('Travel opts into road style without atmosphere and fails honestly instead of using satellite', () => {
  const h = nativeMapHarness([mappedStop('first', 0, 76, 8)]);
  h.props.navigationMode = true;
  let tree = h.measure();
  assert.equal(find(tree, 'MapView').props.styleURL, 'streets');
  assert.equal(find(tree, 'MapView').props.projection, 'mercator');
  assert.equal(find(tree, 'Atmosphere'), null);
  assert.equal(find(tree, 'MapView').props.logoEnabled, true);
  assert.equal(find(tree, 'MapView').props.attributionEnabled, true);
  find(tree, 'MapView').props.onMapLoadingError(); tree = h.render();
  assert.equal(find(tree, 'MapView'), null);
  assert.match(find(tree, 'MapFallback').props.message, /Road map unavailable.*Mapbox style access/);
  assert.equal(find(tree, 'MapFallback').props.retry, h.props.retry);
  h.dispose();
});

test('itinerary sheet snaps by drag or accessible button, bounds details on short screens, and leaves horizontal gestures alone', () => {
  const h = harness(); let handlers, height = 568;
  const { ItinerarySheet } = load('src/components/journey/itinerary-sheet.tsx', {
    'react-native': { ...native, ScrollView: 'ScrollView', useWindowDimensions: () => ({ height }),
      PanResponder: { create(value) { handlers = value; return { panHandlers: {} }; } } },
    '@/components/discovery/ui': ui,
  }, h.hooks);
  const props = { title: 'Itinerary', subtitle: '2 stops', children: jsx('Details', {}), maxDetailsHeight: 100 };
  const render = () => h.render(ItinerarySheet, props);
  let tree = render(); assert.ok(![tree.props.children].flat().some(child => child?.type === 'ScrollView'), 'Story remains a fixed composition; only the popup scrolls');
  assert.equal(find(tree, 'Pressable').props.accessibilityState.expanded, false);
  assert.equal(handlers.onMoveShouldSetPanResponder(null, { dy: 10, dx: 30 }), false);
  assert.equal(handlers.onMoveShouldSetPanResponder(null, { dy: -30, dx: 2 }), true);
  handlers.onPanResponderRelease(null, { dy: -30 }); tree = render();
  assert.equal(find(tree, 'Pressable').props.accessibilityState.expanded, true);
  assert.equal(find(tree, 'ScrollView').props.style.maxHeight, 100);
  assert.equal(find(tree, 'ScrollView').props.nestedScrollEnabled, true);
  handlers.onPanResponderRelease(null, { dy: 30 }); tree = render();
  assert.ok(![tree.props.children].flat().some(child => child?.type === 'ScrollView'), 'Story remains a fixed composition; only the popup scrolls');
  find(tree, 'Pressable').props.onPress(); tree = render(); assert.ok(find(tree, 'Details'));
  height = 300; tree = render(); assert.equal(find(tree, 'ScrollView').props.style.maxHeight, 90);
  handlers.onPanResponderRelease(null, { dy: 10 }); tree = render(); assert.ok(find(tree, 'Details'), 'Small gestures do not snap');
  find(tree, 'Pressable').props.onPress(); tree = render(); assert.equal(find(tree, 'Details'), null);
  h.dispose();
});

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
  assert.ok(![tree.props.children].flat().some(child => child?.type === 'ScrollView'), 'Story remains a fixed composition; only the popup scrolls'); assert.equal(closed, 0);
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


test('Travel navigation hook clears route synchronously on Pause/Finish/background and disposes observers on blur', async () => {
  const h = harness(), store = sessionModel.createTripStore();
  const journey = { id: journeyId, title: 'Coast', stops: [{ ...stop('first'), sequence: 0, latitude: 9, longitude: 77 }] };
  let locationListener, appListener, resolve, signal, removed = 0;
  const intervals = new Map(); let nextTimer = 0;
  const location = { get: () => ({ position: { latitude: 8, longitude: 76, accuracy: 10, timestamp: Date.now() } }), subscribe(fn) { locationListener = fn; return () => { removed++; }; } };
  const app = { currentState: 'active', addEventListener(_, fn) { appListener = fn; return { remove() { removed++; } }; } };
  const road = { geometry: { type: 'LineString', coordinates: [[76, 8], [77, 9]] }, distance: 1000, duration: 60 };
  const { useTripNavigation } = load('src/hooks/use-trip-navigation.ts', {
    'expo-router': { useFocusEffect: fn => h.hooks.useEffect(fn, [fn]) }, 'react-native': { AppState: app },
    '@/lib/journey/trip-session': { ...sessionModel, tripStore: store }, '@/lib/journey/navigation': { ...navigationModel,
      requestRoadRoute: (_, __, ___, abort) => { signal = abort; return new Promise(done => { resolve = done; }); },
      observeNavigation: (controller, read, sources, state) => navigationModel.observeNavigation(controller, read, sources, state, { set(fn) { intervals.set(++nextTimer, fn); return nextTimer; }, clear(id) { intervals.delete(id); } }),
    },
  }, h.hooks);
  const render = () => h.render(() => useTripNavigation(journey, store.get(journeyId), location), {});
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  render(); assert.equal(signal, undefined);
  store.transition(journey, 'begin', store.get(journeyId)); await flush(); assert.equal(render().status, 'loading');
  resolve(road); await flush(); assert.equal(render().route, road);
  store.transition(journey, 'pause', store.get(journeyId)); assert.equal(render().route, null);
  store.transition(journey, 'resume', store.get(journeyId)); app.currentState = 'background'; appListener(); assert.equal(render().route, null);
  app.currentState = 'active'; appListener(); locationListener();
  store.transition(journey, 'finish', store.get(journeyId)); assert.equal(render().route, null);
  h.dispose(); assert.equal(intervals.size, 0); assert.equal(removed, 2);
  assert.equal(signal.aborted, false, 'Completed request needs no further abort; no new request during cooldown');
});

test('Travel hook retains route through GPS loss and recovers while hiding it on lifecycle and destination replacement', async () => {
  const h = harness(), store = sessionModel.createTripStore();
  const journey = { id: journeyId, title: 'Synthetic route', stops: [
    { ...stop('first'), sequence: 0, latitude: 0, longitude: 0.001 },
    { ...stop('second'), sequence: 1, latitude: 0, longitude: 0.002 },
  ] };
  let time = 100000, locationListener, appListener, calls = 0;
  let position = { latitude: 0, longitude: 0, accuracy: 5, timestamp: time };
  const location = { get: () => ({ position }), subscribe(fn) { locationListener = fn; return () => {}; } };
  const app = { currentState: 'active', addEventListener(_, fn) { appListener = fn; return { remove() {} }; } };
  const geometry = { type: 'LineString', coordinates: [[0, 0], [0.001, 0]] };
  const road = { geometry, distance: 111, duration: 30, steps: null };
  const intervals = new Map();
  const { useTripNavigation } = load('src/hooks/use-trip-navigation.ts', {
    'expo-router': { useFocusEffect: fn => h.hooks.useEffect(fn, [fn]) }, 'react-native': { AppState: app },
    '@/lib/journey/trip-session': { ...sessionModel, tripStore: store }, '@/lib/journey/navigation': { ...navigationModel,
      createNavigation: loader => navigationModel.createNavigation(loader, () => time),
      navigationBlock: input => navigationModel.navigationBlock(input, time),
      requestRoadRoute: async () => { calls++; return road; },
      observeNavigation: (controller, read, sources, state) => navigationModel.observeNavigation(controller, read, sources, state,
        { set(fn) { intervals.set(1, fn); return 1; }, clear(id) { intervals.delete(id); } }),
    },
  }, h.hooks);
  const render = () => h.render(() => useTripNavigation(journey, store.get(journeyId), location), {});
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  render(); store.transition(journey, 'begin', store.get(journeyId)); await flush();
  assert.equal(render().route, road);
  for (const accuracy of [60, null]) {
    position = { ...position, timestamp: ++time, accuracy }; locationListener();
    assert.equal(render().route, road); assert.equal(render().guidance, null);
    assert.equal(render().remainingGeometry, geometry);
    position = { ...position, timestamp: ++time, accuracy: 5 }; locationListener();
    assert.equal(render().route, road); assert.equal(calls, 1);
  }
  position = null; time += 16000; locationListener();
  assert.equal(render().route, road); assert.equal(render().guidance, null);
  position = { latitude: 0, longitude: 0, accuracy: 5, timestamp: ++time }; locationListener();
  assert.equal(render().route, road); assert.equal(calls, 1);
  app.currentState = 'background'; appListener(); assert.equal(render().route, null);
  app.currentState = 'active'; appListener(); await flush(); assert.equal(render().route, road);
  store.transition(journey, 'pause', store.get(journeyId)); assert.equal(render().route, null);
  time += 5000; position = { ...position, timestamp: time };
  store.transition(journey, 'resume', store.get(journeyId)); await flush(); assert.equal(render().route, road);
  store.completeStop(journeyId, 'first', store.get(journeyId)); assert.equal(render().route, null);
  store.transition(journey, 'finish', store.get(journeyId)); assert.equal(render().route, null);
  h.dispose(); assert.equal(intervals.size, 0);
});

test('manual completion is separate from preview, confirms only current stop, warns for missing coordinates and resets progress', () => {
  const h = harness(), store = sessionModel.createTripStore();
  const journey = { id: journeyId, title: 'Trip', stops: [
    { ...stop('later'), sequence: 2, latitude: null, longitude: null },
    { ...stop('first'), sequence: 1, latitude: 8, longitude: 76 },
  ] };
  const { TravelModeContent } = load('src/app/travel/[id].tsx', {
    ...sessionMocks(store), 'expo-router': {}, 'react-native': native,
    'react-native-safe-area-context': {}, '@/components/discovery/ui': ui,
    '@/components/journey/map/journey-map': { JourneyMap: 'JourneyMap' }, '@/components/journey/map-itinerary': { MapItinerary: 'MapItinerary' },
    '@/hooks/use-load': {}, '@/lib/discovery/queries': {}, '@/lib/discovery/model': {}, '@/lib/journey/map-data': mapData,
    '@/lib/journey/story-layout': layout, '@/lib/journey/travel-preview': eligibility,
  }, h.hooks);
  const render = () => h.render(TravelModeContent, { journey, onExit() {} });
  const button = (tree, label) => all(tree, 'Pressable').find(item => item.props.accessibilityLabel === label);
  const text = tree => all(tree, 'Text').map(item => [item.props.children].flat(Infinity).join('')).join(' ');
  let tree = render();
  assert.equal(button(tree, 'Mark first complete').props.disabled, true);
  button(tree, 'Begin Trip').props.onPress(); tree = render();
  find(tree, 'MapItinerary').props.onSelect('later'); tree = render();
  assert.equal(find(tree, 'JourneyMap').props.selectedId, 'later');
  assert.equal(find(tree, 'JourneyMap').props.destinationId, 'first');
  assert.equal(button(tree, 'Mark later complete'), undefined);
  assert.equal(all(find(tree, 'ItinerarySheet').props.footer, 'Pressable').some(node => node.props.accessibilityLabel.startsWith('Mark')), false, 'Completion lives in expanded details');
  button(tree, 'Mark first complete').props.onPress(); tree = render();
  find(tree, 'TripConfirmation').props.onCancel(); tree = render();
  assert.deepEqual(store.get(journeyId).completedStopIds, []);
  button(tree, 'Mark first complete').props.onPress(); tree = render();
  const stale = find(tree, 'TripConfirmation').props.onConfirm;
  button(tree, 'Pause').props.onPress(); tree = render();
  stale(); tree = render(); assert.deepEqual(store.get(journeyId).completedStopIds, []);
  assert.equal(button(tree, 'Mark first complete').props.disabled, true);
  button(tree, 'Resume').props.onPress(); tree = render();
  button(tree, 'Mark first complete').props.onPress(); tree = render();
  const complete = find(tree, 'TripConfirmation').props.onConfirm;
  complete(); complete(); tree = render();
  assert.deepEqual(store.get(journeyId).completedStopIds, ['first']);
  assert.equal(find(tree, 'JourneyMap').props.destinationId, 'later');
  assert.equal(find(tree, 'JourneyMap').props.selectedId, 'later', 'Preview is not reset by completion');
  assert.match(text(tree), /Stop 2 of 2/); assert.match(text(tree), /Routing unavailable.*manually/);
  assert.deepEqual(find(tree, 'MapItinerary').props.stops.map(stop => stop.id), ['first', 'later']);
  assert.deepEqual(find(tree, 'MapItinerary').props.completedStopIds, ['first']);
  button(tree, 'Mark later complete').props.onPress(); tree = render();
  assert.match(find(tree, 'TripConfirmation').props.body, /completes the journey.*timer and GPS/);
  find(tree, 'TripConfirmation').props.onConfirm(); tree = render();
  assert.equal(store.get(journeyId).status, 'completed'); assert.match(text(tree), /All 2 stops completed/);
  assert.equal(button(tree, 'Finish'), undefined); assert.equal(button(tree, 'Pause'), undefined);
  assert.equal(find(tree, 'JourneyMap').props.destinationId, undefined);
  button(tree, 'Start a new trip').props.onPress(); tree = render();
  find(tree, 'TripConfirmation').props.onConfirm(); tree = render();
  assert.deepEqual(store.get(journeyId).completedStopIds, []); assert.ok(button(tree, 'Begin Trip'));
  h.dispose();
});

test('itinerary exposes completed and current styling without changing selected preview', () => {
  const h = harness();
  const { MapItinerary } = load('src/components/journey/map-itinerary.tsx', {
    'react-native': native, '@/components/discovery/ui': ui, '@/lib/journey/map-data': mapData,
  }, h.hooks);
  const stops = [stop('first'), stop('second'), stop('third')];
  const tree = h.render(MapItinerary, { stops, selectedId: 'third', completedStopIds: ['first'], destinationId: 'second', onSelect() {} });
  const list = find(tree, 'FlatList');
  const card = i => find(list.props.renderItem({ item: stops[i], index: i }), 'Pressable');
  assert.match(card(0).props.accessibilityLabel, /Completed manually/);
  assert.match(card(1).props.accessibilityLabel, /Current destination/);
  assert.equal(card(1).props.accessibilityState.selected, false);
  assert.equal(card(2).props.accessibilityState.selected, true);
  assert.ok(all(card(0), 'Text').some(node => node.props.children === '✓'));
  h.dispose();
});

test('completion drives the actual navigation hook, cancels old routes, waits for mapped destination and stops on final completion', async () => {
  const h = harness(), store = sessionModel.createTripStore();
  const journey = { id: journeyId, title: 'Trip', stops: [
    { ...stop('third'), sequence: 3, latitude: 10, longitude: 78 },
    { ...stop('first'), sequence: 1, latitude: 9, longitude: 77 },
    { ...stop('missing'), sequence: 2, latitude: null, longitude: null },
  ] };
  let time = Date.now(); const gates = [], signals = [], destinations = [], intervals = new Map();
  const app = { currentState: 'active', addEventListener: () => ({ remove() {} }) };
  const location = { get: () => ({ position: { latitude: 8, longitude: 76, accuracy: 10, timestamp: time } }), subscribe: () => () => {} };
  const { useTripNavigation } = load('src/hooks/use-trip-navigation.ts', {
    'expo-router': { useFocusEffect: fn => h.hooks.useEffect(fn, [fn]) }, 'react-native': { AppState: app },
    '@/lib/journey/trip-session': { ...sessionModel, tripStore: store },
    '@/lib/journey/navigation': { ...navigationModel,
      createNavigation: loader => navigationModel.createNavigation(loader, () => time),
      requestRoadRoute: (_, destination, __, signal) => { destinations.push(destination.id); signals.push(signal); return new Promise(resolve => gates.push(resolve)); },
      observeNavigation: (controller, read, sources, app) => navigationModel.observeNavigation(controller, read, sources, app,
        { set(fn) { intervals.set(1, fn); return 1; }, clear(id) { intervals.delete(id); } }),
    },
  }, h.hooks);
  const render = () => h.render(() => useTripNavigation(journey, store.get(journeyId), location), {});
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const road = { geometry: { type: 'LineString', coordinates: [[76, 8], [77, 9]] }, distance: 1000, duration: 60 };
  render(); store.transition(journey, 'begin', store.get(journeyId)); await flush();
  assert.deepEqual(destinations, ['first']);
  store.completeStop(journeyId, 'first', store.get(journeyId));
  assert.equal(signals[0].aborted, true); assert.equal(render().route, null);
  assert.equal(render().destination.id, 'missing'); assert.match(render().message, /coordinates/);
  await flush(); assert.equal(destinations.length, 1, 'No invented route for unmapped stop');
  store.completeStop(journeyId, 'missing', store.get(journeyId)); await flush();
  assert.equal(render().destination.id, 'third'); assert.equal(render().route, null);
  time += 5000; intervals.get(1)(); await flush(); assert.deepEqual(destinations, ['first', 'third']);
  gates[0](road); await flush(); assert.equal(render().route, null, 'Late first route cannot be restored');
  store.completeStop(journeyId, 'third', store.get(journeyId));
  assert.equal(signals[1].aborted, true); assert.equal(render().destination, undefined);
  gates[1](road); await flush(); assert.equal(render().route, null); assert.match(render().message, /stopped/);
  h.dispose(); assert.equal(intervals.size, 0);
});

test('final manual completion synchronously stops the actual GPS hook and rejects late fixes', async () => {
  const h = harness(), store = sessionModel.createTripStore();
  const journey = { id: journeyId, title: 'Trip', stops: [{ ...stop('only'), sequence: 1 }] };
  let update, removed = 0;
  const { useTripLocation } = load('src/hooks/use-trip-location.ts', {
    'expo-router': { useFocusEffect: fn => h.hooks.useEffect(fn, [fn]) }, 'react-native': native,
    '@/lib/journey/trip-session': { tripStore: store }, '@/lib/journey/foreground-location': locationModel,
    '@/lib/journey/location-port': { locationPort: {
      permission: async () => ({ granted: true, canAskAgain: true }), services: async () => true,
      watch: async fn => { update = fn; return { remove() { removed++; } }; },
    } },
  }, h.hooks);
  const render = () => h.render(() => useTripLocation(journey, store.get(journeyId)), {});
  const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
  render(); await flush(); await render().begin(); await flush();
  update({ latitude: 8, longitude: 76, accuracy: 10, timestamp: Date.now() }); assert.ok(render().position);
  store.completeStop(journeyId, 'only', store.get(journeyId)); assert.equal(removed, 1);
  assert.equal(render().position, null); assert.equal(render().status, 'finished');
  update({ latitude: 9, longitude: 77, accuracy: 10, timestamp: Date.now() + 1 }); assert.equal(render().position, null);
  h.dispose();
});

test('Travel native camera follows GPS, suspends for gestures/Fit/preview and Recenter restores following above the sheet', () => {
  const stops = [mappedStop('first', 1, 77, 9), mappedStop('second', 2, 78, 10)];
  const alerts = [];
  const h = nativeMapHarness(stops, { Alert: { alert: (...args) => alerts.push(args) } });
  const journey = { id: journeyId, title: 'Trip', stops };
  let position = { latitude: 8, longitude: 76, accuracy: 10, timestamp: Date.now() }, locationUpdate;
  const location = { get: () => ({ position, status: 'tracking' }), subscribe(fn) { locationUpdate = fn; return () => {}; } };
  Object.assign(h.props, { navigationMode: true, navigationPadding: { top: 100, bottom: 240 }, travelCamera: { journeyId, location } });
  let tree = h.measure(390, 844); const commands = [];
  find(tree, 'Camera').props.ref.current = { setCamera: command => commands.push(command) };
  find(tree, 'MapView').props.onDidFinishLoadingMap(); tree = h.render();
  const recenter = () => all(tree, 'Pressable').find(node => node.props.accessibilityLabel === 'My Location, recenter map');
  recenter().props.onPress(); tree = h.render(); assert.equal(commands.length, 0, 'Recenter never begins a ready trip');
  assert.deepEqual(alerts.at(-1), ['My Location', 'Begin Trip to use My Location']);
  h.store.transition(journey, 'begin', h.store.get(journeyId)); tree = h.render();
  assert.deepEqual(commands.at(-1).centerCoordinate, [76, 8]); assert.equal(commands.at(-1).zoomLevel, 16);
  const count = commands.length;
  find(tree, 'MapView').props.onCameraChanged({ properties: { center: [76.2, 8.1], zoom: 12, heading: 0, pitch: 0 }, gestures: { isGestureActive: true } });
  position = { ...position, longitude: 76.01 }; locationUpdate(); tree = h.render();
  assert.equal(commands.length, count); assert.equal(recenter().props.accessibilityState.selected, false);
  recenter().props.onPress(); tree = h.render(); assert.deepEqual(commands.at(-1).centerCoordinate, [76.01, 8]);
  position = { ...position, longitude: 76.02 }; locationUpdate(); assert.deepEqual(commands.at(-1).centerCoordinate, [76.02, 8]);
  all(tree, 'Pressable').find(node => node.props.accessibilityLabel === 'Fit journey and reset map orientation').props.onPress();
  const fitCount = commands.length; position = { ...position, longitude: 76.03 }; locationUpdate(); tree = h.render();
  assert.equal(commands.length, fitCount, 'Fit opts into exploration');
  recenter().props.onPress(); tree = h.render(); h.props.selectedId = 'second'; tree = h.render();
  assert.deepEqual(commands.at(-1).centerCoordinate, [78, 10]);
  position = { ...position, longitude: 76.04 }; locationUpdate(); tree = h.render();
  assert.equal(recenter().props.accessibilityState.selected, false, 'Preview does not fight following');
  recenter().props.onPress(); tree = h.render();
  h.props.navigationPadding = { top: 100, bottom: 420 }; tree = h.render();
  assert.equal(commands.at(-1).padding.paddingBottom, 420);
  const controls = all(tree, 'View').find(node => Array.isArray(node.props.style) && node.props.style[0]?.right === 62);
  assert.equal(controls.props.style[1].bottom, 456, 'Recenter sits above measured sheet and left of compass');
  h.dispose();
});

test('Travel camera hook stops synchronously on Pause/Finish/background/blur, cleans timers, and ignores late callbacks', () => {
  const h = harness(), store = sessionModel.createTripStore();
  const journey = { id: journeyId, title: 'Trip', stops: [mappedStop('first', 1, 77, 9)] };
  let locationUpdate, tick, focus, cleanup, canceled = 0, removed = 0, cleared = 0;
  const appListeners = new Set(), commands = [];
  const app = { currentState: 'active', addEventListener(_, fn) { appListeners.add(fn); return { remove() { appListeners.delete(fn); removed++; } }; } };
  const location = { get: () => ({ position: { latitude: 8, longitude: 76, accuracy: 10, timestamp: Date.now() }, status: 'tracking' }), subscribe(fn) { locationUpdate = fn; return () => { removed++; }; } };
  const { useTravelCamera } = load('src/hooks/use-travel-camera.ts', {
    'expo-router': { useFocusEffect: fn => { focus = fn; h.hooks.useEffect(() => { cleanup = fn(); return () => cleanup?.(); }, [fn]); } },
    'react-native': { AppState: app }, '@/lib/journey/trip-session': { tripStore: store }, '@/lib/journey/travel-camera': cameraModel,
  }, h.hooks, { ...globalThis, setInterval(fn) { tick = fn; return 1; }, clearInterval() { cleared++; } });
  const source = { journeyId, location }, move = command => commands.push(command), cancel = () => canceled++;
  const render = () => h.render(() => useTravelCamera(source, move, cancel, { ready: true, reduceMotion: true, top: 100, bottom: 240 }), {});
  render(); store.transition(journey, 'begin', store.get(journeyId)); assert.equal(commands.length, 1);
  store.transition(journey, 'pause', store.get(journeyId)); assert.equal(canceled, 1);
  render().recenter(); assert.equal(commands.length, 1);
  store.transition(journey, 'resume', store.get(journeyId)); assert.equal(commands.length, 2);
  app.currentState = 'background'; for (const fn of appListeners) fn(); assert.equal(canceled, 2);
  tick(); locationUpdate(); assert.equal(commands.length, 2);
  app.currentState = 'active'; for (const fn of appListeners) fn(); assert.equal(commands.length, 3);
  cleanup(); const oldTick = tick, oldLocation = locationUpdate; assert.equal(canceled, 3);
  oldTick(); oldLocation(); render().recenter(); assert.equal(commands.length, 3, 'Blur blocks even a stale button callback');
  cleanup = focus(); assert.equal(commands.length, 4, 'Active reentry follows a suitable fix');
  store.transition(journey, 'finish', store.get(journeyId)); assert.equal(canceled, 4);
  tick(); locationUpdate(); assert.equal(commands.length, 4);
  h.dispose(); assert.equal(appListeners.size, 0); assert.equal(cleared, 2); assert.equal(removed, 4);
});

test('native Travel camera resumes on foreground even when its observer runs before the map AppState listener', () => {
  const listeners = new Set();
  const app = { currentState: 'active', addEventListener(_, fn) { listeners.add(fn); return { remove: () => listeners.delete(fn) }; } };
  const stops = [mappedStop('first', 1, 77, 9)], h = nativeMapHarness(stops, { AppState: app });
  const journey = { id: journeyId, title: 'Trip', stops };
  const location = { get: () => ({ position: { latitude: 8, longitude: 76, accuracy: 10, timestamp: Date.now() }, status: 'tracking' }), subscribe: () => () => {} };
  Object.assign(h.props, { navigationMode: true, travelCamera: { journeyId, location } });
  let tree = h.measure(); const commands = [];
  find(tree, 'Camera').props.ref.current = { setCamera: command => commands.push(command) };
  find(tree, 'MapView').props.onDidFinishLoadingMap(); tree = h.render();
  h.store.transition(journey, 'begin', h.store.get(journeyId)); assert.equal(commands.length, 1);
  app.currentState = 'background'; for (const fn of listeners) fn('background');
  const count = commands.length;
  app.currentState = 'active'; for (const fn of listeners) fn('active');
  assert.equal(commands.length, count + 1); assert.deepEqual(commands.at(-1).centerCoordinate, [76, 8]);
  h.dispose(); assert.equal(listeners.size, 0);
});

test('maneuver panel renders real instruction/icons and GPS estimates, preserves full accessibility text, and never claims arrival', () => {
  const h = harness();
  const { ManeuverPanel } = load('src/components/journey/maneuver-panel.tsx', {
    'react-native': native, '@/components/discovery/ui': ui, '@/lib/journey/turn-guidance': guidanceModel,
  }, h.hooks);
  const text = tree => all(tree, 'Text').map(node => [node.props.children].flat(Infinity).join('')).join(' ');
  const guidance = { status: 'ready', maneuver: { type: 'turn', modifier: 'left', instruction: 'Turn left onto North Road' },
    distanceToManeuver: 123, remainingDistance: 2400 };
  let tree = h.render(ManeuverPanel, { guidance, message: 'Driving route' });
  assert.match(text(tree), /↰.*~120 m to maneuver.*Turn left.*~2.4 km remaining.*GPS estimate/);
  assert.match(tree.props.accessibilityLabel, /Turn left onto North Road/);
  const long = 'Turn right onto ' + 'A long road name '.repeat(20);
  tree = h.render(ManeuverPanel, { guidance: { ...guidance, maneuver: { ...guidance.maneuver, instruction: long } }, message: '' });
  assert.ok(tree.props.accessibilityLabel.includes(long));
  assert.equal(all(tree, 'Text').find(node => node.props.children === long).props.numberOfLines, 3);
  tree = h.render(ManeuverPanel, { guidance: { ...guidance, maneuver: { type: 'arrive', instruction: 'You have arrived' } }, message: '' });
  assert.match(text(tree), /Destination ahead.*Complete stop manually/); assert.doesNotMatch(text(tree), /You have arrived/);
  for (const message of ['Calculating driving route…', 'Navigation paused', 'Mapbox request limit reached', 'Route unavailable: destination stop has no valid map coordinates']) {
    tree = h.render(ManeuverPanel, { guidance: null, message }); assert.equal(tree.props.accessibilityLabel, message);
  }
  tree = h.render(ManeuverPanel, { guidance: { status: 'unavailable', message: 'Turn instructions unavailable' }, message: 'Driving route' });
  assert.match(text(tree), /Turn instructions unavailable/); assert.doesNotMatch(text(tree), /remaining/); h.dispose();
});

test('Travel maneuver stack reserves measured camera/sheet space and preserves fixed controls plus manual completion', () => {
  const h = harness(), store = sessionModel.createTripStore();
  const journey = { id: journeyId, title: 'Trip', stops: [mappedStop('first', 1, 76, 8)] };
  const { TravelModeContent } = load('src/app/travel/[id].tsx', {
    ...sessionMocks(store), 'expo-router': {}, 'react-native': native, 'react-native-safe-area-context': {},
    '@/components/discovery/ui': ui, '@/components/journey/map/journey-map': { JourneyMap: 'JourneyMap' },
    '@/components/journey/map-itinerary': { MapItinerary: 'MapItinerary' }, '@/hooks/use-load': {}, '@/lib/discovery/queries': {},
    '@/lib/discovery/model': {}, '@/lib/journey/map-data': mapData, '@/lib/journey/story-layout': layout, '@/lib/journey/travel-preview': eligibility,
  }, h.hooks);
  const render = () => h.render(TravelModeContent, { journey, onExit() {} });
  let tree = render(); assert.equal(find(tree, 'ManeuverPanel'), null, 'Ready is not active navigation');
  store.transition(journey, 'begin', store.get(journeyId)); tree = render(); assert.ok(find(tree, 'ManeuverPanel'));
  const stack = all(tree, 'View').find(node => node.props.onLayout && node !== tree);
  stack.props.onLayout({ nativeEvent: { layout: { height: 190 } } });
  tree.props.onLayout({ nativeEvent: { layout: { height: 568 } } }); tree = render();
  assert.equal(find(tree, 'JourneyMap').props.navigationPadding.top, 222);
  assert.equal(find(tree, 'ItinerarySheet').props.maxSheetHeight, 218);
  const footer = find(tree, 'ItinerarySheet').props.footer;
  assert.ok(all(footer, 'Pressable').some(node => node.props.accessibilityLabel === 'Pause'));
  assert.ok(all(footer, 'Pressable').some(node => node.props.accessibilityLabel === 'Finish'));
  assert.ok(all(tree, 'Pressable').some(node => node.props.accessibilityLabel === 'Mark first complete'));
  store.transition(journey, 'pause', store.get(journeyId)); tree = render(); assert.ok(find(tree, 'ManeuverPanel'));
  store.transition(journey, 'finish', store.get(journeyId)); tree = render(); assert.equal(find(tree, 'ManeuverPanel'), null);
  h.dispose();
});

function arrivalHarness(stops) {
  const h = harness(), store = sessionModel.createTripStore(); let time = 100000, focusedCleanup, focusedEffect;
  const journey = { id: journeyId, title: 'Trip', stops };
  const listeners = new Set(), appListeners = new Set(), ticks = new Set();
  let snapshot = { status: 'tracking', position: { latitude: 0, longitude: 0, accuracy: 5, timestamp: time } };
  const location = { get: () => snapshot, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
  const app = { currentState: 'active', addEventListener(_, fn) { appListeners.add(fn); return { remove: () => appListeners.delete(fn) }; } };
  const { useTripArrival } = load('src/hooks/use-trip-arrival.ts', {
    'expo-router': { useFocusEffect: fn => { focusedEffect = fn; h.hooks.useEffect(() => { focusedCleanup = fn(); return () => focusedCleanup?.(); }, [fn]); } },
    'react-native': { AppState: app }, '@/lib/journey/trip-session': { ...sessionModel, tripStore: store },
    '@/lib/journey/navigation': navigationModel,
    '@/lib/journey/arrival': { ...arrivalModel, arrivalBlock: input => arrivalModel.arrivalBlock(input, time), createArrival: () => arrivalModel.createArrival({}, () => time),
      observeArrival: (controller, read, sources, state) => arrivalModel.observeArrival(controller, read, sources, state, {
        set(fn) { ticks.add(fn); return fn; }, clear(fn) { ticks.delete(fn); },
      }),
    },
  }, h.hooks);
  const emit = (patch = {}) => {
    time += 3000; snapshot = { status: 'tracking', position: { ...snapshot.position, timestamp: time }, ...patch };
    for (const fn of listeners) fn();
  };
  const begin = () => store.transition(journey, 'begin', store.get(journeyId));
  const render = () => h.render(() => useTripArrival(journey, store.get(journeyId), location), {});
  return { ...h, renderComponent: h.render, store, journey, location, app, listeners, appListeners, ticks, useTripArrival, emit, begin, render,
    blur() { focusedCleanup(); }, focus() { focusedCleanup = focusedEffect(); }, time: () => time,
    background() { app.currentState = 'background'; for (const fn of appListeners) fn(); },
    foreground() { app.currentState = 'active'; for (const fn of appListeners) fn(); },
  };
}

test('actual arrival hook confirms only the ordered destination exactly once, invalidates old routing and finishes the final stop', async () => {
  const stops = [mappedStop('second', 2, 0.0001, 0), mappedStop('first', 1, 0, 0)];
  const h = arrivalHarness(stops); h.render();
  const road = { geometry: { type: 'LineString', coordinates: [[0, 0], [0.0001, 0]] }, distance: 10, duration: 1 };
  const requests = [];
  const route = navigationModel.createNavigation((_, destination, signal) => new Promise(resolve => requests.push({ destination, signal, resolve })), h.time);
  const readRoute = () => ({ status: h.store.get(journeyId).status, focused: true, foreground: true,
    position: h.location.get().position, destination: sessionModel.tripDestination(h.journey, h.store.get(journeyId)) });
  const sync = () => route.update(readRoute());
  const unsubscribe = h.store.subscribe(sync), unsubscribeGps = h.location.subscribe(sync);
  h.begin(); for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.equal(requests[0].destination.id, 'first');
  h.emit(); h.emit(); const before = h.render(); assert.equal(before.prompt.stopId, 'first');
  assert.deepEqual(h.store.get(journeyId).completedStopIds, [], 'GPS evidence never completes a stop');
  assert.equal(before.confirm(before.prompt), true); assert.equal(before.confirm(before.prompt), false);
  assert.deepEqual(h.store.get(journeyId).completedStopIds, ['first']); assert.equal(requests[0].signal.aborted, true);
  requests[0].resolve(road); for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.equal(route.get().route, null, 'Old destination route cannot be restored');
  assert.equal(h.render().prompt, null, 'Next stop starts fresh evidence');
  h.emit(); h.emit(); assert.equal(h.render().prompt, null, 'Previous stop’s cached fix is not new-stop evidence');
  h.emit(); const final = h.render(); assert.equal(final.prompt.stopId, 'second');
  assert.equal(final.confirm(final.prompt), true); assert.equal(final.confirm(final.prompt), false);
  assert.equal(h.store.get(journeyId).status, 'completed'); assert.equal(h.store.get(journeyId).destinationId, null);
  assert.equal(route.get().route, null); assert.equal(h.render().prompt, null);
  assert.equal(h.store.get(journeyId).activeSince, null);
  unsubscribe(); unsubscribeGps(); route.stop(); h.dispose(); assert.equal(h.ticks.size, 0);
});

test('arrival hook dismisses safely and rejects stale confirmation across Pause/Resume, Finish, blur and background', () => {
  for (const mode of ['pause', 'finish', 'blur', 'background', 'denied', 'missing-fix']) {
    const h = arrivalHarness([mappedStop('first', 1, 0, 0)]); h.render(); h.begin(); h.emit(); h.emit();
    const before = h.render(); assert.ok(before.prompt);
    if (mode === 'pause' || mode === 'finish') h.store.transition(h.journey, mode, h.store.get(journeyId));
    if (mode === 'blur') h.blur();
    if (mode === 'background') h.background();
    if (mode === 'denied') h.emit({ status: 'denied', position: null });
    if (mode === 'missing-fix') h.emit({ status: 'unavailable', position: null });
    assert.equal(h.render().prompt, null); assert.equal(before.confirm(before.prompt), false);
    assert.deepEqual(h.store.get(journeyId).completedStopIds, []);
    if (mode === 'pause') { h.store.transition(h.journey, 'resume', h.store.get(journeyId)); assert.equal(h.render().prompt, null); }
    if (mode === 'background') { h.foreground(); assert.equal(h.render().prompt, null); }
    if (mode === 'blur') { h.focus(); assert.equal(h.render().prompt, null); }
    h.dispose(); assert.equal(h.ticks.size, 0); assert.equal(h.appListeners.size, 0);
  }
  const h = arrivalHarness([mappedStop('first', 1, 0, 0)]); h.render(); h.begin(); h.emit(); h.emit();
  const before = h.render(); assert.equal(before.dismiss(before.prompt), true); assert.equal(before.confirm(before.prompt), false);
  h.emit(); h.emit(); assert.equal(h.render().prompt, null); assert.deepEqual(h.store.get(journeyId).completedStopIds, []); h.dispose();
});

test('arrival UI replaces the maneuver card without overlapping fixed controls, ignores preview, and leaves manual completion working after dismissal', () => {
  const h = arrivalHarness([mappedStop('second', 2, null, null), mappedStop('first', 1, 0, 0)]);
  const { TravelModeContent } = load('src/app/travel/[id].tsx', {
    ...sessionMocks(h.store), '@/hooks/use-trip-arrival': { useTripArrival: h.useTripArrival },
    '@/hooks/use-trip-location': { useTripLocation: () => ({ ...h.location.get(), source: h.location, begin: h.begin, canAskAgain: true }) },
    'expo-router': {}, 'react-native': native, 'react-native-safe-area-context': {}, '@/components/discovery/ui': ui,
    '@/components/journey/map/journey-map': { JourneyMap: 'JourneyMap' }, '@/components/journey/map-itinerary': { MapItinerary: 'MapItinerary' },
    '@/hooks/use-load': {}, '@/lib/discovery/queries': {}, '@/lib/discovery/model': {}, '@/lib/journey/map-data': mapData,
    '@/lib/journey/story-layout': layout, '@/lib/journey/travel-preview': eligibility,
  }, h.hooks);
  const render = () => h.renderComponent(TravelModeContent, { journey: h.journey, onExit() {} });
  const button = (tree, label) => all(tree, 'Pressable').find(node => node.props.accessibilityLabel === label);
  let tree = render(); button(tree, 'Begin Trip').props.onPress(); tree = render();
  find(tree, 'MapItinerary').props.onSelect('second'); tree = render();
  h.emit(); h.emit(); tree = render();
  assert.equal(find(tree, 'JourneyMap').props.selectedId, 'second'); assert.equal(find(tree, 'JourneyMap').props.destinationId, 'first');
  const prompt = find(tree, 'ArrivalPrompt'); assert.equal(prompt.props.prompt.stopId, 'first');
  assert.equal(find(tree, 'ManeuverPanel'), null); assert.equal(find(find(tree, 'ItinerarySheet'), 'ArrivalPrompt'), null);
  assert.ok(button(find(tree, 'ItinerarySheet').props.footer, 'Pause')); assert.ok(button(find(tree, 'ItinerarySheet').props.footer, 'Finish'));
  const stack = all(tree, 'View').find(node => node.props.onLayout && node !== tree);
  stack.props.onLayout({ nativeEvent: { layout: { height: 220 } } }); tree = render();
  assert.equal(find(tree, 'JourneyMap').props.navigationPadding.top, 252, 'Measured arrival card participates in camera/layout padding');
  prompt.props.onDismiss(); tree = render(); assert.equal(find(tree, 'ArrivalPrompt'), null); assert.ok(find(tree, 'ManeuverPanel'));
  prompt.props.onConfirm(); assert.deepEqual(h.store.get(journeyId).completedStopIds, [], 'Dismissed callback cannot complete');
  button(tree, 'Mark first complete').props.onPress(); tree = render(); find(tree, 'TripConfirmation').props.onConfirm(); tree = render();
  assert.deepEqual(h.store.get(journeyId).completedStopIds, ['first']);
  assert.ok(all(tree, 'Text').some(node => String(node.props.children).includes('no valid coordinates')));
  h.emit({ status: 'unavailable', position: null }); tree = render();
  button(tree, 'Mark second complete').props.onPress(); tree = render(); find(tree, 'TripConfirmation').props.onConfirm();
  assert.equal(h.store.get(journeyId).status, 'completed', 'Manual path remains usable without coordinates/GPS'); h.dispose();
});

test('reroute status and guarded retry stay in the fixed footer without hiding arrival or trip controls', () => {
  const h = harness(), store = sessionModel.createTripStore();
  const journey = { id: journeyId, title: 'Trip', stops: [mappedStop('first', 1, 0, 0)] };
  store.transition(journey, 'begin', store.get(journeyId));
  let retryCount = 0;
  const state = { destination: journey.stops[0], status: 'error', message: 'Reroute failed · Previous route may be outdated',
    route: { geometry: { type: 'LineString', coordinates: [[0, 0], [0.001, 0]] }, distance: 100, duration: 10 },
    routeOutdated: true, guidance: null, reroute: { phase: 'failed', message: 'Wait before retrying · Previous route may be outdated' },
    canRetry: false, retry: () => retryCount++ };
  const { TravelModeContent } = load('src/app/travel/[id].tsx', {
    ...sessionMocks(store), '@/hooks/use-trip-navigation': { useTripNavigation: () => state },
    '@/hooks/use-trip-arrival': { useTripArrival: () => ({ prompt: { stopId: 'first', name: 'first' }, confirm() {}, dismiss() {} }) },
    'expo-router': {}, 'react-native': native, 'react-native-safe-area-context': {}, '@/components/discovery/ui': ui,
    '@/components/journey/map/journey-map': { JourneyMap: 'JourneyMap' }, '@/components/journey/map-itinerary': { MapItinerary: 'MapItinerary' },
    '@/hooks/use-load': {}, '@/lib/discovery/queries': {}, '@/lib/discovery/model': {}, '@/lib/journey/map-data': mapData,
    '@/lib/journey/story-layout': layout, '@/lib/journey/travel-preview': eligibility,
  }, h.hooks);
  const render = () => h.render(TravelModeContent, { journey, onExit() {} });
  let tree = render(), sheet = find(tree, 'ItinerarySheet');
  assert.match(sheet.props.subtitle, /^Previous route/); assert.ok(find(tree, 'ArrivalPrompt')); assert.equal(find(tree, 'ManeuverPanel'), null);
  const button = (tree, label) => all(tree, 'Pressable').find(node => node.props.accessibilityLabel === label);
  assert.equal(button(sheet.props.footer, 'Retry driving route').props.disabled, true);
  assert.ok(button(sheet.props.footer, 'Pause')); assert.ok(button(sheet.props.footer, 'Finish'));
  assert.ok(all(sheet.props.footer, 'Text').some(node => node.props.accessibilityLiveRegion === 'polite' && String(node.props.children).includes('outdated')));
  state.canRetry = true; tree = render(); button(find(tree, 'ItinerarySheet').props.footer, 'Retry driving route').props.onPress(); assert.equal(retryCount, 1);
  state.status = 'ready'; state.reroute = { phase: 'confirming', message: 'Checking route deviation' }; tree = render();
  assert.equal(button(tree, 'Retry driving route'), undefined); assert.ok(all(find(tree, 'ItinerarySheet').props.footer, 'Text').some(node => node.props.children === 'Checking route deviation'));
  store.transition(journey, 'pause', store.get(journeyId)); tree = render(); assert.equal(button(tree, 'Retry driving route'), undefined); assert.ok(button(tree, 'Resume'));
  h.dispose();
});

test('manual completion and early Finish reject stale confirmations after blur or a background/foreground cycle', () => {
  for (const action of ['complete', 'finish']) for (const lifecycle of ['blur', 'background']) {
    const h = harness(), store = sessionModel.createTripStore(); let focus, cleanup;
    const listeners = new Set();
    const app = { currentState: 'active', addEventListener(_, fn) { listeners.add(fn); return { remove: () => listeners.delete(fn) }; } };
    const journey = { id: journeyId, title: 'Trip', stops: [mappedStop('first', 1, 0, 0)] };
    store.transition(journey, 'begin', store.get(journeyId));
    const { TravelModeContent } = load('src/app/travel/[id].tsx', {
      ...sessionMocks(store),
      'expo-router': { useFocusEffect: fn => { focus = fn; h.hooks.useEffect(() => { cleanup = fn(); return () => cleanup?.(); }, [fn]); } },
      'react-native': { ...native, AppState: app }, 'react-native-safe-area-context': {}, '@/components/discovery/ui': ui,
      '@/components/journey/map/journey-map': { JourneyMap: 'JourneyMap' }, '@/components/journey/map-itinerary': { MapItinerary: 'MapItinerary' },
      '@/hooks/use-load': {}, '@/lib/discovery/queries': {}, '@/lib/discovery/model': {}, '@/lib/journey/map-data': mapData,
      '@/lib/journey/story-layout': layout, '@/lib/journey/travel-preview': eligibility,
    }, h.hooks);
    const render = () => h.render(TravelModeContent, { journey, onExit() {} });
    const button = tree => all(tree, 'Pressable').find(node => node.props.accessibilityLabel === (action === 'complete' ? 'Mark first complete' : 'Finish'));
    let tree = render(); button(tree).props.onPress(); tree = render(); const stale = find(tree, 'TripConfirmation').props.onConfirm;
    if (lifecycle === 'blur') cleanup?.();
    else { app.currentState = 'background'; for (const fn of listeners) fn('background'); }
    stale(); assert.equal(store.get(journeyId).status, 'active'); assert.deepEqual(store.get(journeyId).completedStopIds, []);
    if (lifecycle === 'blur') cleanup = focus();
    else { app.currentState = 'active'; for (const fn of listeners) fn('active'); }
    tree = render(); assert.equal(find(tree, 'TripConfirmation'), null);
    button(tree).props.onPress(); tree = render(); stale(); tree = render();
    assert.ok(find(tree, 'TripConfirmation'), 'Old callback must not close a newer confirmation');
    find(tree, 'TripConfirmation').props.onConfirm();
    assert.equal(store.get(journeyId).status, action === 'complete' ? 'completed' : 'finished');
    const oldListeners = [...listeners]; h.dispose(); for (const fn of oldListeners) fn('background'); stale();
    assert.equal(listeners.size, 0); assert.equal(h.lateUpdates(), 0);
  }
});

test('Travel never renders a precise current-position marker for unavailable, stale, future or inaccurate GPS', () => {
  const h = harness(), store = sessionModel.createTripStore();
  const journey = { id: journeyId, title: 'Trip', stops: [mappedStop('first', 1, 0, 0)] };
  store.transition(journey, 'begin', store.get(journeyId));
  const valid = { latitude: 0, longitude: 0, accuracy: 5, timestamp: Date.now() };
  let position = valid;
  const { TravelModeContent } = load('src/app/travel/[id].tsx', {
    ...sessionMocks(store), '@/hooks/use-trip-location': { useTripLocation: () => ({ status: 'tracking', position }) },
    'expo-router': {}, 'react-native': native, 'react-native-safe-area-context': {}, '@/components/discovery/ui': ui,
    '@/components/journey/map/journey-map': { JourneyMap: 'JourneyMap' }, '@/components/journey/map-itinerary': { MapItinerary: 'MapItinerary' },
    '@/hooks/use-load': {}, '@/lib/discovery/queries': {}, '@/lib/discovery/model': {}, '@/lib/journey/map-data': mapData,
    '@/lib/journey/story-layout': layout, '@/lib/journey/travel-preview': eligibility,
  }, h.hooks);
  const render = () => h.render(TravelModeContent, { journey, onExit() {} });
  assert.equal(find(render(), 'JourneyMap').props.currentPosition, valid);
  for (const fix of [null, { ...valid, timestamp: Date.now() - 16000 }, { ...valid, timestamp: Date.now() + 60000 },
    { ...valid, accuracy: 51 }, { ...valid, accuracy: null }, { ...valid, latitude: NaN }]) {
    position = fix; assert.equal(find(render(), 'JourneyMap').props.currentPosition, null);
  }
  position = { ...valid, timestamp: Date.now() }; assert.equal(find(render(), 'JourneyMap').props.currentPosition, position);
  h.dispose();
});

test('arrival card clearly names the stop and makes confirmation and dismissal explicit with accessible touch targets', () => {
  const { ArrivalPrompt } = load('src/components/journey/arrival-prompt.tsx', { 'react-native': native, '@/components/discovery/ui': ui });
  let confirms = 0, dismisses = 0;
  const name = 'A long destination name '.repeat(8);
  const tree = ArrivalPrompt({ prompt: { name }, onConfirm: () => confirms++, onDismiss: () => dismisses++ });
  const buttons = all(tree, 'Pressable'); assert.equal(buttons.length, 2);
  assert.equal(buttons[0].props.accessibilityLabel, 'Confirm arrival at ' + name); assert.equal(buttons[0].props.style.minHeight, 48);
  assert.equal(buttons[1].props.accessibilityLabel, 'Dismiss arrival and keep navigating'); assert.equal(buttons[1].props.style.minHeight, 48);
  buttons[0].props.onPress(); buttons[1].props.onPress(); assert.equal(confirms, 1); assert.equal(dismisses, 1);
  assert.ok(all(tree, 'Text').some(node => [node.props.children].flat().join('').includes(name)));
});

test('popup JourneyOptions preserves Use, sign-in Remix, private copy reuse and inline failure recovery', async () => {
  for (const mode of ['anonymous', 'signed-in', 'existing', 'blocked']) {
    const h = harness();
    const routes = [], intents = [], copies = [];
    let uses = 0;
    const state = { busy: false, copyId: mode === 'existing' ? 'private-copy' : null, blocked: mode === 'blocked', error: mode === 'blocked' ? 'Check your drafts' : null };
    const component = load('src/components/journey/journey-options.tsx', {
      'expo-router': { useRouter: () => ({ push: route => routes.push(route) }) }, 'react-native': native,
      '../discovery/ui': { ...ui, Action: 'Action' },
      '@/hooks/session-context': { useSessionState: () => ({ loading: false, session: mode === 'anonymous' ? null : { user: { id: 'owner' } } }) },
      '@/hooks/action-intent': { useActionIntent: () => ({ pending: null, begin: (id, action) => { intents.push([id, action]); return true; } }) },
      '@/lib/remix/model': { remixStore: { get: () => state, subscribe: () => () => {}, run: async (_key, task) => task() } },
      '@/lib/remix/queries': { remixJourney: async (id, user) => { copies.push([id, user]); return 'new-copy'; } },
      './story-sheet': { StorySheet: 'StorySheet' },
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    }, h.hooks);
    const tree = h.render(component.JourneyOptions, { id: journeyId, onUse: () => uses++, inlineFeedback: true, menu: { visible: true, onClose() {}, onAbout() {} } });
    all(tree, 'Pressable').find(n => n.props.accessibilityLabel === 'Use This Journey').props.onPress();
    assert.equal(uses, 1);
    const remix = all(tree, 'Pressable').find(n => n.props.accessibilityLabel === (mode === 'existing' ? 'Open private copy' : 'Remix This Journey'));
    if (mode === 'blocked') {
      assert.equal(remix.props.disabled, true);
      assert.ok(all(tree, 'Text').some(n => n.props.accessibilityRole === 'alert'));
      find(tree, 'Action').props.onPress();
      assert.equal(routes.at(-1), '/account');
    } else {
      remix.props.onPress(); await new Promise(resolve => setImmediate(resolve));
      if (mode === 'anonymous') { assert.deepEqual(intents, [[journeyId, 'remix']]); assert.equal(routes.at(-1), '/auth'); }
      else assert.deepEqual(routes.at(-1), { pathname: '/create', params: { draft: mode === 'existing' ? 'private-copy' : 'new-copy' } });
      assert.equal(copies.length, mode === 'signed-in' ? 1 : 0);
    }
    assert.equal(find(tree, 'StorySheet').props.visible, false, 'No stacked feedback modal in the popup');
  }
});
test('editor photo overlays use actual ordered markers; idle playback yields to touches, selection, background and reduced motion',async()=>{
  const listeners=new Set();let preference;
  const idleEvent={properties:{center:[76,8],zoom:7,heading:0,pitch:0}};
  const app={currentState:'active',addEventListener:(_name,fn)=>{listeners.add(fn);return {remove:()=>listeners.delete(fn)};}};
  const h=nativeMapHarness([mappedStop('second',2,77,9),mappedStop('first',1,76,8)],{
    AppState:app,AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:(_name,fn)=>{preference=fn;return {remove(){}};}}
  });
  Object.assign(h.props,{selectedId:null,memoryPhotos:{first:'https://signed.test/first',second:null},animateMemoryRoute:true});
  let tree=h.measure();find(tree,'MapView').props.onDidFinishLoadingMap();await new Promise(resolve=>setImmediate(resolve));tree=h.render();
  const flights=[];find(tree,'Camera').props.ref.current={setCamera:value=>flights.push(value)};
  find(tree,'MapView').props.onMapIdle(idleEvent);tree=h.render();let overlay=find(tree,'JourneyOverlays');
  assert.deepEqual(overlay.props.points.features.map(p=>[p.id,p.properties.photo]),[['first','https://signed.test/first'],['second',null]]);
  assert.equal(overlay.props.playing,true);assert.equal(overlay.props.durationScale,3);assert.equal(overlay.props.drawRoute,false);
  find(tree,'MapView').props.onTouchStart();tree=h.render();assert.equal(find(tree,'JourneyOverlays').props.playing,false);
  find(tree,'MapView').props.onMapIdle(idleEvent);tree=h.render();assert.equal(find(tree,'JourneyOverlays').props.playing,false,'Native idle during a held gesture cannot restart playback');
  find(tree,'MapView').props.onTouchEnd();find(tree,'MapView').props.onMapIdle(idleEvent);tree=h.render();assert.equal(find(tree,'JourneyOverlays').props.playing,true);
  h.props.selectedId='second';tree=h.render();assert.equal(find(tree,'JourneyOverlays').props.playing,false);assert.deepEqual(flights.at(-1).centerCoordinate,[77,9]);assert.equal(flights.at(-1).animationDuration,450);
  h.props.selectedId=null;h.props.animateMemoryRoute=false;tree=h.render();assert.equal(find(tree,'JourneyOverlays').props.playing,false,'Open editor sheet suppresses playback');
  h.props.animateMemoryRoute=true;app.currentState='background';listeners.forEach(fn=>fn('background'));tree=h.render();assert.equal(find(tree,'JourneyOverlays').props.playing,false);
  app.currentState='active';listeners.forEach(fn=>fn('active'));preference(true);tree=h.render();find(tree,'MapView').props.onMapIdle(idleEvent);tree=h.render();assert.equal(find(tree,'JourneyOverlays').props.playing,false);
  h.props.selectedId='first';h.render();assert.equal(flights.at(-1).animationDuration,0);
  h.dispose();assert.equal(listeners.size,0);
});


test('Travel marker switches between compact dot and map-aligned direction above preserved routes', () => {
 const h=nativeMapHarness([mappedStop('a',0,76,8),mappedStop('b',1,76.01,8.01)]);
 try {
   Object.assign(h.props,{navigationMode:true,currentPosition:{latitude:8,longitude:76,direction:359},navigationRoute:{type:'LineString',coordinates:[[76,8],[76.01,8.01]]}});
   let tree=h.measure();
   const arrow=all(tree,'SymbolLayer').find(n=>n.props.id==='travel-position-arrow');
   assert.equal(arrow.props.style.iconRotate,359); assert.equal(arrow.props.style.iconRotationAlignment,'map');
   assert.equal(all(tree,'CircleLayer').some(n=>n.props.id==='travel-position-dot'),false);
   const sources=all(tree,'ShapeSource').map(n=>n.props.id);
   assert.ok(sources.indexOf('travel-current-position')>sources.indexOf('travel-road-route')); assert.ok(sources.includes('planned-line'));
   h.props.currentPosition={latitude:8,longitude:76,direction:null}; tree=h.render();
   assert.equal(all(tree,'SymbolLayer').some(n=>n.props.id==='travel-position-arrow'),false);
   const dot=all(tree,'CircleLayer').find(n=>n.props.id==='travel-position-dot');
   assert.equal(dot.props.style.circleRadius,5); assert.equal(dot.props.style.circleStrokeWidth,2);
 } finally {h.dispose();}
});

test('bounded live companion shares accepted off-route coordinates, leaves dot/heading intact and fails back independently', () => {
  let enabled = true, safe = true, pending = false;
  const imageGate = load('src/lib/buddy/map-image.ts', {});
  const h = nativeMapHarness([mappedStop('a', 0, 76, 8), mappedStop('b', 1, 76.01, 8.01)], { Image: 'DecodedImage' }, globalThis, sessionModel.createTripStore(), hooks => ({
    '@/hooks/use-map-buddy': { useMapBuddy: available => ({ enabled, visible: enabled && available, canHelp: false, openHelp() {} }) },
    '@/hooks/use-live-buddy-safety': { useLiveBuddySafety: () => ({ mapRef() {}, moving() {}, idle() {}, clear: safe && !pending, present: safe }) },
    '@/hooks/use-buddy-map-image': load('src/hooks/use-buddy-map-image.ts', { '@/lib/buddy/map-image': imageGate }, hooks),
  }));
  Object.assign(h.props, { liveBuddy: true, navigationMode: true, currentPosition: { latitude: 8.03, longitude: 76.05, direction: 120 } });
  let tree = h.measure(390, 844); find(tree, 'MapView').props.onDidFinishLoadingMap(); tree = h.render();
  assert.equal(source(tree, 'travel-buddy-companion'), undefined, 'Pending asset never takes map ownership'); assert.ok(source(tree, 'travel-current-position'));
  let decoded = find(tree, 'DecodedImage'); assert.equal(decoded.props.style.width, 128); assert.equal(decoded.props.style.height, 128);
  assert.equal(all(tree, 'View').find(node => node.props.children === decoded).props.style.opacity, 0);
  decoded.props.onLoad(); tree = h.render(); assert.equal(source(tree, 'travel-buddy-companion'), undefined, 'Load without layout is still guarded');
  decoded.props.onLayout({ nativeEvent: { layout: { width: 128, height: 128 } } }); tree = h.render();
  assert.deepEqual(source(tree, 'travel-buddy-companion').props.shape.geometry.coordinates, source(tree, 'travel-current-position').props.shape.geometry.coordinates);
  const icon = all(tree, 'SymbolLayer').find(node => node.props.id === 'travel-buddy-companion-icon');
  assert.equal(icon.props.style.iconRotationAlignment, 'viewport'); assert.deepEqual(icon.props.style.iconTranslate, [32, -12]);
  assert.equal(all(tree, 'SymbolLayer').find(node => node.props.id === 'travel-position-arrow').props.style.iconRotate, 120);
  pending = true; tree = h.render(); assert.ok(source(tree, 'travel-buddy-companion'), 'Follow-camera motion/pending projection keeps the map companion and its ownership');
  const travelHelp = all(tree, 'Pressable').find(node => node.props.accessibilityLabel === 'Journey Buddy help').props.style.at(-1);
  assert.equal(travelHelp.top, undefined); assert.equal(travelHelp.bottom, 312, 'Travel help placement is unchanged above the sheet');
  pending = false; safe = false; tree = h.render(); assert.equal(source(tree, 'travel-buddy-companion'), undefined); assert.ok(source(tree, 'travel-current-position'));
  safe = true; enabled = false; tree = h.render(); assert.equal(source(tree, 'travel-buddy-companion'), undefined); assert.ok(source(tree, 'travel-current-position'));
  enabled = true; find(tree, 'DecodedImage').props.onError(); tree = h.render();
  assert.equal(source(tree, 'travel-buddy-companion'), undefined); assert.ok(source(tree, 'travel-current-position'), 'Asset failure never removes authoritative position');
  all(tree, 'Pressable').find(node => node.props.accessibilityLabel === 'Retry Buddy image').props.onPress(); tree = h.render();
  assert.equal(source(tree, 'travel-buddy-companion'), undefined); decoded = find(tree, 'DecodedImage'); decoded.props.onLayout({ nativeEvent: { layout: { width: 128, height: 128 } } }); decoded.props.onLoad(); tree = h.render();
  assert.ok(source(tree, 'travel-buddy-companion'), 'Explicit local retry restores only successfully decoded artwork');
  h.props.currentPosition = null; tree = h.render(); assert.equal(source(tree, 'travel-current-position'), undefined); assert.equal(source(tree, 'travel-buddy-companion'), undefined); h.dispose();
});

const storyPlayback = () => ({ select() {}, subscribe: () => () => {}, get: () => ({ coordinate: null, moving: false, facing: 'left', revision: 0 }), configure() {}, pause() {} });
test('Story Buddy card selection moves the camera to the selected stop and never re-fits the journey, even for non-fitting overviews', async () => {
  const cases = [[[mappedStop('a', 0, 76, 8), mappedStop('b', 1, 77, 9)], 'b', false], [[mappedStop('a', 0, -170, 10), mappedStop('b', 1, 10, 20), mappedStop('c', 2, 170, 89)], 'b', true]];
  for (const [stops, target, polar] of cases) {
    const h = nativeMapHarness(stops, { AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove() {} }) } });
    Object.assign(h.props, { storyBuddy: storyPlayback(), storyBuddySize: 36, memoryPhotos: {}, animateMemoryRoute: false });
    let tree = h.measure(); await Promise.resolve(); tree = h.render(); const commands = [];
    find(tree, 'Camera').props.ref.current = { setCamera: command => commands.push(command) };
    find(tree, 'MapView').props.onDidFinishLoadingMap(); tree = h.render();
    assert.equal(commands.length, 1); assert.ok(commands[0].padding, 'Initial overview fit is kept');
    if (polar) assert.ok(all(tree, 'Text').some(node => String(node.props.children).startsWith('Some polar locations')), 'Overview genuinely does not fit');
    const stop = stops.find(item => item.id === target); h.props.selectedId = target; tree = h.render();
    assert.equal(commands.length, 2, 'One camera command per selection');
    assert.equal(commands[1].padding, undefined, 'Selection never re-fits the whole journey');
    assert.deepEqual(commands[1].centerCoordinate, [stop.longitude, stop.latitude]); assert.equal(commands[1].animationDuration, 450);
    assert.ok(find(tree, 'StoryWalkingBuddy'), 'Buddy still walks on the selection');
    h.props.selectedId = stops[0].id; tree = h.render(); assert.deepEqual(commands.at(-1).centerCoordinate, [stops[0].longitude, stops[0].latitude]); assert.equal(commands.at(-1).padding, undefined);
    h.dispose();
  }
});
test('Story walker map omits the separate Buddy help button', () => {
  const h = nativeMapHarness([mappedStop('a', 0, 76, 8), mappedStop('b', 1, 77, 9)], { Image: 'DecodedImage' }, globalThis, sessionModel.createTripStore(), {
    '@/hooks/use-map-buddy': { useMapBuddy: () => ({ enabled: true, owned: true, visible: false, canHelp: true, openHelp() {} }) },
  });
  Object.assign(h.props, { memoryPhotos: {}, animateMemoryRoute: false, controlTopInset: 24, storyBuddy: storyPlayback() });
  let tree = h.measure(); find(tree, 'MapView').props.onDidFinishLoadingMap(); tree = h.render();
  assert.equal(all(tree, 'Pressable').some(node => node.props.accessibilityLabel === 'Journey Buddy help'), false);
  assert.ok(find(tree, 'StoryWalkingBuddy')); h.dispose();
});
test('rail JourneyOptions preserves anonymous Remix, existing private copy, blocked feedback and About/customize routes', async () => {
  for (const mode of ['anonymous', 'signed-in', 'existing', 'blocked']) {
    const h = harness();
    const routes = [], intents = [], copies = [];
    let uses = 0, about = 0;
    const state = { busy: false, copyId: mode === 'existing' ? 'private-copy' : null, blocked: mode === 'blocked', error: mode === 'blocked' ? 'Check your drafts' : null };
    const component = load('src/components/journey/journey-options.tsx', {
      'expo-router': { useRouter: () => ({ push: route => routes.push(route) }) }, 'react-native': native,
      '../discovery/ui': { ...ui, Action: 'Action' },
      '@/hooks/session-context': { useSessionState: () => ({ loading: false, session: mode === 'anonymous' ? null : { user: { id: 'owner' } } }) },
      '@/hooks/action-intent': { useActionIntent: () => ({ pending: null, begin: (id, action) => { intents.push([id, action]); return true; } }) },
      '@/lib/remix/model': { remixStore: { get: () => state, subscribe: () => () => {}, run: async (_key, task) => task() } },
      '@/lib/remix/queries': { remixJourney: async (id, user) => { copies.push([id, user]); return 'new-copy'; } },
      './story-sheet': { StorySheet: 'StorySheet' },
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    }, h.hooks);
    const props = { id: journeyId, onUse: () => uses++, presentation:'rail', onAbout:()=>about++ };
    const sheet = (t, title) => all(t,'StorySheet').find(n => n.props.title === title);
    const button = (t, label) => all(t,'Pressable').find(n => n.props.accessibilityLabel === label);
    let tree = h.render(component.JourneyOptions, props);
    button(tree,'About this journey').props.onPress();assert.equal(about,1);
    // Remix and Customize are no longer separate rail buttons: one choice sheet explains both.
    assert.equal(sheet(tree,'Make this journey yours').props.visible,false);
    assert.equal(all(tree,'Pressable').filter(n => /^(Remix This Journey|Open private copy|Customize stops)$/.test(n.props.accessibilityLabel)).every(n => all(sheet(tree,'Make this journey yours'),'Pressable').includes(n)),true,'Customize and Remix live only inside the choice sheet');
    button(tree,'Make it yours').props.onPress();tree=h.render(component.JourneyOptions, props);
    const choice = sheet(tree,'Make this journey yours');assert.equal(choice.props.visible,true);
    const inChoice = label => all(choice,'Pressable').find(n => n.props.accessibilityLabel === label);
    assert.match(JSON.stringify(all(choice,'Text').map(n => n.props.children)),/Nothing is saved/,'Customize explains it is temporary');
    assert.match(JSON.stringify(all(choice,'Text').map(n => n.props.children)),mode === 'existing' ? /already have a private draft/ : /private draft in your account/,'Remix explains it saves a draft');
    inChoice('Customize stops').props.onPress();assert.deepEqual(routes.pop(),{pathname:'/customize/[id]',params:{id:journeyId}});
    tree=h.render(component.JourneyOptions, props);assert.equal(sheet(tree,'Make this journey yours').props.visible,false,'Choosing closes the sheet');
    button(tree,'Make it yours').props.onPress();tree=h.render(component.JourneyOptions, props);
    const remix = all(sheet(tree,'Make this journey yours'),'Pressable').find(n => n.props.accessibilityLabel === (mode === 'existing' ? 'Open private copy' : 'Remix This Journey'));
    if (mode === 'blocked') {
      assert.equal(remix.props.disabled, true);
      button(tree,'Check your drafts').props.onPress();tree=h.render(component.JourneyOptions,props);assert.equal(sheet(tree,'Remix journey').props.visible,true);
      all(sheet(tree,'Remix journey'),'Action')[0].props.onPress();
      assert.equal(routes.at(-1), '/account');
    } else {
      remix.props.onPress(); await new Promise(resolve => setImmediate(resolve));
      if (mode === 'anonymous') { assert.deepEqual(intents, [[journeyId, 'remix']]); assert.equal(routes.at(-1), '/auth'); }
      else assert.deepEqual(routes.at(-1), { pathname: '/create', params: { draft: mode === 'existing' ? 'private-copy' : 'new-copy' } });
      assert.equal(copies.length, mode === 'signed-in' ? 1 : 0);
      tree=h.render(component.JourneyOptions, props);
      assert.equal(sheet(tree,'Make this journey yours').props.visible,false);assert.equal(sheet(tree,'Remix journey').props.visible,false);
    }
  }
});
test('StorySheet owns dark status icons only while visible and releases ownership when closed',()=>{
 const {StorySheet}=load('src/components/journey/story-sheet.tsx',{'react-native':native,'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'@/components/discovery/ui':ui});
 const props={title:'Feedback',onClose(){},children:'Message'};
 assert.equal(find(StorySheet({...props,visible:false}),'StatusBar'),null);
 assert.equal(find(StorySheet({...props,visible:true}),'StatusBar').props.style,'dark');
});
test('edge-to-edge preview moves Fit and compass below inset without changing Travel defaults',()=>{
 const h=nativeMapHarness([mappedStop('a',0,76,8),mappedStop('b',1,77,9)]);
 let tree=h.measure();assert.equal(find(tree,'MapView').props.compassPosition.top,12);
 let fit=all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Fit journey and reset map orientation');assert.equal(fit.props.style[1].top,12);
 h.props.controlTopInset=36;tree=h.render();assert.equal(find(tree,'MapView').props.compassPosition.top,48);fit=all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Fit journey and reset map orientation');assert.equal(fit.props.style[1].top,48);
 h.props.presentation='expanded';h.props.onExpand=()=>{};tree=h.render();
 fit=all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Fit journey and reset map orientation');
 assert.equal(fit.props.style.at(-1).right,54,'Compact Fit leaves top-left clear for Back');
 assert.equal(fit.props.style.at(-1).left,undefined);
 assert.equal(fit.props.style.at(-1).top,40,'Compact controls align below the safe area');
 assert.equal(find(tree,'MapView').props.compassPosition.top,92,'Compass stays below compact controls');
 h.props.onExpand=undefined;tree=h.render();
 assert.equal(find(tree,'MapView').props.compassPosition.top,48,'Expanded map retains original controls');
 h.props.navigationMode=true;h.props.navigationPadding={top:90,bottom:200};tree=h.render();assert.equal(find(tree,'MapView').props.compassPosition.bottom,236);h.dispose();
});


test('map unavailable fallback respects edge-to-edge status inset',()=>{
 const {MapFallback}=load('src/components/journey/map/map-frame.tsx',{'react-native':native,'@/components/discovery/ui':ui});
 let tree=MapFallback({controlTopInset:36,retry:()=>{}});
 assert.equal(tree.props.style.at(-1).paddingTop,56);
 tree=MapFallback({});assert.equal(tree.props.style.at(-1).paddingTop,20);
});

test('stop story viewer shows stop art for photo-less or failed photos with one fixed circle map whose credit can never be covered', () => {
  const previousToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN = 'pk.viewer-synthetic';
  try {
  const h = harness();
  // The real circle module: real footprint and real "can render" URL check.
  const staticMap = load('src/lib/media/static-map.ts', {});
  const mapPhoto = load('src/components/discovery/static-map-photo.tsx', { 'react-native': native, '@/lib/media/static-map': staticMap, '@/lib/buddy/model': {} });
  const circleModule = load('src/components/art/circle-map.tsx', { 'react-native': native, '@/components/discovery/static-map-photo': mapPhoto, '@/lib/media/static-map': staticMap });
  assert.equal(circleModule.circleMapFootprint, staticMap.staticMapCircleSize + 4 + Math.ceil(mapPhoto.staticMapCreditLineHeight * circleModule.circleCreditMaxFontScale));
  const needed = 12 + circleModule.circleMapFootprint + 8;
  const { StopStoryViewer } = load('src/components/journey/stop-story-viewer.tsx', {
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'react-native': { ...native, Modal: 'Modal', ScrollView: 'ScrollView', PanResponder: { create: () => ({ panHandlers: {} }) } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/discovery/journey-photo': { JourneyPhoto: 'JourneyPhoto' }, '@/components/discovery/ui': ui,
    '@/components/art/circle-map': { ...circleModule, CircleMap: 'CircleMap' },
  }, h.hooks);
  const art = load('src/lib/art/journey-art.ts', {});
  const stops = [{ ...stop('a'), latitude: 9.93, longitude: 76.26 }, { ...stop('b'), latitude: 9.96, longitude: 76.24, photo: 'https://example.test/b.jpg' }, { ...stop('c'), latitude: null, longitude: null }, { ...stop('d'), latitude: 9.9, longitude: 76.2 }];
  stops[3].description = 'Notes';
  const props = { journey: { id: 'journey-1', title: 'Trip', destination: 'Kochi', stops }, selectedId: 'a', onSelect() {}, onClose() {}, onMap() {} };
  const render = () => h.render(StopStoryViewer, props);
  const area = tree => all(tree, 'View').find(n => n.props.testID === 'story-image-area');
  const stopArt = tree => find(tree, 'JourneyPhoto').props.fallback;
  let tree = render();
  assert.equal(find(tree, 'JourneyPhoto').props.map, undefined, 'No full-screen static map');
  assert.equal(stopArt(tree).type, 'StopArt'); assert.equal(stopArt(tree).props.index, 0); assert.equal(stopArt(tree).props.stops, stops);
  assert.equal(stopArt(tree).props.seed, art.artSeed(null, stops), 'Same palette as the deck, which only receives stops');
  assert.equal(stopArt(tree).props.accessibilityLabel, 'Stop art. No photo yet. a');
  assert.equal(stopArt(tree).props.inset.top, 24 + 88); assert.equal(stopArt(tree).props.inset.bottom, 24 + 180);
  assert.equal(find(tree, 'CircleMap'), null, 'Hidden until the open space is measured');
  assert.equal(stopArt(tree).props.inset.right, 0, 'No strip reserved while hidden');
  area(tree).props.onLayout({ nativeEvent: { layout: { height: needed - 1 } } }); tree = render();
  assert.equal(find(tree, 'CircleMap'), null, 'Too little space between header and caption for circle plus credit');
  area(tree).props.onLayout({ nativeEvent: { layout: { height: needed } } }); tree = render();
  const circle = find(tree, 'CircleMap');
  assert.equal(circle.props.point, stops[0]);
  assert.equal(Object.assign({}, ...[circle.props.style].flat()).top, 24 + 88 + 12, 'Circle sits below the header');
  assert.equal(stopArt(tree).props.inset.right, 112, 'Art content keeps clear of the circle');
  circle.props.onError(circleModule.circleMapUri(stops[0])); tree = render();
  assert.equal(find(tree, 'CircleMap'), null, 'A failed circle disappears');
  assert.equal(stopArt(tree).props.inset.right, 0, 'and releases its reserved strip');
  props.selectedId = 'd'; tree = render();
  find(tree, 'CircleMap').props.onError(circleModule.circleMapUri(stops[3]));
  props.selectedId = 'a'; tree = render();
  assert.equal(find(tree, 'CircleMap'), null, 'Returning to an earlier failed stop does not retry');
  props.selectedId = 'd'; tree = render();
  assert.equal(find(tree, 'CircleMap'), null, 'Every failed circle URL is remembered');
  props.selectedId = 'a';
  props.selectedId = 'b'; tree = render();
  assert.equal(find(tree, 'CircleMap'), null, 'A photo wins and needs no circle');
  find(tree, 'JourneyPhoto').props.onError(); tree = render();
  assert.equal(find(tree, 'CircleMap').props.point, stops[1], 'A failed photo falls back to art plus the circle');
  assert.equal(stopArt(tree).props.accessibilityLabel, 'Stop art. Photo unavailable. b');
  props.selectedId = 'c'; tree = render();
  assert.equal(find(tree, 'CircleMap'), null, 'Not renderable (no coordinates): no circle');
  assert.equal(stopArt(tree).props.inset.right, 0, 'and no reserved strip');
  stops.push({ ...stop('e'), latitude: 9.8, longitude: 76.1, description: 'Notes' });
  props.selectedId = 'e'; tree = render();
  assert.ok(find(tree, 'CircleMap'));
  all(tree, 'Pressable').find(n => n.props.accessibilityLabel === 'Read full description for e').props.onPress(); tree = render();
  assert.equal(find(tree, 'CircleMap'), null, 'The notes sheet would cover the credit, so the circle hides');
  assert.equal(stopArt(tree).props.inset.right, 0);
  } finally { if (previousToken === undefined) delete process.env.EXPO_PUBLIC_MAPBOX_TOKEN; else process.env.EXPO_PUBLIC_MAPBOX_TOKEN = previousToken; }
});
