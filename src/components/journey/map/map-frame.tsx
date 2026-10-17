import type { RoadGeometry } from '@/lib/journey/navigation';
import type { TravelCameraSource } from '@/hooks/use-travel-camera';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, ui } from '@/components/discovery/ui';
import type { JourneyMapData } from '@/lib/journey/map-data';

export type MapPresentation = 'story' | 'preview' | 'expanded';
export type MapDisplayProps = { memoryPhotos?: Readonly<Record<string, string | null>>; animateMemoryRoute?: boolean; playRouteWithSelection?: boolean; travelCamera?: TravelCameraSource; navigationMode?: boolean; navigationPadding?: { top: number; bottom: number }; destinationId?: string | null; presentation?: MapPresentation; onExpand?: () => void; navigationRoute?: RoadGeometry | null; currentPosition?: { latitude: number; longitude: number } | null };

export function MapFrame({ data, children, presentation = 'story' }: { data: JourneyMapData; children: ReactNode } & MapDisplayProps) {
  if (presentation !== 'story') return <View style={[styles.display, presentation === 'expanded' && { flex: 1 }]}>{children}</View>;
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={ui.sectionTitle}>Journey Map</Text>
    <Text style={styles.note}>Explore the route, then discover the story behind each stop.</Text>
    {children}
    {!!data.markers.length && <Text style={styles.note}>Lines connect consecutive planned stops.
      {data.missing > 0 ? ' ' + data.missing + (data.missing === 1 ? ' stop has' : ' stops have') + ' no map coordinates; these stops remain in the story.' : ''}
    </Text>}
  </View>;
}
export function MapFallback({ message = 'Map unavailable for this journey.', retry, compact = false, onExpand }: { message?: string; retry?: () => void; compact?: boolean; onExpand?: () => void }) {
  if (compact) return <Pressable accessibilityRole="button" accessibilityLabel="Expand journey map" onPress={onExpand} style={styles.compactFallback}><Text style={styles.fallbackTitle}>Journey map</Text><Text style={styles.note}>Expand for map details ↗</Text></Pressable>;
  return <View style={styles.fallback}>
    <Text style={styles.fallbackTitle}>Map unavailable for this journey.</Text>
    {message !== 'Map unavailable for this journey.' && <Text style={styles.note}>{message}</Text>}
    {retry && <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.retryLabel}>Try map again</Text></Pressable>}
  </View>;
}
const styles = StyleSheet.create({
  display: { minHeight: 0, height: '100%' },
  compactFallback: { flex: 1, borderRadius: 18, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: colors.pale },
  section: { gap: 12 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  fallback: { backgroundColor: colors.pale, borderColor: colors.line, borderWidth: 1, borderRadius: 20, padding: 20, gap: 8 },
  fallbackTitle: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  retry: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.paper },
  retryLabel: { color: colors.green, fontWeight: '600' },
});
