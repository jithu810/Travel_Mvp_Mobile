import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, ui } from '@/components/discovery/ui';
import type { JourneyMapData } from '@/lib/journey/map-data';

export function MapFrame({ data, children }: { data: JourneyMapData; children: ReactNode }) {
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={ui.sectionTitle}>Journey Map</Text>
    <Text style={styles.note}>The creator’s planned stops, in story order.</Text>
    {children}
    {!!data.markers.length && <Text style={styles.note}>Lines connect consecutive planned stops.
      {data.missing > 0 ? ' ' + data.missing + (data.missing === 1 ? ' stop has' : ' stops have') + ' no map coordinates; see the timeline below.' : ''}
    </Text>}
  </View>;
}
export function MapFallback({ message = 'Map unavailable for this journey.', retry }: { message?: string; retry?: () => void }) {
  return <View style={styles.fallback}>
    <Text style={styles.fallbackTitle}>Map unavailable for this journey.</Text>
    {message !== 'Map unavailable for this journey.' && <Text style={styles.note}>{message}</Text>}
    {retry && <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.retryLabel}>Try map again</Text></Pressable>}
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 10 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  fallback: { backgroundColor: colors.pale, borderColor: colors.line, borderWidth: 1, borderRadius: 20, padding: 20, gap: 8 },
  fallbackTitle: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  retry: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.paper },
  retryLabel: { color: colors.green, fontWeight: '600' },
});
