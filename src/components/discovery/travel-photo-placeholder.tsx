import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { StaticMapLayer, useStaticMap, type MapFallback } from './static-map-photo';

// With map coordinates a photo-less slot shows a static map; without them, or
// when the map cannot load, it keeps the bundled default travel photo.
export function TravelPhotoPlaceholder({ variant = 'home', compact = false, label = 'Default travel photo. No journey photo available', map, mapLabel = 'Map preview. No photo yet.' }: { variant?: 'home' | 'stop'; compact?: boolean; label?: string; map?: MapFallback | null; mapLabel?: string }) {
  // The map ends above the caption bar so its bottom-left Mapbox logo stays visible.
  const [captionHeight, setCaptionHeight] = useState(compact ? 21 : 35);
  const mapState = useStaticMap(map ? { ...map, bottomInset: captionHeight } : map);
  return <View style={s.placeholder} accessible accessibilityLabel={mapState.active ? mapLabel : label}>
    {mapState.active ? <StaticMapLayer state={mapState} />
      : <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.placeholderArt}>
        <Image source={require('../../../assets/images/journey-photo-fallback.png')} style={s.image} resizeMode="cover" />
      </View>}
    <View pointerEvents="none" testID="travel-photo-caption" onLayout={event => { const height = Math.round(event.nativeEvent.layout.height); if (height > 0) setCaptionHeight(previous => previous === height ? previous : height); }} style={[s.caption, compact && s.compactCaption]}><Text numberOfLines={2} style={[s.label, compact && s.compactLabel]}>{variant === 'stop' ? 'See this stop' : 'Explore journey'}</Text></View>
  </View>;
}
const s = StyleSheet.create({
  placeholder: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: '#EAF1FC' },
  placeholderArt: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  caption: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: 'rgba(5, 18, 22, 0.76)' },
  compactCaption: { paddingHorizontal: 6, paddingVertical: 4 },
  label: { color: '#FFFFFF', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  compactLabel: { fontSize: 10, lineHeight: 13 },
});
