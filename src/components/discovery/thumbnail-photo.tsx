import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useThumbnailSource } from '@/hooks/use-thumbnail-source';
import { JourneyPhoto } from './journey-photo';
import type { MapFallback } from './static-map-photo';
import { TravelPhotoPlaceholder } from './travel-photo-placeholder';

export function ThumbnailPhoto({ uri, thumbnailUri, label, ratio = 1.9, fill = false, variant = 'home', onOriginalError, map, mapLabel, fallback }: {
  uri: string | null; thumbnailUri?: string | null; label: string; ratio?: number; fill?: boolean; variant?: 'home' | 'stop'; onOriginalError?: () => void;
  /** Shown when there is no photo or every photo variant failed to load. */
  map?: MapFallback | null; mapLabel?: string;
  /** Replaces the stock placeholder (e.g. journey art) when there is no usable photo. */
  fallback?: ReactNode;
}) {
  const source = useThumbnailSource(uri, thumbnailUri);
  return <View style={fill ? { flex: 1, width: '100%', height: '100%' } : { width: '100%', aspectRatio: ratio }}>
    {source.uri ? <JourneyPhoto uri={source.uri} label={label} fill thumbnail fallback={fallback} onError={() => { if (source.onError()) onOriginalError?.(); }} />
      : fallback ?? <TravelPhotoPlaceholder compact variant={variant} label={'Default travel photo. No photo available. ' + label} map={map} mapLabel={mapLabel || 'Map preview. No photo yet. ' + label} />}
  </View>;
}
