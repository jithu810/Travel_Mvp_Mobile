import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { JourneyPreview } from '@/lib/journey/preview-playback';
import { useBuddyPreference } from '@/hooks/use-journey-buddy';
import { useBuddyProtectedBounds } from '@/hooks/use-buddy-geometry';

export function JourneyPreviewControls({ preview, active, buddy, onBuddy }: { preview: JourneyPreview; active: boolean; buddy: boolean; onBuddy(value: boolean): void }) {
  const state = useSyncExternalStore(preview.subscribe, preview.get, preview.get), preference = useBuddyPreference();
  const protection = useBuddyProtectedBounds(), playing = state.status === 'playing', disabled = !active || !state.ready || state.status === 'unavailable';
  return <View {...protection} style={styles.root}>
    <Text accessibilityRole="header" style={styles.title}>Journey preview</Text>
    <Text style={styles.note}>Illustrative connections · Not your live location</Text>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause journey preview' : 'Play journey preview'} disabled={disabled || state.status === 'finished'} accessibilityState={{ disabled: disabled || state.status === 'finished' }} onPress={() => { if (!active) return; if (playing) preview.pause(); else preview.play(); }} style={styles.button}><Text>{playing ? 'Pause' : 'Play'}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Replay journey preview" disabled={disabled} accessibilityState={{ disabled }} onPress={() => { if (active) preview.replay(); }} style={styles.button}><Text>Replay</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={buddy && preference.enabled ? 'Preview with plane' : 'Preview with Buddy'} disabled={!active || !preference.enabled} accessibilityState={{ disabled: !active || !preference.enabled }} onPress={() => { if (active && preference.enabled) onBuddy(!buddy); }} style={styles.button}><Text>{buddy && preference.enabled ? 'Use plane' : 'Use Buddy'}</Text></Pressable>
    </View>
    <Text accessibilityLiveRegion="polite" style={styles.note}>{state.status === 'unavailable' ? 'Add two connected stops with map locations to preview.' : !state.ready ? 'Static preview · Playback waits for a ready map and motion settings.' : state.status === 'finished' ? 'Preview complete · Replay to see the journey again.' : state.status === 'paused' ? 'Preview paused · Play continues from here.' : playing ? 'Preview playing' : 'Play to explore the stop sequence.'}</Text>
  </View>;
}
const styles = StyleSheet.create({ root: { paddingVertical: 8, gap: 4 }, title: { color: '#18243B', fontWeight: '700', fontSize: 14 }, note: { color: '#526176', fontSize: 11, lineHeight: 16 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, button: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 18, backgroundColor: '#EDF1F8' } });
