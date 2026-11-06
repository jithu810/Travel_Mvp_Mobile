import { memo } from 'react';
import { MemoryMapNotice, type MemoryMapViewProps } from './memory-map-notice';

// Web deliberately has no browser map or native-module import.
export const MemoryMapView = memo(function MemoryMapView({ pins }: MemoryMapViewProps) {
  return <MemoryMapNotice message={'Explore ' + (pins.length === 1 ? 'this place' : 'these ' + pins.length + ' places') + ' on the interactive travel map in the iOS or Android app.'} />;
});
