import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// Transpile real sources with explicit module stubs (synthetic tokens only).
function load(path, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', code)(name => { assert.ok(name in modules, 'Unexpected dependency: ' + name); return modules[name]; }, exports);
  return exports;
}
const map = load('src/lib/media/static-map.ts');
const token = 'pk.synthetic-test+token/=';
const kochi = { latitude: 9.9312, longitude: 76.2673 };
const fort = { latitude: 9.9658, longitude: 76.2421 };

test('single point builds an Outdoors pin with a fixed ~13 zoom and @2x', () => {
  const url = map.staticMapUrl({ points: [kochi], width: 320, height: 180, token });
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://api.mapbox.com');
  assert.equal(parsed.pathname, '/styles/v1/mapbox/outdoors-v12/static/pin-s+6555cf(76.2673,9.9312)/76.2673,9.9312,13,0/320x180@2x');
  assert.equal(parsed.searchParams.get('padding'), null, 'A fixed camera takes no padding');
  assert.equal(map.staticMapSingleZoom, 13);
});

test('slots from 160 px request the Mapbox logo without in-image text; smaller thumbnails are unbranded', () => {
  const params = width => new URL(map.staticMapUrl({ points: [kochi], width, height: 100, token })).searchParams;
  for (const width of [160, 320, 1280]) { assert.equal(params(width).get('logo'), 'true', String(width)); assert.equal(params(width).get('attribution'), 'false', String(width)); }
  for (const width of [54, 120, 159]) { assert.equal(params(width).get('logo'), 'false', String(width)); assert.equal(params(width).get('attribution'), 'false', String(width)); }
  assert.equal(map.staticMapHasInlineCredit(160), true); assert.equal(map.staticMapHasInlineCredit(159), false); assert.equal(map.staticMapHasInlineCredit(NaN), false);
  assert.equal(map.staticMapInlineCreditText, '© Mapbox © OpenStreetMap');
  assert.equal(map.staticMapCreditText, 'Maps © Mapbox © OpenStreetMap');
});

test('only public pk. tokens are used; the token is URL-encoded and decodes back exactly', () => {
  const url = map.staticMapUrl({ points: [kochi], width: 100, height: 100, token: '  ' + token + '  ' });
  assert.ok(url.includes('access_token=' + encodeURIComponent(token)));
  assert.ok(!url.includes(token), 'Reserved characters never appear raw');
  assert.equal(new URL(url).searchParams.get('access_token'), token);
  for (const rejected of ['sk.secret-synthetic', 'tk.temporary-synthetic', 'pk', 'PK.upper', 'xpk.synthetic', 'synthetic'])
    assert.equal(map.staticMapUrl({ points: [kochi], width: 100, height: 100, token: rejected }), null, rejected);
});

test('several points use numbered pins, auto camera and padding below half the smaller side', () => {
  const url = map.staticMapUrl({ points: [kochi, fort], width: 400, height: 120, token });
  const parsed = new URL(url);
  assert.equal(parsed.pathname, '/styles/v1/mapbox/outdoors-v12/static/pin-s-1+6555cf(76.2673,9.9312),pin-s-2+6555cf(76.2421,9.9658)/auto/400x120@2x');
  const padding = Number(parsed.searchParams.get('padding'));
  assert.ok(padding > 0 && padding < 60, 'padding ' + padding);
  assert.equal(new URL(map.staticMapUrl({ points: [kochi, fort], width: 2, height: 2, token })).searchParams.get('padding'), '0');
});

test('pins are capped, rounded and de-duplicated so the URL stays short', () => {
  const many = Array.from({ length: 80 }, (_, index) => ({ latitude: 10 + index * 0.0123456789, longitude: 76 + index * 0.0123456789 }));
  const url = map.staticMapUrl({ points: many, width: 1280, height: 1280, token });
  assert.equal((url.match(/pin-s-/g) || []).length, map.staticMapMaxPins);
  assert.ok(url.length < 8192, 'length ' + url.length);
  assert.ok(url.includes('(76.01235,10.01235)'), 'Coordinates round to five decimals');
  const same = map.staticMapUrl({ points: [kochi, { ...kochi }, { latitude: 9.931200001, longitude: 76.267300001 }], width: 100, height: 100, token });
  assert.ok(same.includes('/76.2673,9.9312,13,0/'), 'Duplicates collapse to the single-point camera');
});

test('invalid coordinates are skipped; with none left there is no URL', () => {
  const invalid = [null, {}, { latitude: null, longitude: null }, { latitude: NaN, longitude: 1 }, { latitude: 1, longitude: Infinity },
    { latitude: 91, longitude: 0 }, { latitude: 86, longitude: 0 }, { latitude: 0, longitude: 181 }, { latitude: '9', longitude: '76' }];
  assert.equal(map.staticMapUrl({ points: invalid, width: 100, height: 100, token }), null);
  const mixed = map.staticMapUrl({ points: [...invalid, kochi], width: 100, height: 100, token });
  assert.ok(mixed.includes('/76.2673,9.9312,13,0/'));
  assert.equal(map.validMapPoint({ latitude: 0, longitude: -180 }), true);
});

test('null cases: no token, blank token, no points, missing points and unusable sizes', () => {
  for (const missing of [null, '', '   ']) assert.equal(map.staticMapUrl({ points: [kochi], width: 100, height: 100, token: missing }), null);
  assert.equal(map.staticMapUrl({ points: [], width: 100, height: 100, token }), null);
  assert.equal(map.staticMapUrl({ points: undefined, width: 100, height: 100, token }), null);
  for (const size of [NaN, Infinity, -Infinity]) assert.equal(map.staticMapUrl({ points: [kochi], width: size, height: 100, token }), null);
  assert.equal(map.canDrawStaticMap([kochi], token), true);
  assert.equal(map.canDrawStaticMap([kochi], null), false);
  assert.equal(map.canDrawStaticMap([kochi], 'sk.secret-synthetic'), false);
  assert.equal(map.canDrawStaticMap([{ latitude: null, longitude: null }], token), false);
});

test('sizes keep the slot aspect ratio when scaled into the 1..1280 API range', () => {
  const size = (width, height) => /\/(\d+)x(\d+)@2x\?/.exec(map.staticMapUrl({ points: [kochi], width, height, token })).slice(1).map(Number);
  assert.deepEqual(size(5000, 2000), [1280, 512]);
  assert.deepEqual(size(2560, 1280), [1280, 640]);
  assert.deepEqual(size(900, 3000), [384, 1280]);
  assert.deepEqual(size(100000, 10), [1280, 1], 'The short side never drops below 1');
  assert.deepEqual(map.staticMapSize(1280, 720), [1280, 720]);
  assert.deepEqual(map.staticMapSize(NaN, 10), [0, 0]);
  assert.deepEqual(size(0, -4), [1, 1]);
  assert.deepEqual(size(320.6, 179.4), [321, 179]);
});

test('the token defaults to the trimmed public environment value and is injectable', () => {
  const previous = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  try {
    delete process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
    assert.equal(map.staticMapUrl({ points: [kochi], width: 10, height: 10 }), null);
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = '  pk.env-synthetic  ';
    assert.equal(new URL(map.staticMapUrl({ points: [kochi], width: 10, height: 10 })).searchParams.get('access_token'), 'pk.env-synthetic');
    assert.equal(map.staticMapUrl({ points: [kochi], width: 10, height: 10, token: null }), null, 'An explicit null disables the environment token');
    assert.equal(map.canDrawStaticMap([kochi]), true);
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = 'sk.env-secret-synthetic';
    assert.equal(map.canDrawStaticMap([kochi]), false, 'A secret token in the environment is never used');
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_MAPBOX_TOKEN; else process.env.EXPO_PUBLIC_MAPBOX_TOKEN = previous;
  }
});

// Records the Journey Buddy projection each map layer registers (latest wins).
const buddyProjections = [];
const buddyGeometry = { useBuddyProtectedBounds: project => { buddyProjections.push(project); return { ref() {}, collapsable: false, onLayout() {} }; } };
// Component harness: minimal hooks, JSX as plain objects; hook-free function
// components (StaticMapLayer/StaticMapCredit) are expanded in place.
const jsx = (type, props) => ({ type, props });
const nodes = tree => !tree || typeof tree !== 'object' ? [] : typeof tree.type === 'function' ? nodes(tree.type(tree.props)) : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const native = { StyleSheet: { create: value => value }, View: 'View', Text: 'Text', Image: 'Image', ActivityIndicator: 'ActivityIndicator' };
function hooks() {
  const slots = []; let cursor = 0, computations = 0;
  const react = {
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useCallback: fn => fn,
    useMemo: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((value, j) => value !== slots[i].deps[j])) { computations++; slots[i] = { value: fn(), deps }; } return slots[i].value; },
  };
  return { react, render: fn => { cursor = 0; return fn(); }, computations: () => computations };
}
function components(h) {
  const base = { react: h.react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'react-native': native, '@/lib/media/static-map': map, '@/hooks/use-buddy-geometry': buddyGeometry, '@/lib/buddy/model': {} };
  const staticMapPhoto = load('src/components/discovery/static-map-photo.tsx', base);
  const placeholder = load('src/components/discovery/travel-photo-placeholder.tsx', { ...base, './static-map-photo': staticMapPhoto, '../../../assets/images/journey-photo-fallback.png': 17 });
  const photo = load('src/components/discovery/journey-photo.tsx', { ...base, './static-map-photo': staticMapPhoto, './ui': { colors: {} } });
  return { ...staticMapPhoto, ...placeholder, ...photo };
}
const layout = (width, height) => ({ nativeEvent: { layout: { width, height } } });
function withToken(fn) {
  const previous = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN = 'pk.component-synthetic';
  try { fn(); } finally { if (previous === undefined) delete process.env.EXPO_PUBLIC_MAPBOX_TOKEN; else process.env.EXPO_PUBLIC_MAPBOX_TOKEN = previous; }
}

test('stop-deck placeholder: wide map ends above the caption bar so the logo shows, keeps a top-left credit, then falls back on failure', () => withToken(() => {
  const h = hooks(), { TravelPhotoPlaceholder } = components(h);
  const render = () => h.render(() => TravelPhotoPlaceholder({ variant: 'stop', label: 'Default travel photo. Stop', map: { points: [kochi] }, mapLabel: 'Map of Kochi. No photo yet.' }));
  let tree = render();
  assert.equal(tree.props.accessibilityLabel, 'Map of Kochi. No photo yet.');
  let layer = nodes(tree).find(n => n.props?.testID === 'static-map-photo');
  assert.equal(nodes(layer).filter(n => n.type === 'Image').length, 0, 'Nothing is requested before the slot is measured');
  assert.equal(Object.assign({}, ...[layer.props.style].flat()).bottom, 35, 'Estimated caption height before measurement');
  nodes(tree).find(n => n.props?.testID === 'travel-photo-caption').props.onLayout(layout(300, 41.2));
  tree = render(); layer = nodes(tree).find(n => n.props?.testID === 'static-map-photo');
  assert.equal(Object.assign({}, ...[layer.props.style].flat()).bottom, 41, 'The map ends exactly above the measured caption bar');
  layer.props.onLayout(layout(300.4, 128.6));
  tree = render(); layer = nodes(tree).find(n => n.props?.testID === 'static-map-photo');
  const image = nodes(layer).find(n => n.type === 'Image');
  const url = new URL(image.props.source.uri);
  assert.ok(url.pathname.endsWith('/300x129@2x'), 'Image covers only the visible map area, so its bottom-left logo is not covered or cropped');
  assert.equal(url.searchParams.get('access_token'), 'pk.component-synthetic');
  assert.equal(url.searchParams.get('logo'), 'true'); assert.equal(url.searchParams.get('attribution'), 'false');
  const credit = nodes(layer).find(n => n.props?.testID === 'static-map-inline-credit');
  assert.equal(credit.props.children, '© Mapbox © OpenStreetMap');
  const style = Object.assign({}, ...[credit.props.style].flat());
  assert.equal(style.top, 4); assert.equal(style.left, 4); assert.equal(style.bottom, undefined, 'Credit sits in the top corner, never under the caption bar');
  assert.ok(nodes(tree).some(n => n.type === 'Text' && n.props.children === 'See this stop'), 'Caption is kept');
  assert.equal(nodes(layer).some(n => n.props?.children === 'See this stop'), false, 'Caption bar stays outside the map layer');
  image.props.onError();
  tree = render();
  assert.equal(tree.props.accessibilityLabel, 'Default travel photo. Stop');
  assert.equal(nodes(tree).find(n => n.type === 'Image').props.source, 17);
}));

test('map points and URL are memoized across renders with fresh but equal arrays', () => withToken(() => {
  const h = hooks(), { TravelPhotoPlaceholder } = components(h);
  const render = point => h.render(() => TravelPhotoPlaceholder({ map: { points: [{ ...point }] } }));
  nodes(render(kochi)).find(n => n.props?.testID === 'static-map-photo').props.onLayout(layout(120, 80));
  const before = h.computations();
  const first = nodes(render(kochi)).find(n => n.type === 'Image').props.source.uri;
  const second = nodes(render(kochi)).find(n => n.type === 'Image').props.source.uri;
  assert.equal(first, second); assert.equal(h.computations(), before + 1, 'Only the first render after layout builds the URL');
  assert.equal(nodes(render(kochi)).some(n => n.props?.testID === 'static-map-inline-credit'), false, 'Narrow thumbnails rely on the list credit');
  assert.notEqual(nodes(render(fort)).find(n => n.type === 'Image').props.source.uri, first, 'Changed coordinates rebuild the URL');
}));

test('placeholder without coordinates or without a usable token keeps the default photo unchanged', () => {
  const previous = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  try {
    for (const value of [undefined, 'sk.secret-synthetic']) {
      if (value === undefined) delete process.env.EXPO_PUBLIC_MAPBOX_TOKEN; else process.env.EXPO_PUBLIC_MAPBOX_TOKEN = value;
      const h = hooks(); const tree = h.render(() => components(h).TravelPhotoPlaceholder({ label: 'Default', map: { points: [kochi] } }));
      assert.equal(tree.props.accessibilityLabel, 'Default'); assert.equal(nodes(tree).find(n => n.type === 'Image').props.source, 17);
    }
    withToken(() => {
      for (const props of [{ label: 'Default', map: { points: [{ latitude: null, longitude: null }] } }, { label: 'Default' }]) {
        const h = hooks(); assert.equal(h.render(() => components(h).TravelPhotoPlaceholder(props)).props.accessibilityLabel, 'Default');
      }
    });
  } finally { if (previous === undefined) delete process.env.EXPO_PUBLIC_MAPBOX_TOKEN; else process.env.EXPO_PUBLIC_MAPBOX_TOKEN = previous; }
});

test('StaticMapCredit renders one line only when a small map can actually draw', () => {
  const h = hooks(), { StaticMapCredit } = components(h);
  const previous = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  try {
    delete process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
    assert.equal(StaticMapCredit({ points: [kochi] }), null);
    withToken(() => {
      const wrapper = StaticMapCredit({ points: [{ latitude: null, longitude: null }, kochi] });
      assert.equal(wrapper.props.collapsable, false, 'The credit line registers with Journey Buddy geometry');
      const credit = wrapper.props.children;
      assert.equal(credit.props.children, 'Maps © Mapbox © OpenStreetMap'); assert.equal(credit.props.testID, 'static-map-credit');
      assert.equal(StaticMapCredit({ points: [{ latitude: null, longitude: null }] }), null);
      assert.equal(StaticMapCredit({ points: [] }), null);
    });
  } finally { if (previous !== undefined) process.env.EXPO_PUBLIC_MAPBOX_TOKEN = previous; }
});

test('StaticMapCredit stays one capped line only when asked; existing uses are unchanged', () => withToken(() => {
  const { StaticMapCredit, staticMapCreditLineHeight } = components(hooks());
  assert.equal(staticMapCreditLineHeight, 14);
  const plain = StaticMapCredit({ points: [kochi] }).props.children;
  assert.equal(plain.props.numberOfLines, undefined); assert.equal(plain.props.maxFontSizeMultiplier, undefined);
  const single = StaticMapCredit({ points: [kochi], singleLine: { maxFontSizeMultiplier: 1.2 } }).props.children;
  assert.equal(single.props.numberOfLines, 1); assert.equal(single.props.maxFontSizeMultiplier, 1.2);
  assert.equal(single.props.children, 'Maps © Mapbox © OpenStreetMap');
  assert.equal(Object.assign({}, ...[single.props.style].flat()).lineHeight, 14, 'Height bounded by lineHeight x multiplier');
}));

test('branded maps keep Journey Buddy off the top-left credit and bottom-left Mapbox logo', () => withToken(() => {
  const rect = { x: 20, y: 300, width: 320, height: 180 };
  assert.deepEqual(map.staticMapBrandingRects(rect, 0), [{ x: 20, y: 300, width: 170, height: 22 }, { x: 20, y: 444, width: 100, height: 36 }]);
  assert.deepEqual(map.staticMapBrandingRects(rect, 50)[0], { x: 20, y: 350, width: 170, height: 22 }, 'Credit band follows creditTop');
  assert.deepEqual(map.staticMapBrandingRects({ x: 0, y: 0, width: 0, height: 10 }), []);
  const h = hooks(), { TravelPhotoPlaceholder } = components(h);
  const render = () => h.render(() => TravelPhotoPlaceholder({ variant: 'stop', map: { points: [kochi] } }));
  let layer = nodes(render()).find(n => n.props?.testID === 'static-map-photo');
  assert.equal(layer.props.collapsable, false, 'The map layer attaches to buddy geometry');
  assert.deepEqual(buddyProjections.at(-1)(rect), [], 'Nothing is protected before a map image shows');
  layer.props.onLayout(layout(320, 145));
  layer = nodes(render()).find(n => n.props?.testID === 'static-map-photo');
  assert.equal(buddyProjections.at(-1)(rect).length, 2, 'Credit and logo corners are protected while a wide map shows');
  layer.props.onLayout(layout(120, 80)); nodes(render());
  assert.deepEqual(buddyProjections.at(-1)(rect), [], 'Small unbranded thumbnails protect nothing');
}));

test('JourneyPhoto keeps photos first, then map, then its existing fallback', () => withToken(() => {
  const h = hooks(), { JourneyPhoto } = components(h);
  const uri = 'https://example.test/photo.jpg';
  const render = () => h.render(() => JourneyPhoto({ uri, label: 'Stop photo', map: { points: [kochi, fort] }, mapLabel: 'Map of Stop' }));
  let tree = render();
  const photo = nodes(tree).find(n => n.type === 'Image');
  assert.equal(photo.props.source.uri, uri);
  photo.props.onError();
  tree = render();
  const mapNode = nodes(tree).find(n => n.props?.accessibilityLabel === 'Map of Stop');
  assert.ok(mapNode, 'A failed photo shows the map');
  nodes(mapNode).find(n => n.props?.testID === 'static-map-photo').props.onLayout(layout(120, 120));
  tree = render();
  const mapImage = nodes(tree).find(n => n.type === 'Image');
  assert.match(mapImage.props.source.uri, /\/auto\/120x120@2x\?/);
  mapImage.props.onError();
  tree = render();
  assert.ok(nodes(tree).some(n => n.props?.accessibilityLabel === 'No journey photo available'));
  const plainHooks = hooks(); const plain = plainHooks.render(() => components(plainHooks).JourneyPhoto({ uri: null, label: 'Stop photo' }));
  assert.ok(nodes(plain).some(n => n.props?.accessibilityLabel === 'No journey photo available'), 'No map prop keeps the original fallback');
}));

test('static maps remain only in create/draft flows and the opened-stop circle; list and story surfaces use journey art', () => {
  const read = path => readFileSync(path, 'utf8');
  // Unchanged private create/draft flows keep their single-place or draft-cover maps.
  assert.match(read('src/components/create/memory-row.tsx'), /map=\{\{ points: \[stop\] \}\}/);
  assert.match(read('src/components/journey/customize-stops.tsx'), /JourneyPhoto uri=\{stop\.photo\}[^\n]*map=\{\{ points: \[stop\] \}\}/);
  assert.match(read('src/app/draft/[id].tsx'), /JourneyPhoto uri=\{state\.data\.cover\}[^\n]*map=\{\{ points: state\.data\.stops \}\}/);
  // List cards, story cover and opened stop surfaces never request slot-sized static maps.
  for (const file of ['src/components/discovery/home-journey-card.tsx', 'src/components/discovery/journey-card.tsx', 'src/components/discovery/explore-tile.tsx', 'src/components/profile/profile-ui.tsx',
    'src/components/journey/story-header.tsx', 'src/components/journey/stop-card-deck.tsx', 'src/components/journey/stop-timeline.tsx', 'src/components/journey/stop-story-viewer.tsx']) {
    const source = read(file);
    assert.doesNotMatch(source, /map=/, file + ' passes no map prop');
    assert.doesNotMatch(source, /useStaticMap|StaticMapLayer|staticMapUrl/, file + ' renders no slot-sized static map');
    assert.doesNotMatch(source, /static-map/, file + ' imports no static map module');
    assert.doesNotMatch(source, /journey-photo-fallback\.png/, file + ' no longer uses the stock photo');
  }
  for (const file of ['src/components/discovery/home-journey-card.tsx', 'src/components/discovery/journey-card.tsx', 'src/components/discovery/explore-tile.tsx', 'src/components/profile/profile-ui.tsx', 'src/components/journey/story-header.tsx'])
    assert.match(read(file), /<JourneyArt seed=\{artSeed\(journey\.id, journey\.stops\)\}/, file);
  for (const file of ['src/components/journey/stop-card-deck.tsx', 'src/components/journey/stop-timeline.tsx', 'src/components/journey/stop-story-viewer.tsx'])
    assert.match(read(file), /<StopArt /, file);
  // The only opened-surface map is the fixed-size circle, which carries its own credit line.
  assert.match(read('src/components/journey/stop-story-viewer.tsx'), /<CircleMap /);
  const circle = read('src/components/art/circle-map.tsx');
  assert.match(circle, /staticMapCircleUrl\(point\)/); assert.match(circle, /<StaticMapCredit points=\{\[point\]\} singleLine=\{\{ maxFontSizeMultiplier: circleCreditMaxFontScale \}\} \/>/);
});

test('the circle map uses one fixed size per place, so each stop has one cacheable URL', () => {
  const url = map.staticMapCircleUrl(kochi, token);
  assert.equal(map.staticMapCircleSize, 88);
  const parsed = new URL(url);
  assert.equal(parsed.pathname, '/styles/v1/mapbox/outdoors-v12/static/pin-s+6555cf(76.2673,9.9312)/76.2673,9.9312,13,0/88x88@2x');
  assert.equal(parsed.searchParams.get('logo'), 'false', 'Below the inline-credit width: the screen shows StaticMapCredit');
  assert.equal(map.staticMapCircleUrl({ ...kochi }, token), url, 'Stable for equal coordinates');
  for (const invalid of [null, undefined, { latitude: null, longitude: null }, { latitude: 91, longitude: 0 }]) assert.equal(map.staticMapCircleUrl(invalid, token), null);
  assert.equal(map.staticMapCircleUrl(kochi, null), null); assert.equal(map.staticMapCircleUrl(kochi, 'sk.secret-synthetic'), null);
});

test('CircleMap renders the fixed-size map with the credit line, and removes both on failure or without a token', () => withToken(() => {
  const h = hooks();
  const { CircleMap } = load('src/components/art/circle-map.tsx', { react: h.react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'react-native': native,
    '@/components/discovery/static-map-photo': { StaticMapCredit: 'StaticMapCredit', staticMapCreditLineHeight: components(hooks()).staticMapCreditLineHeight }, '@/lib/media/static-map': map });
  const render = point => h.render(() => CircleMap({ point }));
  let tree = render(kochi);
  const image = nodes(tree).find(n => n.type === 'Image');
  assert.match(image.props.source.uri, /\/88x88@2x\?/);
  const credit = nodes(tree).find(n => n.type === 'StaticMapCredit');
  assert.deepEqual(credit.props.points, [kochi], 'Credit shows whenever the circle shows');
  assert.deepEqual(credit.props.singleLine, { maxFontSizeMultiplier: 1.2 }, 'One line with a capped text scale at any font size');
  const box = nodes(tree).find(n => n.props?.children === credit);
  const boxStyle = Object.assign({}, ...[box.props.style].flat());
  assert.equal(boxStyle.maxHeight, Math.ceil(14 * 1.2)); assert.equal(boxStyle.overflow, 'hidden');
  assert.equal(tree.props.pointerEvents, 'none', 'Never blocks the story tap zones');
  image.props.onError();
  assert.equal(render(kochi), null, 'A failed map removes the circle and its credit');
  assert.equal(render({ latitude: null, longitude: null }), null);
  delete process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  assert.equal(render(fort), null, 'No token: no circle and no credit');
}));

test('JourneyPhoto order: photo, then a map where a flow still asks for one, then the caller art, then the generic fallback', () => withToken(() => {
  const h = hooks(), { JourneyPhoto } = components(h);
  const art = { type: 'StopArt', props: {} };
  let tree = h.render(() => JourneyPhoto({ uri: 'https://example.test/p.jpg', label: 'Stop photo', fallback: art }));
  const photo = nodes(tree).find(n => n.type === 'Image');
  assert.equal(photo.props.source.uri, 'https://example.test/p.jpg');
  assert.equal(nodes(tree).includes(art), false, 'Photos always win');
  photo.props.onError();
  tree = h.render(() => JourneyPhoto({ uri: 'https://example.test/p.jpg', label: 'Stop photo', fallback: art }));
  assert.ok(nodes(tree).includes(art), 'A failed photo shows the art');
  assert.equal(nodes(tree).some(n => n.props?.testID === 'static-map-photo'), false, 'No map is requested without a map prop');
  const plain = hooks();
  assert.ok(nodes(plain.render(() => components(plain).JourneyPhoto({ uri: null, label: 'x', fallback: art }))).includes(art));
}));
