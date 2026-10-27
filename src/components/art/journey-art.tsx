import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import {
  artDestination, artShapes, dottedTrail, limitRoute, pickPalette, projectRoute, pseudoRoute, routeSegments, stopTint,
  type ArtBox, type ArtPalette, type ArtPoint, type GeoPoint,
} from '@/lib/art/journey-art';

// Journey art: generated, offline artwork for photo-less journeys and stops. Static
// (no animation) and drawn with plain Views. The art itself is decorative; the slot that
// shows it supplies the meaningful accessibility label.

const maxRouteStops = 30;

type ArtStop = GeoPoint & { id?: string };

function useBox() {
  const [box, setBox] = useState<ArtBox | null>(null);
  const onLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width), height = Math.round(event.nativeEvent.layout.height);
    if (width > 0 && height > 0) setBox(previous => previous && previous.width === width && previous.height === height ? previous : { width, height });
  };
  return { box, onLayout };
}

function artAccessibility(label: string | undefined) {
  return label
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label }
    : { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
}

function Shapes({ seed, box, palette, variant }: { seed: string; box: ArtBox; palette: ArtPalette; variant: number }) {
  return <>{artShapes(seed, box, palette, variant).map((shape, i) => <View key={'shape-' + i} style={[s.shape, {
    left: shape.x - shape.size / 2, top: shape.y - shape.size / 2, width: shape.size, height: shape.size, borderRadius: shape.size / 2, backgroundColor: shape.color, opacity: shape.opacity,
  }]} />)}</>;
}

function Dot({ point, size, color, ring, ringWidth = 0, hollow = false, testID }: { point: ArtPoint; size: number; color: string; ring?: string; ringWidth?: number; hollow?: boolean; testID?: string }) {
  const outer = size + ringWidth * 2;
  return <View testID={testID} style={[s.dot, {
    left: point.x - outer / 2, top: point.y - outer / 2, width: outer, height: outer, borderRadius: outer / 2,
    backgroundColor: hollow ? 'transparent' : color, borderWidth: hollow ? Math.max(1.5, size / 4) : ringWidth, borderColor: hollow ? color : ring,
  }]} />;
}

function Line({ segment, color, testID }: { segment: { left: number; top: number; width: number; height: number; angle: number }; color: string; testID?: string }) {
  return <View testID={testID} style={[s.line, {
    left: segment.left, top: segment.top, width: segment.width, height: segment.height, borderRadius: segment.height / 2, backgroundColor: color,
    transform: [{ rotate: segment.angle + 'deg' }],
  }]} />;
}

// A decorative wavy, dotted trail of hollow dots: clearly ornamental, never a map.
function PseudoRoute({ seed, count, box, palette, padding, highlight }: { seed: string; count: number; box: ArtBox; palette: ArtPalette; padding: number; highlight?: number }) {
  const points = pseudoRoute(seed, count, box, padding);
  const small = Math.min(box.width, box.height) < 120;
  const dot = small ? 6 : 9;
  return <View pointerEvents="none" testID="journey-art-pseudo-route" style={StyleSheet.absoluteFill}>
    {dottedTrail(points, small ? 6 : 9, 80).map((point, i) => <Dot key={'trail-' + i} point={point} size={small ? 2 : 3} color={palette.routeMuted} />)}
    {points.map((point, i) => i === highlight
      ? <Dot key={'p-' + i} point={point} size={dot + 4} color={palette.highlight} ring={palette.ring} ringWidth={small ? 2 : 3} testID="journey-art-highlight" />
      : <Dot key={'p-' + i} point={point} size={dot} color={palette.dot} hollow />)}
  </View>;
}

function RealRoute({ points, box, palette, highlight, small, testID }: { points: readonly (ArtPoint | null)[]; box: ArtBox; palette: ArtPalette; highlight?: number; small: boolean; testID: string }) {
  const thickness = small ? 2 : 3;
  const { points: shown, indices } = limitRoute(points, maxRouteStops, highlight);
  const segments = routeSegments(shown, thickness);
  const dot = small ? 5 : 8;
  const selected = highlight !== undefined ? indices.indexOf(highlight) : -1;
  return <View pointerEvents="none" testID={testID} style={[StyleSheet.absoluteFill, { width: box.width, height: box.height }]}>
    {segments.map(segment => <Line key={'seg-' + segment.from} segment={segment}
      color={highlight === undefined || indices[segment.to] <= highlight ? palette.route : palette.routeMuted} />)}
    {shown.map((point, i) => point && i !== selected ? <Dot key={'stop-' + i} point={point} size={dot} color={highlight !== undefined && indices[i] > highlight ? palette.routeMuted : palette.dot} ring={palette.ring} ringWidth={small ? 1 : 1.5} /> : null)}
    {selected >= 0 && shown[selected] && <Dot point={shown[selected] as ArtPoint} size={small ? 9 : 16} color={palette.highlight} ring={palette.ring} ringWidth={small ? 2 : 3} testID="journey-art-highlight" />}
  </View>;
}

export type JourneyArtProps = {
  /** From artSeed(): stable per journey. */
  seed: string;
  stops?: readonly ArtStop[] | null;
  destination?: string | null;
  /** Draws the destination name; use where the slot has no text of its own. */
  showDestination?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// Card and cover art: palette background, soft shapes and the real route when the data has
// coordinates (opened journeys), otherwise a decorative pseudo-route sized by the stop count.
export function JourneyArt({ seed, stops, destination, showDestination = false, compact = false, accessibilityLabel, style }: JourneyArtProps) {
  const { box, onLayout } = useBox();
  const palette = pickPalette(seed);
  const place = showDestination ? artDestination(destination) : null;
  const list = useMemo(() => stops || [], [stops]);
  const small = compact || (box ? Math.min(box.width, box.height) < 120 : false);
  const padding = box ? Math.max(small ? 12 : 18, Math.min(box.width, box.height) * 0.18) : 0;
  // Keep the route clear of the destination caption.
  const reserve = place && box ? Math.min(box.height * 0.4, small ? 30 : 44) : 0;
  const routeWidth = box ? box.width : 0, routeHeight = box ? Math.max(1, box.height - reserve) : 0;
  const routeBox = useMemo(() => routeWidth > 0 ? { width: routeWidth, height: routeHeight } : null, [routeWidth, routeHeight]);
  const projected = useMemo(() => routeBox ? projectRoute(list, routeBox, padding) : null, [list, routeBox, padding]);
  let route: ReactNode = null;
  if (routeBox && projected) route = projected.count > 0
    ? <RealRoute points={projected.points} box={routeBox} palette={palette} small={small} testID="journey-art-route" />
    : <PseudoRoute seed={seed} count={list.length} box={routeBox} palette={palette} padding={padding} />;
  return <View testID="journey-art" onLayout={onLayout} {...artAccessibility(accessibilityLabel)} style={[s.fill, { backgroundColor: palette.tints[0] }, style]}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.layer}>
      {box && <Shapes seed={seed} box={box} palette={palette} variant={0} />}
      {route}
    </View>
    {place && <View pointerEvents="none" style={[s.destination, small && s.smallDestination]}>
      <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={[s.destinationText, small && s.smallDestinationText, { color: palette.ink }]}>{place}</Text>
    </View>}
  </View>;
}

export type StopArtProps = {
  seed: string;
  stops: readonly ArtStop[];
  /** The stop this art represents, highlighted on the route. */
  index: number;
  name?: string;
  /** mini: tiny thumbnails (route only, no badge or text). */
  variant?: 'full' | 'mini';
  /** Space kept clear of the badge/name/route for the screen's own overlays. */
  inset?: { top?: number; bottom?: number; left?: number; right?: number };
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// A photo-less stop: its number and name with the journey's real route and THIS stop
// highlighted. Each stop differs in its highlight, route progress and background tint.
export function StopArt({ seed, stops, index, name, variant = 'full', inset, accessibilityLabel, style }: StopArtProps) {
  const { box, onLayout } = useBox();
  const palette = pickPalette(seed);
  const mini = variant === 'mini';
  const top = Math.max(0, inset?.top ?? 0), bottom = Math.max(0, inset?.bottom ?? 0), left = Math.max(0, inset?.left ?? 0), right = Math.max(0, inset?.right ?? 0);
  const header = mini ? 0 : 50;
  const padding = mini ? 7 : 18;
  const areaWidth = box ? Math.max(1, box.width - left - right) : 0, areaHeight = box ? Math.max(1, box.height - top - bottom - header) : 0;
  const area = useMemo(() => areaWidth > 0 ? { width: areaWidth, height: areaHeight } : null, [areaWidth, areaHeight]);
  const projected = useMemo(() => area ? projectRoute(stops, area, padding) : null, [stops, area, padding]);
  const highlight = projected?.points[index] ? index : undefined;
  return <View testID="stop-art" onLayout={onLayout} {...artAccessibility(accessibilityLabel)} style={[s.fill, { backgroundColor: stopTint(palette, index) }, style]}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.layer}>
      {box && <Shapes seed={seed} box={box} palette={palette} variant={index + 1} />}
      {area && projected && <View style={[s.area, { left, top: top + header, width: area.width, height: area.height }]}>
        {projected.count > 0
          ? <RealRoute points={projected.points} box={area} palette={palette} highlight={highlight} small={mini || Math.min(area.width, area.height) < 90} testID="stop-art-route" />
          : <PseudoRoute seed={seed} count={stops.length} box={area} palette={palette} padding={padding} highlight={index < 8 ? index : undefined} />}
      </View>}
    </View>
    {!mini && <View pointerEvents="none" style={[s.header, { top: top + 12, left: left + 12, right: right + 12 }]}>
      <View style={[s.badge, { backgroundColor: palette.badge }]}><Text maxFontSizeMultiplier={1.2} style={[s.badgeText, { color: palette.badgeText }]}>{index + 1}</Text></View>
      {!!name?.trim() && <Text numberOfLines={2} maxFontSizeMultiplier={1.2} style={[s.name, { color: palette.ink }]}>{name.trim()}</Text>}
    </View>}
  </View>;
}

const s = StyleSheet.create({
  fill: { flex: 1, width: '100%', overflow: 'hidden' },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  area: { position: 'absolute' },
  shape: { position: 'absolute' },
  dot: { position: 'absolute' },
  line: { position: 'absolute' },
  destination: { position: 'absolute', left: 12, right: 12, bottom: 10 },
  smallDestination: { left: 8, right: 8, bottom: 6 },
  destinationText: { fontSize: 15, lineHeight: 19, fontWeight: '700', letterSpacing: -0.2 },
  smallDestinationText: { fontSize: 11, lineHeight: 14 },
  header: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { minWidth: 30, height: 30, borderRadius: 15, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  name: { flexShrink: 1, fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: -0.2 },
});
