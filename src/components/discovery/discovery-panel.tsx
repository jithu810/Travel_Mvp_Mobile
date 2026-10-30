import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { discoveryCardWidth } from '@/lib/discovery/presentation';
import { useDiscoverySheet } from '@/hooks/use-discovery-sheet';
import { HomeJourneyCard } from './home-journey-card';
import { colors } from './ui';
import { useBuddyProtectedBounds, useBuddyScroll } from '@/hooks/use-buddy-geometry';

export function DiscoveryPanel({ journeys, selectedId, onLocate, onOpen, notice, onClear, onRetrySelection,
  loading, refreshing, error, emptyText, onRefresh, onHeight, onInteraction, availableHeight, availableWidth, bottomClearance = 0, topClearance = 0 }: {
  journeys: PublicJourney[]; selectedId: string | null; onLocate: (id: string) => void; onOpen: (id: string) => void;
  notice: string; onClear: () => void; onRetrySelection?: () => void; loading: boolean; refreshing: boolean;
  error: string | null; emptyText?: string; onRefresh: () => void; onHeight: (height: number) => void; onInteraction: (active: boolean) => void; availableHeight: number; availableWidth: number; bottomClearance?: number; topClearance?: number;
}) {
  // Keep the peek handle and compact cards above the fixed pill. Expanded content
  // scrolls underneath it, with enough trailing space to expose the final actions.
  const clearance = Math.min(Math.max(0, bottomClearance), Math.max(0, availableHeight - 44));
  const publishHeight = useCallback((height: number) => onHeight(height + clearance), [onHeight, clearance]);
  const [chromeHeight, setChromeHeight] = useState(110);
  const [cardHeight, setCardHeight] = useState(142);
  const measureCard = useCallback((height: number) => setCardHeight(previous => Math.max(previous, height)), []);
  const topReserve = Math.min(Math.max(0, topClearance), Math.max(0, availableHeight - clearance - 44));
  const space = Math.max(0, availableHeight - clearance - topReserve);
  const collapsed = Math.min(space, chromeHeight + cardHeight + 14);
  const sheet = useDiscoverySheet(space, publishHeight, onInteraction, { peek: Math.min(44, space), collapsed, expanded: Math.max(collapsed, space - 96) });
  const { expanded } = sheet;
  const protection = useBuddyProtectedBounds(), scroll = useBuddyScroll();
  // Touch/search updates rerender Home; retain the same animation graph.
  const panelHeight = useMemo(() => Animated.add(sheet.height, clearance), [sheet.height, clearance]);
  const [visible, setVisible] = useState(24);
  return <Animated.View {...protection} style={[s.sheet, { height: panelHeight }]}>
    <View onLayout={event => {
      // Expanded descriptions/notices must never redefine the compact snap.
      // Otherwise collapse first lands at the expanded chrome height, then jumps.
      const height = Math.ceil(event.nativeEvent.layout.height);
      if (!expanded && height > 0) setChromeHeight(height);
    }}>
    <View {...sheet.responders.handle}><Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Collapse discovery panel' : 'Expand discovery panel'}
      accessibilityState={{ expanded }} accessibilityHint="Double tap to change panel size"
      onPress={sheet.toggle} style={s.handleButton}>
      <View style={s.handle} /><Text style={s.toggle}>{expanded ? '⌄ Collapse' : '⌃ Explore journeys'}</Text>
    </Pressable></View>
    <View style={s.section}>
      <Text accessibilityRole="header" style={s.heading}>Recently shared</Text>
      <View style={s.tools}>
      <Pressable accessibilityRole="button" accessibilityLabel="Clear located journey" disabled={!selectedId}
        accessibilityState={{ disabled: !selectedId }} onPress={onClear} style={s.clear}>
        <Text style={[s.clearText, !selectedId && s.inactiveClear]}>×</Text>
      </Pressable>
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
    </View>
    <View style={[s.list, !expanded && { marginBottom: clearance }]} {...sheet.responders.content}>
    {[false, true].map(listExpanded => <View key={String(listExpanded)} style={[s.list, { display: expanded === listExpanded ? 'flex' : 'none' }]}>
    {/* Horizontal cards stay inside the protected panel; only vertical list motion changes protected content. */}
    <FlatList {...(listExpanded ? scroll : {})} horizontal={!listExpanded}
      initialNumToRender={listExpanded ? 3 : 2} maxToRenderPerBatch={2} windowSize={3} updateCellsBatchingPeriod={50}
      onScroll={event => { if (listExpanded) { scroll.onScroll(); sheet.offset.current = event.nativeEvent.contentOffset.y; } }} scrollEventThrottle={16}
      data={expanded === listExpanded ? journeys.slice(0, visible) : []} keyExtractor={item => item.id} style={s.list}
      showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={listExpanded}
      contentContainerStyle={[s.items, listExpanded && s.expandedItems, listExpanded && { paddingBottom: clearance + 10 }]}
      renderItem={({ item }) => <HomeJourneyCard journey={item} expanded={listExpanded} width={discoveryCardWidth(availableWidth, listExpanded)}
        selected={selectedId === item.id} onOpen={onOpen} onLocate={onLocate} onHeight={listExpanded ? undefined : measureCard} />}
      ListEmptyComponent={expanded !== listExpanded ? null : <View style={s.empty}>
        {loading ? <><ActivityIndicator color={colors.ink} /><Text style={s.hint}>Finding your next journey…</Text></>
          : <Text style={s.emptyText}>{error ? 'A small detour. Tap Refresh to try again.' : emptyText || 'The next story is still to come. No public journeys yet.'}</Text>}
      </View>}
      ListFooterComponent={expanded !== listExpanded ? null : visible < journeys.length
        ? <Pressable accessibilityRole="button" accessibilityLabel="More journeys" onPress={() => setVisible(count => count + 24)} style={s.more}><Text style={s.refreshText}>More journeys →</Text></Pressable>
        : listExpanded && journeys.length > 0 ? <Text style={s.end}>You’re up to date with recent journeys.</Text> : null}
    /></View>)}
    </View>
  </Animated.View>;
}
const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    backgroundColor: 'rgba(232, 239, 252, 0.97)', overflow: 'hidden', borderWidth: 1, borderBottomWidth: 0, borderColor: '#FFFFFF66' },
  handleButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 4 },
  handle: { width: 32, height: 4, borderRadius: 3, backgroundColor: '#8496B3' },
  toggle: { fontSize: 9, fontWeight: '600', color: colors.muted },
  tools: { flexDirection: 'row', alignItems: 'center' },
  section: { minHeight: 36, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { flexShrink: 1, fontSize: 18, fontWeight: '700', color: '#14243F' },
  refresh: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  refreshText: { fontSize: 11, color: '#235BB2', fontWeight: '600' },
  description: { color: colors.muted, fontSize: 12, lineHeight: 18, marginHorizontal: 18, marginBottom: 6 },
  notice: { flexDirection: 'row', alignItems: 'center', minHeight: 22, paddingHorizontal: 18 },
  hint: { flex: 1, fontSize: 10, lineHeight: 14, color: colors.muted },
  clear: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 21, color: colors.ink },
  inactiveClear: { color: '#8593A8' },
  list: { flex: 1 },
  items: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, gap: 12, alignItems: 'flex-start' },
  expandedItems: { alignItems: 'center' },
  empty: { maxWidth: 300, minHeight: 92, padding: 16, gap: 8, justifyContent: 'center' },
  emptyText: { color: colors.ink, fontSize: 12, lineHeight: 18 },
  more: { minHeight: 44, minWidth: 120, padding: 16, alignItems: 'center', justifyContent: 'center' },
  end: { color: colors.muted, fontSize: 11, paddingVertical: 16 },
});
