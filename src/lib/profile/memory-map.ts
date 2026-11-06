import { isJourneyId, normalizeStops, object } from '../discovery/model';
import { hasCoordinates } from '../journey/map-data';
import { frameJourneyMap, type StoryMapFrame, type StoryMapPadding, type StoryMapViewport } from '../journey/map-camera';
import { artSeed } from '../art/journey-art';
import { nearbyFocus } from '../journey/nearby';
import type { JourneyStop } from '../../types/journey';

// Travel-memory map: one pin per mapped stop of a profile owner's published,
// non-demo journeys. Read-only; never drafts, Travel Mode visits or GPS history.
export const memoryMapJourneyLimit = 100;
// Matches the creation RPC's per-journey stop bound (100 x 50 pins at most).
export const memoryMapStopLimit = 50;
// Rendered photo/art markers (and the only photos signed): at most 24 places,
// i.e. at most 48 signing jobs with stored thumbnails, far below the 512 queue.
// Every other place is still drawn and tappable as a native circle layer.
export const memoryMapFeaturedLimit = 24;
// One mapped place keeps its surroundings visible instead of a street-level zoom.
export const memoryMapMaxZoom = 12;

export type MemoryArtStop = { id: string; latitude: number | null; longitude: number | null };
export type MemoryPin = {
  /** journeyId:stopId, unique across the map. */
  key: string;
  journeyId: string;
  journeyTitle: string;
  stopId: string;
  stopName: string;
  /** Zero-based position of the stop within its journey (art highlight). */
  stopIndex: number;
  latitude: number;
  longitude: number;
  /** Safe storage path or https URL to sign (featured pins only); never rendered. */
  photoPath: string | null;
  /** Signed/https display URLs; null until signed, or when unavailable (art fallback). */
  photo: string | null;
  photoThumbnail: string | null;
  /** Rendered as a photo/art marker; others are circle-only. */
  featured: boolean;
  art: { seed: string; stops: readonly MemoryArtStop[] };
};
/** limited: the read hit the journey cap, so older journeys may be missing. */
export type MemoryMapModel = { pins: MemoryPin[]; journeyCount: number; featuredCount: number; limited: boolean };
export const emptyMemoryMap = (): MemoryMapModel => ({ pins: [], journeyCount: 0, featuredCount: 0, limited: false });

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

// Fail-closed guard over the anonymous journeys-table read: anything that is not a
// published, non-demo journey of exactly this owner is dropped, whatever the transport
// returned. Malformed (non-array) responses reject rather than claim an empty map.
export function normalizeMemoryMap(value: unknown, ownerId: string): MemoryMapModel {
  if (!Array.isArray(value)) throw new Error('The travel map is temporarily unavailable.');
  const owner = isJourneyId(ownerId) ? ownerId.toLowerCase() : null;
  if (!owner) return emptyMemoryMap();
  const seen = new Set<string>();
  const pins: MemoryPin[] = [];
  let journeyCount = 0;
  for (const item of value.slice(0, memoryMapJourneyLimit)) {
    const row = object(item);
    if (!row) continue;
    const id = text(row.id);
    if (!isJourneyId(id) || row.status !== 'published' || row.is_demo !== false
      || typeof row.user_id !== 'string' || row.user_id.toLowerCase() !== owner || seen.has(id.toLowerCase())) continue;
    seen.add(id.toLowerCase());
    const stops: JourneyStop[] = normalizeStops(row.journey_stops, true).slice(0, memoryMapStopLimit);
    const artStops: MemoryArtStop[] = stops.map(stop => ({ id: stop.id, latitude: stop.latitude, longitude: stop.longitude }));
    const seed = artSeed(id, stops);
    const title = text(row.title) || 'Untitled journey';
    const before = pins.length;
    stops.forEach((stop, index) => {
      if (!hasCoordinates(stop) || !isJourneyId(stop.id)) return;
      pins.push({ key: id + ':' + stop.id, journeyId: id, journeyTitle: title, stopId: stop.id, stopName: stop.name, stopIndex: index,
        latitude: stop.latitude, longitude: stop.longitude, photoPath: stop.photo, photo: null, photoThumbnail: null, featured: false,
        art: { seed, stops: artStops } });
    });
    if (pins.length > before) journeyCount++;
  }
  // Featured markers: most recent journeys first, one per distinct place.
  const places = new Set<string>();
  let featuredCount = 0;
  for (const pin of pins) {
    if (featuredCount >= memoryMapFeaturedLimit) break;
    const place = pin.longitude.toFixed(5) + ',' + pin.latitude.toFixed(5);
    if (places.has(place)) continue;
    places.add(place); pin.featured = true; featuredCount++;
  }
  // Only featured markers ever sign or show a photo.
  for (const pin of pins) if (!pin.featured) pin.photoPath = null;
  return { pins, journeyCount, featuredCount, limited: value.length >= memoryMapJourneyLimit };
}

// Story route for a pin. The stop param is honored by Story only when it matches a
// loaded stop; otherwise Story falls back to its first stop.
export function memoryPinRoute(pin: Pick<MemoryPin, 'journeyId' | 'stopId'>) {
  return { pathname: '/journey/[id]' as const, params: { id: pin.journeyId, stop: pin.stopId } };
}


// Fits every pin with the shared Story camera model. Each pin is separated by a
// coordinate-less spacer so no planned line joins unrelated journeys' stops; the
// frame therefore depends on the pins alone.
export function memoryMapFrame(pins: readonly Pick<MemoryPin, 'key' | 'stopName' | 'latitude' | 'longitude'>[], viewport: StoryMapViewport, padding: Partial<StoryMapPadding> = {}): StoryMapFrame | null {
  const stops: JourneyStop[] = pins.flatMap((pin, index) => [
    { id: pin.key, name: pin.stopName, description: '', sequence: index * 2, dayNumber: null, photo: null, rating: null, latitude: pin.latitude, longitude: pin.longitude },
    { id: pin.key + ':spacer', name: '', description: '', sequence: index * 2 + 1, dayNumber: null, photo: null, rating: null, latitude: null, longitude: null },
  ]);
  const frame = frameJourneyMap(stops, viewport, padding);
  if (!frame) return null;
  return { ...frame, camera: { ...frame.camera, zoomLevel: Math.min(frame.camera.zoomLevel, memoryMapMaxZoom) } };
}

export function memoryPinLabel(pin: Pick<MemoryPin, 'journeyTitle' | 'stopName' | 'stopIndex'>) {
  return 'Open ' + pin.journeyTitle + ' at stop ' + (pin.stopIndex + 1) + ': ' + pin.stopName;
}

// What a tap on a place does. A tap that hits several places, or a place whose
// neighbours overlap at this zoom, zooms in first (Story's nearby policy); places that
// still overlap at the zoom cap (e.g. identical coordinates) get a chooser.
export type MemoryPlacePress =
  | { kind: 'open'; key: string }
  | { kind: 'zoom'; centerCoordinate: number[]; zoomLevel: number }
  | { kind: 'choose'; keys: string[] };
export function memoryPlacePress(pins: readonly Pick<MemoryPin, 'key' | 'stopName' | 'latitude' | 'longitude'>[], key: string, hitKeys: readonly string[], zoom: number): MemoryPlacePress | null {
  if (!pins.some(pin => pin.key === key)) return null;
  const points = pins.map(pin => ({ id: pin.key, name: pin.stopName, coordinate: [pin.longitude, pin.latitude] }));
  const group = nearbyFocus(points, key, zoom);
  if (!group) return { kind: 'open', key };
  if (group.choices.length > 1) return { kind: 'choose', keys: group.choices.map(choice => choice.id) };
  const hits = new Set(hitKeys.filter(hit => pins.some(pin => pin.key === hit)));
  hits.add(key);
  const current = Number.isFinite(zoom) ? zoom : 0;
  if (hits.size > 1 && current >= 15.99) return { kind: 'choose', keys: [...hits] };
  if (group.zoomLevel > current + 0.01 || hits.size > 1) return { kind: 'zoom', centerCoordinate: group.centerCoordinate, zoomLevel: Math.max(group.zoomLevel, Math.min(16, current + 2)) };
  return { kind: 'open', key };
}

// Native map loading: never an indefinite spinner. Satellite gets a share of the budget,
// then Outdoors; any error advances; when the total budget ends the notice is shown.
export const memoryMapStyleBudget = 10000;
export const memoryMapTotalBudget = 20000;
export type MemoryMapStyle = 'satellite' | 'outdoors' | 'failed';
export type MemoryMapLoad = { style: MemoryMapStyle; ready: boolean };
export type MemoryMapLoadEvent = { type: 'loaded' | 'error'; style: MemoryMapStyle } | { type: 'style-timeout' | 'deadline' };
export const initialMemoryMapLoad: MemoryMapLoad = { style: 'satellite', ready: false };
export function nextMemoryMapLoad(state: MemoryMapLoad, event: MemoryMapLoadEvent): MemoryMapLoad {
  if (state.style === 'failed') return state;
  switch (event.type) {
    // Late events from a replaced style cannot mark the replacement ready or skip a step.
    case 'loaded': return event.style === state.style && !state.ready ? { ...state, ready: true } : state;
    case 'error': return event.style === state.style ? { style: state.style === 'satellite' ? 'outdoors' : 'failed', ready: false } : state;
    case 'style-timeout': return !state.ready && state.style === 'satellite' ? { style: 'outdoors', ready: false } : state;
    case 'deadline': return state.ready ? state : { style: 'failed', ready: false };
  }
}

// Last camera per profile owner (process memory only). The native map unmounts while
// the profile is unfocused (one active Mapbox map); on return it resumes this camera
// instead of refitting, as long as the places are unchanged.
export type MemoryCamera = { centerCoordinate: number[]; zoomLevel: number; heading: number };
export function memoryPinsSignature(pins: readonly Pick<MemoryPin, 'key' | 'latitude' | 'longitude'>[]) {
  return pins.map(pin => pin.key + '@' + pin.longitude + ',' + pin.latitude).join('|');
}
export function createMemoryCameraCache(maxEntries = 8) {
  const entries = new Map<string, { signature: string; camera: MemoryCamera }>();
  return {
    get(key: string, signature: string): MemoryCamera | null {
      const entry = entries.get(key);
      return entry && entry.signature === signature ? entry.camera : null;
    },
    set(key: string, signature: string, camera: MemoryCamera) {
      const [longitude, latitude] = camera.centerCoordinate;
      if (!key || !Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(camera.zoomLevel)) return;
      entries.delete(key);
      entries.set(key, { signature, camera: { centerCoordinate: [longitude, latitude], zoomLevel: Math.max(0, Math.min(16, camera.zoomLevel)), heading: Number.isFinite(camera.heading) ? camera.heading : 0 } });
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value!);
    },
  };
}
export const memoryCameras = createMemoryCameraCache();
