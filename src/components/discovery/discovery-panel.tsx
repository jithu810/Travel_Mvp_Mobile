import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { discoveryCardWidth, discoveryPanelSize } from '@/lib/discovery/presentation';
import { HomeJourneyCard } from './home-journey-card';
import { colors } from './ui';

export function DiscoveryPanel({ journeys, selectedId, onLocate, onOpen, notice, onClear, onRetrySelection,
  loading, refreshing, error, onRefresh, onHeight, availableHeight, availableWidth }: {
  journeys: PublicJourney[]; selectedId: string | null; onLocate: (id: string) => void; onOpen: (id: string) => void;
  notice: string; onClear: () => void; onRetrySelection?: () => void; loading: boolean; refreshing: boolean;
  error: string | null; onRefresh: () => void; onHeight: (height: number) => void; availableHeight: number; availableWidth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(24);
  const width = discoveryCardWidth(availableWidth, expanded);
  return <View style={[s.sheet, { height: discoveryPanelSize(availableHeight, expanded) }]}
    onLayout={event => onHeight(event.nativeEvent.layout.height)}>
    <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Collapse discovery panel' : 'Expand discovery panel'}
      accessibilityState={{ expanded }} accessibilityHint="Double tap to change panel size"
      onPress={() => setExpanded(value => !value)} style={s.handleButton}>
      <View style={s.handle} /><Text style={s.toggle}>{expanded ? '⌄ Collapse' : '⌃ Explore journeys'}</Text>
    </Pressable>
    <View style={s.section}>
      <Text accessibilityRole="header" style={s.heading}>Recently shared</Text>
      <View style={s.tools}>
      {selectedId && <Pressable accessibilityRole="button" accessibilityLabel="Clear located journey" onPress={onClear} style={s.clear}><Text style={s.clearText}>×</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh journeys" disabled={loading || refreshing}
        accessibilityState={{ disabled: loading || refreshing }} onPress={onRefresh} style={s.refresh}>
        {refreshing ? <ActivityIndicator color={colors.ink} /> : <Text style={s.refreshText}>↻ Refresh</Text>}
      </Pressable>
      </View>
    </View>
    {expanded && <Text style={s.description}>Find a story worth following. Locate its stops or open the full journey.</Text>}
    <View style={s.notice}>
      <Text accessibilityLiveRegion="polite" numberOfLines={expanded ? 3 : 1} style={s.hint}>{notice}</Text>
      {expanded && onRetrySelection && <Pressable accessibilityRole="button" accessibilityLabel="Retry located journey" onPress={onRetrySelection} style={s.refresh}><Text style={s.refreshText}>Retry</Text></Pressable>}
    </View>
    <FlatList key={expanded ? 'expanded' : 'collapsed'} horizontal={!expanded}
      data={journeys.slice(0, visible)} keyExtractor={item => item.id} style={s.list}
      showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={expanded}
      contentContainerStyle={[s.items, expanded && s.expandedItems]}
      renderItem={({ item }) => <HomeJourneyCard journey={item} expanded={expanded} width={width}
        selected={selectedId === item.id} onOpen={onOpen} onLocate={onLocate} />}
      ListEmptyComponent={<View style={s.empty}>
        {loading ? <><ActivityIndicator color={colors.ink} /><Text style={s.hint}>Finding your next journey…</Text></>
          : <Text style={s.emptyText}>{error ? 'A small detour. Tap Refresh to try again.' : 'The next story is still to come. No public journeys yet.'}</Text>}
      </View>}
      ListFooterComponent={visible < journeys.length
        ? <Pressable accessibilityRole="button" accessibilityLabel="More journeys" onPress={() => setVisible(count => count + 24)} style={s.more}><Text style={s.refreshText}>More journeys →</Text></Pressable>
        : expanded && journeys.length > 0 ? <Text style={s.end}>You’re up to date with recent journeys.</Text> : null}
    />
  </View>;
}
const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: colors.paper, overflow: 'hidden', borderWidth: 1, borderBottomWidth: 0, borderColor: '#FFFFFF66' },
  handleButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 4 },
  handle: { width: 32, height: 4, borderRadius: 3, backgroundColor: '#BFC8BA' },
  toggle: { fontSize: 9, fontWeight: '600', color: colors.muted },
  tools: { flexDirection: 'row', alignItems: 'center' },
  section: { minHeight: 36, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 18, fontWeight: '600', color: colors.ink },
  refresh: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  refreshText: { fontSize: 11, color: colors.ink, fontWeight: '600' },
  description: { color: colors.muted, fontSize: 12, lineHeight: 18, marginHorizontal: 18, marginBottom: 6 },
  notice: { flexDirection: 'row', alignItems: 'center', minHeight: 22, paddingHorizontal: 18 },
  hint: { flex: 1, fontSize: 10, lineHeight: 14, color: colors.muted },
  clear: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 21, color: colors.ink },
  list: { flex: 1 },
  items: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, gap: 12, alignItems: 'flex-start' },
  expandedItems: { alignItems: 'center' },
  empty: { maxWidth: 300, minHeight: 92, padding: 16, gap: 8, justifyContent: 'center' },
  emptyText: { color: colors.ink, fontSize: 12, lineHeight: 18 },
  more: { minHeight: 44, minWidth: 120, padding: 16, alignItems: 'center', justifyContent: 'center' },
  end: { color: colors.muted, fontSize: 11, paddingVertical: 16 },
});
