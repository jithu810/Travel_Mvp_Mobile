// Mapbox Static Images API URLs for photo-less places and journeys.
// Pure and dependency-free so it can be unit-tested and reused by any photo slot.
export type MapPoint = { latitude: number | null; longitude: number | null };
export type StaticMapOptions = {
  points: readonly MapPoint[] | null | undefined;
  width: number;
  height: number;
  /** Defaults to EXPO_PUBLIC_MAPBOX_TOKEN. Only public (pk.) tokens are used; null/'' disables. */
  token?: string | null;
};

// Matches the Outdoors style used by the Home globe and journey maps.
export const staticMapStyle = 'mapbox/outdoors-v12';
export const staticMapMaxSize = 1280;
// Pins are capped so the URL stays well below the API's 8,192-character limit.
export const staticMapMaxPins = 25;
export const staticMapSingleZoom = 13;
// Slots from this width request the Mapbox logo in the image (drawn bottom-left,
// about 10 px inset and 20 px tall) plus an app-drawn top-left text credit; the
// in-image text attribution stays off. Slots keep the logo area clear of their own
// overlays through MapFallback.bottomInset. Narrower thumbnails are fully unbranded
// and rely on one StaticMapCredit line per list.
export const staticMapInlineCreditMinWidth = 160;
export const staticMapInlineCreditText = '© Mapbox © OpenStreetMap';
export const staticMapCreditText = 'Maps © Mapbox © OpenStreetMap';
const pinColor = '6555cf';
// Web Mercator cannot render the poles; the API rejects such coordinates.
const maxLatitude = 85.0511;

const round = (value: number) => Number(value.toFixed(5));
export function validMapPoint(point: MapPoint | null | undefined): point is { latitude: number; longitude: number } {
  return !!point && typeof point.latitude === 'number' && typeof point.longitude === 'number'
    && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) <= maxLatitude && Math.abs(point.longitude) <= 180;
}
export function mapPoints(points: readonly MapPoint[] | null | undefined): { latitude: number; longitude: number }[] {
  const seen = new Set<string>();
  const result: { latitude: number; longitude: number }[] = [];
  for (const point of points || []) {
    if (!validMapPoint(point)) continue;
    const latitude = round(point.latitude), longitude = round(point.longitude);
    const key = longitude + ',' + latitude;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ latitude, longitude });
  }
  return result;
}
// Scales both sides by one factor before clamping, so the requested image keeps
// the slot's aspect ratio. Non-finite sizes are unusable (0).
export function staticMapSize(width: number, height: number): [number, number] {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return [0, 0];
  const w = Math.max(0, width), h = Math.max(0, height), largest = Math.max(w, h);
  const scale = largest > staticMapMaxSize ? staticMapMaxSize / largest : 1;
  const side = (value: number) => Math.min(staticMapMaxSize, Math.max(1, Math.round(value * scale)));
  return [side(w), side(h)];
}
function envToken() {
  return process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim() || null;
}

export function staticMapUrl(options: StaticMapOptions): string | null {
  const token = ('token' in options ? options.token : envToken())?.trim();
  // Never put a secret (sk.) or malformed token into an image URL.
  if (!token || !token.startsWith('pk.')) return null;
  const [width, height] = staticMapSize(options.width, options.height);
  if (!width || !height) return null;
  const points = mapPoints(options.points).slice(0, staticMapMaxPins);
  if (!points.length) return null;
  // Overlay text is built only from validated numbers, so it needs no escaping.
  const pins = points.map((point, index) => 'pin-s' + (points.length > 1 ? '-' + (index + 1) : '') + '+' + pinColor + '(' + point.longitude + ',' + point.latitude + ')').join(',');
  const single = points.length === 1;
  const camera = single ? points[0].longitude + ',' + points[0].latitude + ',' + staticMapSingleZoom + ',0' : 'auto';
  const query = ['access_token=' + encodeURIComponent(token), 'attribution=false', 'logo=' + (staticMapHasInlineCredit(width))];
  // Padding must leave a drawable area; keep it under half the smaller side.
  if (!single) query.push('padding=' + Math.max(0, Math.min(40, Math.floor(Math.min(width, height) * 0.15))));
  return 'https://api.mapbox.com/styles/v1/' + staticMapStyle + '/static/' + pins + '/' + camera + '/' + width + 'x' + height + '@2x?' + query.join('&');
}
export function staticMapHasInlineCredit(width: number) { return Number.isFinite(width) && width >= staticMapInlineCreditMinWidth; }
// True when a map could be drawn for these points (valid coordinates and a token).
export function canDrawStaticMap(points: readonly MapPoint[] | null | undefined, token?: string | null) {
  return staticMapUrl(token === undefined ? { points, width: 1, height: 1 } : { points, width: 1, height: 1, token }) !== null;
}
// Journey Buddy keeps clear of these window-space rects on a branded (wide) map:
// the app-drawn top-left text credit and Mapbox's bottom-left logo.
export const staticMapCreditBand = { width: 170, height: 22 };
export const staticMapLogoBand = { width: 100, height: 36 };
export function staticMapBrandingRects(rect: { x: number; y: number; width: number; height: number }, creditTop = 0) {
  if (!(rect.width > 0 && rect.height > 0)) return [];
  const credit = { x: rect.x, y: rect.y + creditTop, width: Math.min(rect.width, staticMapCreditBand.width), height: Math.min(staticMapCreditBand.height, Math.max(0, rect.height - creditTop)) };
  const logoHeight = Math.min(rect.height, staticMapLogoBand.height);
  const logo = { x: rect.x, y: rect.y + rect.height - logoHeight, width: Math.min(rect.width, staticMapLogoBand.width), height: logoHeight };
  return [credit, logo].filter(item => item.width > 0 && item.height > 0);
}
