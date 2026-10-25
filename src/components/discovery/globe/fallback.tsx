import { BrandedLoading } from '@/components/branded-loading';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { spaceColor } from '@/lib/discovery/presentation';
import { colors } from '../ui';
import { useBuddyProtectedBounds, useBuddyScroll } from '@/hooks/use-buddy-geometry';
export function GlobeFallback({ message, retry, bottomInset = 0, compact = false }: { message: string; retry?: () => void; bottomInset?: number; compact?: boolean }) {
  const protection = useBuddyProtectedBounds(), scroll = useBuddyScroll();
  return <View style={styles.fallback}>
    <ScrollView {...scroll} showsVerticalScrollIndicator={false} style={[styles.viewport, { bottom: bottomInset }]} contentContainerStyle={[styles.content, compact && { padding: 8, gap: 4 }]}>
      {!compact && <Text style={styles.kicker}>A WORLD OF POSSIBILITIES</Text>}
      {!compact && <Text style={styles.title}>Your next chapter starts here.</Text>}
      <Text style={styles.body}>{compact ? 'World preview unavailable' : message}</Text>
      {retry && <Pressable {...protection} accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.label}>Retry map</Text></Pressable>}
    </ScrollView>
  </View>;
}
export function GlobeLoading({ bottomInset = 0 }: { bottomInset?: number }) {
  return <View style={styles.fallback}><View style={[styles.viewport, styles.content, { bottom: bottomInset, padding: 0, alignItems: 'stretch' }]}><BrandedLoading compact message="Opening the world…" /></View></View>;
}
export const styles = StyleSheet.create({
  fallback: { flex: 1, backgroundColor: spaceColor },
  viewport: { position: 'absolute', top: 0, left: 0, right: 0 },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 10 },
  kicker: { fontSize: 9, letterSpacing: 1.6, color: '#AAC5B8', textAlign: 'center', fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 27, color: colors.paper, textAlign: 'center', fontWeight: '600', maxWidth: 300 },
  body: { fontSize: 11, lineHeight: 16, color: '#C3CED9', textAlign: 'center', maxWidth: 300 },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: colors.white, borderRadius: 22 },
  label: { color: colors.ink, fontWeight: '600' },
});
