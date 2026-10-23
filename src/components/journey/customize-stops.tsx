import { theme } from '@/theme/mobile-theme';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, BackHandler, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Action, colors, ui } from '../discovery/ui';
import { JourneyPhoto } from '../discovery/journey-photo';
import { JourneyMap } from './map/journey-map';
import { useSessionState } from '@/hooks/session-context';
import { useLoad } from '@/hooks/use-load';
import { randomUUID } from '@/lib/create/id';
import { decide, emptySelection, orderedStops, requestSelectedRoute, selectedStops, selectionIssue, undoSelection } from '@/lib/remix/customize';
import { remixStore } from '@/lib/remix/model';
import { remixSelectedJourney } from '@/lib/remix/queries';
import { routeSummary } from '@/lib/journey/navigation';
import type { JourneyStop, PublicJourney } from '@/types/journey';

export function CustomizeStops({ journey }: { journey: PublicJourney }) {
  const router = useRouter();
  const auth = useSessionState();
  const userId = auth.session?.user.id;
  const [selection, setSelection] = useState(emptySelection);
  const [review, setReview] = useState(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [selection.cursor, review]);
  const [idError, setIdError] = useState<string | null>(null);
  const focused = useRef(false);
  const [routeFocused, setRouteFocused] = useState(true);
  const draftIdRef = useRef<string | null>(null);
  const account = useRef(userId);
  const ordered = useMemo(() => orderedStops(journey.stops), [journey.stops]);
  const selected = useMemo(() => selectedStops(ordered, selection), [ordered, selection]);
  const issue = selectionIssue(selected);
  const key = 'selected:' + journey.id + ':' + (userId ?? 'anonymous') + ':' + JSON.stringify(selected.map(stop => stop.id));
  const get = useCallback(() => remixStore.get(key), [key]);
  const copy = useSyncExternalStore(remixStore.subscribe, get, get);
  const locked = copy.busy || (review && (copy.blocked || !!copy.copyId));
  const back = useCallback(() => {
    if (copy.busy) return;
    if (review && !locked) { setSelection(previous => ({ ...previous, cursor: 0 })); setReview(false); scroll.current?.scrollTo({ y: 0, animated: false }); } else router.back();
  }, [review, locked, copy.busy, router]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    account.current = userId;
    setRouteFocused(true);
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => { focused.current = false; setRouteFocused(false); subscription.remove(); };
  }, [back, userId]));
  const routeLoader = useCallback((signal: AbortSignal) => review && routeFocused && !issue
    ? requestSelectedRoute(selected, process.env.EXPO_PUBLIC_MAPBOX_TOKEN, signal) : Promise.resolve(null), [review, routeFocused, issue, selected]);
  const route = useLoad(routeLoader);
  const choose = useCallback((keep: boolean) => { if (!locked) setSelection(previous => decide(previous, ordered, keep)); }, [locked, ordered]);
  // No card animations: system Reduce Motion is respected without removing gesture controls.
  const gesture = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, value) => !review && !locked && Math.abs(value.dx) > 18 && Math.abs(value.dx) > Math.abs(value.dy) * 1.5,
    onPanResponderRelease: (_, value) => { if (Math.abs(value.dx) >= 70 && Math.abs(value.dx) > Math.abs(value.dy) * 1.5) choose(value.dx > 0); },
  }), [choose, review, locked]);
  const stop = ordered[selection.cursor];
  const skipped = ordered.filter(item => selection.decisions[item.id] === false);
  function reviewStop(item: JourneyStop) {
    const index = ordered.indexOf(item);
    const kept = selection.decisions[item.id] === true;
    const restored = kept && selection.history.findLast(entry => entry.id === item.id)?.previous === false;
    return <View key={item.id} style={[styles.reviewStop, !kept && styles.skippedStop]}>
      <View style={styles.stopRow}>
        <View style={[styles.position, !kept && styles.skippedPosition]}><Text style={styles.positionText}>{index + 1}</Text></View>
        <View style={styles.stopCopy}>
          <Text style={styles.stopTitle}>{item.name || 'Unnamed stop'}</Text>
          <Text style={styles.caption}>Original stop {index + 1}{item.dayNumber ? ' · Day ' + item.dayNumber : ''}</Text>
          <Text style={[styles.status, !kept && styles.skippedStatus]}>{kept ? restored ? 'Restored · selected' : 'Selected' : 'Skipped'}</Text>
        </View>
      </View>
      <Action compact secondary label={(kept ? 'Skip ' : 'Restore ') + item.name} disabled={locked} onPress={() => setSelection(previous => ({ ...previous,
        decisions: { ...previous.decisions, [item.id]: !previous.decisions[item.id] },
        history: [...previous.history, { id: item.id, previous: previous.decisions[item.id], cursor: index }] }))} />
    </View>;
  }
  async function confirm() {
    if (issue || route.loading || route.error || locked || auth.loading) return;
    if (!userId) { router.push('/auth'); return; }
    let id = draftIdRef.current;
    if (!id) {
      try { id = randomUUID(); draftIdRef.current = id; } catch (error) { setIdError(error instanceof Error ? error.message : 'Secure ID unavailable.'); return; }
    }
    const result = await remixStore.run(key, () => remixSelectedJourney(journey.id, selected.map(item => item.id), id!, userId));
    if (result && focused.current && account.current === userId) router.replace({ pathname: '/create', params: { draft: result } });
  }
  return <>
    <View style={[ui.header, ui.compactHeader]}>
      <Pressable accessibilityRole="button" accessibilityLabel={review ? 'Back to stop selections' : 'Exit customization'} disabled={copy.busy} accessibilityState={{ disabled: copy.busy }} onPress={back} style={ui.back}><Text style={ui.backText}>‹</Text></Pressable>
      <Text accessibilityRole="header" style={ui.headerTitle}>{review ? 'Review your stops' : 'Customize stops'}</Text>
    </View>
    <ScrollView ref={scroll} contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text style={ui.eyebrow}>{review ? 'STEP 2 · YOUR ROUTE' : 'STEP 1 · MAKE IT YOURS'}</Text>
        <Text style={styles.journeyTitle}>{journey.title}</Text>
        <Text style={styles.caption}>{review ? 'Check what stays in your journey. You can still change your mind.' : 'Choose the places you want to explore. The original journey stays unchanged.'}</Text>
      </View>
      {review ? <>
        <View style={styles.summary} accessibilityLiveRegion="polite">
          <View style={styles.summaryCell}><Text style={styles.summaryNumber}>{selected.length}</Text><Text style={styles.summaryLabel}>Selected</Text></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}><Text style={styles.summaryNumber}>{skipped.length}</Text><Text style={styles.summaryLabel}>Skipped</Text></View>
        </View>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Selected stops · {selected.length}</Text>
          <Text style={styles.caption}>Included in your route, in the original order.</Text>
          {selected.length ? selected.map(reviewStop) : <Text style={styles.empty}>No stops selected. Restore a stop below to include it.</Text>}
        </View>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Skipped stops · {skipped.length}</Text>
          <Text style={styles.caption}>Not included. Restore adds a stop back in its original position.</Text>
          {skipped.length ? skipped.map(reviewStop) : <Text style={styles.empty}>Nothing skipped — all stops are included.</Text>}
        </View>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Your route preview</Text>
          {issue ? <Text accessibilityRole="alert" style={styles.notice}>{issue}</Text> : <>
            <View style={styles.endpoints}><Text style={styles.caption}>START · {selected[0]?.name}</Text><Text style={styles.caption}>END · {selected.at(-1)?.name}</Text></View>
            <JourneyMap stops={selected} navigationRoute={route.data?.geometry} animateMemoryRoute={false} />
            {route.loading ? <View style={styles.loading} accessibilityLabel="Calculating selected-stop route"><ActivityIndicator /><Text style={styles.caption}>Calculating your selected route…</Text></View>
              : route.error ? <><Text accessibilityRole="alert" style={styles.notice}>{route.error}</Text><Action label="Retry route preview" onPress={route.retry} /></>
                : <Text accessibilityLiveRegion="polite" style={styles.caption}>{route.data ? routeSummary(route.data) : 'One stop selected · marker preview; no connecting road route needed.'}</Text>}
          </>}
          <Text style={styles.caption}>Skipping removes a stop as a waypoint. Roads may still pass its location.</Text>
        </View>
        <Text style={styles.caption}>A private draft keeps credit to the original creator. Nothing is created until confirmation succeeds.</Text>
        <Action label="Revisit selections" secondary disabled={locked} onPress={() => { setSelection(previous => ({ ...previous, cursor: 0 })); setReview(false); scroll.current?.scrollTo({ y: 0, animated: false }); }} />
      </> : stop ? <>
        <View style={styles.progressRow}><Text accessibilityLiveRegion="polite" style={styles.progress}>Stop {selection.cursor + 1} of {ordered.length}</Text><Text style={styles.caption}>{selected.length} selected · {skipped.length} skipped</Text></View>
        <View {...gesture.panHandlers} style={styles.card}>
          <JourneyPhoto uri={stop.photo} label={stop.name} ratio={2.3} />
          <View style={styles.cardBody}>
            <Text style={ui.eyebrow}>ORIGINAL STOP {selection.cursor + 1}{stop.dayNumber ? ' · DAY ' + stop.dayNumber : ''}</Text>
            <Text accessibilityRole="header" style={styles.cardTitle}>{stop.name || 'Unnamed stop'}</Text>
            <Text style={styles.caption}>Category unavailable</Text>
            <Text style={ui.body}>{stop.description || 'No description available.'}</Text>
            {selection.decisions[stop.id] !== undefined && <Text style={styles.status}>Current selection: {selection.decisions[stop.id] ? 'Keep' : 'Skip'}</Text>}
          </View>
        </View>
      </> : <View style={styles.ready}><Text style={styles.readySymbol}>✓</Text><Text accessibilityRole="header" style={ui.sectionTitle}>Your stops, your journey</Text><Text style={ui.body}>{selected.length} selected · {skipped.length} skipped. Review your choices and route next.</Text></View>}
      {(copy.error || idError) && <Text accessibilityRole="alert" style={styles.notice}>{copy.error || idError}</Text>}
      {copy.copyId && <Action label="Open my draft" onPress={() => router.replace({ pathname: '/create', params: { draft: copy.copyId! } })} />}
      {copy.blocked && <Action label="Check Account drafts" onPress={() => router.push('/account')} />}
      <Action label="Exit customization" secondary disabled={copy.busy} onPress={() => router.back()} />
    </ScrollView>
    <View style={styles.dock}>
      {!review && stop && <>
        <View style={styles.directionRow}><Text style={styles.direction}>← Swipe left to skip</Text><Text style={styles.direction}>Swipe right to keep →</Text></View>
        <Text style={styles.optional}>Or tap a button — swiping is optional.</Text>
        <View style={styles.actions}><View style={styles.actionCell}><Action label="Skip" accessibilityLabel={'Skip ' + stop.name} disabled={locked} secondary onPress={() => choose(false)} /></View>
          <View style={styles.actionCell}><Action label="Keep" accessibilityLabel={'Keep ' + stop.name} disabled={locked} onPress={() => choose(true)} /></View></View>
      </>}
      {review && <Action label={copy.busy ? 'Creating your draft…' : 'Confirm and create draft'} disabled={!!issue || route.loading || !!route.error || locked || auth.loading} onPress={() => { void confirm(); }} />}
      {!review && !stop && <Action label="Review selected stops" disabled={locked || selection.cursor < ordered.length} onPress={() => { setReview(true); scroll.current?.scrollTo({ y: 0, animated: false }); }} />}
      <Action label="Undo" compact disabled={locked || !selection.history.length} secondary onPress={() => { setSelection(undoSelection); setReview(false); scroll.current?.scrollTo({ y: 0, animated: false }); }} />
    </View>
  </>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 20, gap: 16 },
  intro: { gap: 5 },
  journeyTitle: { color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.5 },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  progress: { color: colors.ink, fontSize: 13, fontWeight: '700', lineHeight: 20 },
  card: { borderRadius: 24, backgroundColor: theme.surface, borderWidth: 1, borderColor: colors.white, overflow: 'hidden', boxShadow: '0 3px 8px rgba(21,62,53,0.09)' },
  cardBody: { padding: 16, gap: 8 },
  cardTitle: { color: colors.ink, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5 },
  dock: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8, gap: 8, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.line, flexShrink: 0 },
  directionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  direction: { color: colors.ink, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  optional: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12 }, actionCell: { flex: 1, minWidth: 0 },
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
  loading: { gap: 8, alignItems: 'center' }, ready: { alignItems: 'center', paddingVertical: 28, gap: 12 },
  readySymbol: { fontSize: 36, color: colors.ink, backgroundColor: colors.pale, padding: 16, borderRadius: 40 },
});
