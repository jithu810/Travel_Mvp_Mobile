import { usePilotColor, darkPilotStyles } from '@/theme/dark-pilot';
import { primaryControl } from '@/theme/mobile-theme';
import { SwipeAction, SwipeJourneyStart } from '@/components/journey/swipe-journey-start';
import { useBuddyScreen } from '@/hooks/use-journey-buddy';
import { useSessionState } from '@/hooks/session-context';
import { useBuddyProtectedBounds, useBuddyScroll } from '@/hooks/use-buddy-geometry';
import { JourneyActionIcon } from '@/components/journey/journey-action-icon';
import { StatusBar } from 'expo-status-bar';
import { BrandedLoading } from '@/components/branded-loading';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Message, ScreenHeader, ui as lightUi } from '@/components/discovery/ui';
import { StopStoryViewer } from '@/components/journey/stop-story-viewer';
import { SocialActions } from '@/components/journey/social-actions';
import { StoryCreator } from '@/components/journey/story-header';
import { StopTimeline } from '@/components/journey/stop-timeline';
import { StorySnapshot } from '@/components/journey/story-extras';
import { SourceAttribution } from '@/components/remix/source-attribution';
import { StorySheet } from '@/components/journey/story-sheet';
import { JourneyOptions } from '@/components/journey/journey-options';
import { JourneyMap } from '@/components/journey/map/journey-map';
import { createStoryBuddyPlayback } from '@/lib/journey/story-buddy-playback';
import { ItinerarySheet } from '@/components/journey/itinerary-sheet';
import { MapItinerary } from '@/components/journey/map-itinerary';
import { canOpenTravelMode } from '@/lib/journey/travel-preview';
import { useLoad } from '@/hooks/use-load';
import { loadPublicJourney } from '@/lib/discovery/queries';
import { travelerLabel } from '@/lib/discovery/model';
import { hasCoordinates, buildMapData } from '@/lib/journey/map-data';
import { hasStory } from '@/lib/journey/snapshot';
import { selectedStopId } from '@/lib/journey/story-layout';
import { feedGesture } from '@/lib/discovery/journey-feed-session';
import type { PublicJourney } from '@/types/journey';

export default function JourneyStoryScreen() {
  const styles = lightStyles_styles;
  const ui = lightUi;
  const params = useLocalSearchParams<{ id: string | string[]; source?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const loader = useCallback((signal: AbortSignal) => loadPublicJourney(id, signal), [id]);
  const state = useLoad(loader);
  return <SafeAreaView style={ui.safe} edges={state.data ? ['left', 'right', 'bottom'] : ['top', 'left', 'right', 'bottom']}><View style={ui.page}>
    <Stack.Screen options={{ statusBarStyle: 'light' }} />
    {state.data ? <JourneyStoryContent key={state.data.id} journey={state.data} refresh={state.refresh} refreshing={state.refreshing} error={state.error} /> : <View style={styles.unavailable}>
      <ScreenHeader title="Journey Story" back />
      {state.loading ? <BrandedLoading message="Opening the journey…" />
        : <View style={styles.message}><Message title={state.error ? 'A small detour' : 'Journey unavailable'} body={state.error || 'This journey may no longer be public. Explore Discover for more stories.'} retry={state.retry} /></View>}
    </View>}
  </View></SafeAreaView>;
}

export type StoryFeed = { index: number; count: number; enabled: boolean; initialStop?: string; onStop: (id: string) => void; onAvailability: (available: boolean) => void; onPage: (direction: number) => void; onDrag: (dy: number) => void };
type TemporaryStory = { onRemove: (stopId: string) => void; onBack: () => void; editingBlocked: boolean; error: string | null };
export function JourneyStoryContent({ journey, refresh, refreshing, error, saveFirst = false, temporary, feed }: { journey: PublicJourney; saveFirst?: boolean; refresh: () => void; refreshing: boolean; error: string | null; temporary?: TemporaryStory; feed?: StoryFeed }) {
  const pilotColor = usePilotColor();
  const styles = lightStyles_styles;
  const ui = lightUi;
  const auth = useSessionState();
  const router = useRouter();
  const footerProtection = useBuddyProtectedBounds(), expandProtection = useBuddyProtectedBounds(), backProtection = useBuddyProtectedBounds(), scroll = useBuddyScroll();
  const insets = useSafeAreaInsets();
  const [panel, setPanel] = useState<'map' | 'about' | 'stop' | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(temporary || journey.sourceId ? 130 : 76);
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { setFocused(false); setPanel(null); };
  }, []));
  const window = useWindowDimensions();
  // Measure the area above app navigation, rather than budgeting against the full screen.
  const availableHeight = viewportHeight || window.height - insets.bottom - 80;
  const deckHeight = temporary ? 390 : 362;
  const fitted = !temporary?.error && availableHeight >= Math.max(640, footerHeight + deckHeight + 138) && window.fontScale <= 1;
  const mapHeight = fitted
    ? Math.max(130, availableHeight - footerHeight - deckHeight - 8)
    : Math.max(180, Math.min(310, window.height * 0.33));
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { if (fitted) scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [fitted]);
  const [requestedId, setRequestedId] = useState<string | null>(feed?.initialStop || null);
  const [socialOverlay, setSocialOverlay] = useState(false), [optionsOverlay, setOptionsOverlay] = useState(false);
  const available = focused && panel === null && !socialOverlay && !optionsOverlay;
  const feedActive = !!feed?.enabled && available;
  const notifyAvailability = feed?.onAvailability;
  useEffect(() => { notifyAvailability?.(available); }, [available, notifyAvailability]);
  const feedLatest = useRef({ feed, allowed: feedActive && fitted });
  useEffect(() => { feedLatest.current = { feed, allowed: feedActive && fitted }; }, [feed, feedActive, fitted]);
  const hasFeed = !!feed;
  const gestureBlocked = useRef(false);
  // PanResponder stores these callbacks; ref reads occur only in touch events.
  // eslint-disable-next-line react-hooks/refs
  const pager = useMemo(() => hasFeed ? PanResponder.create({
    onStartShouldSetPanResponderCapture: event => { gestureBlocked.current = event.nativeEvent.touches.length !== 1; return false; },
    onMoveShouldSetPanResponderCapture: (_event, gesture) => {
      if (gesture.numberActiveTouches !== 1 || (Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) >= Math.abs(gesture.dy))) gestureBlocked.current = true;
      return !gestureBlocked.current && feedGesture(gesture.dx, gesture.dy, gesture.numberActiveTouches, feedLatest.current.allowed);
    },
    onPanResponderMove: (_event, gesture) => { if (gesture.numberActiveTouches !== 1) gestureBlocked.current = true; if (!gestureBlocked.current && feedLatest.current.allowed) feedLatest.current.feed?.onDrag(gesture.dy); },
    onPanResponderRelease: (_event, gesture) => { const current = feedLatest.current; current.feed?.onDrag(0); if (!gestureBlocked.current && feedGesture(gesture.dx, gesture.dy, 1, current.allowed) && Math.abs(gesture.dy) >= 65) current.feed?.onPage(gesture.dy < 0 ? 1 : -1); },
    onPanResponderTerminate: () => feedLatest.current.feed?.onDrag(0),
    onPanResponderTerminationRequest: () => true,
  }) : null, [hasFeed]);
  const storyBuddy = useMemo(() => createStoryBuddyPlayback(journey.stops), [journey.stops]);
  useEffect(() => () => storyBuddy.pause(), [storyBuddy]);
  useEffect(() => { if (!focused || (panel !== null && panel !== 'map')) storyBuddy.pause(); }, [focused, panel, storyBuddy]);
  const selectedId = selectedStopId(journey.stops, requestedId);
  useEffect(() => storyBuddy.select(selectedId), [storyBuddy, selectedId]);
  const notifyStop = feed?.onStop;
  useEffect(() => { if (selectedId) notifyStop?.(selectedId); }, [selectedId, notifyStop]);
  const selected = journey.stops.find(stop => stop.id === selectedId);
  const select = useCallback((id: string) => {
    if (journey.stops.some(stop => stop.id === id)) {
      storyBuddy.select(id);
      setRequestedId(previous => previous === id ? previous : id);
    }
  }, [journey.stops, storyBuddy]);
  const loop = useCallback((id: string, reducedMotion: boolean) => {
    storyBuddy.restart(reducedMotion);
    setRequestedId(id);
  }, [storyBuddy]);
  const openMap = useCallback(() => setPanel('map'), [setPanel]);
  const openTravel = useCallback(() => {
    if (!canOpenTravelMode(journey)) return;
    setPanel(null); setFocused(false);
    router.push({ pathname: '/travel/[id]', params: { id: journey.id, ...(temporary ? { customized: '1' } : {}) } });
  }, [journey, router, setPanel, setFocused, temporary]);
  const showStop = useCallback((id: string) => { select(id); setPanel('stop'); }, [select, setPanel]);
  const memoryPhotos = useMemo(() => Object.fromEntries(journey.stops.map(stop => [stop.id, stop.photo])), [journey.stops]);
  const missing = buildMapData(journey.stops).missing;
  const showSource = !temporary && !!journey.sourceId;
  useBuddyScreen({ floating: panel !== 'map', suppressed: !focused || (!!feed && !feed.enabled) || (panel !== null && panel !== 'map'),
    ownStory: !temporary && !auth.loading && !auth.error && !!auth.session && !!journey.creatorId && auth.session.user.id.toLowerCase() === journey.creatorId.toLowerCase() ? { id: journey.id, title: journey.title } : undefined });
  return <View style={styles.screen} onLayout={event => setViewportHeight(event.nativeEvent.layout.height)}>
    {focused && panel === null && <StatusBar style="light" />}
    <ScrollView {...scroll} ref={scrollRef} style={styles.body} scrollEnabled={!fitted} bounces={!fitted} showsVerticalScrollIndicator={!fitted} contentContainerStyle={[styles.content, fitted && styles.fittedContent]} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
      <View style={[styles.preview, { height: mapHeight }]}>
        {focused && panel === null && <JourneyMap stops={journey.stops} memoryPhotos={memoryPhotos} storyBuddy={storyBuddy} storyBuddySize={36} storyBuddyMotion={temporary ? 'run' : 'walk'} animateMemoryRoute={false} selectedId={selectedId} onSelect={select} presentation="expanded" controlTopInset={insets.top} onExpand={openMap} />}
        <Pressable {...backProtection} accessibilityRole="button" accessibilityLabel={temporary ? 'Back to magic cards' : 'Go back'} accessibilityActions={feed ? [{ name: 'previousJourney', label: 'Previous journey' }, { name: 'nextJourney', label: 'Next journey' }] : undefined} onAccessibilityAction={event => { if (feedActive) feed?.onPage(event.nativeEvent.actionName === 'nextJourney' ? 1 : event.nativeEvent.actionName === 'previousJourney' ? -1 : 0); }} accessibilityHint={temporary ? 'Return to your choices. Use Undo to choose stops again.' : feed ? `Journey ${feed.index + 1} of ${feed.count}. ${feed.index === 0 ? 'First journey. ' : ''}${feed.index === feed.count - 1 ? 'Last journey. ' : ''}Actions: Previous journey and Next journey. Activate to return to Search.` : 'Return to the previous screen.'} onPress={temporary ? temporary.onBack : () => { if (router.canGoBack()) router.back(); else router.replace('/discover'); }} style={[styles.mapBack, { top: insets.top + 4 }]}><View style={styles.mapControlFace}><Text style={styles.mapBackGlyph}>{'\u2039'}</Text></View></Pressable>
        <Pressable {...expandProtection} accessibilityRole="button" accessibilityLabel="Expand journey map" onPress={openMap} style={[styles.expand, { top: insets.top + 4 }]}><View style={styles.mapControlFace}><View style={styles.mapControlIcon}><JourneyActionIcon name="expand" /></View></View></Pressable>
      </View>
      <View {...pager?.panHandlers} collapsable={false}><StopTimeline horizontal stacked compact={!temporary} fitted={fitted} textScale={window.fontScale} creator={<StoryCreator journey={journey} />} active={focused && panel === null && (!feed || feed.enabled)} stops={journey.stops} selectedId={selectedId} onSelect={select} onDetails={showStop} onLoop={loop} photoActions={temporary ? <Pressable accessibilityRole="button" accessibilityLabel={'Remove ' + (selected?.name || 'stop') + ' from this trip'} accessibilityHint="Only removes this stop from your temporary selection." disabled={temporary.editingBlocked || journey.stops.length <= 1} accessibilityState={{ disabled: temporary.editingBlocked || journey.stops.length <= 1 }} onPress={() => { if (focused && panel === null && selectedId && !temporary.editingBlocked && journey.stops.length > 1) temporary.onRemove(selectedId); }} style={[styles.removeStop, (temporary.editingBlocked || journey.stops.length <= 1) && { opacity: 0.45 }]}><Text style={styles.removeLabel}>Remove</Text></Pressable> : <SocialActions selectedMemoryId={selectedId} key={'social-' + journey.id} journey={journey} layout="rail" saveFirst={saveFirst} onOverlayChange={setSocialOverlay} />} optionsActions={temporary ? <Pressable accessibilityRole="button" accessibilityLabel="About your selected journey" onPress={() => setPanel('about')} style={styles.textAction}><Text style={styles.link}>About</Text></Pressable> : <JourneyOptions key={journey.id} id={journey.id} creatorId={journey.creatorId} onUse={openTravel} presentation="rail" onAbout={() => setPanel('about')} onOverlayChange={setOptionsOverlay} />} /></View>
    </ScrollView>
    {(showSource || canOpenTravelMode(journey)) && <View {...footerProtection} onLayout={event => { footerProtection.onLayout(); setFooterHeight(event.nativeEvent.layout.height); }} style={styles.swipeFooter}>
      {!temporary && journey.sourceId && <SourceAttribution key={'source-' + journey.sourceId} id={journey.sourceId} variant="published" compact={fitted} />}
      {temporary && <View style={styles.selectionNote}><Text style={styles.note}>{journey.stops.length} selected {journey.stops.length === 1 ? 'stop' : 'stops'} for this trip. {temporary.editingBlocked ? 'Finish your current trip before removing stops.' : journey.stops.length <= 1 ? 'Keep at least one stop to start your journey.' : 'Remove a place using its card.'}</Text>{temporary.error && <Text accessibilityRole="alert" style={styles.note}>{temporary.error}</Text>}</View>}
      {!temporary && canOpenTravelMode(journey) && <Text style={styles.guide}>{feed ? 'Swipe sideways for stops, up/down for journeys.' : 'Swipe cards to explore. Swipe below to start.'}</Text>}
      {canOpenTravelMode(journey) && (temporary ? <SwipeAction active={focused && panel === null && (!feed || feed.enabled)} resetKey={journey.id} label="Swipe to journey" onStart={openTravel} /> : <SwipeJourneyStart active={focused && panel === null && (!feed || feed.enabled)} onStart={openTravel} />)}</View>}
    <View pointerEvents="none" testID="journey-status-shade" style={[styles.statusShade, { height: insets.top + 20 }]} />
    {panel === 'stop' && <StopStoryViewer journey={journey} selectedId={selectedId} onSelect={select} onClose={() => setPanel(null)} onMap={openMap} />}
    <StorySheet visible={panel === 'map' || panel === 'about'} title={panel === 'map' ? journey.title : 'About this journey'} subtitle={panel === 'map' ? journey.stops.length + (journey.stops.length === 1 ? ' stop' : ' stops') + ' · Journey map' : undefined} onClose={() => setPanel(null)} scrollable={panel !== 'map'} suppressBuddy={panel !== 'map'}>
      {panel === 'map' ? <>
        <JourneyMap stops={journey.stops} memoryPhotos={memoryPhotos} storyBuddy={storyBuddy} storyBuddySize={64} storyBuddyMotion={temporary ? 'run' : 'walk'} animateMemoryRoute={false} selectedId={selectedId} onSelect={select} presentation="expanded" />
        <ItinerarySheet title="Explore the itinerary" subtitle={journey.stops.length + ' stops · ' + (selected?.name || journey.title)}>
        <MapItinerary stops={journey.stops} selectedId={selectedId} onSelect={select} />
        <View style={styles.mapCaption}>
          {selected ? <Pressable accessibilityRole="button" accessibilityLabel={'Read stop ' + (journey.stops.indexOf(selected) + 1) + ': ' + selected.name} onPress={() => setPanel('stop')} style={styles.selectedStop}>
            <Text style={styles.eyebrow}>STOP {journey.stops.indexOf(selected) + 1}{selected.dayNumber !== null ? ' · DAY ' + selected.dayNumber : ''}</Text>
            <Text numberOfLines={1} style={styles.stopName}>{selected.name} ↗</Text>
            <Text style={styles.note}>{selected.description.trim() || 'No description has been added for this stop.'}</Text>
            {!hasCoordinates(selected) && <Text style={styles.note}>No map coordinates for this stop.</Text>}
          </Pressable> : <Text style={ui.body}>No stops have been added yet.</Text>}
        </View>
        <Text style={styles.routeNote}>{temporary ? 'Your selected stops. ' : ''}Creator’s planned connections · No live navigation or recorded GPS track.{missing ? ' ' + missing + (missing === 1 ? ' stop has' : ' stops have') + ' no coordinates and ' + (missing === 1 ? 'is' : 'are') + ' not on the map; lines break at these stops.' : ''}</Text>
        </ItinerarySheet>
        {canOpenTravelMode(journey) && <Pressable accessibilityRole="button" accessibilityLabel="Start Journey" accessibilityHint="Opens Travel Mode. Begin Trip starts the timer and location tracking." onPress={openTravel} style={styles.start}><Text style={styles.startLabel}>Start Journey →</Text><Text style={styles.startHint}>Open Travel Mode</Text></Pressable>}
      </> : panel === 'about' ? <>
        <Text accessibilityRole="header" style={ui.heading}>{journey.title}</Text>
        {journey.destination !== 'Destination not specified' && <Text style={ui.body}>{journey.destination}</Text>}
        <Text style={ui.body}>{travelerLabel(journey.travelerType)}{journey.durationDays !== null ? ' · ' + journey.durationDays + (journey.durationDays === 1 ? ' day' : ' days') : ''} · {journey.stops.length} {journey.stops.length === 1 ? 'stop' : 'stops'}</Text>
        <StoryCreator journey={journey} />
        {journey.likes !== null && <Text style={ui.body}>{journey.likes} {journey.likes === 1 ? 'like' : 'likes'}</Text>}
        <StorySnapshot journey={journey} />
        {hasStory(journey) && <Text selectable style={ui.body}>{journey.description}</Text>}
        {temporary ? <Text style={ui.body}>Travel through your selected stops in their original order. This selection is temporary and the original journey stays unchanged. Begin Trip enables location tracking.</Text> : <><Text style={ui.body}>Start Journey travels the original route. Customize chooses stops for this trip without creating a draft. Remix requires sign-in and creates your own editable private draft.</Text>
        <Text style={ui.body}>Like and Save require sign-in. Share is available without an account. Begin Trip starts the timer and GPS updates after location permission is allowed. GPS updates stop when you pause or finish, leave Travel Mode, or put the app in the background. Returning to an active trip resumes GPS updates.</Text>
        {error && <Text accessibilityRole="alert" style={ui.body}>Couldn’t refresh: {error}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh journey" disabled={refreshing} accessibilityState={{ disabled: refreshing }} onPress={refresh} style={styles.textAction}>{refreshing ? <ActivityIndicator color={pilotColor(colors.ink)} /> : <Text style={styles.link}>Refresh journey ↻</Text>}</Pressable></>}
      </> : null}
    </StorySheet>
    {(error || refreshing) && <Pressable accessibilityRole="button" accessibilityLabel={error ? 'Journey refresh failed. View details.' : 'Refreshing journey'} accessibilityLiveRegion="polite" onPress={() => setPanel('about')} style={[styles.refreshStatus, { top: insets.top + 14 }]}><Text style={styles.link}>{refreshing ? '↻' : '!'}</Text></Pressable>}
  </View>;
}
const lightStyles_styles = darkPilotStyles(StyleSheet.create({
  mapBack: { position: 'absolute', left: 6, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  mapControlFace: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  mapControlIcon: { transform: [{ scale: 0.75 }] },
  mapBackGlyph: { color: colors.ink, fontSize: 28, lineHeight: 32 },
  removeStop: { minHeight: 48, minWidth: 60, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: 'transparent' },
  removeLabel: { fontSize: 12, color: colors.ink, fontWeight: '600' },
  guide: { flexShrink: 0, color: colors.muted, fontSize: 10, lineHeight: 14, paddingHorizontal: 4 },
  selectionNote: { flexShrink: 0, paddingHorizontal: 8, gap: 6 },
  statusShade: { position: 'absolute', top: 0, left: 0, right: 0, experimental_backgroundImage: 'linear-gradient(180deg, rgba(5,15,30,0.78) 0%, rgba(5,15,30,0.55) 65%, rgba(5,15,30,0) 100%)' },
  screen: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0 },
  fittedContent: { flexGrow: 1, flexBasis: 0, paddingBottom: 0 },
  content: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 12, gap: 8 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolbarButton: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#EDF1F8' },
  toolbarText: { color: '#18243B', fontSize: 22 },
  story: { padding: 14, gap: 6, borderRadius: 22, backgroundColor: '#F0F3F9', borderWidth: 1, borderColor: '#FFFFFF' },
  compactTitle: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  title: { color: '#18243B', fontSize: 18, lineHeight: 24, fontWeight: '700' },
  swipeFooter: { flexShrink: 0, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 0, gap: 4 },
  storyAuthor: { paddingHorizontal: 4 },
  people: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  creator: { width: '34%', minWidth: 0 },
  preview: { flexShrink: 0, marginHorizontal: -16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', backgroundColor: '#080F1E' },
  mapOptions: { position: 'absolute', top: 58, right: 8, minHeight: 48, minWidth: 48, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  expand: { position: 'absolute', top: 4, right: 6, height: 48, width: 48, justifyContent: 'center', alignItems: 'center' },
  expandLabel: { color: colors.ink, fontWeight: '700', fontSize: 12 },
  mapCaption: { paddingTop: 6, flexShrink: 0 }, selectedStop: { minHeight: 48, justifyContent: 'center', gap: 2 },
  routeNote: { color: colors.muted, fontSize: 10, lineHeight: 14, paddingTop: 6, flexShrink: 0 },
  start: { minHeight: 48, marginTop: 8, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, backgroundColor: primaryControl.backgroundColor, experimental_backgroundImage: primaryControl.experimental_backgroundImage, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  startLabel: { color: colors.white, fontSize: 14, fontWeight: '700' }, startHint: { color: colors.white, fontSize: 10, flexShrink: 1 },
  stopName: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  eyebrow: { color: colors.green, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  textAction: { minHeight: 48, justifyContent: 'center', paddingVertical: 8 }, link: { color: colors.ink, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  refreshStatus: { position: 'absolute', top: 14, right: 70, width: 48, height: 48, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  unavailable: { flex: 1 }, loading: { flex: 1, gap: 16, padding: 20 },
  coverPlaceholder: { flex: 1, maxHeight: 240, borderRadius: 24, backgroundColor: colors.line }, message: { paddingHorizontal: 22 },
}));
