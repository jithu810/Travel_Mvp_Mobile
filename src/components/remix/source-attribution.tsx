import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, ui } from '@/components/discovery/ui';
import { useLoad } from '@/hooks/use-load';
import { loadPublicJourneyCard } from '@/lib/discovery/queries';
import { remixCredit, unavailableSourceCopy } from '@/lib/remix/model';
import { theme } from '@/theme/mobile-theme';

// Credits a remix's DIRECT parent only. One lightweight public-card lookup (no detail,
// no photo signing), so a private or withdrawn original reads as unavailable.
// - draft: private draft screen, credit plus the View original action
// - editor: one compact line in the draft editor header, no navigation away
// - published: "Remixed from" link on a published journey
export function SourceAttribution({ id, variant = 'draft' }: { id: string; variant?: 'draft' | 'editor' | 'published' }) {
  const router = useRouter();
  const loader = useCallback((signal: AbortSignal) => loadPublicJourneyCard(id, signal), [id]);
  const source = useLoad(loader);
  const open = () => router.push({ pathname: '/journey/[id]', params: { id } });
  if (variant === 'draft') return <View style={{ gap: 10 }}>
    <Text style={ui.body}>{source.loading ? 'Checking the original journey…' : remixCredit('Remix of', source.data)}</Text>
    {source.data && <Action label="View original journey" onPress={open} />}
    {source.error && <Action label="Retry source attribution" onPress={source.retry} />}
  </View>;
  if (variant === 'editor') {
    const text = source.loading ? 'Checking the original journey…' : remixCredit('Remix of', source.data);
    return source.error && !source.loading
      ? <Pressable accessibilityRole="button" accessibilityLabel={unavailableSourceCopy + ' Retry source attribution'} onPress={source.retry} style={s.retry}><Text numberOfLines={1} style={s.editor}>{unavailableSourceCopy} Retry ↻</Text></Pressable>
      : <Text numberOfLines={1} style={s.editor} accessibilityLiveRegion="polite">{text}</Text>;
  }
  const text = source.loading ? 'Checking the original journey…' : remixCredit('Remixed from', source.data);
  return source.data
    ? <Pressable accessibilityRole="link" accessibilityLabel={text} accessibilityHint="Opens the original journey" onPress={open} style={({ pressed }) => [s.published, pressed && { opacity: 0.7 }]}>
      <Text numberOfLines={2} style={s.publishedText}>{text} <Text style={s.link}>↗</Text></Text>
    </Pressable>
    : <View style={s.published}>
      <Text numberOfLines={2} style={s.publishedText}>{text}</Text>
      {source.error && !source.loading && <Pressable accessibilityRole="button" accessibilityLabel="Retry source attribution" onPress={source.retry} style={s.retry}><Text style={s.link}>Retry ↻</Text></Pressable>}
    </View>;
}
const s = StyleSheet.create({
  editor: { color: theme.accent, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  retry: { minHeight: 32, justifyContent: 'center' },
  published: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  publishedText: { flex: 1, minWidth: 0, color: theme.muted, fontSize: 12, lineHeight: 18 },
  link: { color: theme.accent, fontSize: 12, lineHeight: 18, fontWeight: '600' },
});
