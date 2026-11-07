import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { StorySheet } from '@/components/journey/story-sheet';
import { memoryPinLabel, type MemoryPin } from '@/lib/profile/memory-map';
import { theme } from '@/theme/mobile-theme';

export function MemoryPlaceChoices({ pins, onSelect, onClose }: { pins: readonly MemoryPin[]; onSelect: (key: string) => void; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const current = Math.min(page, Math.max(0, Math.ceil(pins.length / 50) - 1));
  const pages = Math.ceil(pins.length / 50);
  return <StorySheet visible title="Choose a memory" onClose={onClose} scrollable={false} suppressBuddy={false}>
    <Text style={s.note}>These shared places overlap. Choose a memory for Buddy to show.</Text>
    <FlatList data={pins.slice(current * 50, current * 50 + 50)} keyExtractor={pin => pin.key} initialNumToRender={6} windowSize={3} maxToRenderPerBatch={6}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={'Select memory: ' + memoryPinLabel(item)} onPress={() => onSelect(item.key)} style={s.item}><Text style={s.title}>{item.stopName}</Text><Text style={s.note}>{item.journeyTitle}</Text></Pressable>} />
    {pages > 1 && <View style={s.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous memories page" disabled={!current} accessibilityState={{ disabled: !current }} onPress={() => setPage(current - 1)} style={s.control}><Text style={s.title}>Previous</Text></Pressable>
      <Text style={s.note}>{current + 1} / {pages}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next memories page" disabled={current + 1 >= pages} accessibilityState={{ disabled: current + 1 >= pages }} onPress={() => setPage(current + 1)} style={s.control}><Text style={s.title}>Next</Text></Pressable>
    </View>}
  </StorySheet>;
}
const s = StyleSheet.create({
  note: { color: theme.muted, fontSize: 12, lineHeight: 18 }, title: { color: theme.text, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  item: { minHeight: 48, padding: 12, gap: 3, borderBottomWidth: 1, borderColor: theme.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, control: { minWidth: 48, minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
});
