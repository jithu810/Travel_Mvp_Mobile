import { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { StaticMapCredit } from '@/components/discovery/static-map-photo';
import { staticMapCircleSize, staticMapCircleUrl, type MapPoint } from '@/lib/media/static-map';

// A small circular real map of one place, for opened (non-list) surfaces only. It always
// requests the same fixed size, so each place has one cacheable URL. The circle crops the
// Mapbox logo (none is requested at this size), so the one-line StaticMapCredit is drawn
// directly below it whenever the map shows; a failed image removes both.
export function CircleMap({ point, style }: { point: MapPoint | null | undefined; style?: StyleProp<ViewStyle> }) {
  const [failed, setFailed] = useState<string | null>(null);
  const uri = staticMapCircleUrl(point);
  if (!uri || !point || uri === failed) return null;
  return <View pointerEvents="none" testID="circle-map" accessible={false} style={[s.wrap, style]}>
    <View style={s.circle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image key={uri} source={{ uri }} style={s.image} resizeMode="cover" onError={() => setFailed(uri)} />
    </View>
    <View style={s.credit}><StaticMapCredit points={[point]} /></View>
  </View>;
}

const s = StyleSheet.create({
  wrap: { alignItems: 'flex-end', gap: 4 },
  circle: { width: staticMapCircleSize, height: staticMapCircleSize, borderRadius: staticMapCircleSize / 2, overflow: 'hidden', borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#E4ECF4', boxShadow: '0 3px 8px rgba(20, 36, 63, 0.25)' },
  image: { width: '100%', height: '100%' },
  credit: { paddingHorizontal: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.85)' },
});
