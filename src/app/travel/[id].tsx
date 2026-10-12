import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, Message, ui } from '@/components/discovery/ui';
import { JourneyMap } from '@/components/journey/map/journey-map';
import { MapItinerary } from '@/components/journey/map-itinerary';
import { TripConfirmation } from '@/components/journey/trip-confirmation';
import { useTripElapsed, useTripSnapshot } from '@/hooks/use-trip-session';
import { useTripLocation } from '@/hooks/use-trip-location';
import { locationLabel } from '@/lib/journey/foreground-location';
import { formatTripTime, tripStore, type TripAction, type TripSession } from '@/lib/journey/trip-session';
import { useLoad } from '@/hooks/use-load';
import { loadPublicJourney } from '@/lib/discovery/queries';
import { isJourneyId } from '@/lib/discovery/model';
import { buildMapData, hasCoordinates } from '@/lib/journey/map-data';
import { selectedStopId } from '@/lib/journey/story-layout';
import { canOpenTravelMode } from '@/lib/journey/travel-preview';
import type { PublicJourney } from '@/types/journey';

export default function TravelModeScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const loader = useCallback((signal: AbortSignal) => loadPublicJourney(id, signal), [id]);
  const state = useLoad(loader);
  const session = useTripSnapshot(id);
  const available = session.journey ?? state.data;
  const [leaving, setLeaving] = useState(false);
  const exit = useCallback(() => {
    if (router.canGoBack()) router.back();
    else if (isJourneyId(id)) router.replace({ pathname: '/journey/[id]', params: { id } });
    else router.replace('/discover');
  }, [router, id]);
  const requestExit = useCallback(() => {
    const current = tripStore.get(id);
    if (current.status === 'active' || current.status === 'paused') setLeaving(true);
    else exit();
  }, [id, exit]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { requestExit(); return true; });
    return () => subscription.remove();
  }, [requestExit]));
  return <SafeAreaView style={ui.safe}><View style={[ui.page, styles.page]}>
    {session.journey && state.error && <Text style={styles.routeNote}>Original could not refresh. Using this session’s itinerary.</Text>}
    {canOpenTravelMode(available) ? <TravelModeContent key={available.id} journey={available} onExit={requestExit} /> : <>
      <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Travel Mode</Text><Exit onExit={requestExit} /></View>
      <View style={styles.unavailable}>{state.loading ? <View accessibilityRole="progressbar" accessibilityLabel="Loading journey"><ActivityIndicator color={colors.ink} /><Text style={styles.note}>Opening your itinerary…</Text></View>
        : <Message title="Journey unavailable" body={state.error || 'Choose a public journey with at least one stop to open Travel Mode.'} retry={state.error ? state.retry : undefined} />}</View>
    </>}
    {leaving && <TripConfirmation title="Leave Travel Mode?" body={(session.status === 'active' ? 'Your local timer keeps running while you’re away.' : 'Your local session stays paused.') + ' Reopen this journey’s Travel Mode to return. This session is kept only until the app process closes.'} confirmLabel="Leave and keep session" onCancel={() => setLeaving(false)} onConfirm={() => { setLeaving(false); exit(); }} />}
  </View></SafeAreaView>;
}

function Exit({ onExit }: { onExit: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Exit Travel Mode" onPress={onExit} style={styles.exit}><Text style={styles.exitLabel}>Exit</Text></Pressable>;
}

export function TravelModeContent({ journey, onExit }: { journey: PublicJourney; onExit: () => void }) {
  const compact = useWindowDimensions().height < 700;
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const session = useTripSnapshot(journey.id);
  const elapsed = useTripElapsed(session);
  const location = useTripLocation(journey, session);
  const requesting = location.status === 'requesting';
  const [confirmation, setConfirmation] = useState<{ action: 'finish' | 'new'; session: TripSession } | null>(null);
  const act = (action: TripAction) => tripStore.transition(journey, action, session);
  const selectedId = selectedStopId(journey.stops, requestedId);
  const index = journey.stops.findIndex(stop => stop.id === selectedId);
  const selected = journey.stops[index];
  const missing = buildMapData(journey.stops).missing;
  const select = useCallback((id: string) => {
    if (journey.stops.some(stop => stop.id === id)) setRequestedId(id);
  }, [journey.stops]);
  return <>
    <View style={styles.header}><View style={styles.heading}><Text style={styles.eyebrow}>TRAVEL MODE · LOCAL SESSION</Text><Text accessibilityRole="header" numberOfLines={compact ? 1 : 2} style={styles.title}>{journey.title}</Text></View><Exit onExit={onExit} /></View>
    <View style={styles.status}><View style={styles.dot} /><View style={styles.heading}><Text accessibilityLiveRegion="polite" style={styles.statusTitle}>{{ ready: 'Ready to start', active: 'Trip in progress', paused: 'Trip paused', finished: 'Trip finished' }[session.status]}</Text><Text accessibilityLiveRegion="polite" style={styles.note}>{Platform.OS === 'web' ? 'GPS requires the iOS or Android development build' : locationLabel(location)}</Text></View>
      {session.status !== 'ready' && <Text accessibilityLabel={'Elapsed session time: ' + formatTripTime(elapsed)} style={styles.timer}>{formatTripTime(elapsed)}</Text>}
    </View>
    <JourneyMap stops={journey.stops} selectedId={selectedId} onSelect={select} presentation="expanded" currentPosition={location.position} />
    <MapItinerary stops={journey.stops} selectedId={selectedId} onSelect={select} />
    <View style={styles.panel}>
      <View style={styles.progress}><Text style={styles.eyebrow}>{index === 0 ? 'FIRST STOP' : 'ITINERARY PREVIEW'}</Text><Text style={styles.note}>{selected ? 'Stop ' + (index + 1) + ' of ' + journey.stops.length : 'No stops'}</Text></View>
      {selected && <><Text numberOfLines={1} accessibilityRole="header" style={styles.stopName}>{selected.name}{selected.dayNumber !== null ? ' · Day ' + selected.dayNumber : ''}</Text>
        {!hasCoordinates(selected) && <Text style={styles.note}>This stop has no map coordinates.</Text>}
        <ScrollView style={styles.description} contentContainerStyle={styles.descriptionContent}>
          <Text style={styles.note}>{selected.description.trim() || 'No description has been added for this stop.'}</Text>
        </ScrollView></>}
      <Text style={styles.routeNote}>Creator’s planned connections{missing ? ' · ' + missing + (missing === 1 ? ' unmapped stop' : ' unmapped stops') : ''}</Text>
      {session.status === 'finished' && <Text numberOfLines={2} style={styles.note}>{session.title} · {session.plannedStops} planned stops · Final duration {formatTripTime(elapsed)}</Text>}
      <View style={styles.actions}>
        {session.status === 'ready' ? <Pressable accessibilityRole="button" accessibilityLabel="Begin Trip" accessibilityHint="Requests foreground location permission before starting the local trip timer." disabled={requesting || Platform.OS === 'web'} accessibilityState={{ disabled: requesting || Platform.OS === 'web', busy: requesting }} onPress={() => { void location.begin(); }} style={[styles.begin, (requesting || Platform.OS === 'web') && { opacity: 0.55 }]}><Text style={styles.beginLabel}>{requesting ? 'Requesting location…' : 'Begin Trip →'}</Text></Pressable>
          : session.status === 'finished' ? <Pressable accessibilityRole="button" accessibilityLabel="Start a new trip" onPress={() => setConfirmation({ action: 'new', session })} style={styles.begin}><Text style={styles.beginLabel}>Start a new trip</Text></Pressable>
            : <><Pressable accessibilityRole="button" accessibilityLabel={session.status === 'active' ? 'Pause' : 'Resume'} onPress={() => act(session.status === 'active' ? 'pause' : 'resume')} style={styles.begin}><Text style={styles.beginLabel}>{session.status === 'active' ? 'Pause' : 'Resume'}</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Finish" onPress={() => setConfirmation({ action: 'finish', session })} style={styles.finish}><Text style={styles.exitLabel}>Finish</Text></Pressable></>}
      </View>
      {session.status === 'active' && (location.status === 'unavailable' || location.status === 'denied') && location.canAskAgain && <Pressable accessibilityRole="button" accessibilityLabel="Retry location" onPress={() => { void location.retry(); }} style={styles.locationAction}><Text style={styles.exitLabel}>Retry location</Text></Pressable>}
      {location.status === 'denied' && !location.canAskAgain && <Pressable accessibilityRole="button" accessibilityLabel="Open location settings" onPress={() => { void Linking.openSettings().catch(() => {}); }} style={styles.locationAction}><Text style={styles.exitLabel}>Allow location in device settings</Text></Pressable>}
      <Text style={styles.footer}>In memory only · No travel verification or location history</Text>
    </View>
    {confirmation && <TripConfirmation title={confirmation.action === 'finish' ? 'Finish this trip?' : 'Start a new trip?'} body={confirmation.action === 'finish' ? 'This freezes your local session duration. It does not verify any stops visited or distance travelled.' : 'This replaces the finished session and resets its timer. You will then choose Begin Trip to start.'} confirmLabel={confirmation.action === 'finish' ? 'Confirm finish' : 'Reset to ready'} onCancel={() => setConfirmation(null)} onConfirm={() => { tripStore.transition(journey, confirmation.action, confirmation.session); setConfirmation(null); }} />}
  </>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingBottom: 8, gap: 6, minHeight: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, flexShrink: 0 },
  heading: { flex: 1, minWidth: 0 }, title: { color: colors.ink, fontSize: 18, lineHeight: 23, fontWeight: '700', flexShrink: 1 },
  eyebrow: { color: colors.green, fontSize: 10, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8 },
  exit: { minHeight: 44, minWidth: 52, paddingHorizontal: 12, borderRadius: 22, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  exitLabel: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  statusTitle: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  timer: { color: colors.ink, fontSize: 20, lineHeight: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  panel: { gap: 4, flexShrink: 0, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.line },
  progress: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  stopName: { color: colors.ink, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  description: { maxHeight: 36 }, descriptionContent: { paddingBottom: 2 },
  routeNote: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  begin: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  finish: { minHeight: 48, minWidth: 80, borderRadius: 16, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  beginLabel: { color: colors.white, fontSize: 14, fontWeight: '700' },
  footer: { color: colors.muted, fontSize: 10, lineHeight: 14, textAlign: 'center' },
  locationAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  unavailable: { flex: 1, justifyContent: 'center' },
});
