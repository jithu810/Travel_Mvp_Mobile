import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const output = mkdtempSync(join(tmpdir(), 'discovery-panel-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/discovery/presentation.ts'], {
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
  assert.ok(globeAtmosphere.starIntensity <= 0.2);
  const native = readFileSync('src/components/discovery/globe/native-globe.tsx', 'utf8');
  assert.ok(native.includes('<Mapbox.Atmosphere style={globeAtmosphere} />'));
  assert.ok(native.includes('Mapbox.StyleURL.Outdoors'));
  assert.ok(native.includes('bottom: bottomInset + 10'));
});
test('panel has an explicit accessible toggle, vertical expanded scrolling, real photo and separate Locate action', () => {
  const panel = readFileSync('src/components/discovery/discovery-panel.tsx', 'utf8');
  assert.ok(panel.includes('accessibilityState={{ expanded }}'));
  assert.ok(panel.includes('horizontal={!expanded}'));
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
