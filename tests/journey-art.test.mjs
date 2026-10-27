import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// Transpile real sources with explicit module stubs (synthetic data only).
function load(path, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', code)(name => { assert.ok(name in modules, 'Unexpected dependency: ' + name); return modules[name]; }, exports);
  return exports;
}
const art = load('src/lib/art/journey-art.ts');
const uuid = i => '00000000-0000-4000-8000-' + String(i).padStart(12, '0');
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-6, (message || '') + ' ' + actual + ' != ' + expected);

test('palettes are deterministic per seed and vary across journeys', () => {
  assert.equal(art.hashString(''), 0x811c9dc5);
  assert.equal(art.hashString('journey'), art.hashString('journey'));
  const seed = art.artSeed(uuid(1));
  assert.equal(art.pickPalette(seed), art.pickPalette(art.artSeed(uuid(1))));
  const used = new Set(Array.from({ length: 60 }, (_, i) => art.pickPalette(art.artSeed(uuid(i))).name));
  assert.ok(used.size >= 4, 'Different journeys get different palettes: ' + [...used]);
  assert.ok(art.artPalettes.length >= 5 && art.artPalettes.length <= 8, 'A small curated set');
  for (const palette of art.artPalettes) {
    for (const color of [...palette.tints, ...palette.shapes, palette.route, palette.routeMuted, palette.dot, palette.highlight, palette.ring, palette.ink, palette.badge, palette.badgeText])
      assert.match(color, /^#[0-9A-F]{6}$/i, palette.name);
  }
});

test('the art seed matches between card and detail data and ignores stop order and case', () => {
  const stops = [{ id: 'B-2' }, { id: 'a-1' }, { id: 'c-3' }];
  assert.equal(art.artSeed('journey-x', stops), 'stop:a-1');
  assert.equal(art.artSeed(null, [...stops].reverse()), 'stop:a-1', 'Detail surfaces that only receive stops get the same seed');
  assert.equal(art.artSeed('Journey-X', []), 'journey:journey-x');
  assert.equal(art.artSeed('journey-x', [{ id: '' }, { id: null }, {}]), 'journey:journey-x');
  assert.equal(art.artSeed(undefined, undefined), 'journey:');
  assert.notEqual(art.artSeed('a', [{ id: 's1' }]), art.artSeed('a', [{ id: 's2' }]));
});

test('stop tints vary by index within the journey palette', () => {
  const palette = art.artPalettes[0];
  assert.deepEqual([0, 1, 2, 3].map(i => art.stopTint(palette, i)), [palette.tints[0], palette.tints[1], palette.tints[2], palette.tints[0]]);
  assert.equal(art.stopTint(palette, -1), palette.tints[0]); assert.equal(art.stopTint(palette, NaN), palette.tints[0]);
});

test('projection: equirectangular with cos(latitude), aspect preserved, padded and centred', () => {
  const box = { width: 200, height: 100 };
  // Equator: 1 degree of longitude equals 1 degree of latitude.
  const square = art.projectRoute([{ latitude: -0.5, longitude: 0 }, { latitude: 0.5, longitude: 1 }], box, 10);
  const [a, b] = square.points;
  close(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 'Aspect ratio is preserved');
  close(Math.abs(b.y - a.y), 80, 'Limited by the padded height');
  close((a.x + b.x) / 2, 100, 'Centred horizontally'); close((a.y + b.y) / 2, 50);
  assert.ok(b.y < a.y, 'North is up');
  // At 60 degrees, one degree of longitude is half as wide as one of latitude.
  const north = art.projectRoute([{ latitude: 60, longitude: 0 }, { latitude: 60, longitude: 2 }, { latitude: 61, longitude: 0 }], { width: 1000, height: 1000 }, 0).points;
  close(Math.abs(north[1].x - north[0].x) / Math.abs(north[2].y - north[0].y), 2 * Math.cos(60.333333333 * Math.PI / 180), 'cos(mean latitude) correction');
  for (const point of art.projectRoute(Array.from({ length: 9 }, (_, i) => ({ latitude: 9 + Math.sin(i) / 10, longitude: 76 + i / 50 })), box, 12).points) {
    assert.ok(point.x >= 12 - 1e-9 && point.x <= 188 + 1e-9 && point.y >= 12 - 1e-9 && point.y <= 88 + 1e-9, 'Within padding');
  }
});

test('projection edge cases: one point, identical points, invalid points and the antimeridian', () => {
  const box = { width: 120, height: 80 };
  assert.deepEqual(art.projectRoute([{ latitude: 9.9, longitude: 76.2 }], box, 10), { points: [{ x: 60, y: 40 }], count: 1 });
  const same = art.projectRoute([{ latitude: 9.9, longitude: 76.2 }, { latitude: 9.9, longitude: 76.2 }], box, 10);
  assert.deepEqual(same.points, [{ x: 60, y: 40 }, { x: 60, y: 40 }]);
  const mixed = art.projectRoute([null, { latitude: null, longitude: 1 }, { latitude: 10, longitude: 76 }, { latitude: NaN, longitude: 1 }, { latitude: 95, longitude: 0 }, { latitude: 0, longitude: 190 }, { latitude: 11, longitude: 76 }], box, 10);
  assert.equal(mixed.count, 2);
  assert.deepEqual(mixed.points.map(point => point !== null), [false, false, true, false, false, false, true], 'Indices are kept so a stop can still be highlighted');
  assert.deepEqual(art.projectRoute([{ latitude: null, longitude: null }], box, 10), { points: [null], count: 0 });
  assert.deepEqual(art.projectRoute(null, box), { points: [], count: 0 });
  assert.equal(art.projectRoute([{ latitude: 1, longitude: 1 }], { width: 0, height: 10 }).count, 0, 'Unmeasured boxes draw nothing');
  const wrap = art.projectRoute([{ latitude: -0.5, longitude: 179.5 }, { latitude: 0.5, longitude: -179.5 }], { width: 100, height: 100 }, 0).points;
  close(Math.abs(wrap[1].x - wrap[0].x), 100, 'One degree apart across the antimeridian, not 359');
  // Huge padding is clamped to keep a drawable centre.
  assert.deepEqual(art.projectRoute([{ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }], { width: 40, height: 40 }, 500).points, [{ x: 20, y: 20 }, { x: 20, y: 20 }]);
});

test('segment geometry: midpoint, length and angle for a View rotated about its centre', () => {
  const s = art.segmentGeometry({ x: 0, y: 0 }, { x: 30, y: 40 }, 4);
  assert.equal(s.length, 50); assert.equal(s.width, 50); assert.equal(s.height, 4);
  assert.equal(s.midX, 15); assert.equal(s.midY, 20); assert.equal(s.left, -10); assert.equal(s.top, 18);
  close(s.angle, Math.atan2(40, 30) * 180 / Math.PI);
  assert.equal(art.segmentGeometry({ x: 5, y: 5 }, { x: 5, y: 25 }).angle, 90);
  assert.equal(art.segmentGeometry({ x: 5, y: 5 }, { x: -5, y: 5 }).angle, 180);
  assert.equal(art.segmentGeometry({ x: 1, y: 1 }, { x: 1, y: 1 }).angle, 0);
  const segments = art.routeSegments([{ x: 0, y: 0 }, { x: 10, y: 0 }, null, { x: 20, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 0 }]);
  assert.deepEqual(segments.map(segment => [segment.from, segment.to]), [[0, 1], [3, 4]], 'A missing stop breaks the line; zero-length segments are dropped');
});

test('pseudo-route: deterministic decorative wave of at most eight dots inside the padding', () => {
  const box = { width: 300, height: 160 };
  const first = art.pseudoRoute('seed-a', 5, box, 20);
  assert.deepEqual(first, art.pseudoRoute('seed-a', 5, box, 20));
  assert.notDeepEqual(first, art.pseudoRoute('seed-b', 5, box, 20));
  assert.equal(first.length, 5);
  assert.equal(art.pseudoRoute('seed-a', 30, box, 20).length, art.pseudoRouteMaxDots);
  assert.equal(art.pseudoRouteMaxDots, 8);
  assert.deepEqual(art.pseudoRoute('seed-a', 0, box, 20), []);
  assert.deepEqual(art.pseudoRoute('seed-a', NaN, box, 20), []);
  assert.deepEqual(art.pseudoRoute('seed-a', 1, box, 20), [{ x: 150, y: 80 }]);
  assert.deepEqual(art.pseudoRoute('seed-a', 3, { width: 0, height: 0 }, 20), []);
  for (let i = 0; i < 40; i++) {
    const points = art.pseudoRoute('journey-' + i, 8, box, 20);
    points.forEach((point, j) => {
      assert.ok(point.x >= 20 && point.x <= 280 && point.y >= 20 && point.y <= 140, 'Inside padding');
      if (j) assert.ok(point.x > points[j - 1].x, 'Moves steadily across');
    });
  }
  const trail = art.dottedTrail([{ x: 0, y: 0 }, { x: 100, y: 0 }], 10);
  assert.equal(trail.length, 9); assert.ok(trail.every(point => point.y === 0 && point.x > 0 && point.x < 100));
  assert.equal(art.dottedTrail([{ x: 0, y: 0 }, { x: 10000, y: 0 }], 2, 50).length, 50, 'Bounded');
});

test('long routes are thinned but keep the ends, the highlighted stop and its neighbours', () => {
  const points = Array.from({ length: 100 }, (_, i) => ({ i }));
  const limited = art.limitRoute(points, 10, 57);
  for (const kept of [0, 99, 56, 57, 58]) assert.ok(limited.indices.includes(kept), 'keeps ' + kept);
  assert.ok(limited.points.length <= 13, 'Bounded: ' + limited.points.length);
  assert.deepEqual(limited.points.map(point => point.i), limited.indices);
  assert.deepEqual(art.limitRoute([1, 2, 3], 10).indices, [0, 1, 2]);
  assert.equal(art.artDestination('  Kochi '), 'Kochi');
  assert.equal(art.artDestination('Destination not specified'), null);
  assert.equal(art.artDestination(null), null);
});

test('thinning never bridges a missing stop and never drops a run of valid stops', () => {
  const p = i => ({ x: i * 10, y: 0, i });
  // runs: 0-14, gap 15-16, 17-17 (single), gap 18, 19-39
  const input = Array.from({ length: 40 }, (_, i) => i === 15 || i === 16 || i === 18 ? null : p(i));
  const limited = art.limitRoute(input, 8);
  for (const end of [0, 14, 17, 19, 39]) assert.ok(limited.indices.includes(end), 'run end ' + end + ' kept');
  assert.equal(limited.points.filter(point => point === null).length, 2, 'One break per gap, merged when consecutive');
  const segments = art.routeSegments(limited.points);
  for (const segment of segments) {
    const from = limited.indices[segment.from], to = limited.indices[segment.to];
    assert.ok(input.slice(from, to + 1).every(Boolean), 'Segment ' + from + '->' + to + ' spans only valid stops');
  }
  assert.ok(segments.some(segment => limited.indices[segment.from] === 0), 'The first run still draws');
  assert.ok(segments.some(segment => limited.indices[segment.to] === 39), 'The last run still draws');
  assert.equal(limited.points[0].i, 0); assert.notEqual(limited.points.at(-1), null, 'No trailing break');
  assert.deepEqual(art.limitRoute([null, p(1), null], 8).indices, [1], 'Leading and trailing gaps add no breaks');
});

test('near-zero spans draw small and centred instead of stretching across the box', () => {
  const box = { width: 200, height: 200 };
  // Two stops about one metre apart.
  const tiny = art.projectRoute([{ latitude: 9.93, longitude: 76.26 }, { latitude: 9.93001, longitude: 76.26001 }], box, 10).points;
  assert.ok(Math.hypot(tiny[1].x - tiny[0].x, tiny[1].y - tiny[0].y) < 1, 'Metres apart stay together');
  for (const point of tiny) assert.ok(Math.abs(point.x - 100) < 1 && Math.abs(point.y - 100) < 1, 'Centred');
  assert.equal(art.artMinSpanDegrees, 0.005);
  // A route larger than the minimum still fills the box.
  const big = art.projectRoute([{ latitude: 9.9, longitude: 76.2 }, { latitude: 10.0, longitude: 76.2 }], box, 10).points;
  close(Math.abs(big[1].y - big[0].y), 180, 'Real spans fill the padded box');
});

test('route scenes colour progress up to the highlighted stop and mute what comes after', () => {
  const points = [0, 1, 2, 3, 4].map(i => ({ x: i * 20, y: 10 }));
  const scene = art.routeScene(points, { max: 30, highlight: 2, thickness: 3 });
  assert.deepEqual(scene.segments.map(segment => [segment.from, segment.to, segment.traveled]), [[0, 1, true], [1, 2, true], [2, 3, false], [3, 4, false]]);
  assert.deepEqual(scene.dots.map(dot => [dot.index, dot.upcoming]), [[0, false], [1, false], [3, true], [4, true]]);
  assert.deepEqual(scene.highlight, points[2]);
  const plain = art.routeScene(points, { max: 30, thickness: 3 });
  assert.ok(plain.segments.every(segment => segment.traveled) && plain.dots.every(dot => !dot.upcoming) && plain.highlight === null, 'Journey art: all solid, no highlight');
  const mini = art.routeScene(Array.from({ length: 40 }, (_, i) => ({ x: i, y: i % 3 })), { max: 8, highlight: 23, thickness: 2 });
  assert.deepEqual(mini.highlight, { x: 23, y: 23 % 3 }, 'The mini cap keeps the highlighted stop');
  for (const neighbour of [22, 24]) assert.ok(mini.dots.some(dot => dot.index === neighbour), 'and its neighbours');
  assert.ok(mini.dots.length + 1 <= 11, 'Capped near 8: ' + (mini.dots.length + 1));
});

test('pseudo-route highlight maps stop indices proportionally so stops 9 and later still mark a dot', () => {
  assert.equal(art.pseudoRouteIndex(3, 5), 3);
  assert.equal(art.pseudoRouteIndex(0, 20), 0);
  assert.equal(art.pseudoRouteIndex(19, 20), 7, 'The last stop marks the last dot');
  assert.equal(art.pseudoRouteIndex(12, 20), Math.round(12 * 7 / 19));
  for (let i = 0; i < 30; i++) { const dot = art.pseudoRouteIndex(i, 30); assert.ok(dot >= 0 && dot <= 7); }
  assert.equal(art.pseudoRouteIndex(0, 1), 0);
  for (const [index, count] of [[-1, 5], [5, 5], [1.5, 5], [0, 0]]) assert.equal(art.pseudoRouteIndex(index, count), undefined);
});

// Component harness: JSX as plain objects, minimal hooks; hook-free inner components expand in place.
const jsx = (type, props) => ({ type, props });
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : typeof tree.type === 'function' ? nodes(tree.type(tree.props)) : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const native = { StyleSheet: { create: value => value, absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } }, View: 'View', Text: 'Text', Image: 'Image' };
function hooks() {
  const slots = []; let cursor = 0;
  const react = {
    memo: component => component,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useMemo: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((value, j) => value !== slots[i].deps[j])) slots[i] = { value: fn(), deps }; return slots[i].value; },
  };
  return { react, render: fn => { cursor = 0; return fn(); } };
}
const runtime = { jsx, jsxs: jsx, Fragment: 'Fragment' };
function components(h) { return load('src/components/art/journey-art.tsx', { react: h.react, 'react/jsx-runtime': runtime, 'react-native': native, '@/lib/art/journey-art': art }); }
const layout = (width, height) => ({ nativeEvent: { layout: { width, height } } });
const style = node => Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
const located = [{ id: 'a', latitude: 9.93, longitude: 76.26 }, { id: 'b', latitude: 9.96, longitude: 76.24 }, { id: 'c', latitude: 10.02, longitude: 76.3 }, { id: 'd', latitude: 10.1, longitude: 76.35 }];

test('JourneyArt draws the real route when coordinates exist, otherwise a decorative pseudo-route', () => {
  const h = hooks(), { JourneyArt } = components(h);
  const seed = art.artSeed('j', located);
  const render = props => h.render(() => JourneyArt({ seed, ...props }));
  let tree = render({ stops: located, accessibilityLabel: 'Journey art. No journey cover photo available. Trip' });
  assert.equal(tree.props.accessibilityLabel, 'Journey art. No journey cover photo available. Trip');
  assert.equal(tree.props.accessible, true);
  assert.equal(style(tree).backgroundColor, art.pickPalette(seed).tints[0]);
  assert.equal(nodes(tree).filter(n => n.props?.testID === 'journey-art-route').length, 0, 'Nothing is drawn before measurement');
  tree.props.onLayout(layout(320, 180));
  tree = render({ stops: located });
  const route = nodes(tree).find(n => n.props?.testID === 'journey-art-route');
  assert.ok(route, 'Real route');
  assert.equal(nodes(route).filter(n => n.props?.style?.[1]?.transform).length, 3, 'Three rotated segments for four stops');
  assert.equal(nodes(tree).some(n => n.type === 'Image'), false, 'No network image');
  assert.equal(tree.props.accessible, false, 'Decorative without a label');
  assert.equal(tree.props.importantForAccessibility, 'no-hide-descendants');
  const h2 = hooks(), card = components(h2).JourneyArt;
  const cardStops = located.map(stop => ({ id: stop.id, latitude: null, longitude: null }));
  let cardTree = h2.render(() => card({ seed, stops: cardStops, destination: 'Kochi', showDestination: true, compact: true }));
  cardTree.props.onLayout(layout(120, 120));
  cardTree = h2.render(() => card({ seed, stops: cardStops, destination: 'Kochi', showDestination: true, compact: true }));
  const pseudo = nodes(cardTree).find(n => n.props?.testID === 'journey-art-pseudo-route');
  assert.ok(pseudo, 'Card data has no coordinates: decorative pseudo-route');
  assert.equal(nodes(pseudo).filter(n => style(n).backgroundColor === 'transparent').length, 4, 'One hollow dot per stop');
  assert.ok(nodes(cardTree).some(n => n.type === 'Text' && n.props.children === 'Kochi'));
  assert.equal(nodes(cardTree).filter(n => n.type === 'Text').length, 1, 'No map-like labels: only the destination');
  const h3 = hooks(), hidden = components(h3).JourneyArt;
  assert.equal(nodes(h3.render(() => hidden({ seed, stops: [], destination: 'Destination not specified', showDestination: true }))).some(n => n.type === 'Text'), false);
});

test('StopArt highlights its own stop, so every stop looks different; mini thumbnails carry no text', () => {
  const seed = art.artSeed(null, located);
  const draw = (index, variant = 'full', stops = located) => {
    const h = hooks(), { StopArt } = components(h);
    const props = { seed, stops, index, name: 'Stop ' + index, variant, inset: { top: 10, right: 40 } };
    h.render(() => StopArt(props)).props.onLayout(layout(320, 180));
    return h.render(() => StopArt(props));
  };
  const highlight = tree => { const node = nodes(tree).find(n => n.props?.testID === 'journey-art-highlight'); return node && style(node); };
  const first = draw(0), third = draw(2);
  assert.notDeepEqual([highlight(first).left, highlight(first).top], [highlight(third).left, highlight(third).top], 'Highlighted position differs');
  assert.notEqual(style(first).backgroundColor, style(draw(1)).backgroundColor, 'Per-stop tint');
  assert.equal(highlight(first).backgroundColor, art.pickPalette(seed).highlight);
  const texts = nodes(third).filter(n => n.type === 'Text').map(n => n.props.children);
  assert.deepEqual(texts, [3, 'Stop 2'], 'Number badge and stop name');
  const header = nodes(third).find(n => n.props?.style?.[0]?.flexDirection === 'row');
  assert.equal(style(header).right, 52, 'Keeps clear of the right inset');
  assert.deepEqual(nodes(draw(1, 'mini')).filter(n => n.type === 'Text'), [], 'Mini: route only');
  const unlocated = [...located.slice(0, 2), { id: 'x', latitude: null, longitude: null }];
  assert.equal(highlight(draw(2, 'full', unlocated)), undefined, 'A stop without coordinates is not highlighted on the real route');
  const long = Array.from({ length: 40 }, (_, i) => ({ id: 'l' + i, latitude: 9 + i / 100, longitude: 76 + (i % 4) / 100 }));
  const mini = draw(30, 'mini', long);
  assert.ok(highlight(mini), 'Mini cap keeps the highlighted stop');
  assert.ok(nodes(mini).filter(n => style(n).width === style(n).height && style(n).width < 12).length <= 12, 'Mini draws only a few stops');
  assert.equal(nodes(mini).filter(n => style(n).opacity !== undefined).length, 0, 'Mini skips the decorative shapes');
  assert.ok(nodes(draw(30, 'full', long)).some(n => style(n).opacity !== undefined), 'Full art keeps them');
  const unlocatedMany = Array.from({ length: 20 }, (_, i) => ({ id: 'u' + i, latitude: null, longitude: null }));
  assert.ok(highlight(draw(15, 'full', unlocatedMany)), 'Stop 16 of 20 still marks a pseudo-route dot');
  const none = draw(1, 'full', located.map(stop => ({ id: stop.id, latitude: null, longitude: null })));
  assert.ok(nodes(none).some(n => n.props?.testID === 'journey-art-pseudo-route'), 'No geography: decorative fallback');
  assert.ok(highlight(none), 'The pseudo-route still marks this stop');
});

test('stop timeline uses stop art for photo-less stops in thumbnails, cards and the vertical list, without static maps', () => {
  const react = { useState: initial => [initial === 0 ? 320 : initial, () => {}], useRef: initial => ({ current: initial }), useEffect() {} };
  const { StopTimeline } = load('src/components/journey/stop-timeline.tsx', {
    'react/jsx-runtime': runtime, react, 'react-native': { ...native, AccessibilityInfo: {}, FlatList: 'FlatList', Pressable: 'Pressable' },
    './stop-card-deck': { StopCardDeck: 'StopCardDeck' }, '@/theme/mobile-theme': { theme: {} }, '@/components/discovery/journey-photo': { JourneyPhoto: 'JourneyPhoto' },
    '@/components/discovery/ui': { colors: {}, ui: {} }, '@/lib/journey/story-layout': { stopIndexAtOffset: () => 0 },
    '@/components/art/journey-art': { StopArt: 'StopArt' }, '@/lib/art/journey-art': art,
  });
  const stops = Array.from({ length: 9 }, (_, i) => ({ id: 's' + i, name: 'Stop ' + i, description: '', sequence: i + 1, dayNumber: null, photo: i === 1 ? 'https://example.test/p.jpg' : null, rating: null, latitude: 9 + i / 100, longitude: 76 }));
  stops.push({ ...stops[0], id: 'unlocated', name: 'Nowhere', latitude: null, longitude: null });
  const seed = art.artSeed(null, stops);
  const vertical = nodes(StopTimeline({ stops }));
  const slots = vertical.filter(n => n.props?.testID === 'vertical-stop-art');
  assert.equal(slots.length, 8, 'Every photo-less located stop gets art (no network, so no cap)');
  const arts = slots.map(slot => [slot.props.children].flat()[0]);
  assert.deepEqual(arts.map(n => n.props.index), [0, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(arts.every(n => n.type === 'StopArt' && n.props.seed === seed && n.props.stops === stops));
  const photo = vertical.find(n => n.type === 'JourneyPhoto');
  assert.equal(photo.props.uri, stops[1].photo); assert.equal(photo.props.fallback.props.index, 1, 'A failed photo falls back to art');
  assert.equal(vertical.some(n => n.props?.map), false);
  const element = StopTimeline({ stops, horizontal: true, selectedId: 's0', onSelect() {}, onDetails() {} });
  const tree = element.type(element.props);
  assert.equal(nodes(tree).some(n => n.type === 'StaticMapCredit'), false, 'No list credit needed: no small maps');
  const lists = nodes(tree).filter(n => n.type === 'FlatList');
  const thumb = nodes(lists.find(n => n.props.testID === 'journey-stop-thumbnails').props.renderItem({ item: stops[3], index: 3 })).find(n => n.type === 'JourneyPhoto');
  assert.equal(thumb.props.map, undefined); assert.equal(thumb.props.fallback.props.variant, 'mini'); assert.equal(thumb.props.fallback.props.index, 3);
  const card = nodes(lists.find(n => n.props.testID === 'journey-stop-carousel').props.renderItem({ item: stops[4], index: 4 })).find(n => n.type === 'JourneyPhoto');
  assert.equal(card.props.map, undefined); assert.equal(card.props.fallback.props.index, 4); assert.equal(card.props.fallback.props.inset.bottom, 72, 'Art content stays above the text panel');
});

test('carousel hint promises a photo only while a usable photo exists', () => {
  const slots = []; let cursor = 0;
  const react = { useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial === 0 ? 320 : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; }, useEffect() {} };
  const { StopTimeline } = load('src/components/journey/stop-timeline.tsx', {
    'react/jsx-runtime': runtime, react, 'react-native': { ...native, AccessibilityInfo: {}, FlatList: 'FlatList', Pressable: 'Pressable' },
    './stop-card-deck': { StopCardDeck: 'StopCardDeck' }, '@/theme/mobile-theme': { theme: {} }, '@/components/discovery/journey-photo': { JourneyPhoto: 'JourneyPhoto' },
    '@/components/discovery/ui': { colors: {}, ui: {} }, '@/lib/journey/story-layout': { stopIndexAtOffset: () => 0 },
    '@/components/art/journey-art': { StopArt: 'StopArt' }, '@/lib/art/journey-art': art,
  });
  const stops = [{ id: 'p', name: 'Photo', description: '', sequence: 1, dayNumber: null, photo: 'https://example.test/p.jpg', rating: null, latitude: 9, longitude: 76 },
    { id: 'n', name: 'None', description: '', sequence: 2, dayNumber: null, photo: null, rating: null, latitude: 9.1, longitude: 76 }];
  const render = () => { cursor = 0; const element = StopTimeline({ stops, horizontal: true, selectedId: 'p', onSelect() {}, onDetails() {} }); return element.type(element.props); };
  const card = (tree, i) => nodes(nodes(tree).find(n => n.type === 'FlatList' && n.props.testID === 'journey-stop-carousel').props.renderItem({ item: stops[i], index: i }));
  let tree = render();
  const hint = (tree, i) => card(tree, i).find(n => n.type === 'Pressable').props.accessibilityHint;
  assert.equal(hint(tree, 0), 'Opens the full stop story and photo');
  assert.equal(hint(tree, 1), 'Opens the full stop story');
  card(tree, 0).find(n => n.type === 'JourneyPhoto').props.onError();
  tree = render();
  assert.equal(hint(tree, 0), 'Opens the full stop story', 'A failed photo is no longer promised');
});
