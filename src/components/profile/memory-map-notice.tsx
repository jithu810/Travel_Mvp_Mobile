import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MemoryPin } from '@/lib/profile/memory-map';
import type { MemoryJourneyCover } from './memory-buddy-presentation';
import { spaceColor } from '@/lib/discovery/presentation';
import { lightTheme, theme } from '@/theme/mobile-theme';

export type MemoryMapViewport = { width: number; height: number };
/** cameraKey: profile owner, for resuming the last camera after the map remounts. */
export type MemoryMapViewProps = { pins: readonly MemoryPin[]; onOpen: (pin: MemoryPin) => void; initialViewport: MemoryMapViewport; cameraKey: string; onScreen?: boolean; journeyCovers?: readonly MemoryJourneyCover[] };

// Shown inside the map frame when the native map cannot render here.
export function MemoryMapNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <View style={s.notice} accessibilityLiveRegion="polite">
    <Text style={s.title}>Travel map unavailable here.</Text>
    <Text style={s.body}>{message}</Text>
    {retry && <Pressable accessibilityRole="button" accessibilityLabel="Try travel map again" onPress={retry} style={s.retry}><Text style={s.retryLabel}>Try map again</Text></Pressable>}
  </View>;
}

const s = StyleSheet.create({
  notice: { flex: 1, backgroundColor: spaceColor, padding: 20, gap: 8, justifyContent: 'center' },
  title: { color: theme.text, fontSize: 15, fontWeight: '600' },
  body: { color: theme.muted, fontSize: 12, lineHeight: 19 },
  retry: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: lightTheme.surface },
  retryLabel: { color: lightTheme.accent, fontWeight: '600' },
});
