import type { PublicJourney } from '../../types/journey';
import { safePhoto } from './model';
import { buildMapData, hasCoordinates } from '../journey/map-data';

export const worldCamera = { centerCoordinate: [35, 18], zoomLevel: 0.8, heading: 0, pitch: 0 };
export function discoveryPoints(journey: PublicJourney | null) {
  const seen = new Set<string>();
  const photos = new Map<string, string>();
  for (const stop of journey?.stops || []) {
    const photo = safePhoto(stop.photo);
    if (hasCoordinates(stop) && photo?.startsWith('https://')) {
      const coordinate = [stop.longitude, stop.latitude].join(',');
      if (!photos.has(coordinate)) photos.set(coordinate, photo);
    }
  }
  const markers = journey ? buildMapData(journey.stops).markers : [];
  return {
    type: 'FeatureCollection' as const,
    features: markers.flatMap(marker => {
      const key = marker.coordinate.join(',');
      if (seen.has(key)) return [];
      seen.add(key);
      return [{
        type: 'Feature' as const, id: marker.id,
        geometry: { type: 'Point' as const, coordinates: marker.coordinate },
        properties: { journeyId: journey!.id, name: marker.name,
          photo: photos.get(key) || null },
      }];
    }),
  };
}
export type DiscoveryPoints = ReturnType<typeof discoveryPoints>;
export function selectedJourneyId(properties: unknown, points: DiscoveryPoints): string | null {
  if (!properties || typeof properties !== 'object' || !('journeyId' in properties)) return null;
  const id = properties.journeyId;
  return typeof id === 'string' && points.features.some(f => f.properties.journeyId === id) ? id : null;
}
