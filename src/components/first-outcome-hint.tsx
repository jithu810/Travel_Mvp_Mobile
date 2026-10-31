import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useBuddyProtectedBounds } from '@/hooks/use-buddy-geometry';
import { colors } from '@/components/discovery/ui';

// Route-local guidance; it performs no action or persistence on the user's behalf.
export function FirstOutcomeHint({ title, children, visible = true }: { title: string; children: string; visible?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const protection = useBuddyProtectedBounds();
  if (dismissed || !visible) return null;
  return <View {...protection} style={s.card}>
    <View style={s.copy}><Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={s.body}>{children}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss guidance" onPress={() => setDismissed(true)} style={s.close}><Text style={s.body}>Close</Text></Pressable>
  </View>;
}
const s = StyleSheet.create({
  card: { margin: 12, padding: 12, gap: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, flexDirection: 'row', alignItems: 'flex-start' },
  copy: { flex: 1, minWidth: 0, gap: 4 }, title: { color: colors.ink, fontWeight: '700', fontSize: 14, lineHeight: 20 },
  body: { color: colors.ink, fontSize: 13, lineHeight: 19 }, close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
