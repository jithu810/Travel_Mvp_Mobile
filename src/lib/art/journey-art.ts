// "Journey art": deterministic, offline artwork for journeys and stops without photos.
// Pure and dependency-free so it can be unit-tested; components draw the results with
// plain React Native Views (no SVG, gradients or network requests).

export type ArtPalette = {
  name: string;
  dark: boolean;
  /** Per-stop background tints; index 0 is the journey (card) background. */
  tints: readonly [string, string, string];
  /** Soft layered background shapes. */
  shapes: readonly [string, string, string];
  route: string;
  /** Upcoming (not yet reached) route segments on stop art. */
  routeMuted: string;
  dot: string;
  highlight: string;
  ring: string;
  ink: string;
  inkMuted: string;
  badge: string;
  badgeText: string;
};

// Curated around the app's brand blues/violet (#3873CE, #6555CF, #2C63AF, #14243F, pale blues).
export const artPalettes: readonly ArtPalette[] = [
  { name: 'harbour', dark: false, tints: ['#E7EFFB', '#DCE8F9', '#EEF3FC'], shapes: ['#CFDFF6', '#BED3F2', '#DCE6FA'], route: '#2C63AF', routeMuted: '#9DB8E2', dot: '#3873CE', highlight: '#6555CF', ring: '#FFFFFF', ink: '#14243F', inkMuted: '#3D4F6E', badge: '#2C63AF', badgeText: '#FFFFFF' },
  { name: 'twilight', dark: false, tints: ['#EDEAFF', '#E4E0FC', '#F2F0FF'], shapes: ['#DAD3FA', '#CFC7F7', '#E2E8FA'], route: '#6555CF', routeMuted: '#B7AEEA', dot: '#6555CF', highlight: '#2C63AF', ring: '#FFFFFF', ink: '#14243F', inkMuted: '#41456E', badge: '#6555CF', badgeText: '#FFFFFF' },
  { name: 'midnight', dark: true, tints: ['#14243F', '#182B4A', '#1B2F52'], shapes: ['#1F3860', '#26467A', '#1A2D4F'], route: '#8FB4EE', routeMuted: '#4A6797', dot: '#BFD3F5', highlight: '#FFFFFF', ring: '#6555CF', ink: '#F2F5FC', inkMuted: '#C2CDE2', badge: '#3873CE', badgeText: '#FFFFFF' },
  { name: 'lagoon', dark: false, tints: ['#E3F0F7', '#D8E9F4', '#EAF4FA'], shapes: ['#C8E0EF', '#B6D4EA', '#D7E9F4'], route: '#2C63AF', routeMuted: '#93B7D9', dot: '#2C63AF', highlight: '#6555CF', ring: '#FFFFFF', ink: '#14243F', inkMuted: '#3A5068', badge: '#14243F', badgeText: '#FFFFFF' },
  { name: 'dusk', dark: true, tints: ['#2B3C7E', '#2F428A', '#283873'], shapes: ['#3A4F9C', '#4559A8', '#24336B'], route: '#C9D6F8', routeMuted: '#6F80BF', dot: '#E4EAFB', highlight: '#FFFFFF', ring: '#6555CF', ink: '#FFFFFF', inkMuted: '#D3DBF4', badge: '#6555CF', badgeText: '#FFFFFF' },
  { name: 'morning', dark: false, tints: ['#F3F1FC', '#EBEFFB', '#F6F4FD'], shapes: ['#E2E9F8', '#E6E0FB', '#D3DFF5'], route: '#3873CE', routeMuted: '#A9C0E6', dot: '#3873CE', highlight: '#6555CF', ring: '#FFFFFF', ink: '#14243F', inkMuted: '#45506A', badge: '#3873CE', badgeText: '#FFFFFF' },
];

// FNV-1a 32-bit: small, stable across platforms and runs.
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// The art seed for a journey. Detail views of the Journey Story only receive the stops
// (not the journey id), so the seed prefers the journey's smallest stop id: it is the same
// in card and detail data and independent of stop order. Journeys without stops use their id.
export function artSeed(journeyId: string | null | undefined, stops?: readonly { id?: string | null }[] | null): string {
  let smallest: string | null = null;
  for (const stop of stops || []) {
    const id = typeof stop?.id === 'string' ? stop.id.trim().toLowerCase() : '';
    if (id && (smallest === null || id < smallest)) smallest = id;
  }
  return smallest ? 'stop:' + smallest : 'journey:' + (journeyId || '').trim().toLowerCase();
}

export function pickPalette(seed: string): ArtPalette {
  return artPalettes[hashString(seed) % artPalettes.length];
}

// A stop's background: a tint from the journey palette that varies with the stop index.
export function stopTint(palette: ArtPalette, index: number): string {
  const i = Number.isInteger(index) && index >= 0 ? index : 0;
  return palette.tints[i % palette.tints.length];
}

// Deterministic PRNG (mulberry32), returns values in [0, 1).
export function seededRandom(seed: number | string): () => number {
  let state = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ArtBox = { width: number; height: number };
export type ArtPoint = { x: number; y: number };
export type GeoPoint = { latitude: number | null; longitude: number | null };

export function usableBox(box: ArtBox | null | undefined): box is ArtBox {
  return !!box && Number.isFinite(box.width) && Number.isFinite(box.height) && box.width > 0 && box.height > 0;
}

export function validGeoPoint(point: GeoPoint | null | undefined): point is { latitude: number; longitude: number } {
  return !!point && typeof point.latitude === 'number' && typeof point.longitude === 'number'
    && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}

// Smallest extent (degrees of latitude, or cos-corrected longitude) the projection zooms to.
export const artMinSpanDegrees = 0.005;

export type ProjectedRoute = {
  /** One entry per input point, in order; null where the point is missing or invalid. */
  points: (ArtPoint | null)[];
  /** Number of valid projected points. */
  count: number;
};

// Equirectangular projection with a cos(latitude) correction, fitted into the padded box
// while preserving the aspect ratio and centred. A single point or identical points sit
// in the centre, and the drawing never zooms in further than artMinSpanDegrees so stops
// a few metres apart stay close together instead of stretching across the box. Longitudes are unwrapped around the first valid point so routes that
// cross the antimeridian stay compact.
export function projectRoute(points: readonly (GeoPoint | null | undefined)[] | null | undefined, box: ArtBox, padding = 0): ProjectedRoute {
  const input = points || [];
  const empty: ProjectedRoute = { points: input.map(() => null), count: 0 };
  if (!usableBox(box)) return empty;
  let reference: number | null = null;
  const valid = input.map(point => {
    if (!validGeoPoint(point)) return null;
    let longitude = point.longitude;
    if (reference === null) reference = longitude;
    else { while (longitude - reference > 180) longitude -= 360; while (longitude - reference < -180) longitude += 360; }
    return { latitude: point.latitude, longitude };
  });
  const located = valid.filter((point): point is { latitude: number; longitude: number } => point !== null);
  if (!located.length) return empty;
  const meanLatitude = located.reduce((sum, point) => sum + point.latitude, 0) / located.length;
  const correction = Math.max(0.01, Math.cos(meanLatitude * Math.PI / 180));
  const raw = valid.map(point => point ? { x: point.longitude * correction, y: -point.latitude } : null);
  const xs = raw.flatMap(point => point ? [point.x] : []), ys = raw.flatMap(point => point ? [point.y] : []);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = Math.max(0, Math.min(padding, box.width / 2, box.height / 2));
  const innerWidth = Math.max(0, box.width - pad * 2), innerHeight = Math.max(0, box.height - pad * 2);
  const spanX = maxX - minX, spanY = maxY - minY;
  // Each axis is fitted as if it spanned at least artMinSpanDegrees (about 550 m), so tiny
  // spreads draw small and centred; identical points (span 0) collapse onto the centre.
  const scale = Math.min(innerWidth / Math.max(spanX, artMinSpanDegrees), innerHeight / Math.max(spanY, artMinSpanDegrees));
  const offsetX = (box.width - spanX * scale) / 2, offsetY = (box.height - spanY * scale) / 2;
  const projected = raw.map(point => point ? { x: offsetX + (point.x - minX) * scale, y: offsetY + (point.y - minY) * scale } : null);
  return { points: projected, count: located.length };
}

export type Segment = { left: number; top: number; width: number; height: number; angle: number; midX: number; midY: number; length: number };

// Geometry for drawing a line from a to b with a View rotated about its centre.
export function segmentGeometry(a: ArtPoint, b: ArtPoint, thickness = 3): Segment {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
  const angle = length ? Math.atan2(dy, dx) * 180 / Math.PI : 0;
  return { left: midX - length / 2, top: midY - thickness / 2, width: length, height: thickness, angle, midX, midY, length };
}

export type RouteSegment = Segment & { from: number; to: number };

// Segments between consecutive located points. Like the journey map, a missing point
// breaks the line instead of joining its neighbours.
export function routeSegments(points: readonly (ArtPoint | null)[], thickness = 3): RouteSegment[] {
  const result: RouteSegment[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (!a || !b) continue;
    const segment = segmentGeometry(a, b, thickness);
    if (segment.length < 0.5) continue;
    result.push({ ...segment, from: i - 1, to: i });
  }
  return result;
}

export const pseudoRouteMaxDots = 8;

// A decorative wavy trail for cards, whose data carries no coordinates. It is clearly
// not a map: evenly spaced dots on a gentle wave, shaped by the seed.
export function pseudoRoute(seed: string, count: number, box: ArtBox, padding = 0): ArtPoint[] {
  if (!usableBox(box)) return [];
  const n = Math.max(0, Math.min(pseudoRouteMaxDots, Math.floor(Number.isFinite(count) ? count : 0)));
  if (!n) return [];
  const random = seededRandom('pseudo:' + seed);
  const pad = Math.max(0, Math.min(padding, box.width / 2, box.height / 2));
  const innerWidth = box.width - pad * 2, innerHeight = box.height - pad * 2;
  const centreY = box.height / 2;
  if (n === 1) return [{ x: box.width / 2, y: centreY }];
  const amplitude = innerHeight * (0.22 + random() * 0.18);
  const phase = random() * Math.PI * 2;
  const waves = 0.8 + random() * 0.9;
  const tilt = (random() - 0.5) * innerHeight * 0.3;
  const points: ArtPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const jitter = (random() - 0.5) * innerHeight * 0.08;
    const y = centreY + Math.sin(phase + t * waves * Math.PI * 2) * amplitude + (t - 0.5) * tilt + jitter;
    points.push({ x: pad + t * innerWidth, y: Math.max(pad, Math.min(box.height - pad, y)) });
  }
  return points;
}

// Small dots spaced along a polyline, for the decorative (dotted) trail.
export function dottedTrail(points: readonly ArtPoint[], spacing = 8, maxDots = 120): ArtPoint[] {
  const result: ArtPoint[] = [];
  const step = Math.max(2, spacing);
  for (let i = 1; i < points.length && result.length < maxDots; i++) {
    const a = points[i - 1], b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const dots = Math.floor(length / step);
    for (let j = 1; j < dots && result.length < maxDots; j++) {
      const t = j / dots;
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return result;
}

export type ArtShape = { x: number; y: number; size: number; color: string; opacity: number };

// Soft layered circles behind the route, deterministic per seed and variant (e.g. stop index).
export function artShapes(seed: string, box: ArtBox, palette: ArtPalette, variant = 0): ArtShape[] {
  if (!usableBox(box)) return [];
  const random = seededRandom('shapes:' + seed + ':' + variant);
  const largest = Math.max(box.width, box.height);
  return palette.shapes.map((color, i) => {
    const size = largest * (0.55 + random() * 0.5) / (i + 1) ** 0.35;
    return { x: random() * box.width, y: random() * box.height, size, color, opacity: palette.dark ? 0.7 : 0.85 - i * 0.12 };
  });
}

export type LimitedRoute<T> = {
  /** Kept points in order; a null marks a break where the input had missing points. */
  points: (T | null)[];
  /** Original index of each kept point (-1 for a break). */
  indices: number[];
};

// Bounds route detail on art by thinning only VALID points. Every contiguous run of valid
// points keeps its first and last point, so a run is never dropped and no gap is bridged;
// the highlighted point and its valid neighbours are always kept. Missing points become a
// single null break, so segments still stop at them.
export function limitRoute<T>(points: readonly (T | null | undefined)[], max: number, keep?: number): LimitedRoute<T> {
  const valid: number[] = [];
  points.forEach((point, i) => { if (point !== null && point !== undefined) valid.push(i); });
  const chosen = new Set<number>();
  if (valid.length <= Math.max(2, max)) valid.forEach(i => chosen.add(i));
  else {
    const step = (valid.length - 1) / (Math.max(2, max) - 1);
    for (let i = 0; i < Math.max(2, max); i++) chosen.add(valid[Math.round(i * step)]);
    valid.forEach((i, j) => {
      const previous = valid[j - 1], next = valid[j + 1];
      if (previous !== i - 1 || next !== i + 1) chosen.add(i);
    });
    if (keep !== undefined && points[keep] != null) for (const i of [keep - 1, keep, keep + 1]) if (points[i] != null) chosen.add(i);
  }
  const result: LimitedRoute<T> = { points: [], indices: [] };
  points.forEach((point, i) => {
    if (point === null || point === undefined) {
      if (result.points.length && result.points[result.points.length - 1] !== null) { result.points.push(null); result.indices.push(-1); }
    } else if (chosen.has(i)) { result.points.push(point); result.indices.push(i); }
  });
  while (result.points.length && result.points[result.points.length - 1] === null) { result.points.pop(); result.indices.pop(); }
  return result;
}

// Maps a stop index onto the (at most pseudoRouteMaxDots) decorative dots proportionally,
// so stop 9 and later still mark a dot.
export function pseudoRouteIndex(index: number, count: number): number | undefined {
  if (!Number.isInteger(index) || index < 0 || !Number.isFinite(count) || index >= count) return undefined;
  const dots = Math.min(pseudoRouteMaxDots, Math.floor(count));
  if (dots <= 1) return 0;
  return count <= dots ? index : Math.round(index * (dots - 1) / (count - 1));
}

export type RouteScene = {
  segments: (RouteSegment & { traveled: boolean })[];
  dots: { point: ArtPoint; index: number; upcoming: boolean }[];
  highlight: ArtPoint | null;
};

// Everything needed to draw a real route: thinned points, segments coloured by progress
// (up to the highlighted stop: traveled; after it: upcoming) and the highlighted point.
export function routeScene(points: readonly (ArtPoint | null)[], options: { max: number; highlight?: number; thickness: number }): RouteScene {
  const { highlight } = options;
  const limited = limitRoute(points, options.max, highlight);
  const segments = routeSegments(limited.points, options.thickness).map(segment => ({
    ...segment, traveled: highlight === undefined || limited.indices[segment.to] <= highlight,
  }));
  const dots: RouteScene['dots'] = [];
  let selected: ArtPoint | null = null;
  limited.points.forEach((point, i) => {
    if (!point) return;
    const index = limited.indices[i];
    if (index === highlight) selected = point;
    else dots.push({ point, index, upcoming: highlight !== undefined && index > highlight });
  });
  return { segments, dots, highlight: selected };
}

export function artDestination(destination: string | null | undefined): string | null {
  const text = (destination || '').trim();
  return text && text !== 'Destination not specified' ? text : null;
}
