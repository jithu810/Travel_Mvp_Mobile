import { SwipeJourneyStart } from '@/components/journey/swipe-journey-start';
import { useBuddyScreen } from '@/hooks/use-journey-buddy';
import { useBuddyProtectedBounds, useBuddyScroll } from '@/hooks/use-buddy-geometry';
import { JourneyActionIcon } from '@/components/journey/journey-action-icon';
import { StatusBar } from 'expo-status-bar';
import { BrandedLoading } from '@/components/branded-loading';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { StopStoryViewer } from '@/components/journey/stop-story-viewer';
import { SocialActions } from '@/components/journey/social-actions';
import { StoryCreator } from '@/components/journey/story-header';
import { StopTimeline } from '@/components/journey/stop-timeline';
import { StorySnapshot } from '@/components/journey/story-extras';
import { SourceAttribution } from '@/components/remix/source-attribution';
import { StorySheet } from '@/components/journey/story-sheet';
import { JourneyOptions } from '@/components/journey/journey-options';
import { JourneyMap } from '@/components/journey/map/journey-map';
import { ItinerarySheet } from '@/components/journey/itinerary-sheet';
import { MapItinerary } from '@/components/journey/map-itinerary';
import { canOpenTravelMode } from '@/lib/journey/travel-preview';
import { useLoad } from '@/hooks/use-load';
import { loadPublicJourney } from '@/lib/discovery/queries';
import { travelerLabel } from '@/lib/discovery/model';
import { hasCoordinates, buildMapData } from '@/lib/journey/map-data';
import { hasStory } from '@/lib/journey/snapshot';
import { selectedStopId } from '@/lib/journey/story-layout';
import type { PublicJourney } from '@/types/journey';

export default function JourneyStoryScreen() {
  const params = useLocalSearchParams<{ id: string | string[]; source?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const loader = useCallback((signal: AbortSignal) => loadPublicJourney(id, signal), [id]);
  const state = useLoad(loader);
  return <SafeAreaView style={ui.safe} edges={state.data ? ['left', 'right', 'bottom'] : ['top', 'left', 'right', 'bottom']}><View style={ui.page}>
    {state.data ? <JourneyStoryContent key={state.data.id} journey={state.data} saveFirst={params.source === 'search'} refresh={state.refresh} refreshing={state.refreshing} error={state.error} /> : <View style={styles.unavailable}>
      <ScreenHeader title="Journey Story" back />
      {state.loading ? <BrandedLoading message="Opening the journey…" />
        : <View style={styles.message}><Message title={state.error ? 'A small detour' : 'Journey unavailable'} body={state.error || 'This journey may no longer be public. Explore Discover for more stories.'} retry={state.retry} /></View>}
    </View>}
  </View></SafeAreaView>;
}

export function JourneyStoryContent({ journey, refresh, refreshing, error, saveFirst = false }: { journey: PublicJourney; saveFirst?: boolean; refresh: () => void; refreshing: boolean; error: string | null }) {
  const router = useRouter();
  const footerProtection = useBuddyProtectedBounds(), expandProtection = useBuddyProtectedBounds(), scroll = useBuddyScroll();
  const insets = useSafeAreaInsets();
  const [panel, setPanel] = useState<'map' | 'about' | 'stop' | null>(null);
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { setFocused(false); setPanel(null); };
  }, []));
  const window = useWindowDimensions();
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const selectedId = selectedStopId(journey.stops, requestedId);
  const selected = journey.stops.find(stop => stop.id === selectedId);
  const select = useCallback((id: string) => {
    if (journey.stops.some(stop => stop.id === id)) setRequestedId(previous => previous === id ? previous : id);
  }, [journey.stops]);
  const openMap = useCallback(() => setPanel('map'), [setPanel]);
  const openTravel = useCallback(() => {
    if (!canOpenTravelMode(journey)) return;
    setPanel(null); setFocused(false);
    router.push({ pathname: '/travel/[id]', params: { id: journey.id } });
  }, [journey, router, setPanel, setFocused]);
  const showStop = useCallback((id: string) => { select(id); setPanel('stop'); }, [select, setPanel]);
  const memoryPhotos = useMemo(() => Object.fromEntries(journey.stops.map(stop => [stop.id, stop.photo])), [journey.stops]);
  const missing = buildMapData(journey.stops).missing;
  useBuddyScreen({ floating: true, suppressed: !focused || panel !== null });
  return <View style={styles.screen}>
    {focused && panel === null && <StatusBar style="light" />}
    <ScrollView {...scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
      <View style={[styles.preview, { height: Math.max(150, Math.min(280, window.height * 0.30)) }]}>
        {focused && panel === null && <JourneyMap stops={journey.stops} memoryPhotos={memoryPhotos} playRouteWithSelection={requestedId === null} animateMemoryRoute={requestedId === null} selectedId={selectedId} onSelect={select} presentation="expanded" controlTopInset={insets.top} onExpand={openMap} />}
        <Pressable {...expandProtection} accessibilityRole="button" accessibilityLabel="Expand journey map" onPress={openMap} style={[styles.expand, { top: insets.top + 4 }]}><JourneyActionIcon name="expand" /></Pressable>
      </View>
      <StopTimeline horizontal stacked creator={<StoryCreator journey={journey} />} active={focused && panel === null} stops={journey.stops} selectedId={selectedId} onSelect={select} onDetails={showStop} photoActions={<SocialActions selectedMemoryId={selectedId} key={'social-' + journey.id} journey={journey} layout="rail" saveFirst={saveFirst} />} optionsActions={<JourneyOptions key={journey.id} id={journey.id} onUse={openTravel} presentation="rail" onAbout={() => setPanel('about')} />} />
      {journey.sourceId && <SourceAttribution key={'source-' + journey.sourceId} id={journey.sourceId} variant="published" />}
    </ScrollView>
    {canOpenTravelMode(journey) && <View {...footerProtection} style={styles.swipeFooter}><SwipeJourneyStart active={focused && panel === null} onStart={openTravel} /></View>}
    <View pointerEvents="none" testID="journey-status-shade" style={[styles.statusShade, { height: insets.top + 20 }]} />
    {panel === 'stop' && <StopStoryViewer journey={journey} selectedId={selectedId} onSelect={select} onClose={() => setPanel(null)} onMap={openMap} />}
    <StorySheet visible={panel === 'map' || panel === 'about'} title={panel === 'map' ? journey.title : 'About this journey'} subtitle={panel === 'map' ? journey.stops.length + (journey.stops.length === 1 ? ' stop' : ' stops') + ' · Journey map' : undefined} onClose={() => setPanel(null)} scrollable={panel !== 'map'}>
      {panel === 'map' ? <>
        <JourneyMap stops={journey.stops} memoryPhotos={memoryPhotos} animateMemoryRoute={false} selectedId={selectedId} onSelect={select} presentation="expanded" />
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
        <Text style={styles.routeNote}>Creator’s planned connections · No live navigation or recorded GPS track.{missing ? ' ' + missing + (missing === 1 ? ' stop has' : ' stops have') + ' no coordinates and ' + (missing === 1 ? 'is' : 'are') + ' not on the map; lines break at these stops.' : ''}</Text>
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
        <Text style={ui.body}>Use opens the original public route and stops. Remix requires sign-in and creates a private draft. Editing comes later.</Text>
        <Text style={ui.body}>Like and Save require sign-in. Share is available without an account. Open the journey map for Travel Mode with a local session timer. No GPS tracking.</Text>
        {error && <Text accessibilityRole="alert" style={ui.body}>Couldn’t refresh: {error}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh journey" disabled={refreshing} accessibilityState={{ disabled: refreshing }} onPress={refresh} style={styles.textAction}>{refreshing ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.link}>Refresh journey ↻</Text>}</Pressable>
      </> : null}
    </StorySheet>
    {(error || refreshing) && <Pressable accessibilityRole="button" accessibilityLabel={error ? 'Journey refresh failed. View details.' : 'Refreshing journey'} accessibilityLiveRegion="polite" onPress={() => setPanel('about')} style={[styles.refreshStatus, { top: insets.top + 14 }]}><Text style={styles.link}>{refreshing ? '↻' : '!'}</Text></Pressable>}
  </View>;
}
const styles = StyleSheet.create({
  statusShade: { position: 'absolute', top: 0, left: 0, right: 0, experimental_backgroundImage: 'linear-gradient(180deg, rgba(5,15,30,0.78) 0%, rgba(5,15,30,0.55) 65%, rgba(5,15,30,0) 100%)' },
  screen: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 12, gap: 8 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolbarButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#EDF1F8' },
  toolbarText: { color: '#18243B', fontSize: 22 },
  story: { padding: 14, gap: 6, borderRadius: 22, backgroundColor: '#F0F3F9', borderWidth: 1, borderColor: '#FFFFFF' },
  compactTitle: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  title: { color: '#18243B', fontSize: 18, lineHeight: 24, fontWeight: '700' },
  swipeFooter: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  storyAuthor: { paddingHorizontal: 4 },
  people: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  creator: { width: '34%', minWidth: 0 },
  preview: { marginHorizontal: -16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', backgroundColor: '#080F1E' },
  mapOptions: { position: 'absolute', top: 58, right: 8, minHeight: 44, minWidth: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  expand: { position: 'absolute', top: 4, right: 6, minHeight: 44, minWidth: 44, paddingHorizontal: 8, backgroundColor: colors.paper, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  expandLabel: { color: colors.ink, fontWeight: '700', fontSize: 12 },
  mapCaption: { paddingTop: 6, flexShrink: 0 }, selectedStop: { minHeight: 48, justifyContent: 'center', gap: 2 },
  routeNote: { color: colors.muted, fontSize: 10, lineHeight: 14, paddingTop: 6, flexShrink: 0 },
  start: { minHeight: 48, marginTop: 8, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#6555CF', experimental_backgroundImage: 'linear-gradient(110deg, #AA54DB 0%, #246BE0 100%)', flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  startLabel: { color: colors.white, fontSize: 14, fontWeight: '700' }, startHint: { color: colors.paper, fontSize: 10, flexShrink: 1 },
  stopName: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  eyebrow: { color: colors.green, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  textAction: { minHeight: 44, justifyContent: 'center', paddingVertical: 8 }, link: { color: colors.ink, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  refreshStatus: { position: 'absolute', top: 14, right: 70, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  unavailable: { flex: 1 }, loading: { flex: 1, gap: 16, padding: 20 },
  coverPlaceholder: { flex: 1, maxHeight: 240, borderRadius: 24, backgroundColor: colors.line }, message: { paddingHorizontal: 22 },
});
