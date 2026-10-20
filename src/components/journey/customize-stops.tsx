import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, BackHandler, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import { Action, ui } from '../discovery/ui';
import { JourneyPhoto } from '../discovery/journey-photo';
import { JourneyMap } from './map/journey-map';
import { useSessionState } from '@/hooks/session-context';
import { useLoad } from '@/hooks/use-load';
import { randomUUID } from '@/lib/create/id';
import { decide, emptySelection, orderedStops, requestSelectedRoute, selectedStops, selectionIssue, undoSelection } from '@/lib/remix/customize';
import { remixStore } from '@/lib/remix/model';
import { remixSelectedJourney } from '@/lib/remix/queries';
import { routeSummary } from '@/lib/journey/navigation';
import type { PublicJourney } from '@/types/journey';

export function CustomizeStops({ journey }: { journey: PublicJourney }) {
  const router = useRouter();
  const auth = useSessionState();
  const userId = auth.session?.user.id;
  const [selection, setSelection] = useState(emptySelection);
  const [review, setReview] = useState(false);
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
    if (review && !locked) { setSelection(previous => ({ ...previous, cursor: 0 })); setReview(false); } else router.back();
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
    <View style={[ui.header, { gap: 12 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={review ? 'Back to stop selections' : 'Exit customization'} disabled={copy.busy} accessibilityState={{ disabled: copy.busy }} onPress={back} style={ui.back}><Text style={ui.backText}>‹</Text></Pressable>
      <Text accessibilityRole="header" style={ui.headerTitle}>{review ? 'Review your stops' : 'Customize stops'}</Text>
    </View>
    <ScrollView contentContainerStyle={[ui.list, { gap: 16 }]}>
      <Text style={ui.body}>{journey.title} · Your draft keeps credit to the original creator. The published journey stays unchanged.</Text>
      {review ? <>
        <Text style={ui.sectionTitle}>{selected.length} selected {selected.length === 1 ? 'stop' : 'stops'}</Text>
        {issue ? <Text accessibilityRole="alert" style={ui.body}>{issue}</Text> : <>
          <Text style={ui.body}>Start: {selected[0]?.name} · End: {selected.at(-1)?.name}</Text>
          <JourneyMap stops={selected} navigationRoute={route.data?.geometry} animateMemoryRoute={false} />
          {route.loading ? <View accessibilityLabel="Calculating selected-stop route"><ActivityIndicator /><Text style={ui.body}>Calculating your selected route…</Text></View>
            : route.error ? <><Text accessibilityRole="alert" style={ui.body}>{route.error}</Text><Action label="Retry route preview" onPress={route.retry} /></>
              : <Text accessibilityLiveRegion="polite" style={ui.body}>{route.data ? routeSummary(route.data) : 'One stop selected · marker preview; no connecting road route needed.'}</Text>}
        </>}
        <Text style={ui.body}>Stops stay in the original order. Skipping a stop removes it as a waypoint; roads may still pass its location.</Text>
        {ordered.map((item, index) => <View key={item.id} style={{ gap: 6 }}>
          <Text style={ui.body}>{index + 1}. {item.name} · {selection.decisions[item.id] ? 'Keep' : 'Skip'}</Text>
          <Action secondary label={(selection.decisions[item.id] ? 'Skip ' : 'Restore ') + item.name} disabled={locked} onPress={() => setSelection(previous => ({ ...previous,
            decisions: { ...previous.decisions, [item.id]: !previous.decisions[item.id] },
            history: [...previous.history, { id: item.id, previous: previous.decisions[item.id], cursor: index }] }))} />
        </View>)}
        <Action label="Revisit selections" secondary disabled={locked} onPress={() => { setSelection(previous => ({ ...previous, cursor: 0 })); setReview(false); }} />
        <Action label={copy.busy ? 'Creating your draft…' : 'Confirm and create draft'} disabled={!!issue || route.loading || !!route.error || locked || auth.loading} onPress={() => { void confirm(); }} />
      </> : stop ? <>
        <View {...gesture.panHandlers} style={{ gap: 14 }}>
          <Text accessibilityLiveRegion="polite" style={ui.eyebrow}>Stop {selection.cursor + 1} of {ordered.length} · Original position {selection.cursor + 1}</Text>
          <JourneyPhoto uri={stop.photo} label={stop.name} />
          <Text accessibilityRole="header" style={ui.heading}>{stop.name || 'Unnamed stop'}</Text>
          <Text style={ui.body}>Category unavailable{stop.dayNumber ? ' · Day ' + stop.dayNumber : ''}</Text>
          <Text style={ui.body}>{stop.description || 'No description available.'}</Text>
          <Text style={ui.body}>Swipe right to Keep, left to Skip, or use the buttons below.</Text>
          {selection.decisions[stop.id] !== undefined && <Text style={ui.body}>Current selection: {selection.decisions[stop.id] ? 'Keep' : 'Skip'}</Text>}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><Action label="Skip" accessibilityLabel={'Skip ' + stop.name} disabled={locked} secondary onPress={() => choose(false)} /></View>
          <View style={{ flex: 1 }}><Action label="Keep" accessibilityLabel={'Keep ' + stop.name} disabled={locked} onPress={() => choose(true)} /></View></View>
      </> : <><Text style={ui.sectionTitle}>Selections ready</Text><Text style={ui.body}>{selected.length} stops kept. Review your route before creating a draft.</Text></>}
      <Action label="Undo" disabled={locked || !selection.history.length} secondary onPress={() => { setSelection(undoSelection); setReview(false); }} />
      {!review && <Action label="Review selected stops" disabled={locked || selection.cursor < ordered.length} onPress={() => setReview(true)} />}
      {(copy.error || idError) && <Text accessibilityRole="alert" style={ui.body}>{copy.error || idError}</Text>}
      {copy.copyId && <Action label="Open my draft" onPress={() => router.replace({ pathname: '/create', params: { draft: copy.copyId! } })} />}
      {copy.blocked && <Action label="Check Account drafts" onPress={() => router.push('/account')} />}
      <Action label="Exit customization" secondary disabled={copy.busy} onPress={() => router.back()} />
    </ScrollView>
  </>;
}
