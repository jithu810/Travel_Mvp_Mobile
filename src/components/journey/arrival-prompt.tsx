import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/components/discovery/ui';
import type { ArrivalPrompt as Prompt } from '@/lib/journey/arrival';

export function ArrivalPrompt({ prompt, onConfirm, onDismiss }: { prompt: Prompt; onConfirm: () => void; onDismiss: () => void }) {
  return <View testID="arrival-prompt" style={styles.panel}>
    <Text accessibilityRole="header" accessibilityLiveRegion="polite" accessibilityLabel={'Near ' + prompt.name + '?'} numberOfLines={2} style={styles.title}>Near {prompt.name}?</Text>
    <Text style={styles.note}>GPS suggests you are nearby. Confirm to complete this stop.</Text>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Confirm arrival at ' + prompt.name} onPress={onConfirm} style={styles.confirm}><Text style={styles.confirmText}>Confirm arrival</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss arrival and keep navigating" onPress={onDismiss} style={styles.dismiss}><Text style={styles.dismissText}>Keep navigating</Text></Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 12, gap: 6, borderRadius: 18, backgroundColor: colors.paper, borderColor: colors.green, borderWidth: 1 },
  title: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8 },
  confirm: { flex: 1, minHeight: 48, padding: 8, borderRadius: 12, backgroundColor: colors.ink, justifyContent: 'center', alignItems: 'center' },
  dismiss: { flex: 1, minHeight: 48, padding: 8, borderRadius: 12, backgroundColor: colors.pale, justifyContent: 'center', alignItems: 'center' },
  confirmText: { color: colors.white, fontSize: 12, lineHeight: 18, textAlign: 'center', fontWeight: '600' },
  dismissText: { color: colors.ink, fontSize: 12, lineHeight: 18, textAlign: 'center', fontWeight: '600' },
});
