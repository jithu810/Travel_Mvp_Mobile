import { theme } from '@/theme/mobile-theme';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/components/discovery/ui';
import { guidanceDistance, maneuverIcon, type Guidance } from '@/lib/journey/turn-guidance';

export function ManeuverPanel({ guidance, message }: { guidance?: Guidance | null; message: string }) {
  const step = guidance?.status === 'ready' ? guidance.maneuver : null;
  // Mapbox's arrival text can say "You have arrived". An upcoming endpoint is not a verified visit.
  const instruction = step?.type === 'arrive' ? 'Destination ahead · Complete stop manually' : step?.instruction;
  const distance = step && guidance?.distanceToManeuver != null ? guidanceDistance(guidance.distanceToManeuver) : null;
  const remaining = step && guidance?.remainingDistance != null ? guidanceDistance(guidance.remainingDistance) + ' remaining · GPS estimate' : null;
  const status = instruction || guidance?.message || message;
  return <View testID="maneuver-panel" accessible accessibilityLabel={[distance, status, remaining].filter(Boolean).join('. ')} style={styles.panel}>
    <Text accessible={false} style={styles.icon}>{step ? maneuverIcon(step) : '◇'}</Text>
    <View style={styles.content}>
      {distance && <Text style={styles.distance}>{distance} to maneuver</Text>}
      <Text accessibilityRole="header" numberOfLines={3} style={styles.instruction}>{status}</Text>
      {remaining && <Text numberOfLines={2} style={styles.note}>{remaining}</Text>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  panel: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 18, backgroundColor: theme.navigation, alignItems: 'center' },
  content: { flex: 1, minWidth: 0, gap: 2 },
  icon: { color: colors.white, fontSize: 30, width: 34, textAlign: 'center' },
  distance: { color: colors.white, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  instruction: { color: colors.white, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  note: { color: colors.white, fontSize: 11, lineHeight: 16 },
});
