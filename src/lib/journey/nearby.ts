export type NearbyPoint = { id: string; name: string; coordinate: readonly number[] };
const valid = (p: NearbyPoint) => p.coordinate.length === 2 && p.coordinate.every(Number.isFinite) && Math.abs(p.coordinate[0]) <= 180 && Math.abs(p.coordinate[1]) <= 90;
const y = (lat: number) => (1 - Math.log(Math.tan(Math.PI / 4 + Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI / 360)) / Math.PI) / 2;
function distance(a: NearbyPoint, b: NearbyPoint) {
  const x = Math.abs(a.coordinate[0] - b.coordinate[0]) / 360;
  return Math.hypot(Math.min(x, 1 - x), y(a.coordinate[1]) - y(b.coordinate[1]));
}
// Selection-time policy only. Never changes stored coordinates or initial overview.
// Mapbox's 512px world tile scale approximates screen separation on a flat local view.
export function nearbyFocus(points: readonly NearbyPoint[], id: string, currentZoom: number) {
  const selected = points.find(p => p.id === id && valid(p));
  if (!selected) return null;
  const zoom = Number.isFinite(currentZoom) ? Math.max(0, Math.min(16, currentZoom)) : 0;
  const peers = points.filter(p => p.id !== id && valid(p)).map(p => ({ p, d: distance(selected, p) }));
  const nearest = peers.filter(p => p.d > 1e-12).reduce((n, p) => Math.min(n, p.d), Infinity);
  const target = nearest * 512 * 2 ** zoom < 56 ? Math.min(16, Math.max(zoom, Math.log2(64 / (512 * nearest)))) : zoom;
  // At the zoom cap, offer a list for unresolved overlaps, including identical coordinates.
  const inseparable = peers.filter(p => p.d * 512 * 2 ** 16 < 48).map(p => p.p);
  return { centerCoordinate: [selected.coordinate[0], Math.max(-85.05112878, Math.min(85.05112878, selected.coordinate[1]))],
    zoomLevel: target, choices: inseparable.length ? [selected, ...inseparable] : [] };
}
