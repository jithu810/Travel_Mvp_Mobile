import { useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { canDrawStaticMap, mapPoints, staticMapBrandingRects, staticMapCreditText, staticMapHasInlineCredit, staticMapInlineCreditText, staticMapUrl, type MapPoint } from '@/lib/media/static-map';
import { useBuddyProtectedBounds } from '@/hooks/use-buddy-geometry';
import type { BuddyRect } from '@/lib/buddy/model';

// Photo-less places and journeys can show a static map of their coordinates.
// creditTop moves the inline credit below a screen's own top overlay (header);
// bottomInset ends the map above a bottom overlay (caption bar, sheet, text panel)
// so the Mapbox logo in its bottom-left corner stays visible.
export type MapFallback = { points: readonly MapPoint[] | null | undefined; creditTop?: number; bottomInset?: number };

// Callers pass fresh arrays each render; a coordinate key keeps the work memoized.
const pointsKey = (points: readonly MapPoint[] | null | undefined) => (points || []).map(point => point ? point.latitude + ',' + point.longitude : '').join(';');

export function useStaticMap(map: MapFallback | null | undefined) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const key = map ? pointsKey(map.points) : '';
  // Recomputed from the coordinate key rather than array identity.
  const points = useMemo(() => key ? mapPoints(key.split(';').map(pair => { const [latitude, longitude] = pair.split(',').map(value => value === 'null' || value === '' ? NaN : Number(value)); return { latitude, longitude }; })) : [], [key]);
  // A 1x1 probe answers "token and coordinates available" before layout.
  const possible = useMemo(() => points.length > 0 && Boolean(staticMapUrl({ points, width: 1, height: 1 })), [points]);
  // Exact slot size keeps the image aspect equal to the slot.
  const uri = useMemo(() => possible && box ? staticMapUrl({ points, width: box.width, height: box.height }) : null, [possible, points, box]);
  return {
    // Active while the map can still display; a failed image returns to the caller's fallback.
    active: possible && !(uri && uri === failed),
    uri: uri && uri !== failed ? uri : null,
    // Wide slots draw the credit in their top-left corner, clear of bottom captions/sheets.
    inlineCredit: Boolean(box && staticMapHasInlineCredit(box.width)),
    creditTop: Math.max(0, map?.creditTop ?? 0),
    bottomInset: Math.max(0, map?.bottomInset ?? 0),
    onLayout: (event: LayoutChangeEvent) => {
      const width = Math.round(event.nativeEvent.layout.width), height = Math.round(event.nativeEvent.layout.height);
      if (width > 0 && height > 0) setBox(previous => previous && previous.width === width && previous.height === height ? previous : { width, height });
    },
    onError: () => { if (uri) setFailed(uri); },
  };
}
export type StaticMapState = ReturnType<typeof useStaticMap>;

// Decorative image; the surrounding slot owns the accessibility label. Wide maps carry
// the Mapbox logo plus an inline text credit; narrow ones rely on StaticMapCredit.
// While a branded map shows, Journey Buddy keeps clear of its credit and logo corners.
export function StaticMapLayer({ state }: { state: StaticMapState }) {
  const branded = Boolean(state.uri && state.inlineCredit), creditTop = state.creditTop;
  const project = useCallback((rect: BuddyRect): readonly BuddyRect[] => branded ? staticMapBrandingRects(rect, creditTop) : [], [branded, creditTop]);
  const protection = useBuddyProtectedBounds(project);
  const { onLayout: layout } = state;
  return <View {...protection} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.fill, { bottom: state.bottomInset }]} onLayout={event => { protection.onLayout(); layout(event); }} testID="static-map-photo">
    {state.uri && <Image key={state.uri} source={{ uri: state.uri }} style={s.image} resizeMode="cover" onError={state.onError} />}
    {state.uri && state.inlineCredit && <Text testID="static-map-inline-credit" numberOfLines={1} style={[s.inline, { top: 4 + state.creditTop }]}>{staticMapInlineCreditText}</Text>}
  </View>;
}

// One attribution line per screen or list that shows small (< 160 px) map thumbnails,
// rendered only when at least one of those thumbnails can actually draw a map.
export function StaticMapCredit({ points }: { points: readonly MapPoint[] | null | undefined }) {
  const protection = useBuddyProtectedBounds();
  if (!canDrawStaticMap(points)) return null;
  return <View {...protection}><Text testID="static-map-credit" accessibilityLabel="Maps by Mapbox and OpenStreetMap" style={s.credit}>{staticMapCreditText}</Text></View>;
}

const s = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#E4ECF4', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  credit: { color: '#505D73', fontSize: 10, lineHeight: 14 },
  inline: { position: 'absolute', left: 4, color: '#101B2E', fontSize: 9, lineHeight: 12, backgroundColor: 'rgba(255,255,255,0.75)', paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden' },
});
