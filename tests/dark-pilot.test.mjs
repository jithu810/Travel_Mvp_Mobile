import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadPilotTheme } from './helpers/dark-pilot-harness.mjs';
const pilot = loadPilotTheme('/discover');

test('dark appearance covers every app route, including nested screens and authentication', () => {
  for (const path of ['/', '/discover', '/journey/abc']) assert.equal(pilot.isDarkPilotRoute(path), true, path);
  for (const path of ['/search', '/search?view=stories', '/create', '/account', '/journey', '/journey/abc/travel', '/travel/abc', '/profile/a', '/magic/abc', '/auth']) assert.equal(pilot.isDarkPilotRoute(path), true, path);
});
test('route changes keep the same dark styles without mutating the original stylesheet', () => {
  let path = '/discover'; const current = loadPilotTheme(() => path);
  const light = { panel: { backgroundColor: '#FFFFFF', borderColor: '#D1D8EE' }, text: { color: '#101B2E' } };
  const before = structuredClone(light), dark = current.usePilotStyles(light);
  assert.notEqual(dark, light); assert.deepEqual(light, before);
  assert.equal(dark.panel.backgroundColor, pilot.darkPilot.surface);
  assert.equal(dark.text.color, pilot.darkPilot.text);
  assert.equal(current.usePilotStyles(light), dark, 'same static stylesheet reuses the cached variant');
  path = '/create'; assert.equal(current.usePilotStyles(light), dark);
  path = '/journey/abc'; assert.equal(current.usePilotStyles(light), dark);
});
test('photo-overlay whites, primary gradients and unrelated map/art colors are preserved', () => {
  const light = { photo: { color: '#FFFFFF', backgroundColor: 'rgba(5,28,24,0.65)' }, primary: { backgroundColor: '#6546CD', experimental_backgroundImage: 'linear-gradient(110deg, #AA54DB 0%, #246BE0 100%)' }, art: { backgroundColor: '#FFCC55', shadowColor: '#101B2E' } };
  assert.deepEqual(pilot.darkPilotStyles(light), light);
});
test('navigation geometry receives a visible foreground, while light surfaces receive dark fills', () => {
  const styles = pilot.darkPilotStyles({ plus: { backgroundColor: '#283B56' }, search: { borderColor: '#283B56' }, surface: { backgroundColor: '#FFFFFF' } });
  assert.equal(styles.plus.backgroundColor, pilot.darkPilot.text);
  assert.equal(styles.search.borderColor, pilot.darkPilot.text);
  assert.equal(styles.surface.backgroundColor, pilot.darkPilot.surface);
});
function luminance(hex) {
  const linear = hex.slice(1).match(/../g).map(value => { const c = parseInt(value, 16) / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
test('normal-size text, muted copy, links and accents meet 4.5:1 on pilot surfaces', () => {
  const d = pilot.darkPilot;
  for (const foreground of [d.text, d.muted, d.accent, d.link]) for (const background of [d.background, d.surface, d.inset, '#263F65', '#30264B'])
    assert.ok(ratio(foreground, background) >= 4.5, `${foreground} on ${background}: ${ratio(foreground, background)}`);
});
test('color helpers apply dark defaults on every route and retain unknown explicit colors', () => {
  assert.equal(loadPilotTheme('/account').usePilotColor()('#101B2E'), pilot.darkPilot.text);
  assert.equal(pilot.usePilotColor()('#101B2E'), pilot.darkPilot.text);
  assert.equal(pilot.usePilotColor()('#EF3340'), '#EF3340');
});
