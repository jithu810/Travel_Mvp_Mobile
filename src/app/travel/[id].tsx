import { BrandedLoading } from '@/components/branded-loading';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Message } from '@/components/discovery/ui';
import { JourneyMap } from '@/components/journey/map/journey-map';
import { ItinerarySheet } from '@/components/journey/itinerary-sheet';
import { ManeuverPanel } from '@/components/journey/maneuver-panel';
import { ArrivalPrompt } from '@/components/journey/arrival-prompt';
import { MapItinerary } from '@/components/journey/map-itinerary';
import { TripConfirmation } from '@/components/journey/trip-confirmation';
import { useTripElapsed, useTripSnapshot } from '@/hooks/use-trip-session';
import { useTripNavigation } from '@/hooks/use-trip-navigation';
import { useTripArrival } from '@/hooks/use-trip-arrival';
import { navigationFix, routeSummary } from '@/lib/journey/navigation';
import { useTripLocation } from '@/hooks/use-trip-location';
import { locationLabel } from '@/lib/journey/foreground-location';
import { formatTripTime, orderedTripStops, tripStore, type TripAction, type TripSession } from '@/lib/journey/trip-session';
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
  return <View style={styles.screen}>
    {canOpenTravelMode(available) ? <TravelModeContent key={available.id} journey={available} onExit={requestExit} refreshNotice={session.journey && state.error ? 'Original could not refresh. Using this session’s itinerary.' : undefined} /> : <SafeAreaView style={styles.unavailable}>
      <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Travel Mode</Text><Exit onExit={requestExit} /></View>
      <View style={styles.unavailable}>{state.loading ? <BrandedLoading message="Opening your itinerary…" />
        : <Message title="Journey unavailable" body={state.error || 'Choose a public journey with at least one stop to open Travel Mode.'} retry={state.error ? state.retry : undefined} />}</View>
    </SafeAreaView>}
    {leaving && <TripConfirmation title="Leave Travel Mode?" body={(session.status === 'active' ? 'Your local timer keeps running while you’re away.' : 'Your local session stays paused.') + ' Reopen this journey’s Travel Mode to return. This session is kept only until the app process closes.'} confirmLabel="Leave and keep session" onCancel={() => setLeaving(false)} onConfirm={() => { setLeaving(false); exit(); }} />}
  </View>;
}

function Exit({ onExit }: { onExit: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Exit Travel Mode" onPress={onExit} style={styles.exit}><Text style={styles.exitLabel}>Exit</Text></Pressable>;
}

export function TravelModeContent({ journey, onExit, refreshNotice }: { journey: PublicJourney; onExit: () => void; refreshNotice?: string }) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [viewportHeight, setViewportHeight] = useState(window.height);
  const [sheetHeight, setSheetHeight] = useState(220);
  const [topOverlayHeight, setTopOverlayHeight] = useState(80);
  const navigationPadding = useMemo(() => ({ top: insets.top + topOverlayHeight + 8, bottom: sheetHeight + Math.max(insets.bottom, 8) + 20 }), [insets.top, insets.bottom, sheetHeight, topOverlayHeight]);
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const session = useTripSnapshot(journey.id);
  const elapsed = useTripElapsed(session);
  const location = useTripLocation(journey, session);
  const travelCamera = useMemo(() => ({ journeyId: journey.id, location: location.source }), [journey.id, location.source]);
  const navigation = useTripNavigation(journey, session, location.source);
  const arrival = useTripArrival(journey, session, location.source);
  const requesting = location.status === 'requesting';
  const compactRouteStatus = navigation.message.startsWith('Waiting for GPS:') ? 'Waiting for an accurate GPS fix' : navigation.message;
  const showLocationStatus = (session.status === 'active' && location.status === 'tracking' && location.position?.directionSource !== 'course') || Platform.OS === 'web' || ['ready', 'requesting', 'weak', 'unavailable', 'denied', 'stopped'].includes(location.status);
  const [confirmation, setConfirmation] = useState<{ action: 'finish' | 'new' | 'complete'; session: TripSession; stopId?: string; epoch: number } | null>(null);
  const interaction = useRef({ focused: false, epoch: 0 });
  useFocusEffect(useCallback(() => {
    let disposed = false;
    interaction.current.focused = true; interaction.current.epoch++;
    setConfirmation(null);
    const app = AppState.addEventListener('change', state => {
      if (disposed) return;
      if (state !== 'active') { interaction.current.epoch++; setConfirmation(null); }
    });
    return () => { disposed = true; interaction.current.focused = false; interaction.current.epoch++; app.remove(); };
  }, []));
  const canInteract = () => interaction.current.focused && AppState.currentState === 'active';
  const act = (action: TripAction) => canInteract() && tripStore.transition(journey, action, session);
  const requestConfirmation = (action: 'finish' | 'new' | 'complete', stopId?: string) => {
    if (canInteract() && tripStore.get(journey.id) === session) setConfirmation({ action, session, stopId, epoch: interaction.current.epoch });
  };
  const stops = useMemo(() => orderedTripStops(session.journey ?? journey), [session.journey, journey]);
  const selectedId = selectedStopId(stops, requestedId);
  const index = stops.findIndex(stop => stop.id === selectedId);
  const selected = stops[index];
  const terminal = session.status === 'finished' || session.status === 'completed';
  const destinationIndex = stops.findIndex(stop => stop.id === navigation.destination?.id);
  const progressLabel = session.status === 'completed' ? 'All ' + stops.length + ' stops completed'
    : terminal ? session.completedStopIds.length + ' of ' + stops.length + ' stops completed'
    : 'Stop ' + (destinationIndex + 1) + ' of ' + stops.length;
  const missing = buildMapData(journey.stops).missing;
  const select = useCallback((id: string) => {
    if (journey.stops.some(stop => stop.id === id)) setRequestedId(id);
  }, [journey.stops]);
  return <View style={styles.screen} onLayout={event => setViewportHeight(event.nativeEvent.layout.height)}>
    <View style={styles.mapArea}>
      <JourneyMap stops={journey.stops} selectedId={selectedId} onSelect={select} presentation="expanded" navigationMode
        travelCamera={travelCamera} navigationPadding={navigationPadding} destinationId={navigation.destination?.id}
        currentPosition={navigationFix(location.position) ? location.position : null} navigationRoute={navigation.remainingGeometry} />
    </View>
    <View pointerEvents="box-none" style={[styles.overlays, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.topStack} onLayout={event => setTopOverlayHeight(event.nativeEvent.layout.height)}>
        <View style={styles.header}><View style={styles.heading}><Text style={styles.eyebrow}>TRAVEL MODE</Text><Text accessibilityRole="header" numberOfLines={1} style={styles.title}>{journey.title}</Text></View><Exit onExit={onExit} /></View>
        {!terminal && session.status !== 'ready' && (arrival.prompt ? <ArrivalPrompt prompt={arrival.prompt} onConfirm={() => arrival.confirm(arrival.prompt!)} onDismiss={() => arrival.dismiss(arrival.prompt!)} /> : <ManeuverPanel guidance={navigation.guidance} message={navigation.message} />)}
      </View>
      <View style={styles.mapSpace} pointerEvents="none" />
      <ItinerarySheet compact title={terminal ? session.status === 'completed' ? 'Journey completed' : 'Trip ended early' : 'To ' + (navigation.destination?.name || 'next stop')} subtitle={terminal ? progressLabel : navigation.route ? (navigation.routeOutdated ? 'Previous route · ' : '') + routeSummary(navigation.route) : session.status === 'ready' ? 'Begin Trip when you’re ready' : compactRouteStatus}
        maxSheetHeight={Math.max(0, viewportHeight - insets.top - insets.bottom - topOverlayHeight - 112)} onHeightChange={setSheetHeight}
        footer={    <View style={styles.panel}>
        <View style={styles.status}><Text accessibilityLiveRegion="polite" style={styles.statusTitle}>{{ ready: 'Ready to start', active: progressLabel, paused: 'Paused · ' + progressLabel, finished: 'Trip ended early', completed: 'Journey completed' }[session.status]}</Text>
          {session.status !== 'ready' && <Text accessibilityLabel={'Elapsed session time: ' + formatTripTime(elapsed)} style={styles.timer}>{formatTripTime(elapsed)}</Text>}
        </View>
        {session.status === 'active' && (navigation.reroute || navigation.status === 'error') && <View style={styles.rerouteStatus}>
          <Text accessibilityLiveRegion="polite" numberOfLines={2} style={[styles.routeNote, { flex: 1 }]}>{navigation.reroute?.message || navigation.message}</Text>
          {navigation.status === 'error' && <Pressable accessibilityRole="button" accessibilityLabel="Retry driving route" disabled={navigation.canRetry === false} accessibilityState={{ disabled: navigation.canRetry === false }} onPress={navigation.retry} style={[styles.routeRetry, navigation.canRetry === false && { opacity: 0.5 }]}><Text style={styles.exitLabel}>Retry route</Text></Pressable>}
        </View>}
        {showLocationStatus && <Text accessibilityLiveRegion="polite" numberOfLines={2} style={styles.note}>{Platform.OS === 'web' ? 'GPS requires the iOS or Android development build' : locationLabel(location)}</Text>}
      {terminal && <Text numberOfLines={2} style={styles.note}>{session.title} · {session.completedStopIds.length}/{session.plannedStops} completed · Final duration {formatTripTime(elapsed)}</Text>}
      <View style={styles.actions}>
        {session.status === 'ready' ? <Pressable hitSlop={2} accessibilityRole="button" accessibilityLabel="Begin Trip" accessibilityHint="Starts the local trip timer and foreground GPS after permission is allowed." disabled={requesting || location.status === 'denied' || Platform.OS === 'web'} accessibilityState={{ disabled: requesting || location.status === 'denied' || Platform.OS === 'web', busy: requesting }} onPress={() => { void location.begin(); }} style={[styles.begin, (requesting || location.status === 'denied' || Platform.OS === 'web') && { opacity: 0.55 }]}><Text style={styles.beginLabel}>{requesting ? 'Requesting location…' : 'Begin Trip →'}</Text></Pressable>
          : terminal ? <Pressable hitSlop={2} accessibilityRole="button" accessibilityLabel="Start a new trip" onPress={() => requestConfirmation('new')} style={styles.begin}><Text style={styles.beginLabel}>Start a new trip</Text></Pressable>
            : <><Pressable hitSlop={2} accessibilityRole="button" accessibilityLabel={session.status === 'active' ? 'Pause' : 'Resume'} onPress={() => act(session.status === 'active' ? 'pause' : 'resume')} style={styles.begin}><Text style={styles.beginLabel}>{session.status === 'active' ? 'Pause' : 'Resume'}</Text></Pressable>
              <Pressable hitSlop={2} accessibilityRole="button" accessibilityLabel="Finish" onPress={() => requestConfirmation('finish')} style={styles.finish}><Text style={styles.exitLabel}>Finish</Text></Pressable></>}
      </View>
      {(session.status === 'active' || session.status === 'ready') && (location.status === 'unavailable' || location.status === 'denied') && location.canAskAgain && <Pressable accessibilityRole="button" accessibilityLabel="Retry location" onPress={() => { void location.retry(); }} style={styles.locationAction}><Text style={styles.exitLabel}>Retry location</Text></Pressable>}
      {location.status === 'denied' && !location.canAskAgain && <Pressable accessibilityRole="button" accessibilityLabel="Open location settings" onPress={() => { void Linking.openSettings().catch(() => {}); }} style={styles.locationAction}><Text style={styles.exitLabel}>Allow location in device settings</Text></Pressable>}
    </View>}>
        <Text accessibilityRole="header" style={styles.stopName}>{journey.title}</Text>
        <Text style={styles.note}>{journey.stops.length} planned stops · Route status: {navigation.message}</Text>
        <Text style={styles.note}>{locationLabel(location)}</Text>
        {session.status === 'active' && <Text accessibilityLiveRegion="polite" style={styles.note}>{arrival.message}</Text>}
        {refreshNotice && <Text style={styles.note}>{refreshNotice}</Text>}
        <Text accessibilityLiveRegion="polite" style={styles.eyebrow}>{progressLabel}</Text>
        {!terminal && navigation.destination && <View style={styles.completion}>
          <Text style={styles.stopName}>Next: {navigation.destination.name}</Text>
          {!hasCoordinates(navigation.destination) && <Text style={styles.note}>Routing unavailable: this stop has no valid map coordinates. You can still complete it manually.</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel={'Mark ' + navigation.destination.name + ' complete'} disabled={session.status !== 'active'} accessibilityState={{ disabled: session.status !== 'active' }}
            onPress={() => requestConfirmation('complete', navigation.destination?.id)} style={[styles.completeButton, session.status !== 'active' && { opacity: 0.5 }]}>
            <Text style={styles.beginLabel}>Mark current stop complete ✓</Text>
          </Pressable>
          {session.status !== 'active' && <Text style={styles.note}>{session.status === 'paused' ? 'Resume the trip to complete this stop.' : 'Begin Trip to complete stops in order.'}</Text>}
        </View>}
      <MapItinerary stops={stops} selectedId={selectedId} onSelect={select} completedStopIds={session.completedStopIds} destinationId={terminal ? null : navigation.destination?.id} />
      <View style={styles.progress}><Text style={styles.eyebrow}>{index === 0 ? 'FIRST STOP' : 'ITINERARY PREVIEW'}</Text><Text style={styles.note}>{selected ? 'Stop ' + (index + 1) + ' of ' + journey.stops.length : 'No stops'}</Text></View>
      {selected && <><Text numberOfLines={1} accessibilityRole="header" style={styles.stopName}>{selected.name}{selected.dayNumber !== null ? ' · Day ' + selected.dayNumber : ''}</Text>
        {!hasCoordinates(selected) && <Text style={styles.note}>This stop has no map coordinates.</Text>}
        <Text style={styles.note}>{selected.description.trim() || 'No description has been added for this stop.'}</Text>
      </>}
      <Text style={styles.routeNote}>Creator’s planned connections{missing ? ' · ' + missing + (missing === 1 ? ' unmapped stop' : ' unmapped stops') : ''}</Text>
        <Text style={styles.routeNote}>Blue: driving route · Dashed green: planned stops · Route duration is the last calculation, not live ETA</Text>
        <Text style={styles.routeNote}>In memory only · No travel verification or location history</Text>
      </ItinerarySheet>
    </View>
    {confirmation && <TripConfirmation title={confirmation.action === 'complete' ? 'Complete this stop?' : confirmation.action === 'finish' ? 'Finish this trip?' : 'Start a new trip?'}
      body={confirmation.action === 'complete' ? 'Mark ' + (stops.find(stop => stop.id === confirmation.stopId)?.name || 'this stop') + ' complete? ' + (confirmation.session.completedStopIds.length + 1 === stops.length ? 'This completes the journey and stops the timer and GPS.' : 'Navigation will move to the next stop.') + ' This is a manual record, not GPS verification.'
        : confirmation.action === 'finish' ? 'End the trip early and freeze its duration. Remaining stops stay incomplete. This does not verify stops visited or distance travelled.' : 'This replaces the ended session and resets its timer and completed stops. You will then choose Begin Trip to start.'}
      confirmLabel={confirmation.action === 'complete' ? 'Complete stop' : confirmation.action === 'finish' ? 'Confirm finish' : 'Reset to ready'} onCancel={() => { if (canInteract()) setConfirmation(current => current === confirmation ? null : current); }} onConfirm={() => {
        if (!canInteract() || confirmation.epoch !== interaction.current.epoch) return;
        if (confirmation.action === 'complete') tripStore.completeStop(journey.id, confirmation.stopId!, confirmation.session);
        else tripStore.transition(journey, confirmation.action, confirmation.session);
        setConfirmation(current => current === confirmation ? null : current);
      }} />}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, backgroundColor: colors.paper },
  mapArea: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  overlays: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, paddingHorizontal: 12 },
  mapSpace: { flex: 1, minHeight: 0 },
  topStack: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, paddingLeft: 14, borderRadius: 24, backgroundColor: colors.paper, elevation: 3 },
  heading: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  eyebrow: { color: colors.green, fontSize: 10, lineHeight: 15, fontWeight: '700', letterSpacing: 0.8 },
  exit: { minHeight: 44, minWidth: 52, paddingHorizontal: 12, borderRadius: 22, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  exitLabel: { color: colors.ink, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statusTitle: { flex: 1, color: colors.ink, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  timer: { color: colors.ink, fontSize: 12, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'], backgroundColor: colors.pale, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  panel: { gap: 4 },
  rerouteStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeRetry: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 12, backgroundColor: colors.pale },
  completion: { gap: 6, paddingVertical: 8 },
  completeButton: { minHeight: 48, padding: 10, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  stopName: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  routeNote: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  begin: { flex: 1, minHeight: 44, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  finish: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  beginLabel: { color: colors.white, fontSize: 13, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  locationAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  unavailable: { flex: 1, justifyContent: 'center', padding: 16 },
});
