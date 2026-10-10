import { memo, useMemo } from 'react';
import type { JourneyStop } from '@/types/journey';
import { buildMapData } from '@/lib/journey/map-data';
import { MapFallback, MapFrame } from './map-frame';

// Web deliberately has no browser map or native-module import.
export const JourneyMap = memo(function JourneyMap({ stops }: { stops: JourneyStop[] }) {
  const data = useMemo(() => buildMapData(stops), [stops]);
  return <MapFrame data={data}><MapFallback message={data.markers.length
    ? 'Explore the interactive journey map in the iOS or Android app.' : undefined} /></MapFrame>;
});
