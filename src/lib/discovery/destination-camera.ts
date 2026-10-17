import { hasCoordinates } from '../journey/map-data';
import type { Viewport } from './camera';
export type DestinationFocus = { latitude: number; longitude: number; name: string; mapboxId?: string | null };
export function destinationCamera(place: DestinationFocus | null | undefined, viewport: Viewport) {
  if (!place || !hasCoordinates(place) || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || viewport.width <= 0 || viewport.height <= 0) return null;
  return { centerCoordinate: [place.longitude, place.latitude], zoomLevel: 10, heading: 0, pitch: 0,
    padding: { paddingTop: Math.min(12, viewport.height * 0.15), paddingBottom: Math.min(12, viewport.height * 0.15), paddingLeft: Math.min(12, viewport.width * 0.1), paddingRight: Math.min(12, viewport.width * 0.1) } };
}
export function destinationMarker(place: DestinationFocus | null | undefined) {
  return { type: 'FeatureCollection' as const, features: place && hasCoordinates(place) ? [{ type: 'Feature' as const, id: 'selected-destination',
    geometry: { type: 'Point' as const, coordinates: [place.longitude, place.latitude] }, properties: { name: place.name } }] : [] };
}
