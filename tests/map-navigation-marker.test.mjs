import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// Executes the native component with inert native adapters; no device rendering is claimed.
function fixture() {
  const jsx = (type, props) => ({ type, props });
  const react = { memo: fn => fn, useCallback: fn => fn, useEffect() {}, useMemo: fn => fn(), useRef: () => ({ current: null }), useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] };
  const mapbox = Object.fromEntries(['MapView', 'Atmosphere', 'Camera', 'ShapeSource', 'LineLayer', 'CircleLayer', 'SymbolLayer', 'Images'].map(name => [name, name]));
  mapbox.StyleURL = {};
  const frame = { camera: {}, projection: 'mercator', route: { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: [[[0, 0], [0.01, 0]]] } }, fitsViewport: true };
  const mocks = {
    '@/components/journey/journey-action-icon': { JourneyActionIcon: 'JourneyActionIcon' },
    '@/lib/journey/nearby': { nearbyFocus: () => null }, '../nearby-locations': { NearbyLocations: 'NearbyLocations' },
    'expo-router': { useFocusEffect() {} }, '@/components/discovery/globe/journey-overlays': { JourneyOverlays: 'JourneyOverlays' },
    'react/jsx-runtime': { jsx, jsxs: jsx }, react, '@rnmapbox/maps': { __esModule: true, default: mapbox, ...mapbox },
    'react-native': { AppState: { currentState: 'active' }, StyleSheet: { create: x => x }, View: 'View', Text: 'Text', Pressable: 'Pressable' },
    '@/components/discovery/ui': { colors: {} }, '@/lib/discovery/presentation': {}, '@/lib/discovery/globe-style': {},
    '@/lib/journey/map-camera': { frameJourneyMap: () => frame }, './map-frame': {},
    '@/hooks/use-travel-camera': { useTravelCamera: () => ({ explore() {}, canMove: () => true }) },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(readFileSync('src/components/journey/map/native-map.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(name => { assert.ok(name in mocks, name); return mocks[name]; }, module, module.exports);
  const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  return position => nodes(module.exports.NativeJourneyMap({ data: { markers: [] }, stops: [], presentation: 'expanded', navigationMode: true,
    currentPosition: position, navigationRoute: { type: 'LineString', coordinates: [[0, 0], [0.01, 0]] } }));
}

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
