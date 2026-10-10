import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export const colors = { paper: '#F5F3EC', ink: '#153E35', muted: '#65736A', green: '#708454', line: '#DEE2D7', white: '#FFFFFF', pale: '#E5EBD9' };

export function ScreenHeader({ title, back = false, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const router = useRouter();
  return <View style={ui.header}>
    {back ? <Pressable accessibilityRole="button" accessibilityLabel="Go back"
      onPress={() => router.canGoBack() ? router.back() : router.replace('/discover')} style={ui.back}>
      <Text style={ui.backText}>‹</Text>
    </Pressable> : <View style={ui.logo}><Text style={ui.logoText}>JC</Text></View>}
    <Text numberOfLines={1} style={ui.headerTitle}>{title}</Text>{right}
  </View>;
}
export function Action({ label, onPress, disabled = false, accessibilityLabel }: { label: string; onPress: () => void; disabled?: boolean; accessibilityLabel?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={({ pressed }) => [ui.action, (pressed || disabled) && { opacity: 0.75 }]}>
    <Text style={ui.actionLabel}>{label}</Text>
  </Pressable>;
}
export function Message({ title, body, retry, action = 'Try again' }: { title: string; body: string; retry?: () => void; action?: string }) {
  return <View style={ui.message} accessibilityLiveRegion="polite">
    <Text style={ui.messageTitle}>{title}</Text><Text style={ui.body}>{body}</Text>
    {retry && <Action label={action} onPress={retry} />}
  </View>;
}
export function LoadingCards() {
  return <View accessibilityLabel="Loading public journeys" accessibilityRole="progressbar" style={ui.loading}>
    <ActivityIndicator color={colors.ink} /><Text style={ui.body}>Finding your next journey…</Text>
    {[0, 1].map(item => <View key={item} style={ui.skeleton}><View style={ui.skeletonImage} /><View style={ui.skeletonLine} /><View style={[ui.skeletonLine, { width: '55%' }]} /></View>)}
  </View>;
}
export const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { width: '100%', maxWidth: 560, flex: 1, alignSelf: 'center' },
  list: { paddingHorizontal: 22, paddingBottom: 30, flexGrow: 1 },
  header: { minHeight: 76, paddingHorizontal: 22, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { backgroundColor: colors.ink, width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  logoText: { color: colors.paper, fontWeight: '700', fontSize: 15 },
  headerTitle: { flex: 1, color: colors.ink, fontWeight: '600', fontSize: 18 },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.pale },
  backText: { fontSize: 34, lineHeight: 38, color: colors.ink },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: colors.green },
  heading: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -1, color: colors.ink },
  sectionTitle: { fontSize: 21, lineHeight: 28, fontWeight: '700', color: colors.ink },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  action: { minHeight: 48, borderRadius: 14, backgroundColor: colors.ink, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  actionLabel: { fontSize: 14, color: colors.white, fontWeight: '600' },
  message: { paddingVertical: 36, gap: 14 },
  messageTitle: { fontSize: 21, color: colors.ink, fontWeight: '600', lineHeight: 27 },
  loading: { gap: 14, paddingTop: 12 },
  skeleton: { backgroundColor: colors.white, paddingBottom: 20, borderRadius: 22, overflow: 'hidden', gap: 14 },
  skeletonImage: { aspectRatio: 1.9, backgroundColor: colors.line },
  skeletonLine: { height: 14, width: '80%', backgroundColor: colors.line, marginHorizontal: 18, borderRadius: 7 },
  footer: { paddingVertical: 24, gap: 14 },
});
