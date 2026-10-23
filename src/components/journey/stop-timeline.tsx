import { theme } from '@/theme/mobile-theme';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { JourneyStop } from '@/types/journey';
import { JourneyPhoto } from '@/components/discovery/journey-photo';
import { colors, ui } from '@/components/discovery/ui';
import { stopIndexAtOffset } from '@/lib/journey/story-layout';

type CarouselProps = { stops: JourneyStop[]; horizontal: true; selectedId: string | null; onSelect: (id: string) => void; onDetails: (id: string) => void; stacked?: boolean; compact?: boolean };
export function StopTimeline(props: CarouselProps | { stops: JourneyStop[]; horizontal?: false }) {
  return props.horizontal ? <HorizontalStopTimeline {...props} /> : <VerticalStopTimeline stops={props.stops} />;
}
// The private draft screen continues using its existing read-only vertical presentation.
function VerticalStopTimeline({ stops }: { stops: JourneyStop[] }) {
  if (!stops.length) return <View style={vertical.empty}><Text style={ui.sectionTitle}>The itinerary is still unwritten</Text><Text style={vertical.description}>The creator hasn’t added stops yet. Enjoy the story and check back for more places.</Text></View>;
  return <View><View style={vertical.heading}><View style={vertical.rule} /><Text style={ui.eyebrow}>THE PLACES IN BETWEEN</Text></View><Text accessibilityRole="header" style={vertical.title}>Along the way</Text>{stops.map((stop, index) => <View key={stop.id} style={vertical.row}>
    <View style={vertical.rail}><View style={vertical.number}><Text style={vertical.numberText}>{index + 1}</Text></View>{index < stops.length - 1 && <View style={vertical.line} />}</View>
    <View style={vertical.stop}>
<View style={vertical.stopHeader}>{stop.dayNumber !== null && <Text style={vertical.day}>DAY {stop.dayNumber}</Text>}<Text accessibilityRole="header" style={vertical.name}>{stop.name}</Text></View>
      {stop.photo && <View style={vertical.photo}><JourneyPhoto uri={stop.photo} label={stop.name + ' photo'} ratio={1.3} /></View>}
      {!!stop.description.trim() && <Text style={vertical.description}>{stop.description}</Text>}
      {stop.rating !== null && <Text accessibilityLabel={'Creator rating: ' + stop.rating + ' out of 5'} style={vertical.rating}>★ {stop.rating}/5 <Text style={vertical.ratingLabel}> · Creator’s rating</Text></Text>}
    </View>
  </View>)}</View>;
}
const vertical = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }, rule: { height: 1, width: 24, backgroundColor: colors.green },
  stopHeader: { minHeight: 30, gap: 4 }, empty: { padding: 20, gap: 10, borderRadius: 20, backgroundColor: colors.white },
  ratingLabel: { color: colors.muted, fontWeight: '400', fontSize: 11 },
  title: { fontSize: 25, lineHeight: 32, marginBottom: 22, color: colors.ink, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, paddingBottom: 18 }, rail: { width: 30, alignItems: 'center' },
  number: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 12, color: colors.paper, fontWeight: '600' }, line: { width: 1, flex: 1, backgroundColor: theme.border, marginVertical: 7 },
  stop: { flex: 1, minWidth: 0, padding: 14, gap: 12, backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.line },
  day: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, color: colors.green }, name: { fontSize: 19, lineHeight: 26, color: colors.ink, fontWeight: '600' },
  photo: { borderRadius: 18, overflow: 'hidden' }, description: { color: colors.muted, fontSize: 14, lineHeight: 23 }, rating: { fontSize: 12, color: colors.ink, lineHeight: 20, fontWeight: '600' },
});

function HorizontalStopTimeline({ stops, selectedId, onSelect, onDetails, stacked = false, compact = false }: {
  stops: JourneyStop[]; selectedId: string | null; onSelect: (id: string) => void; onDetails: (id: string) => void; stacked?: boolean; compact?: boolean;
}) {
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true, changed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active && !changed) setReduceMotion(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; if (active) setReduceMotion(value); });
    return () => { active = false; listener.remove(); };
  }, []);
  const cards = useRef<FlatList<JourneyStop>>(null);
  const thumbnails = useRef<FlatList<JourneyStop>>(null);
  const [width, setWidth] = useState(0);
  const index = Math.max(0, stops.findIndex(stop => stop.id === selectedId));
  const stride = Math.max(1, Math.round(width * (stacked ? 1 : 0.88)));
  const lastOffset = useRef(-1);
  const lastSelected = useRef(selectedId);
  const dragging = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ stops, onSelect, stride });
  useEffect(() => { latest.current = { stops, onSelect, stride }; }, [stops, onSelect, stride]);
  useEffect(() => {
    lastSelected.current = selectedId;
    if (!width || dragging.current) return;
    const offset = index * stride;
    if (lastOffset.current !== offset) {
      cards.current?.scrollToOffset({ offset, animated: lastOffset.current >= 0 && !reduceMotion });
      lastOffset.current = offset;
    }
    thumbnails.current?.scrollToOffset({ offset: Math.max(0, index * 66 - width / 2 + 33), animated: true });
  }, [index, stride, width, selectedId, reduceMotion]);
  useEffect(() => () => { if (settleTimer.current) clearTimeout(settleTimer.current); }, []);
  function settle(offset: number) {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    dragging.current = false;
    const current = latest.current;
    const next = stopIndexAtOffset(offset, current.stride, current.stops.length);
    lastOffset.current = next * current.stride;
    const stop = current.stops[next];
    if (stop && stop.id !== lastSelected.current) { lastSelected.current = stop.id; current.onSelect(stop.id); }
  }
  function dragEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const offset = event.nativeEvent.targetContentOffset?.x ?? event.nativeEvent.contentOffset.x;
    // A slow drag may have no momentum event. Momentum start cancels this fallback.
    settleTimer.current = setTimeout(() => settle(offset), 150);
  }
  if (!stops.length) return <View style={styles.empty}><Text style={styles.name}>Places still to come</Text><Text style={styles.note}>The creator hasn’t added stops yet.</Text></View>;
  return <View style={stacked ? styles.deck : styles.section} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {!stacked && <FlatList testID="journey-stop-thumbnails" ref={thumbnails} horizontal data={stops} extraData={selectedId} keyExtractor={stop => stop.id} showsHorizontalScrollIndicator={false}
      style={styles.timeline} contentContainerStyle={styles.thumbnailContent} getItemLayout={(_, i) => ({ length: 66, offset: i * 66, index: i })}
      renderItem={({ item, index: i }) => <View style={styles.thumbnailSlot}>
        {i < stops.length - 1 && <View style={styles.connector} />}
        <Pressable accessibilityRole="button" accessibilityLabel={'Stop ' + (i + 1) + ': ' + item.name} accessibilityState={{ selected: item.id === selectedId }} onPress={() => onDetails(item.id)} style={[styles.thumbnail, item.id === selectedId && styles.selectedThumbnail]}>
          <View style={styles.thumbnailImage}><JourneyPhoto uri={item.photo} label={item.name + ' photo'} ratio={1} thumbnail /></View>
          <View style={styles.number}><Text style={styles.numberLabel}>{i + 1}</Text></View>
        </Pressable>
      </View>} />}
    <View style={styles.progress} accessibilityLiveRegion="polite"><Text style={styles.progressLabel}>Stop {index + 1} of {stops.length}{stops[index]?.dayNumber !== null ? ' · Day ' + stops[index]?.dayNumber : ''}</Text><Text style={styles.swipe}>Swipe to explore →</Text></View>
    {stacked && stops.length > 1 && <View pointerEvents="none" accessible={false} style={styles.stackEdge} />}
    {width > 0 && <FlatList testID="journey-stop-carousel" ref={cards} horizontal data={stops} keyExtractor={stop => stop.id} extraData={selectedId}
      style={stacked ? styles.deckCarousel : styles.carousel} contentContainerStyle={{ paddingRight: Math.max(0, width - stride), height: '100%' }} showsHorizontalScrollIndicator={false}
      directionalLockEnabled nestedScrollEnabled pagingEnabled={stacked} snapToInterval={stride} decelerationRate="fast" disableIntervalMomentum
      getItemLayout={(_, i) => ({ length: stride, offset: i * stride, index: i })}
      scrollEventThrottle={16} onScroll={event => {
        const offset = event.nativeEvent.contentOffset.x;
        if (settleTimer.current) clearTimeout(settleTimer.current);
        // Also covers web/trackpad scrolling and native drags without momentum callbacks.
        settleTimer.current = setTimeout(() => settle(offset), 180);
      }}
      onScrollBeginDrag={() => { dragging.current = true; if (settleTimer.current) clearTimeout(settleTimer.current); }}
      onScrollEndDrag={dragEnd} onMomentumScrollBegin={() => { if (settleTimer.current) clearTimeout(settleTimer.current); }}
      onMomentumScrollEnd={event => settle(event.nativeEvent.contentOffset.x)}
      renderItem={({ item, index: i }) => <View style={{ width: stride, paddingRight: stacked ? 0 : 10, height: '100%' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={'Read stop ' + (i + 1) + ': ' + item.name} accessibilityState={{ selected: item.id === selectedId }} accessibilityHint="Opens the full stop story and photo" onPress={() => onDetails(item.id)} style={styles.card}>
          <View style={stacked ? styles.deckPhoto : { flex: 1 }}><JourneyPhoto uri={item.photo} label={item.name + ' photo'} fill fit={stacked ? 'contain' : 'cover'} /></View>
          {!stacked && <View style={styles.cardShade} pointerEvents="none" />}
          <View style={[styles.cardText, stacked && styles.deckText, compact && { padding: 8 }]} pointerEvents="none">
            <Text maxFontSizeMultiplier={1.3} numberOfLines={compact || stacked ? 1 : 2} style={[styles.cardName, stacked && { color: theme.text }, compact && { fontSize: 18, lineHeight: 23 }]}>{item.name}{compact ? ' ↗' : ''}</Text>
            {!!item.description.trim() && <Text numberOfLines={compact || stacked ? 1 : 2} style={[styles.excerpt, stacked && { color: theme.muted }]}>{item.description}</Text>}
            {!compact && <Text style={[styles.readMore, stacked && { color: theme.accent }]}>{item.rating !== null ? '★ ' + item.rating + '/5 · Creator’s rating · ' : ''}Read story ↗</Text>}
          </View>
        </Pressable>
      </View>} />}
    {stacked && <View style={styles.progress}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous memory" disabled={index === 0} accessibilityState={{ disabled: index === 0 }} onPress={() => { if (index > 0) onSelect(stops[index - 1].id); }} style={[styles.deckControl, index === 0 && { opacity: 0.4 }]}><Text style={styles.progressLabel}>← Previous</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Next memory" disabled={index >= stops.length - 1} accessibilityState={{ disabled: index >= stops.length - 1 }} onPress={() => { if (index < stops.length - 1) onSelect(stops[index + 1].id); }} style={[styles.deckControl, index >= stops.length - 1 && { opacity: 0.4 }]}><Text style={styles.progressLabel}>Next →</Text></Pressable>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  deck: { gap: 8, position: 'relative' },
  deckPhoto: { height: 140, backgroundColor: '#101B2E' },
  deckText: { position: 'relative', backgroundColor: theme.surface, paddingVertical: 6 },
  deckCarousel: { height: 230, flexGrow: 0, borderRadius: 22 },
  stackEdge: { position: 'absolute', top: 19, left: 10, right: 10, height: 230, borderRadius: 22, backgroundColor: '#D6DFF2', transform: [{ rotate: '2deg' }] },
  deckControl: { minHeight: 44, minWidth: 100, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#E7EDF9', alignItems: 'center', justifyContent: 'center' },
  section: { flex: 1, minHeight: 0, gap: 6 },
  timeline: { flexGrow: 0, flexShrink: 0, height: 62 },
  thumbnailContent: { alignItems: 'center' }, thumbnailSlot: { width: 66, height: 60, justifyContent: 'center' },
  connector: { position: 'absolute', left: 48, right: -10, top: 28, height: 2, backgroundColor: theme.border },
  thumbnail: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, padding: 3, borderColor: colors.paper, backgroundColor: colors.paper },
  thumbnailImage: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  selectedThumbnail: { borderColor: colors.ink, backgroundColor: colors.green },
  number: { position: 'absolute', bottom: -1, right: -1, minWidth: 20, borderRadius: 10, alignItems: 'center', backgroundColor: colors.ink },
  numberLabel: { color: colors.white, fontSize: 10, lineHeight: 16, fontWeight: '700' },
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  progressLabel: { fontSize: 11, lineHeight: 17, fontWeight: '600', color: colors.ink, flexShrink: 1 },
  swipe: { fontSize: 10, lineHeight: 17, color: colors.muted },
  carousel: { flex: 1, minHeight: 0 },
  card: { flex: 1, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.pale },
  cardShade: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(6,28,23,0.18)' },
  cardText: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, gap: 3, backgroundColor: 'rgba(5,28,24,0.78)' },
  cardName: { color: colors.white, fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.4 },
  excerpt: { color: '#F3F3EA', fontSize: 12, lineHeight: 18 },
  readMore: { color: '#E4ECD8', fontSize: 10, lineHeight: 16 },
  empty: { flex: 1, justifyContent: 'center', gap: 8, padding: 16 }, name: { fontSize: 18, fontWeight: '600', color: colors.ink }, note: { fontSize: 14, lineHeight: 22, color: colors.muted },
});
