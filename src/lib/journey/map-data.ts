import type { JourneyStop } from '../../types/journey';

export type Coordinate = [number, number];
export function hasCoordinates(stop: Pick<JourneyStop, 'latitude' | 'longitude'>): stop is JourneyStop & { latitude: number; longitude: number } {
  return typeof stop.latitude === 'number' && Number.isFinite(stop.latitude) && Math.abs(stop.latitude) <= 90
    && typeof stop.longitude === 'number' && Number.isFinite(stop.longitude) && Math.abs(stop.longitude) <= 180;
}
export function buildMapData(stops: JourneyStop[]) {
  const ordered = [...stops].sort((a, b) => a.sequence - b.sequence);
  const markers = ordered.flatMap((stop, index) => hasCoordinates(stop)
    ? [{ id: stop.id, name: stop.name, number: index + 1, coordinate: [stop.longitude, stop.latitude] as Coordinate }] : []);
  const segments: Coordinate[][] = [];
  let segment: Coordinate[] = [];
  for (const stop of ordered) {
    if (hasCoordinates(stop)) segment.push([stop.longitude, stop.latitude]);
    else { if (segment.length > 1) segments.push(segment); segment = []; }
  }
  if (segment.length > 1) segments.push(segment);
  const bounds = markers.length ? {
    ne: [Math.max(...markers.map(m => m.coordinate[0])), Math.max(...markers.map(m => m.coordinate[1]))] as Coordinate,
    sw: [Math.min(...markers.map(m => m.coordinate[0])), Math.min(...markers.map(m => m.coordinate[1]))] as Coordinate,
  } : null;
  return {
    markers, missing: ordered.length - markers.length, bounds,
    line: { type: 'Feature' as const, properties: {}, geometry: { type: 'MultiLineString' as const, coordinates: segments } },
  };
}
export type JourneyMapData = ReturnType<typeof buildMapData>;
