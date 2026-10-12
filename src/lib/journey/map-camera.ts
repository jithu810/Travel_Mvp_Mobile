import { travelLine } from '../discovery/travel';
import { buildMapData, type Coordinate } from './map-data';
import type { JourneyStop } from '../../types/journey';

export type StoryMapViewport = { width: number; height: number };
export type StoryMapPadding = { paddingTop: number; paddingBottom: number; paddingLeft: number; paddingRight: number };
export type StoryOverviewReason = 'wide-route' | 'polar-route' | 'viewport-too-small';
export type StoryMapFrame = {
  projection: 'globe' | 'mercator';
  overviewReasons: StoryOverviewReason[];
  camera: { centerCoordinate: Coordinate; zoomLevel: number; heading: 0; pitch: 0; padding: StoryMapPadding };
  // East may exceed 180: this is an unwrapped extent, never native SDK bounds.
  extent: { west: number; east: number; south: number; north: number; crossesAntimeridian: boolean };
  route: ReturnType<typeof travelLine>;
  markerCount: number;
  missingCount: number;
  paddingClamped: boolean;
  latitudeClamped: boolean;
  // Tests containment in the Mercator fit model, not native globe screen space.
  fitsViewport: boolean;
};
const radians = Math.PI / 180;
const mercatorLimit = 85.0511287798066;
const maxZoom = 16;
const pointZoom = 14;
const wrap = (longitude: number) => ((longitude + 180) % 360 + 360) % 360 - 180;
const circle = (longitude: number) => ((longitude % 360) + 360) % 360;
const clampLatitude = (latitude: number) => Math.max(-mercatorLimit, Math.min(mercatorLimit, latitude));
const mercatorY = (latitude: number) => (1 - Math.asinh(Math.tan(clampLatitude(latitude) * radians)) / Math.PI) / 2;

function storyPadding(viewport: StoryMapViewport, requested: Partial<StoryMapPadding>) {
  const defaults: StoryMapPadding = { paddingTop: 12, paddingBottom: 20, paddingLeft: 20, paddingRight: 20 };
  const padding = { ...defaults };
  let clamped = false;
  for (const key of Object.keys(defaults) as (keyof StoryMapPadding)[]) {
    const value = requested[key];
    if (value === undefined) continue;
    if (!Number.isFinite(value) || value < 0) { clamped = true; continue; }
    padding[key] = value;
  }
  for (const [a, b, size] of [
    ['paddingLeft', 'paddingRight', viewport.width],
    ['paddingTop', 'paddingBottom', viewport.height],
  ] as const) {
    // Preserve relative inset sizes but leave at least half a tiny viewport,
    // or 44 logical pixels on larger views. Avoid overflow for huge inputs.
    const budget = size - Math.min(44, size / 2);
    const largest = Math.max(padding[a], padding[b]);
    if (largest > 0 && largest > budget / (padding[a] / largest + padding[b] / largest)) {
      const weight = padding[a] / largest + padding[b] / largest;
      padding[a] = budget * (padding[a] / largest) / weight;
      padding[b] = budget * (padding[b] / largest) / weight;
      clamped = true;
    }
  }
  return { padding, clamped };
}

function longitudeExtent(points: Coordinate[], segments: Coordinate[][]) {
  const intervals: [number, number][] = points.map(point => [circle(point[0]), circle(point[0])]);
  // The cut must lie in an unoccupied longitude gap, not between two samples
  // of a connected leg. This also detects routes that cover the full world.
  for (const segment of segments) {
    for (let i = 1; i < segment.length; i++) {
      const start = circle(segment[i - 1][0]);
      const end = start + wrap(segment[i][0] - segment[i - 1][0]);
      const low = Math.min(start, end), high = Math.max(start, end);
      if (low < 0) intervals.push([0, high], [low + 360, 360]);
      else if (high > 360) intervals.push([low, 360], [0, high - 360]);
      else intervals.push([low, high]);
    }
  }
  intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (previous && interval[0] <= previous[1]) previous[1] = Math.max(previous[1], interval[1]);
    else merged.push([...interval]);
  }
  let gap = -1, start = 0;
  merged.forEach((interval, i) => {
    const next = i + 1 < merged.length ? merged[i + 1][0] : merged[0][0] + 360;
    if (next - interval[1] > gap) { gap = next - interval[1]; start = circle(next); }
  });
  const span = 360 - gap;
  // A global overview has a stable Greenwich center, regardless of sampling.
  const west = span >= 360 - 1e-9 ? -180 : wrap(start);
  return { west, east: west + span, span };
}

function angularDistance(a: Coordinate, b: Coordinate) {
  const lat = Math.sin((b[1] - a[1]) * radians / 2);
  const lon = Math.sin(wrap(b[0] - a[0]) * radians / 2);
  const square = lat * lat + Math.cos(a[1] * radians) * Math.cos(b[1] * radians) * lon * lon;
  return 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, square)))) / radians;
}

/** Pure preparation for a future Story renderer; no SDK calls or animation.
 * Uses Home's sampled spherical geometry without changing its implementation.
 * Globe suitability is a conservative UI policy (70-degree radius / 160-degree
 * longitude span / 80-degree latitude), not an SDK capability restriction.
 * Camera fitting uses the same 512px Mercator model as Home. Native globe
 * containment still needs device verification during visual integration.
 */
export function frameJourneyMap(stops: JourneyStop[], viewport: StoryMapViewport, requestedPadding: Partial<StoryMapPadding> = {}): StoryMapFrame | null {
  if (![viewport.width, viewport.height].every(value => Number.isFinite(value) && value >= 1 && value <= Number.MAX_SAFE_INTEGER)) return null;
  const data = buildMapData(stops);
  if (!data.markers.length) return null;
  const route = travelLine(data.line.geometry.coordinates);
  const points = [...data.markers.map(marker => marker.coordinate), ...route.geometry.coordinates.flat()];
  const first = points[0];
  const coincident = points.every(point => point[1] === first[1]
    && (Math.abs(first[1]) === 90 || wrap(point[0]) === wrap(first[0])));
  // Longitudes at the same physical pole, and +/-180, are equivalent.
  const fittingPoints: Coordinate[] = coincident ? [[Math.abs(first[1]) === 90 ? 0 : wrap(first[0]), first[1]]] : points;
  const longitude = longitudeExtent(fittingPoints, coincident ? [] : route.geometry.coordinates);
  let south = 90, north = -90;
  for (const point of fittingPoints) { south = Math.min(south, point[1]); north = Math.max(north, point[1]); }
  const { padding, clamped: paddingClamped } = storyPadding(viewport, requestedPadding);
  const usableWidth = viewport.width - padding.paddingLeft - padding.paddingRight;
  const usableHeight = viewport.height - padding.paddingTop - padding.paddingBottom;
  const top = mercatorY(north), bottom = mercatorY(south);
  const center: Coordinate = [wrap(longitude.west + longitude.span / 2),
    coincident ? clampLatitude(first[1]) : Math.atan(Math.sinh(Math.PI * (1 - top - bottom))) / radians];
  const horizontal = longitude.span / 360, vertical = bottom - top;
  const requiredZoom = Math.min(horizontal > 0 ? Math.log2(usableWidth / (512 * horizontal)) : Infinity,
    vertical > 0 ? Math.log2(usableHeight / (512 * vertical)) : Infinity);
  const zoomLevel = coincident ? pointZoom : Math.max(0, Math.min(maxZoom, requiredZoom));
  const latitudeClamped = south < -mercatorLimit || north > mercatorLimit;
  const overviewReasons: StoryOverviewReason[] = [];
  if (longitude.span >= 160 || points.some(point => angularDistance(center, point) >= 70)) overviewReasons.push('wide-route');
  if (south <= -80 || north >= 80) overviewReasons.push('polar-route');
  if (requiredZoom < 0) overviewReasons.push('viewport-too-small');
  return {
    projection: overviewReasons.length ? 'mercator' : 'globe', overviewReasons,
    camera: { centerCoordinate: center, zoomLevel, heading: 0, pitch: 0, padding },
    extent: { west: longitude.west, east: longitude.east, south, north, crossesAntimeridian: longitude.east > 180 },
    route, markerCount: data.markers.length, missingCount: data.missing, paddingClamped, latitudeClamped,
    fitsViewport: !latitudeClamped && requiredZoom >= 0,
  };
}
