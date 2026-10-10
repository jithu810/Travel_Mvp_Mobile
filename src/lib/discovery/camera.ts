import { hasCoordinates, type Coordinate } from '../journey/map-data';
import type { DiscoveryPoints } from './map';

export const locateDuration = 900;
export const localStopZoom = 14;
export const maxDiscoveryZoom = 16;
export type Viewport = { width: number; height: number };
export function discoveryPadding(viewport: Viewport, panelHeight: number) {
  const width = Math.max(0, viewport.width), height = Math.max(0, viewport.height);
  const panel = Math.max(0, Math.min(Number.isFinite(panelHeight) ? panelHeight : 0, height - 1));
  // Reserve left-side World, right-side compass, and the native logo/info row.
  // Reduce margins on unusually tiny layouts; never send padding >= map dimensions.
  const exposed = height - panel;
  return {
    paddingTop: Math.min(12, exposed * 0.1),
    paddingBottom: panel + Math.min(32, exposed * 0.25),
    paddingLeft: Math.min(112, width * 0.3),
    paddingRight: Math.min(56, width * 0.15),
  };
}
const mercatorY = (latitude: number) => {
  const radians = Math.max(-85.05112878, Math.min(85.05112878, latitude)) * Math.PI / 180;
  return (1 - Math.log(Math.tan(Math.PI / 4 + radians / 2)) / Math.PI) / 2;
};
export function locateCamera(points: DiscoveryPoints, viewport: Viewport, panelHeight: number) {
  if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || viewport.width <= 0 || viewport.height <= 0) return null;
  const coordinates = points.features.flatMap(feature => {
    const [longitude, latitude] = feature.geometry.coordinates;
    return hasCoordinates({ longitude, latitude }) ? [[longitude, latitude] as Coordinate] : [];
  });
  if (!coordinates.length) return null;
  const padding = discoveryPadding(viewport, panelHeight);
  const west = Math.min(...coordinates.map(c => c[0])), east = Math.max(...coordinates.map(c => c[0]));
  const south = Math.min(...coordinates.map(c => c[1])), north = Math.max(...coordinates.map(c => c[1]));
  if (east === west && north === south) return { centerCoordinate: [west, south], zoomLevel: localStopZoom, heading: 0, pitch: 0, padding };
  // Explicit center + zoom avoids the SDK bounds path on globe projection.
  // Fit the shortest longitude arc and Mercator latitude span to visible pixels.
  const sorted = [...new Set(coordinates.map(c => (c[0] + 360) % 360))].sort((a, b) => a - b);
  let gap = -1, start = sorted[0], span = 360;
  sorted.forEach((longitude, index) => {
    const next = index + 1 < sorted.length ? sorted[index + 1] : sorted[0] + 360;
    if (next - longitude > gap) { gap = next - longitude; start = next % 360; span = 360 - gap; }
  });
  const top = mercatorY(north), bottom = mercatorY(south);
  const usableWidth = viewport.width - padding.paddingLeft - padding.paddingRight;
  const usableHeight = viewport.height - padding.paddingTop - padding.paddingBottom;
  const zoom = Math.min(Math.log2(usableWidth / (512 * Math.max(span / 360, 1e-12))),
    Math.log2(usableHeight / (512 * Math.max(bottom - top, 1e-12))));
  return {
    centerCoordinate: [((start + span / 2 + 180) % 360) - 180, Math.atan(Math.sinh(Math.PI * (1 - top - bottom))) * 180 / Math.PI],
    zoomLevel: Math.max(0, Math.min(maxDiscoveryZoom, zoom)), heading: 0, pitch: 0, padding,
  };
}
