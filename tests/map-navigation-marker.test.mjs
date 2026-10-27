import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { buddyGeometryStub, buddyMapPinsStub } from './helpers/buddy-geometry-stub.mjs';

// Executes the native component with inert native adapters; no device rendering is claimed.
function fixture(image = { ready: false, failed: false, version: 0 }) {
  const jsx = (type, props) => ({ type, props });
  const react = { memo: fn => fn, useCallback: fn => fn, useEffect() {}, useMemo: fn => fn(), useRef: () => ({ current: null }), useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] };
  const mapbox = Object.fromEntries(['MapView', 'Atmosphere', 'Camera', 'ShapeSource', 'LineLayer', 'CircleLayer', 'SymbolLayer', 'Images'].map(name => [name, name]));
  mapbox.StyleURL = {};
  const frame = { camera: {}, projection: 'mercator', route: { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: [[[0, 0], [0.01, 0]]] } }, fitsViewport: true };
  const mocks = {
    '@/hooks/use-map-buddy': { useMapBuddy: () => ({ enabled: false, visible: false, openHelp() {} }) },
    '@/hooks/use-buddy-map-image': { useBuddyMapImage: () => image },
    '@/hooks/use-live-buddy-safety': { useLiveBuddySafety: () => ({ mapRef() {}, moving() {}, idle() {}, clear: false }) },
    '@/lib/buddy/map-image': { buddyMapImageSource: { uri: 'data:image/png;base64,buddy' } }, '@/lib/buddy/map-presentation': { LIVE_BUDDY_OFFSET: [32, -12] },
    './story-walking-buddy': { StoryWalkingBuddy: 'StoryWalkingBuddy' },
    '@/hooks/use-buddy-geometry': buddyGeometryStub,
    '@/hooks/use-buddy-map-pins': buddyMapPinsStub,
    '@/lib/buddy/map-controls': { journeyBuddyControls: () => [] },
    '@/components/journey/journey-action-icon': { JourneyActionIcon: 'JourneyActionIcon' },
    '@/lib/journey/nearby': { nearbyFocus: () => null }, '../nearby-locations': { NearbyLocations: 'NearbyLocations' },
    'expo-router': { useFocusEffect() {} }, '@/components/discovery/globe/journey-overlays': { JourneyOverlays: 'JourneyOverlays' },
    'react/jsx-runtime': { jsx, jsxs: jsx }, react, '@rnmapbox/maps': { __esModule: true, default: mapbox, ...mapbox },
    'react-native': { AppState: { currentState: 'active' }, StyleSheet: { create: x => x }, View: 'View', Text: 'Text', Image: 'Image', Pressable: 'Pressable' },
    '@/components/discovery/ui': { colors: {} }, '@/lib/discovery/presentation': {}, '@/lib/discovery/globe-style': {},
    '@/lib/journey/map-camera': { frameJourneyMap: () => frame }, './map-frame': {},
    '@/hooks/use-travel-camera': { useTravelCamera: () => ({ explore() {}, canMove: () => true }) },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(readFileSync('src/components/journey/map/native-map.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(name => { assert.ok(name in mocks, name); return mocks[name]; }, module, module.exports);
  const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  return (position, extra = {}) => nodes(module.exports.NativeJourneyMap({ data: { markers: [] }, stops: [], presentation: 'expanded', navigationMode: true,
    currentPosition: position, navigationRoute: { type: 'LineString', coordinates: [[0, 0], [0.01, 0]] }, ...extra }));
}

test('native map probes decode outside Mapbox and registers unchanged source only after readiness', () => {
  const state = { ready: false, failed: false, version: 1, onLoad() {}, onError() {}, onLayout() {} };
  const render = fixture(state);
  let tree = render(null, { liveBuddy: true });
  const probe = tree.find(node => node.type === 'Image');
  assert.ok(probe); assert.equal(probe.props.style.width, 128); assert.equal(probe.props.style.height, 128);
  const wrapper = tree.find(node => node.type === 'View' && node.props.children === probe);
  assert.ok(wrapper); assert.equal(wrapper.props.style.opacity, 0); assert.equal(wrapper.props.pointerEvents, 'none');
  assert.equal(probe.props.accessible, false); assert.equal(wrapper.props.importantForAccessibility, 'no-hide-descendants');
  assert.equal(probe.props.onLoad, state.onLoad); assert.equal(probe.props.onLayout, state.onLayout); assert.equal(probe.props.onError, state.onError);
  const children = [tree.find(node => node.type === 'MapView').props.children].flat(Infinity);
  assert.equal(children.includes(probe), false, 'Probe must not be a Mapbox child');
  assert.equal(children.includes(wrapper), false, 'Probe wrapper must not be a Mapbox child');
  assert.equal(tree.some(node => node.type === 'Images' && node.props.images?.['journey-map-buddy']), false);
  state.ready = true; tree = render(null, { liveBuddy: true });
  const registry = tree.find(node => node.type === 'Images' && node.props.images?.['journey-map-buddy']);
  assert.ok(registry); assert.deepEqual(registry.props.images['journey-map-buddy'], probe.props.source);
  assert.equal(registry.props.children, undefined, 'No fragile Mapbox.Image snapshot children');
  assert.equal(tree.find(node => node.type === 'Image').props.source, registry.props.images['journey-map-buddy']);
  assert.equal(fixture()(null).some(node => node.type === 'Image'), false, 'Home/editor defaults do not mount a probe');
});

test('native marker preserves an off-route GPS coordinate independently of the blue route', () => {
  const tree = fixture()({ latitude: 0.002, longitude: 0.004, direction: 90 });
  const marker = tree.find(n => n.props?.id === 'travel-current-position');
  assert.deepEqual(marker.props.shape.geometry.coordinates, [0.004, 0.002]);
  assert.deepEqual(tree.find(n => n.props?.id === 'travel-road-route').props.shape.geometry.coordinates, [[0, 0], [0.01, 0]]);
  assert.ok(tree.indexOf(marker) > tree.findIndex(n => n.props?.id === 'travel-road-line'));
});

test('native course uses map-relative rotation and missing course has a compact honest fallback', () => {
  const render = fixture();
  for (const direction of [0, 90, 359]) {
    const tree = render({ latitude: 0, longitude: 0, direction });
    const arrow = tree.find(n => n.props?.id === 'travel-position-arrow');
    assert.ok(arrow);
    assert.equal(arrow.props.style.iconImage, 'travel-direction-arrow');
    assert.equal(arrow.props.style.iconRotate, direction);
    assert.equal(arrow.props.style.iconRotationAlignment, 'map');
    const uri = tree.find(n => n.type === 'Images').props.images['travel-direction-arrow'].uri;
    assert.ok(uri.startsWith('data:image/png;base64,'));
    const png = Buffer.from(uri.split(',')[1], 'base64');
    assert.equal(png.readUInt32BE(16), 28); assert.equal(png.readUInt32BE(20), 28);
    assert.equal(arrow.props.style.iconSize, 1);
    assert.equal(tree.some(n => n.props?.id === 'travel-position-dot'), false);
  }
  const tree = render({ latitude: 0, longitude: 0, direction: null });
  assert.equal(tree.some(n => n.props?.id === 'travel-position-arrow'), false);
  assert.ok(tree.find(n => n.props?.id === 'travel-position-dot').props.style.circleRadius <= 6);
  assert.equal(render(null).some(n => n.props?.id === 'travel-current-position'), false);
});
