import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/components/discovery/ui';
import { hasCoordinates } from '@/lib/journey/map-data';
import type { JourneyStop } from '@/types/journey';

const stride = 166;

// Public detail already supplies creator sequence order. Never reorder by day or name.
export function MapItinerary({ stops, selectedId, onSelect }: { stops: JourneyStop[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const list = useRef<FlatList<JourneyStop>>(null);
  const index = stops.findIndex(stop => stop.id === selectedId);
  useEffect(() => {
    if (index >= 0) list.current?.scrollToOffset({ offset: index * stride, animated: false });
  }, [index, stops]);
  if (!stops.length) return null;
  return <View style={styles.section}>
    <View style={styles.heading}><Text style={styles.label}>ITINERARY</Text><Text style={styles.hint}>Swipe to explore →</Text></View>
    <FlatList ref={list} testID="map-itinerary" accessibilityLabel="Journey itinerary in creator order" horizontal data={stops} extraData={selectedId}
      initialNumToRender={4} maxToRenderPerBatch={6} windowSize={3} showsHorizontalScrollIndicator={false}
      keyExtractor={stop => stop.id} getItemLayout={(_, i) => ({ length: stride, offset: i * stride, index: i })}
      renderItem={({ item, index: i }) => {
        const selected = item.id === selectedId;
        const mapped = hasCoordinates(item);
        return <View style={styles.slot}><Pressable accessibilityRole="button" accessibilityState={{ selected }} aria-selected={selected}
          accessibilityLabel={'Stop ' + (i + 1) + ': ' + item.name + (item.dayNumber !== null ? ', Day ' + item.dayNumber : '') + (!mapped ? ', No map coordinates' : '')}
          onPress={() => onSelect(item.id)} style={[styles.stop, selected && styles.selected]}>
          <View style={[styles.number, selected && styles.selectedNumber]}><Text style={[styles.numberText, selected && styles.selectedText]}>{i + 1}</Text></View>
          <View style={styles.details}><Text numberOfLines={1} style={styles.name}>{item.name}</Text>
            {(item.dayNumber !== null || !mapped) && <Text numberOfLines={1} style={styles.meta}>{item.dayNumber !== null ? 'Day ' + item.dayNumber : ''}{item.dayNumber !== null && !mapped ? ' · ' : ''}{!mapped ? 'Not on map' : ''}</Text>}
          </View>
        </Pressable></View>;
      }} />
  </View>;
}

const styles = StyleSheet.create({
  section: { height: 82, flexShrink: 0, gap: 6, paddingTop: 6 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  label: { color: colors.green, fontSize: 10, lineHeight: 16, fontWeight: '700', letterSpacing: 1 },
  hint: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  slot: { width: stride, paddingRight: 8 },
  stop: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  selected: { borderColor: colors.green, backgroundColor: colors.pale },
  number: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pale },
  selectedNumber: { backgroundColor: colors.ink },
  numberText: { color: colors.ink, fontSize: 11, fontWeight: '700' }, selectedText: { color: colors.paper },
  details: { flex: 1, minWidth: 0, gap: 2 }, name: { color: colors.ink, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 10, lineHeight: 15 },
});
