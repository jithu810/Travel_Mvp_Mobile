import { theme } from '@/theme/mobile-theme';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, colors, ui } from '../discovery/ui';
import { JourneyPhoto } from '../discovery/journey-photo';
import { StopArt } from '@/components/art/journey-art';
import { artSeed } from '@/lib/art/journey-art';
import { StopDeck, type StopDeckHandle } from '@/components/remix/stop-deck';
import { decide, emptySelection, orderedStops, selectedStops, undoSelection } from '@/lib/remix/customize';
import { createCustomizedTravel, customizedTravel, customizedTravelIssue } from '@/lib/journey/customized-travel';
import { useTripSnapshot } from '@/hooks/use-trip-session';
import type { PublicJourney } from '@/types/journey';

export function CustomizeStops({ journey }: { journey: PublicJourney }) {
  const router = useRouter();
  const [selection, setSelection] = useState(emptySelection);
  const [tight, setTight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const focused = useRef(false);
  const opening = useRef(false);
  const preview = useRef<{ signature: string; id: string } | null>(null);
  const [previewId, setPreviewId] = useState('');
  const previewJourney = previewId ? customizedTravel(previewId) : null;
  const session = useTripSnapshot(previewJourney?.id ?? '');
  const locked = session.status === 'active' || session.status === 'paused';
  const ordered = useMemo(() => orderedStops(journey.stops), [journey.stops]);
  const selected = useMemo(() => selectedStops(ordered, selection), [ordered, selection]);
  useFocusEffect(useCallback(() => {
    focused.current = true; opening.current = false; setActive(true);
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { router.back(); return true; });
    return () => { focused.current = false; setActive(false); subscription.remove(); };
  }, [router]));
  const commit = useCallback((keep: boolean, id: string) => {
    if (focused.current && !opening.current && !locked) setSelection(previous => ordered[previous.cursor]?.id === id ? decide(previous, ordered, keep) : previous);
  }, [ordered, locked]);
  const deck = useRef<StopDeckHandle>(null);
  const stop = ordered[selection.cursor];
  const skipped = ordered.filter(item => selection.decisions[item.id] === false);
  function choose(keep: boolean) { if (locked || opening.current || !stop) return; if (deck.current) deck.current.play(keep); else commit(keep, stop.id); }
  function undo() {
    const last = selection.history.at(-1);
    if (locked || opening.current || !last) return;
    if (deck.current && !deck.current.restore(selection.decisions[last.id] === true, last.id)) return;
    setSelection(undoSelection); setError(null);
  }
  const issue = customizedTravelIssue(journey, selected.map(item => item.id));
  function viewJourney() {
    if (!focused.current || opening.current || stop || issue) return;
    opening.current = true;
    try {
      const signature = JSON.stringify(selected.map(item => item.id));
      if (preview.current?.signature !== signature) preview.current = { signature, id: createCustomizedTravel(journey, selected.map(item => item.id)) };
      setPreviewId(preview.current.id);
      router.push({ pathname: '/customized/[id]', params: { id: preview.current.id } });
    } catch (cause) { opening.current = false; setError(cause instanceof Error ? cause.message : 'Unable to open your selected stops.'); }
  }
  const undoAction = <Action label="Undo" compact disabled={locked || !selection.history.length} secondary onPress={undo} />;
  return <>
    <View style={[ui.header, ui.compactHeader]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Exit customization" onPress={() => router.back()} style={ui.back}><Text style={ui.backText}>‹</Text></Pressable>
      <Text accessibilityRole="header" style={ui.headerTitle}>Customize stops</Text>
    </View>
    <View style={styles.deckStep} onLayout={event => { const height = event.nativeEvent.layout.height; setTight(previous => previous ? height < 460 : height < 360); }}>
      <View style={styles.intro}>
        <Text style={ui.eyebrow}>MAKE IT YOURS</Text>
        <Text numberOfLines={1} style={styles.journeyTitle}>{journey.title}</Text>
        {!tight && <Text numberOfLines={2} style={styles.caption}>Choose the places you want to explore. Your selection is for this trip only. The original journey stays unchanged.</Text>}
      </View>
      <View style={styles.progressRow}><Text accessibilityLiveRegion="polite" style={styles.progress}>{stop ? 'Stop ' + (selection.cursor + 1) + ' of ' + ordered.length : 'All ' + ordered.length + ' stops decided'}</Text><Text style={styles.caption}>{selected.length} selected · {skipped.length} discarded</Text></View>
      <StopDeck ref={deck} stops={ordered} cursor={selection.cursor} decisions={selection.decisions} disabled={locked} active={active} onDecide={commit}
        card={stop && <View style={styles.card}>
          <View style={styles.cardPhoto}><JourneyPhoto uri={stop.photo} label={stop.name} fill fallback={<StopArt seed={artSeed(journey.id, ordered)} stops={ordered} index={selection.cursor} name={stop.name} accessibilityLabel={'Stop art. ' + (stop.photo ? 'Photo unavailable. ' : 'No photo yet. ') + (stop.name || 'Unnamed stop')} />} /></View>
          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={ui.eyebrow}>ORIGINAL STOP {selection.cursor + 1}{stop.dayNumber ? ' · DAY ' + stop.dayNumber : ''}</Text>
            <Text accessibilityRole="header" numberOfLines={tight ? 1 : 2} style={styles.cardTitle}>{stop.name || 'Unnamed stop'}</Text>
            <Text numberOfLines={1} style={styles.caption}>Category unavailable</Text>
            <Text numberOfLines={tight ? 2 : 3} style={ui.body}>{stop.description || 'No description available.'}</Text>
            {selection.decisions[stop.id] !== undefined && <Text numberOfLines={1} style={styles.status}>Current selection: {selection.decisions[stop.id] ? 'Select' : 'Discard'}</Text>}
          </View>
        </View>}
        empty={<View style={styles.ready}><Text style={styles.readySymbol}>✓</Text><Text accessibilityRole="header" style={ui.sectionTitle}>Your stops, your journey</Text><Text style={[ui.body, styles.center]}>{selected.length} selected · {skipped.length} discarded. View the map and cards for your selected stops in their original order.</Text></View>} />
      {locked && <Text style={styles.notice}>Finish your current trip in Travel Mode before changing selected stops. View selected journey to return to your session.</Text>}
      {error && <Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
    </View>
    <View style={styles.dock}>
      {stop ? <>
        <Text style={styles.direction}>Swipe down to discard · Swipe up to select</Text>
        {!tight && <Text style={styles.optional}>Or tap a button — swiping is optional.</Text>}
        <View style={styles.actions}><View style={styles.actionCell}><Action label="Discard" disabled={locked} accessibilityLabel={'Discard ' + stop.name} secondary onPress={() => choose(false)} /></View>
          {undoAction}
          <View style={styles.actionCell}><Action label="Select" disabled={locked} accessibilityLabel={'Select ' + stop.name} onPress={() => choose(true)} /></View></View>
      </> : <>
        {issue && <Text accessibilityRole="alert" style={styles.notice}>{issue} Use Undo to change your choices.</Text>}
        <Action disabled={!active || !!issue} label="View selected journey" onPress={viewJourney} />
        {undoAction}
      </>}
    </View>
  </>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 20, gap: 16 },
  deckStep: { flex: 1, minHeight: 0, overflow: 'hidden', paddingHorizontal: 18, paddingTop: 2, paddingBottom: 6, gap: 8 },
  intro: { gap: 5 },
  journeyTitle: { color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.5 },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  progress: { color: colors.ink, fontSize: 13, fontWeight: '700', lineHeight: 20 },
  card: { flex: 1, backgroundColor: theme.surface },
  cardPhoto: { flex: 1, minHeight: 40, overflow: 'hidden' },
  cardBody: { flexShrink: 1, paddingHorizontal: 16, paddingVertical: 10, gap: 3, overflow: 'hidden' },
  cardTitle: { color: colors.ink, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5 },
  dock: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8, gap: 8, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.line, flexShrink: 0 },
  direction: { color: colors.ink, fontSize: 12, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  optional: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 }, actionCell: { flex: 1, minWidth: 0 },
  summary: { flexDirection: 'row', backgroundColor: theme.lavender, borderRadius: 22, padding: 16, alignItems: 'center' },
  summaryCell: { flex: 1, alignItems: 'center', gap: 3 },
  summaryNumber: { color: colors.ink, fontSize: 26, lineHeight: 32, fontWeight: '700' },
  summaryLabel: { color: theme.muted, fontSize: 12, lineHeight: 18 },
  summaryDivider: { width: 1, height: 38, backgroundColor: theme.border },
  section: { gap: 10 }, sectionTitle: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  reviewStop: { borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 10 },
  skippedStop: { backgroundColor: theme.inset },
  stopRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, stopCopy: { flex: 1, minWidth: 0, gap: 3 },
  position: { minWidth: 32, minHeight: 32, padding: 6, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pale },
  skippedPosition: { backgroundColor: theme.border }, positionText: { fontSize: 12, color: colors.ink, fontWeight: '700' },
  stopTitle: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  status: { color: '#356147', fontSize: 12, lineHeight: 18, fontWeight: '600' }, skippedStatus: { color: '#666C61' },
  empty: { padding: 14, borderRadius: 16, backgroundColor: colors.pale, color: colors.ink, fontSize: 13, lineHeight: 20 },
  endpoints: { padding: 12, borderRadius: 16, backgroundColor: colors.pale, gap: 6 },
  notice: { color: colors.ink, fontSize: 13, lineHeight: 20, padding: 14, borderRadius: 16, backgroundColor: '#F4E8D5' },
  loading: { gap: 8, alignItems: 'center' }, ready: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, gap: 10 }, center: { textAlign: 'center' },
  readySymbol: { fontSize: 36, color: colors.ink, backgroundColor: colors.pale, padding: 16, borderRadius: 40 },
});
