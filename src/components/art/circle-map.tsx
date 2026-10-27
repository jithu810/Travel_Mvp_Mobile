import { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { StaticMapCredit, staticMapCreditLineHeight } from '@/components/discovery/static-map-photo';
import { staticMapCircleSize, staticMapCircleUrl, type MapPoint } from '@/lib/media/static-map';

// The circle's credit is one line with a capped text scale, so its height is bounded at
// any system font size and the footprint below always covers it.
export const circleCreditMaxFontScale = 1.2;
export const circleCreditHeight = Math.ceil(staticMapCreditLineHeight * circleCreditMaxFontScale);
const circleGap = 4;
// Vertical space the circle and its credit line need (circle, gap, one credit line).
export const circleMapFootprint = staticMapCircleSize + circleGap + circleCreditHeight;

// The URL the circle would request, or null when it cannot render (no public token or
// no valid coordinates). Screens reserve space only when this is non-null.
export function circleMapUri(point: MapPoint | null | undefined): string | null {
  return staticMapCircleUrl(point);
}

// A small circular real map of one place, for opened (non-list) surfaces only. It always
// requests the same fixed size, so each place has one cacheable URL. The circle crops the
// Mapbox logo (none is requested at this size), so the one-line StaticMapCredit is drawn
// directly below it whenever the map shows; a failed image removes both and reports it.
export function CircleMap({ point, style, onError }: { point: MapPoint | null | undefined; style?: StyleProp<ViewStyle>; onError?: (uri: string) => void }) {
  const [failed, setFailed] = useState<string | null>(null);
  const uri = circleMapUri(point);
  if (!uri || !point || uri === failed) return null;
  return <View pointerEvents="none" testID="circle-map" accessible={false} style={[s.wrap, style]}>
    <View style={s.circle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image key={uri} source={{ uri }} style={s.image} resizeMode="cover" onError={() => { setFailed(uri); onError?.(uri); }} />
    </View>
    <View style={s.credit}><StaticMapCredit points={[point]} singleLine={{ maxFontSizeMultiplier: circleCreditMaxFontScale }} /></View>
  </View>;
}

const s = StyleSheet.create({
  wrap: { alignItems: 'flex-end', gap: circleGap },
  circle: { width: staticMapCircleSize, height: staticMapCircleSize, borderRadius: staticMapCircleSize / 2, overflow: 'hidden', borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#E4ECF4', boxShadow: '0 3px 8px rgba(20, 36, 63, 0.25)' },
  image: { width: '100%', height: '100%' },
  credit: { maxHeight: circleCreditHeight, paddingHorizontal: 6, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.85)' },
});
