import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
// Execute the actual dependency-free shared theme in the component harness.
const mobileTheme = {};
new Function('exports', ts.transpileModule(readFileSync('src/theme/mobile-theme.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mobileTheme);


function load(file, dependencies, state = null, hookOverrides = {}) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const react = { useRef:()=>({current:null}),useEffect:()=>{}, memo: fn => fn, useState: initial => typeof state === 'function' ? state(initial) : [state ?? initial, () => {}], useMemo: fn => fn(), useCallback: fn => fn, ...hookOverrides };
  const rn = { StyleSheet: { create: value => value }, Platform: { OS: 'web' }, StatusBar: {} };
  for (const name of ['View', 'Text', 'Pressable', 'Image', 'TextInput']) rn[name] = name;
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', source)(name => { if (name === '@/theme/mobile-theme') return mobileTheme;
    if(name==='@/lib/discovery/queries')return {invalidatePublicJourneys(){},...dependencies[name]};
    if(name==='@/components/discovery/compact-search-input')return load('src/components/discovery/compact-search-input.tsx',{},null,{useRef:()=>({current:null})});
    if(name==='@/lib/social/saved-queries')return {loadSavedJourneys:async()=>[]};
    if(name==='@/components/journey/journey-action-icon')return {JourneyActionIcon:'JourneyActionIcon'};
    if (name === '../../../assets/images/journey-photo-fallback.png') return 17;
    if (name === './travel-photo-placeholder') return load('src/components/discovery/travel-photo-placeholder.tsx', {});
    if (name === './home-control-icon') return load('src/components/discovery/home-control-icon.tsx', {});
    if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons', MaterialCommunityIcons: 'MaterialCommunityIcons' };
    if (name === 'expo-status-bar') return {StatusBar:'StatusBar'};
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react-native') return { ...rn, ...dependencies[name] };
    if(name==='@/components/create/place-picker')return {PlacePicker:'PlacePicker'};
    if(name==='@/hooks/session-context' && !(name in dependencies))return {useSessionState:()=>({session:null,loading:false})};
    if(name==='@/hooks/use-load' && !(name in dependencies))return {useLoad:()=>({data:null,refresh:()=>{}})};
    if(name==='@/lib/profile/edit-queries')return {loadOwnProfile:()=>Promise.resolve(null)};
    if(name==='@/lib/discovery/model' && !(name in dependencies))return {safePhoto:()=>null,hideViewerJourneys:rows=>rows.map(r=>r.journey),discoveryJourneys:rows=>rows.map(r=>r.journey)};
    if(name==='@/hooks/use-discovery-viewer' && !(name in dependencies))return {useDiscoveryViewer:()=>({pending:false,id:null})};
    if(name==='expo-router')return {Stack:{Screen:'StackScreen'},useFocusEffect:()=>{},useGlobalSearchParams:()=>({}),...dependencies[name]};
    if (name in dependencies) return name==='@/lib/discovery/map'?{worldCamera:{centerCoordinate:[35,18]},...dependencies[name]}:dependencies[name];
    if(name==='@/components/branded-loading')return {BrandedLoading:'BrandedLoading'};throw Error(name);
  }, exports);
  return exports;
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (typeof tree.type === 'function') return nodes(tree.type(tree.props));
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
const colors = { paper: '#fff' };
test('shared Search route highlights only its selected entry point and Story detail stays on Story', () => {
  for (const [path, view, active] of [['/search', undefined, 'search'], ['/search', 'search', 'search'], ['/search', 'stories', 'story'], ['/journey/a', undefined, 'story'], ['/account', undefined, 'account']]) {
    const nav = load('src/components/floating-navigation.tsx', {
      'expo-router': { usePathname: () => path, useGlobalSearchParams: () => ({ view }) },
      'react-native-safe-area-context': {},
    });
    assert.equal(nav.MainNavigationFrame({ children: 'screen' }).props.children[1].props.active, active);
  }
});
test('Search and Story share one public list while preserving independent query state', () => {
  let view = 'search', cursor = 0;
  let collection = { data: [{ id: 'a', destination: 'Coast' }, { id: 'b', destination: 'Hills' }].map(journey => ({ journey, creatorId: null })), loading: false };
  const state = [];
  const component = load('src/app/search.tsx', {
    'expo-router': { useLocalSearchParams: () => ({ view }), useRouter:()=>({}), useFocusEffect(){} },
    'react-native': { TextInput: 'TextInput', FlatList: 'FlatList', KeyboardAvoidingView: 'KeyboardAvoidingView', RefreshControl: 'RefreshControl' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/discovery/explore-tile': { ExploreTile: 'ExploreTile' },
    '@/components/discovery/journey-card': { JourneyCard: 'JourneyCard' },
    '@/components/discovery/ui': { colors, ui: {}, ScreenHeader: 'ScreenHeader', Message: 'Message', LoadingCards: 'LoadingCards' },
    '@/hooks/use-load': { useLoad: () => collection },
    '@/lib/discovery/model': { hideViewerJourneys:rows=>rows.map(r=>r.journey),discoveryJourneys:rows=>rows.map(r=>r.journey), searchJourneys: (rows, query) => rows.filter(row => row.destination.includes(query)) },
    '@/lib/discovery/queries': { loadDiscoveryEntries: () => {} },
  }, initial => { const slot = cursor++; if (!(slot in state)) state[slot] = initial; return [state[slot], value => { state[slot] = value; }]; });
  function render() { cursor = 0; return nodes(component.default()); }
  let all = render();
  all.find(n => n.type === 'TextInput').props.onChangeText('Coast');
  assert.equal(render().find(n => n.type === 'FlatList').props.data.length, 1);
  view = 'stories'; all = render();
  assert.equal(all.find(n => n.type === 'TextInput').props.value, '');
  assert.equal(all.filter(n => n.type === 'FlatList').length, 1);
  assert.equal(all.find(n => n.type === 'FlatList').props.data.length, 2);
  view = 'search';
  assert.equal(render().find(n => n.type === 'TextInput').props.value, 'Coast');
  collection={data:null,loading:true};assert.ok(render().some(n=>n.type==='BrandedLoading'));
  collection={data:[],loading:false,refreshing:true};assert.ok(!render().some(n=>n.type==='BrandedLoading'));
  collection={data:null,loading:false,error:'Offline'};assert.ok(!render().some(n=>n.type==='BrandedLoading'));
});
test('Account uses the loaded profile avatar and falls back after image failure', () => {
  const uri = 'https://example.invalid/signed-avatar';
  let failed = null;
  const nav = load('src/components/floating-navigation.tsx', {
    'expo-router': { useRouter: () => ({ navigate: () => {} }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0 }) },
    '@/hooks/use-load': { useLoad: () => ({ data: { avatarPreview: uri }, refresh: () => {} }) },
  }, () => [failed, value => { failed = value; }]);
  let all = nodes(nav.FloatingNavigation({ active: 'account' }));
  const avatar = all.find(n => n.type === 'Image');
  assert.equal(avatar.props.source.uri, uri);
  avatar.props.onError();
  all = nodes(nav.FloatingNavigation({ active: 'account' }));
  assert.ok(!all.some(n => n.type === 'Image'));
  assert.ok(all.some(n => n.props?.accessibilityLabel === 'Open account'));
});
test('Home embeds place search; Account and navigation retain existing routes and geometry', () => {
  for (const bottomInset of [0, 24, 48]) {
  const pushed = []; const refreshOrder=[];
  const navigation = load('src/components/floating-navigation.tsx', {
    'expo-router': { useRouter: () => ({ navigate: route => pushed.push(route) }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: bottomInset, left: 0, right: 0 }) },
  });
  const home = load('src/app/discover.tsx', {
    '@/components/floating-navigation': navigation,
    '../../assets/journey-creator-logo.png': 'supplied-logo',
    'expo-router': { useRouter: () => ({ push: route => pushed.push(route) }), useFocusEffect: () => {} },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: bottomInset }) },
    '@/components/discovery/globe/discovery-globe': { DiscoveryGlobe: 'Globe' },
    '@/components/discovery/discovery-panel': { DiscoveryPanel: 'Panel' },
    '@/components/discovery/ui': { colors }, '@/hooks/use-load': { useLoad: () => ({ data: [], loading: false, refresh:()=>refreshOrder.push('refresh') }) },
    '@/lib/discovery/map': { discoveryPoints: () => ({ features: [] }) },
    '@/lib/discovery/travel': { discoveryRoute: () => null },
    '@/lib/discovery/presentation': { spaceColor: '#080F1E' },
    '@/lib/discovery/queries': { invalidatePublicJourneys:()=>refreshOrder.push('invalidate'), loadPublicJourney: () => {}, loadDiscoveryEntries: () => {} },
  });
  const tree = home.default();
  const all = nodes(tree);
  assert.ok(!all.some(n => n.props?.accessibilityLabel === 'Journey Creator logo'));
  const header = tree.props.children.props.children[1];
  assert.equal(header.props.style[0].flexDirection, 'row');
  assert.equal(header.props.children.length, 2);
  const search = header.props.children[0];
  assert.equal(search.props.style.flex, 1);
  assert.equal(search.props.style.minWidth, 0);
  assert.equal(search.props.style.minHeight, 44);
  const picker = search.props.children;
  assert.equal(picker.type, 'PlacePicker');
  assert.equal(picker.props.label, 'Search places');
  assert.equal(picker.props.homeSearch, true);
  assert.equal(picker.props.autoSuggest, true);
  assert.equal(picker.props.embeddedSuggestions, true);
  assert.equal(picker.props.destinationOnly, undefined, 'Addresses remain searchable');
  assert.equal(picker.props.onPress, undefined, 'Search never navigates');
  assert.equal(header.props.style[0].gap, 8);
  assert.equal(header.props.style[0].minHeight, 52);
  assert.equal(header.props.style[0].position,'absolute');assert.equal(header.props.style[0].backgroundColor,undefined);assert.equal(header.props.style[1].top,4);
  const shade=all.find(n=>n.props?.testID==='home-status-shade');assert.equal(shade.props.pointerEvents,'none');
  assert.equal(all.find(n=>n.type==='Globe').props.headerInset,68);
  assert.equal(all.find(n=>n.type==='Panel').props.topClearance,68);
  for (const control of header.props.children.slice(1)) {
    assert.equal(control.props.style.width, 44);
    assert.equal(control.props.style.minHeight, 44);
    assert.equal(control.props.style.flexShrink, 0);
    const icon = control.props.children;
    assert.equal(icon.props.style.width, 34);
    assert.equal(icon.props.style.height, 34);
  }
  for (const width of [320, 360, 412]) {
    const reserved = 2 * header.props.style[0].paddingHorizontal + 44 + header.props.style[0].gap;
    assert.ok(width - reserved >= 150, 'Remaining Search width on common narrow phones');
  }
  assert.deepEqual(tree.props.edges, ['left', 'right']);
  assert.ok(!all.some(n => n.type === 'Text' && ['JC', 'Journey Creator'].includes(n.props.children)));
  for (const [label, route] of [['Open account', '/account'], ['Search journeys and creators', '/search?view=search'], ['Browse public stories', '/search?view=stories'], ['Create Journey from Home', '/create'], ['Create Journey', '/create']]) {
    all.find(n => n.props?.accessibilityLabel === label).props.onPress();
    assert.equal(pushed.at(-1), route);
  }
  const bell = all.find(n => n.props?.accessibilityLabel === 'Notifications, coming soon');
  assert.equal(bell.props.onPress, undefined);
  assert.equal(bell.props.accessibilityRole, 'image');
  assert.ok(all.some(n => n.type === 'Globe'));
  assert.ok(all.some(n => n.type === 'Panel'));all.find(n=>n.type==='Panel').props.onRefresh();assert.deepEqual(refreshOrder,['invalidate','refresh']);
  const explore = all.find(n => n.props?.accessibilityLabel === 'Explore');
  const count = pushed.length; explore.props.onPress(); assert.equal(pushed.length, count);
  assert.equal(explore.props.accessibilityState.selected, true);
  assert.equal(explore.props.style({ pressed: false })[1].backgroundColor, '#C9DFFF');
  const nav = all.find(n => [n.props?.children].flat(Infinity).includes(explore));
  assert.equal(nav.props.children.length, 5);
  assert.equal(nav.props.style[0].position, 'absolute');
  assert.equal(nav.props.style[1].bottom, bottomInset + 8);
  assert.ok(nav.props.style[0].zIndex > 0 && nav.props.style[0].elevation > 0);
  assert.ok(nav.props.style[0].backgroundColor.startsWith('rgba('));
  assert.equal(nav.props.onStartShouldSetResponder(), true);
  assert.equal(nav.props.onResponderTerminationRequest(), false);
  const panel = all.find(n => n.type === 'Panel');
  assert.equal(panel.props.bottomClearance, bottomInset + 142);
  assert.ok(!nodes(panel).includes(nav));
  for (const child of nav.props.children.slice(1)) {
    assert.equal(child.props.style({ pressed: false })[0].flex, 1);
    assert.equal(child.props.style({ pressed: false })[0].minHeight, 46);
  }
  }
});
const journey = { id: 'journey-a', cover: 'https://example.invalid/portrait.jpg', title: 'Coastal weekend', destination: 'Coast', creatorName: 'Traveler', stops: [{ id: 'stop' }] };
function card(cover = journey.cover, failed = null, expanded = true) {
  const calls = [];
  const component = load('src/components/discovery/home-journey-card.tsx', {
    '@/lib/discovery/model': { journeyFacts: j => j.stops.length + ' stops' }, './ui': { colors },
  }, failed);
  return { calls, all: nodes(component.HomeJourneyCard({ journey: { ...journey, cover }, expanded, width: 300, selected: false, onOpen: id => calls.push(['open', id]), onLocate: id => calls.push(['locate', id]) })) };
}
test('Home fills photo frames without blurred side panels and uses 16:9 expanded covers', () => {
  for (const expanded of [false, true]) {
    const { all } = card(journey.cover, null, expanded);
    const images = all.filter(n => n.type === 'Image');
    assert.equal(images.length, 1);
    const photo = images[0];
    assert.equal(photo.props.resizeMode, 'cover');
    assert.equal(photo.props.accessibilityLabel, journey.title + ' cover photo');
    assert.equal(photo.props.blurRadius, undefined);
    assert.equal(photo.props.source.uri, journey.cover);
    const frame = all.find(n => n.props?.children === photo);
    const frameStyle = Object.assign({}, ...frame.props.style.filter(Boolean));
    assert.equal(frameStyle.overflow, 'hidden');
    assert.equal(frameStyle.width, expanded ? '100%' : 96);
    assert.equal(frameStyle.height, expanded ? Math.round(300 * 9 / 16) : 84);
    if (expanded) assert.equal(frameStyle.aspectRatio, 16 / 9);
  }
});
test('Home retains title, author, count, Locate and both Story entry points (card and Explore journey)', () => {
  const { all, calls } = card();
  const texts = all.filter(n => n.type === 'Text').map(n => [n.props.children].flat().join(''));
  for (const text of [journey.title, 'By Traveler', '1 stops']) assert.ok(texts.includes(text));
  for (const label of ['Locate journey: Coastal weekend', 'Explore journey: Coastal weekend', 'Open journey: Coastal weekend, Coast']) all.find(n => n.props?.accessibilityLabel === label).props.onPress();
  assert.deepEqual(calls, [['locate', journey.id], ['open', journey.id], ['open', journey.id]]);
});
test('missing/failed photos retain fallback and a changed URI recovers', () => {
  for (const [uri, failed] of [[null, null], [journey.cover, journey.cover]]) {
    assert.ok(card(uri, failed).all.some(n => n.props?.accessibilityLabel === 'Default travel photo. No journey cover photo available. Coast. Explore journey'));
  }
  assert.equal(card('https://example.invalid/new.jpg', journey.cover).all.filter(n => n.type === 'Image').length, 1);
});

test('Home image failure falls back, a new URI recovers and card measurement remains live', () => {
  let failedUri = null;
  const component = load('src/components/discovery/home-journey-card.tsx', {
    '@/lib/discovery/model': { journeyFacts: j => j.stops.length + ' stops' }, './ui': { colors },
  }, () => [failedUri, value => { failedUri = value; }]);
  let measured;
  const props = { journey, expanded: true, width: 300, selected: true, onOpen() {}, onLocate() {}, onHeight: value => { measured = value; } };
  let tree = component.HomeJourneyCard(props);
  tree.props.onLayout({ nativeEvent: { layout: { height: 310 } } });
  assert.equal(measured, 310);
  assert.equal(nodes(tree).find(n => n.props?.accessibilityLabel === 'Locate journey: Coastal weekend').props.accessibilityState.selected, true);
  for (const label of ['Locate journey: Coastal weekend', 'Explore journey: Coastal weekend']) {
    const action = nodes(tree).find(n => n.props?.accessibilityLabel === label);
    const style = Object.assign({}, ...[action.props.style].flat().filter(Boolean));
    assert.ok(style.minWidth >= 44 && style.minHeight >= 56);
    assert.equal(style.height, undefined, 'Action can grow with larger text');
    const text = nodes(action).find(n => n.type === 'Text');
    assert.equal(text.props.children, label.startsWith('Locate') ? 'Locate' : 'Explore journey');
    assert.equal(text.props.numberOfLines, undefined, 'Visible title can wrap at large font sizes');
    const icon = nodes(action).find(n => n.props?.accessibilityElementsHidden);
    assert.equal(icon.props.pointerEvents, 'none');
    assert.equal(icon.props.accessible, false);
    assert.equal(icon.props.importantForAccessibility, 'no-hide-descendants');
    const glyph = nodes(icon).find(n => n.type === (label.startsWith('Locate') ? 'Ionicons' : 'MaterialCommunityIcons'));
    assert.equal(glyph.props.name, label.startsWith('Locate') ? 'locate-outline' : 'book-outline');
    assert.equal(glyph.props.size, 28);
    assert.equal(glyph.props.color, label.startsWith('Locate') ? '#6555CF' : '#3873CE');
    const box = Object.assign({}, ...[icon.props.style].flat().filter(Boolean));
    assert.equal(box.width, 28); assert.equal(box.height, 28, 'Glyph space is reserved before the icon font loads');
    if (!label.startsWith('Locate')) assert.equal(action.props.accessibilityHint, 'Opens Journey Story');
  }
  const unselectedLocate = nodes(component.HomeJourneyCard({ ...props, selected: false })).find(n => n.props?.accessibilityLabel === 'Locate journey: Coastal weekend');
  assert.equal(nodes(unselectedLocate).find(n => n.type === 'Ionicons').props.color, '#3873CE');
  nodes(tree).find(n => n.type === 'Image').props.onError();
  assert.equal(failedUri, journey.cover);
  assert.ok(nodes(component.HomeJourneyCard(props)).some(n => n.props?.accessibilityLabel === 'Default travel photo. No journey cover photo available. Coast. Explore journey'));
  tree = component.HomeJourneyCard({ ...props, journey: { ...journey, cover: 'https://example.invalid/landscape.jpg' } });
  assert.equal(nodes(tree).find(n => n.type === 'Image').props.source.uri, 'https://example.invalid/landscape.jpg');
  const {HomeControlIcon}=load('src/components/discovery/home-control-icon.tsx',{});
  const world=HomeControlIcon({name:'world'});
  assert.equal(world.props.style[0].width,24);assert.equal(world.props.style[1],false,'World keeps its original icon size');
});

test('Home missing and failed covers use supplied default photo with readable native caption', () => {
  for (const expanded of [false, true]) for (const [uri, failed] of [[null, null], [journey.cover, journey.cover]]) {
    const { all } = card(uri, failed, expanded);
    const fallback = all.find(n => n.props?.accessibilityLabel === 'Default travel photo. No journey cover photo available. Coast. Explore journey');
    assert.equal(fallback.props.accessible, true);
    const art = nodes(fallback).find(n => n.props?.accessibilityElementsHidden);
    assert.equal(art.props.accessible, false);
    assert.equal(art.props.importantForAccessibility, 'no-hide-descendants');
    const image = nodes(art).find(n => n.type === 'Image');
    assert.equal(image.props.source, 17);assert.equal(image.props.resizeMode, 'cover');
    const caption = nodes(fallback).filter(n => n.type === 'Text');
    assert.equal(caption.length, 1);assert.equal(caption[0].props.children, 'Explore journey');
    const textStyle=Object.assign({},...caption[0].props.style.filter(Boolean));
    assert.equal(textStyle.color,'#FFFFFF');assert.equal(textStyle.fontSize,expanded?12:10);
    assert.ok(!caption.some(n=>n.props.children===journey.destination));
  }
});
test('Journey generic fallback has a distinct caption and honest accessibility label',()=>{
 const {TravelPhotoPlaceholder}=load('src/components/discovery/travel-photo-placeholder.tsx',{});
 const tree=TravelPhotoPlaceholder({variant:'stop'});
 assert.match(tree.props.accessibilityLabel,/Default travel photo/);
 assert.equal(nodes(tree).find(n=>n.type==='Text').props.children,'See this stop');
});

test('sheet overlay clearance keeps peek/compact controls above pill and expanded final actions scrollable', () => {
  for (const expanded of [false, true]) for (const availableHeight of [190, 436, 720]) for (const bottomClearance of [94, 118, 150]) for (const topClearance of [0, 96, 500]) {
    let sheetArea, published, bounds;
    const offset = { current: 0 };
    const component = load('src/components/discovery/discovery-panel.tsx', {
      'react-native': { Animated: { View: 'AnimatedView', add: (a, b) => a + b }, FlatList: 'FlatList' },
      '@/lib/discovery/presentation': { discoveryCardWidth: () => 300 },
      '@/hooks/use-discovery-sheet': { useDiscoverySheet: (area, onHeight, onInteraction, sizes) => {
        sheetArea = area; bounds = sizes; onHeight(44);
        return { height: 44, expanded, offset, responders: { handle: {}, content: {} } };
      } },
      './home-journey-card': { HomeJourneyCard: 'Card' }, './ui': { colors },
    });
    const tree = component.DiscoveryPanel({ journeys: [journey], availableHeight, availableWidth: 360, bottomClearance, topClearance, onHeight: h => { published = h; } });
    const clearance = Math.min(bottomClearance, availableHeight - 44);
    assert.equal(sheetArea, availableHeight - clearance - Math.min(topClearance, Math.max(0, availableHeight - clearance - 44)));
    assert.equal(bounds.collapsed, Math.min(sheetArea, 266), 'Collapsed sheet budgets its chrome and full compact card');
    assert.ok(bounds.expanded >= bounds.collapsed && bounds.expanded <= sheetArea);
    assert.equal(published, 44 + clearance);
    assert.equal(tree.props.style[1].height, 44 + clearance);
    assert.ok(published <= availableHeight);
    const all = nodes(tree);
    const lists = all.filter(n => n.type === 'FlatList');
    assert.equal(lists.length, 2);
    const active = lists.find(n => n.props.horizontal === !expanded);
    const hidden = lists.find(n => n !== active);
    assert.equal(active.props.data.length, 1);
    assert.equal(hidden.props.data.length, 0, 'Hidden Home list cannot request image sources');
    assert.equal(hidden.props.ListEmptyComponent, null);
    assert.equal(hidden.props.ListFooterComponent, null);
    assert.equal(active.props.initialNumToRender, expanded ? 3 : 2);
    assert.equal(active.props.maxToRenderPerBatch, 2);
    assert.equal(active.props.windowSize, 3);
    const vertical = lists.find(n => !n.props.horizontal);
    assert.ok(vertical.props.contentContainerStyle.at(-1).paddingBottom > clearance);
    vertical.props.onScroll({ nativeEvent: { contentOffset: { y: 60 } } });
    assert.equal(offset.current, 60);
    const compact = lists.find(n => n.props.horizontal);
    const parent = all.find(n => n.props?.children?.some?.(child => child?.props?.children === compact));
    if (!expanded) assert.equal(parent.props.style[1].marginBottom, clearance);
  }
});
test('shared navigation selects each destination and frame includes only standard browsing routes', () => {
  for (const active of ['explore', 'search', 'create', 'story', 'account', null]) {
    const routes = [];
    const nav = load('src/components/floating-navigation.tsx', {
      'expo-router': { useRouter: () => ({ navigate: route => routes.push(route) }) },
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 24, left: 0, right: 0 }) },
    });
    const tree = nav.FloatingNavigation({ active });
    const buttons = nodes(tree).filter(n => n.type === 'Pressable');
    assert.equal(buttons.length, 5);
    for (const [i, key] of ['explore', 'search', 'create', 'story', 'account'].entries()) {
      assert.equal(buttons[i].props.accessibilityState.selected, active === key);
      const count = routes.length;
      buttons[i].props.onPress();
      if (active === key) assert.equal(routes.length, count);
      else assert.equal(routes.at(-1), ['/discover', '/search?view=search', '/create', '/search?view=stories', '/account'][i]);
    }
    assert.equal(tree.props.style[1].bottom, 32);
    assert.equal(tree.props.style[0].backgroundColor, 'rgba(242, 246, 255, 0.97)');
  }
  for (const path of ['/search', '/create', '/account', '/journey/a', '/profile/traveler', '/', '/discover', '/auth', '/draft/a', '/travel/a']) {
    const nav = load('src/components/floating-navigation.tsx', { 'expo-router': { usePathname: () => path }, 'react-native-safe-area-context': {} });
    const tree = nav.MainNavigationFrame({ children: 'screen' });
    const expected = ['/search', '/create', '/account', '/journey/a', '/profile/traveler'].includes(path);
    assert.equal(Boolean(tree.props.children[1]), expected, path);
    assert.equal(Boolean(tree.props.children[0].props.style[1]), expected);
    if (expected) assert.equal(tree.props.children[0].props.style[1].paddingBottom, 72);
  }
});
test('Home retains navigation and its live globe through loading, refreshing and errors',()=>{
  let collection={data:[],loading:false};
  const home=load('src/app/discover.tsx',{
    '@/components/floating-navigation':{FloatingNavigation:'Navigation'},
    '../../assets/journey-creator-logo.png':'logo',
    'expo-router':{useRouter:()=>({}),useFocusEffect:()=>{}},
    'react-native-safe-area-context':{SafeAreaView:'SafeAreaView',useSafeAreaInsets:()=>({bottom:24})},
    '@/components/discovery/globe/discovery-globe':{DiscoveryGlobe:'Globe'},
    '@/components/discovery/discovery-panel':{DiscoveryPanel:'Panel'},
    '@/hooks/use-load':{useLoad:()=>({refresh(){},...collection})},
    '@/lib/discovery/map':{discoveryPoints:()=>({features:[]})},'@/lib/discovery/travel':{discoveryRoute:()=>null},
    '@/lib/discovery/presentation':{spaceColor:'#080F1E'},'@/lib/discovery/queries':{loadPublicJourney:()=>{},loadDiscoveryEntries:()=>{}},
  });
  const tree = home.default(), all = nodes(tree), children = tree.props.children.props.children;
  assert.equal(children.filter(Boolean).length, 6);
  assert.equal(children[2].type, 'View');
  assert.equal(children[5].type, 'Navigation');
  assert.equal(all.find(n => n.type === 'Navigation').props.active, 'explore');
  assert.ok(all.some(n => n.type === 'Globe'));
  collection={data:null,loading:true};let loadingTree=home.default();
  assert.ok(nodes(loadingTree).some(n=>n.type==='BrandedLoading'));
  assert.ok(nodes(loadingTree).some(n=>n.type==='Globe'),'Live map stays mounted under the overlay');
  collection={data:[],loading:false,refreshing:true};assert.ok(!nodes(home.default()).some(n=>n.type==='BrandedLoading'));
  collection={data:null,loading:false,error:'Offline'};assert.ok(!nodes(home.default()).some(n=>n.type==='BrandedLoading'));
});

test('Home assigns native-screen dark loading icons then light globe icons without a competing component owner',()=>{
 let cursor=0,collection={data:null,loading:true};const slots=[];
 const memo=(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j]))slots[i]={deps,value:fn()};return slots[i].value;};
 const hooks={useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useCallback:(fn,deps)=>memo(()=>fn,deps),useMemo:memo};
 const focus=fn=>{const i=cursor++;if(slots[i]?.fn!==fn){slots[i]?.cleanup?.();slots[i]={fn,cleanup:fn()};}};
 const Home=load('src/app/discover.tsx',{
  'expo-router':{useRouter:()=>({}),useFocusEffect:focus},
  'react-native':{Platform:{OS:'android'},Keyboard:{dismiss(){}}},
  'react-native-safe-area-context':{SafeAreaView:'SafeAreaView',useSafeAreaInsets:()=>({top:30,bottom:20})},
  '@/components/floating-navigation':{FloatingNavigation:'Navigation'},'@/components/discovery/globe/discovery-globe':{DiscoveryGlobe:'Globe'},'@/components/discovery/discovery-panel':{DiscoveryPanel:'Panel'},
  '@/hooks/use-load':{useLoad:()=>({refresh(){},...collection})},'@/lib/discovery/map':{worldCamera:{centerCoordinate:[35,18]},discoveryPoints:()=>({features:[]})},'@/lib/discovery/travel':{discoveryRoute:()=>null},'@/lib/discovery/presentation':{spaceColor:'#080F1E'},'@/lib/discovery/queries':{loadDiscoveryEntries(){},loadPublicJourney(){}},
 },null,hooks).default;
 const render=()=>{cursor=0;return Home();};
 let tree=render();assert.ok(nodes(tree).some(n=>n.type==='BrandedLoading'));assert.equal(nodes(tree).find(n=>n.type==='StackScreen').props.options.statusBarStyle,'dark');
 collection={data:[],loading:false};tree=render();assert.ok(!nodes(tree).some(n=>n.type==='BrandedLoading'));assert.equal(nodes(tree).find(n=>n.type==='StackScreen').props.options.statusBarStyle,'light');
 tree=render();assert.equal(nodes(tree).filter(n=>n.type==='StackScreen').length,1);
 assert.equal(nodes(tree).filter(n=>n.type==='StatusBar').length,0,'Native route owns transition style without a competing Expo status component');slots.forEach(s=>s?.cleanup?.());

});
test('Home image lists expose data only in active layout and More keeps every journey reachable',()=>{
 let expanded=false,cursor=0;const slots=[];const rows=Array.from({length:61},(_,i)=>({...journey,id:String(i)}));
 const component=load('src/components/discovery/discovery-panel.tsx',{
  'react-native':{Animated:{View:'AnimatedView',add:(a,b)=>a+b},FlatList:'FlatList'},
  '@/lib/discovery/presentation':{discoveryCardWidth:()=>300},'@/hooks/use-discovery-sheet':{useDiscoverySheet:()=>({height:200,expanded,offset:{current:0},responders:{handle:{},content:{}}})},'./home-journey-card':{HomeJourneyCard:'Card'},'./ui':{colors},
 },initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];});
 const render=()=>{cursor=0;return nodes(component.DiscoveryPanel({journeys:rows,availableHeight:720,availableWidth:360,onHeight(){}})).filter(n=>n.type==='FlatList');};
 for(const size of [24,48,61]) {
  const lists=render(),active=lists.find(n=>n.props.horizontal===!expanded),hidden=lists.find(n=>n!==active);assert.equal(active.props.data.length,size);assert.equal(hidden.props.data.length,0);assert.equal(hidden.props.ListFooterComponent,null);assert.equal(hidden.props.ListEmptyComponent,null);
  if(size<61){active.props.ListFooterComponent.props.onPress();expanded=!expanded;}
 }
});
