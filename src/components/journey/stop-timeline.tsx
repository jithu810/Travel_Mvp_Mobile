import { StyleSheet, Text, View } from 'react-native';
import type { JourneyStop } from '@/types/journey';
import { JourneyPhoto } from '@/components/discovery/journey-photo';
import { colors, ui } from '@/components/discovery/ui';

export function StopTimeline({ stops }: { stops: JourneyStop[] }) {
  if (!stops.length) return null;
  return <View>
    <View style={styles.heading}><View style={styles.rule} /><Text style={ui.eyebrow}>THE PLACES IN BETWEEN</Text></View>
    <Text accessibilityRole="header" style={[ui.sectionTitle, styles.title]}>Along the way</Text>
    {stops.map((stop, index) => <View key={stop.id} style={styles.row}>
      <View style={styles.rail}>
        <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
        {index < stops.length - 1 && <View style={styles.line} />}
      </View>
      <View style={[styles.stop, index === stops.length - 1 && styles.last]}>
        <View style={styles.stopHeader}>
          {stop.dayNumber !== null && <Text style={styles.day}>DAY {stop.dayNumber}</Text>}
          <Text accessibilityRole="header" style={styles.name}>{stop.name}</Text>
        </View>
        {stop.photo && <View style={styles.photo}><JourneyPhoto uri={stop.photo} label={stop.name + ' photo'} ratio={1.5} /></View>}
        {stop.description.trim() ? <Text style={styles.description}>{stop.description}</Text> : null}
        {stop.rating !== null && <Text style={styles.rating} accessibilityLabel={'Creator rating: ' + stop.rating + ' out of 5'}>★ {stop.rating}/5 <Text style={styles.ratingLabel}> · Creator’s rating</Text></Text>}
      </View>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  rule: { height: 1, width: 24, backgroundColor: colors.green },
  title: { fontSize: 25, lineHeight: 32, marginBottom: 22 },
  row: { flexDirection: 'row', gap: 12 },
  rail: { width: 30, alignItems: 'center' },
  number: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 12, color: colors.paper, fontWeight: '600' },
  line: { width: 1, flex: 1, backgroundColor: '#CDD7C2', marginVertical: 7 },
  stop: { flex: 1, minWidth: 0, paddingBottom: 28, gap: 12 },
  last: { paddingBottom: 0 },
  stopHeader: { minHeight: 30, gap: 4 },
  day: { fontSize: 9, fontWeight: '700', letterSpacing: 1.3, color: colors.green },
  name: { fontSize: 19, lineHeight: 26, color: colors.ink, fontWeight: '600' },
  photo: { borderRadius: 18, overflow: 'hidden' },
  description: { color: colors.muted, fontSize: 14, lineHeight: 23 },
  rating: { fontSize: 12, color: colors.ink, lineHeight: 20, fontWeight: '600' },
  ratingLabel: { color: colors.muted, fontWeight: '400', fontSize: 11 },
});
