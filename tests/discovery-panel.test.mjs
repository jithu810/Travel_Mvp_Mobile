import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const output = mkdtempSync(join(tmpdir(), 'discovery-panel-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/discovery/presentation.ts', 'src/lib/discovery/sheet.ts', 'src/lib/discovery/globe-style.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  types: ['node'], outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
assert.equal(ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics).length, 0);
const { discoveryPanelSize, discoveryCardWidth, globeAtmosphere, spaceColor } = createRequire(import.meta.url)(join(output, 'lib/discovery/presentation.js'));
test('sheet sizes fit the measured viewport and expanded state leaves an exposed map band', () => {
  // Home viewport excludes measured header, safe areas and navigation.
  for (const height of [436, 720]) {
    const collapsed = discoveryPanelSize(height, false), expanded = discoveryPanelSize(height, true);
    assert.equal(collapsed, 260);
    assert.ok(expanded > collapsed && expanded <= height - 96);
  }
  for (const height of [0, 80, 190]) {
    assert.ok(discoveryPanelSize(height, true) >= discoveryPanelSize(height, false));
    for (const expanded of [false, true]) {
      assert.ok(discoveryPanelSize(height, expanded) >= 0);
      assert.ok(discoveryPanelSize(height, expanded) <= height);
    }
  }
  assert.equal(discoveryPanelSize(NaN, true), 0);
});
test('compact and expanded journey widths fit small and large phone screens', () => {
  for (const width of [360, 412]) {
    assert.ok(discoveryCardWidth(width, false) <= width - 52);
    assert.ok(discoveryCardWidth(width, true) <= width - 32);
    assert.ok(discoveryCardWidth(width, false) <= 300);
  }
  assert.equal(discoveryCardWidth(-1, true), 0);
  assert.equal(discoveryCardWidth(Infinity, false), 0);
});
test('native space styling uses the supported atmosphere API with restrained stars', () => {
  assert.equal(spaceColor, '#080F1E');
  assert.equal(globeAtmosphere.spaceColor, spaceColor);
  assert.ok(globeAtmosphere.horizonBlend > 0 && globeAtmosphere.horizonBlend < 0.1);
  assert.ok(globeAtmosphere.starIntensity > 0.06 && globeAtmosphere.starIntensity <= 0.2);
  const native = readFileSync('src/components/discovery/globe/native-globe.tsx', 'utf8');
  assert.ok(native.includes('<Mapbox.Atmosphere style={globeAtmosphere} />'));
  assert.ok(native.includes('Mapbox.StyleURL.Outdoors'));
  assert.ok(native.includes('logoPosition={globeLogoPosition}'));
  assert.ok(native.includes('Mapbox.StyleURL.SatelliteStreet'));
  assert.ok(native.includes('onMapLoadingError={mapError}'));
});
test('panel has an explicit accessible toggle, vertical expanded scrolling, real photo and separate Locate action', () => {
  const panel = readFileSync('src/components/discovery/discovery-panel.tsx', 'utf8');
  assert.ok(panel.includes('accessibilityState={{ expanded }}'));
  assert.ok(panel.includes('horizontal={!listExpanded}'));
  assert.ok(panel.includes("display: expanded === listExpanded ? 'flex' : 'none'"));
  assert.ok(!panel.includes('scrollTo') && !panel.includes('key={expanded'));
  assert.ok(panel.includes('sheet.responders.handle') && panel.includes('sheet.responders.content'));
  assert.ok(!panel.includes('PanResponder'));
  const card = readFileSync('src/components/discovery/home-journey-card.tsx', 'utf8');
  assert.ok(card.includes('source={{ uri: journey.cover }}'));
  assert.ok(card.includes('onError='));
  assert.ok(card.includes('No journey cover photo available'));
  assert.ok(card.includes('onLocate(journey.id)'));
  assert.ok(card.includes('onOpen(journey.id)'));
  const home = readFileSync('src/app/discover.tsx', 'utf8');
  assert.ok(home.includes("if (Platform.OS === 'web') return;"));
  assert.ok(home.includes('StatusBar.popStackEntry(entry)'));
});

const require = createRequire(import.meta.url);
const { draggedSheetHeight, sheetHeight, sheetSnapMode, shouldDragSheet } = require(join(output, 'lib/discovery/sheet.js'));
const { nextGlobeStyle, globeLogoPosition, globeAttributionPosition, worldCountryLabels } = require(join(output, 'lib/discovery/globe-style.js'));
test('drag clamps from reachable handle-only peek to expanded within the measured safe viewport', () => {
  // Portrait/landscape areas after header/search/nav/safe-area layout subtraction.
  for (const available of [0, 30, 80, 190, 436, 720]) {
    const low = sheetHeight(available, 'peek'), high = sheetHeight(available, 'expanded');
    assert.equal(low, Math.min(44, discoveryPanelSize(available, false)));
    assert.ok(low >= 0 && high <= available);
    if (available >= 72) assert.equal(low, 44);
    assert.equal(draggedSheetHeight(low, -10000, available), high);
    assert.equal(draggedSheetHeight(high, 10000, available), low);
    assert.equal(draggedSheetHeight(low, -(high - low) / 2, available), (low + high) / 2);
    assert.equal(sheetSnapMode(low, 0, available), 'peek');
    assert.equal(sheetHeight(available, sheetSnapMode(high, 0, available)), high);
  }
  assert.equal(sheetHeight(NaN, 'peek'), 0);
  assert.equal(sheetHeight(Infinity, 'expanded'), 0);
  assert.equal(sheetSnapMode(260, 0, 484), 'collapsed');
  assert.equal(sheetSnapMode(340, -0.6, 484), 'expanded');
  assert.equal(sheetSnapMode(388, 0.6, 484), 'collapsed');
  assert.equal(sheetSnapMode(80, 0.6, 484), 'peek');
});
test('only vertical handle drags and appropriate content-edge gestures claim the sheet', () => {
  assert.equal(shouldDragSheet(0, -40, 1, false, 0, 0), true);
  assert.equal(shouldDragSheet(0, 40, 1, true, 0, 0), true);
  assert.equal(shouldDragSheet(0, 40, 1, false, 0, 0), true); // Collapsed can now drag down to peek.
  for (const args of [[40, 4, 1, false, 0, 0], [0, -40, 1, true, 0, 30],
    [0, 40, 1, true, 80, 0], [0, 40, 1, true, 0, 10], [0, 40, 2, true, 0, 0]])
    assert.equal(shouldDragSheet(...args), false);
  assert.equal(shouldDragSheet(0, -40, 1, true, 100, 100, true), true);
});
test('satellite failure falls back once to Outdoors, then graceful failure; branding stays exposed', () => {
  assert.equal(nextGlobeStyle('satellite'), 'outdoors');
  assert.equal(nextGlobeStyle('outdoors'), 'failed');
  assert.equal(nextGlobeStyle('failed'), 'failed');
  assert.ok(globeLogoPosition.top >= 0 && globeLogoPosition.top < 96);
  assert.ok(globeAttributionPosition.top >= 0 && globeAttributionPosition.top < 96);
  assert.ok(globeAttributionPosition.right > 12);
});

// Exercise the actual hook with deterministic RN animation/responder doubles.
// This verifies callback wiring and cleanup; it does not emulate Android touch dispatch.
function sheetHarness() {
  const effects = [], animations = [], heights = [], interactions = [];
  class Value {
    constructor(value) { this.value = value; this.listeners = new Map(); this.active = null; }
    addListener(callback) { const id = this.listeners.size + 1; this.listeners.set(id, callback); return id; }
    removeListener(id) { this.listeners.delete(id); }
    setValue(value) { this.value = value; this.listeners.forEach(callback => callback({ value })); }
    stopAnimation() { if (this.active) { const callback = this.active; this.active = null; callback({ finished: false }); } }
  }
  const react = {
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: current => ({ current }), useCallback: callback => callback, useMemo: factory => factory(),
    useEffect: effect => effects.push(effect),
  };
  const rn = { Animated: { Value, spring(value, config) { return { start(callback) {
    value.active = callback;
    animations.push({ config, callback, finish() { value.active = null; value.setValue(config.toValue); callback({ finished: true }); } });
  } }; } }, PanResponder: { create: callbacks => ({ panHandlers: callbacks }) } };
  const compiled = ts.transpileModule(readFileSync('src/hooks/use-discovery-sheet.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(name => {
    if (name === 'react') return react;
    if (name === 'react-native') return rn;
    if (name.endsWith('/presentation')) return { discoveryPanelSize };
    if (name.endsWith('/sheet')) return { draggedSheetHeight, sheetHeight, sheetSnapMode, shouldDragSheet };
    throw new Error(name);
  }, exports);
  const sheet = exports.useDiscoverySheet(484, height => heights.push(height), active => interactions.push(active));
  const cleanup = effects.map(effect => effect()).filter(Boolean);
  return { sheet, heights, interactions, animations, cleanup: () => cleanup.forEach(callback => callback()) };
}
test('actual sheet hook follows drag and publishes padding height only on settle; tap still toggles', () => {
  const h = sheetHarness(), handle = h.sheet.responders.handle;
  assert.deepEqual(h.heights, [260]);
  assert.equal(handle.onMoveShouldSetPanResponderCapture(null, { dx: 0, dy: -80, numberActiveTouches: 1 }), true);
  handle.onPanResponderGrant(); handle.onPanResponderMove(null, { dy: -80 });
  assert.equal(h.sheet.height.value, 340); assert.deepEqual(h.heights, [260]);
  handle.onPanResponderRelease(null, { vy: -0.6 });
  assert.deepEqual(h.heights, [260]); h.animations.at(-1).finish();
  assert.deepEqual(h.heights, [260, 388]);
  h.sheet.toggle(); h.animations.at(-1).finish(); assert.deepEqual(h.heights, [260, 388, 260]);
  assert.equal(h.interactions.at(-1), false); h.cleanup();
});
test('actual content responder leaves normal scrolling alone and claims a downward drag only at the top', () => {
  const h = sheetHarness(); h.sheet.toggle(); h.animations.at(-1).finish();
  const content = h.sheet.responders.content;
  h.sheet.offset.current = 80; content.onStartShouldSetPanResponderCapture(); h.sheet.offset.current = 0;
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, { dx: 0, dy: 40, numberActiveTouches: 1 }), false);
  content.onStartShouldSetPanResponderCapture();
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, { dx: 0, dy: -40, numberActiveTouches: 1 }), false);
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, { dx: 0, dy: 40, numberActiveTouches: 1 }), true);
  h.cleanup();
});
test('unmount invalidates a pending spring completion and removes the height listener', () => {
  const h = sheetHarness(); h.sheet.toggle(); const pending = h.animations.at(-1);
  h.cleanup(); pending.callback({ finished: true });
  assert.deepEqual(h.heights, [260]); assert.equal(h.sheet.height.listeners.size, 0);
});

test('peek settles without publishing drag frames and accessible toggle restores full collapsed content', () => {
  const h = sheetHarness(), handle = h.sheet.responders.handle;
  handle.onPanResponderGrant(); handle.onPanResponderMove(null, { dy: 400 });
  assert.equal(h.sheet.height.value, 44); assert.deepEqual(h.heights, [260]);
  handle.onPanResponderRelease(null, { vy: 0.6 }); h.animations.at(-1).finish();
  assert.deepEqual(h.heights, [260, 44]);
  h.sheet.toggle(); h.animations.at(-1).finish();
  assert.deepEqual(h.heights, [260, 44, 260]); h.cleanup();
});

test('world country layer parses zoom-one data and hands off through paint opacity without duplicate labels', () => {
  assert.equal(worldCountryLabels.sourceID, 'composite');
  assert.equal(worldCountryLabels.sourceLayerID, 'place_label');
  assert.ok(worldCountryLabels.minZoomLevel <= 0.8 && worldCountryLabels.maxZoomLevel > 1);
  const native = readFileSync('src/components/discovery/globe/native-globe.tsx', 'utf8');
  assert.ok(native.includes("ready && style === 'satellite' && <Mapbox.SymbolLayer {...worldCountryLabels}"));
  assert.ok(native.includes("filter={['all', ['==', ['get', 'class'], 'country'], ['<=', ['get', 'symbolrank'], 3]]}"));
  assert.ok(native.includes('textAllowOverlap: false, textIgnorePlacement: false'));
  assert.ok(native.includes('belowLayerID="country-label"')); // Normal country labels retain placement priority.
  assert.ok(native.includes("textOpacity: ['step', ['zoom'], 1, 1, 0]"));
  assert.ok(native.includes("visibility: 'visible', symbolPlacement: 'point'"));
  assert.ok(native.includes("textVariableAnchor: ['center', 'top', 'bottom', 'left', 'right']"));
  assert.ok(native.includes("['coalesce', ['get', 'name_en'], ['get', 'name']]"));
});
