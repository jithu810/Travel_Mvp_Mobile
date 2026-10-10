import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { futureActions, storySnapshot } from '@/lib/journey/snapshot';
import { colors, ui } from '@/components/discovery/ui';

export function StorySnapshot({ journey }: { journey: PublicJourney }) {
  const value = storySnapshot(journey);
  if (!value.stopCount || (!value.pace && !value.signals.length)) return null;
  return <View style={styles.snapshot}>
    <Text style={ui.eyebrow}>JOURNEY SNAPSHOT</Text>
    {value.pace && <Text style={styles.snapshotTitle}>{value.pace} pace · {value.dayCount} active {value.dayCount === 1 ? 'day' : 'days'}</Text>}
    {value.averageStopsPerDay !== null && <Text style={styles.note}>About {Math.round(value.averageStopsPerDay)} stops/day. Pace reflects stop count, not time spent.</Text>}
    {value.signals.length > 0 && <Text style={styles.signals}>{value.signals.join(' · ')}</Text>}
  </View>;
}
export function FutureJourneyActions() {
  return <View style={styles.actions}>
    <Text accessibilityRole="header" style={ui.sectionTitle}>Make it your next chapter</Text>
    <Text style={styles.note}>Journey actions will be available in a future update.</Text>
    <View style={styles.actionRow}>{futureActions.map(label => <Pressable key={label} disabled accessibilityRole="button"
      accessibilityLabel={label + '. Available in a future update.'} accessibilityState={{ disabled: true }} style={styles.action}>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>)}</View>
  </View>;
}
const styles = StyleSheet.create({
  snapshot: { borderLeftWidth: 3, borderColor: '#A4B78C', paddingLeft: 16, gap: 8 },
  snapshotTitle: { color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 23 },
  note: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  signals: { fontSize: 13, lineHeight: 21, color: colors.ink },
  actions: { gap: 10, paddingTop: 24, borderTopWidth: 1, borderColor: colors.line },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: '#EEEEE7' },
  actionLabel: { fontSize: 12, color: colors.muted },
});
