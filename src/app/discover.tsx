import { theme, primaryControl } from '@/theme/mobile-theme';
import { BrandedLoading } from '@/components/branded-loading';
import { PlacePicker } from '@/components/create/place-picker';
import type { Place } from '@/lib/create/model';
import { FloatingNavigation } from '@/components/floating-navigation';
import { useBuddyScreen } from '@/hooks/use-journey-buddy';
import { useBuddyProtectedBounds } from '@/hooks/use-buddy-geometry';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiscoveryGlobe } from '@/components/discovery/globe/discovery-globe';
import { DiscoveryPanel } from '@/components/discovery/discovery-panel';
import { useDiscoveryViewer } from '@/hooks/use-discovery-viewer';
import { useLoad } from '@/hooks/use-load';
import { discoveryPoints, worldCamera } from '@/lib/discovery/map';
import { hideViewerJourneys, onlyViewerJourneysCopy } from '@/lib/discovery/model';
import { discoveryRoute } from '@/lib/discovery/travel';
import { spaceColor } from '@/lib/discovery/presentation';
import { invalidatePublicJourneys, loadDiscoveryEntries, loadPublicJourney } from '@/lib/discovery/queries';
import { BuddyIntro } from '@/components/buddy/buddy-intro';

export default function DiscoverScreen() {
  const router = useRouter();
  const headerProtection = useBuddyProtectedBounds(), bannerProtection = useBuddyProtectedBounds();
  const insets = useSafeAreaInsets();
  // The public load never waits for authentication; only the viewer filter does.
  const state = useLoad(loadDiscoveryEntries);
  const viewer = useDiscoveryViewer();
  const reloadPublic = state.refresh;
  const refreshPublic = () => { invalidatePublicJourneys(); state.refresh(); };
  useFocusEffect(useCallback(() => { reloadPublic(); }, [reloadPublic]));
  // The first-use intro belongs to the visible Home only, never over a screen pushed above it.
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    const listener = AppState.addEventListener('change', next => { if (next === 'active') reloadPublic(); });
    return () => listener.remove();
  }, [reloadPublic]);
  const initialLoading = state.loading && !state.data;
  const [sheetInteracting, setSheetInteracting] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [placeVersion, setPlaceVersion] = useState(0);
  const [dismissVersion, setDismissVersion] = useState(0);
  const [userProximity, setUserProximity] = useState<Place | null>(null);
  const [mapProximity, setMapProximity] = useState<Place>({ name: 'Map center', label: 'Map center', longitude: worldCamera.centerCoordinate[0], latitude: worldCamera.centerCoordinate[1], mapboxId: null });
  const dismissSearch = useCallback(() => { setDismissVersion(v => v + 1); Keyboard.dismiss(); }, []);
  const selectPlace = useCallback((value: Place) => { setPlace(value); setPlaceVersion(v => v + 1); }, []);
  const mapCenter = useCallback((center: [number, number]) => setMapProximity(previous => previous.longitude === center[0] && previous.latitude === center[1] ? previous : { ...previous, longitude: center[0], latitude: center[1] }), []);
  useFocusEffect(useCallback(() => {
    let active = true;
    setUserProximity(null);
    if (Platform.OS !== 'web') void import('expo-location').then(async location => {
      if (!(await location.getForegroundPermissionsAsync()).granted) return;
      const fix = await location.getLastKnownPositionAsync({ maxAge: 300000, requiredAccuracy: 5000 });
      if (active && fix) setUserProximity({ name: 'Current location', label: 'Current location', ...fix.coords, mapboxId: null });
    }).catch(() => { /* Search falls back to the observed map center without requesting permission. */ });
    return () => { active = false; dismissSearch(); };
  }, [dismissSearch]));
  const [headerHeight, setHeaderHeight] = useState(56);
  const headerTop = Math.max(0, insets.top || 0) + 4;
  const headerClearance = headerTop + headerHeight + 8;
  const [navHeight, setNavHeight] = useState(56);
  const navBottom = Math.max(0, insets.bottom) + 8;
  const navClearance = navBottom + navHeight + 12;
  const [bannerHeight, setBannerHeight] = useState(54);
  const [railHeight, setRailHeight] = useState(260);
  const [layout, setLayout] = useState({ height: 0, width: 360 });
  const [locateVersion, setLocateVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const locate = useCallback((id: string) => { setPlace(null); dismissSearch(); setSelectedId(id); setLocateVersion(version => version + 1); }, [dismissSearch]);
  // Coordinates are only in public detail. Resolve one explicit selection, never N+1 card requests.
  const loadSelected = useCallback((signal: AbortSignal) => selectedId ? loadPublicJourney(selectedId, signal) : Promise.resolve(null), [selectedId]);
  const selection = useLoad(loadSelected);
  const points = useMemo(() => discoveryPoints(selection.data), [selection.data]);
  const route = useMemo(() => discoveryRoute(selection.data), [selection.data]);
  const open = useCallback((id: string) => router.push({ pathname: '/journey/[id]', params: { id } }), [router]);
  // Hide the signed-in viewer's own journeys; hold the list while the session restores.
  const journeys = useMemo(() => viewer.pending ? [] : hideViewerJourneys(state.data || [], viewer.id), [state.data, viewer.pending, viewer.id]);
  // Signing in can hide a selected journey; drop it so the globe never keeps showing it.
  if (selectedId && !viewer.pending && !journeys.some(j => j.id === selectedId) && state.data?.some(entry => entry.journey.id === selectedId)) setSelectedId(null);
  // Every loaded journey is the viewer's own: point to search instead of "no journeys".
  const onlyOwn = !viewer.pending && !journeys.length && Boolean(state.data?.length);
  const notice = state.error || (selectedId ? selection.error || (selection.loading ? 'Finding this journey on the map…'
    : !selection.data ? 'This journey is no longer public.'
    : !points.features.length ? 'No mapped stops for this journey. Open its story to explore.'
    : Platform.OS === 'web' ? 'Mapped stops are available in the mobile app. Open the story to explore.' : 'Tap a stop to open ' + selection.data.title) : 'Journeys from our global community');
  useBuddyScreen({ floating: true, suppressed: initialLoading, interacting: sheetInteracting, geometryMoving: sheetInteracting });
  return <SafeAreaView edges={['left', 'right']} style={s.safe}>
    <View style={s.page}>
      <Stack.Screen options={{ statusBarStyle: initialLoading ? 'dark' : 'light' }} />
      <View {...headerProtection} style={[s.header, { top: headerTop }]} onLayout={event => { headerProtection.onLayout(); setHeaderHeight(event.nativeEvent.layout.height); }}>
        <View style={s.search}><PlacePicker label="Search places" homeSearch compact embeddedSuggestions autoSuggest disabled={false}
          dismissVersion={dismissVersion} proximity={userProximity || mapProximity} onSelect={selectPlace} /></View>
      </View>
      <View style={s.exploration} onTouchStart={dismissSearch} onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setLayout(previous => previous.width === width && previous.height === height ? previous : { width, height });
      }}>
        <View style={s.map}><DiscoveryGlobe points={points} route={route} onOpen={open} bottomInset={railHeight} headerInset={headerClearance} viewport={layout} selectionId={selectedId} locateVersion={locateVersion} sheetInteracting={sheetInteracting} homeSearch destinationMode={!!place} destination={place} destinationVersion={placeVersion} onCenterChange={mapCenter} /></View>
        <DiscoveryPanel journeys={journeys} selectedId={selectedId} onLocate={locate} onOpen={open}
          notice={notice} onClear={() => setSelectedId(null)} onRetrySelection={selection.error ? selection.retry : undefined}
          loading={state.loading || (viewer.pending && !state.error)} emptyText={onlyOwn ? onlyViewerJourneysCopy : undefined} refreshing={state.refreshing} error={state.error} onRefresh={refreshPublic}
          onInteraction={setSheetInteracting} onHeight={setRailHeight} availableHeight={layout.height} availableWidth={layout.width} bottomClearance={navClearance + bannerHeight + 12} topClearance={headerClearance} />
      </View>
      <Pressable {...bannerProtection} accessibilityRole="button" accessibilityLabel="Create Journey from Home" onPress={() => router.push('/create')}
        onLayout={event => { bannerProtection.onLayout(); setBannerHeight(event.nativeEvent.layout.height); }} style={[s.banner, { bottom: navClearance }]}>
        <View style={s.bannerCopy}><Text style={s.bannerTitle}>Start your own journey</Text></View>
        <View style={s.bannerAction}><Text style={s.bannerActionText}>Create Journey ↗</Text></View>
      </Pressable>
      <View pointerEvents="none" testID="home-status-shade" style={[s.statusShade, { height: headerTop + 12 }]} />
      <FloatingNavigation active="explore" onHeight={setNavHeight} />
      {initialLoading && <BrandedLoading overlay message="Exploring the world…" />}
    </View>
    {/* A Modal: outside the page so it adds no Home layout node. */}
    <BuddyIntro ready={focused && !initialLoading} />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  statusShade: { position: 'absolute', top: 0, left: 0, right: 0, experimental_backgroundImage: 'linear-gradient(180deg, rgba(5,15,30,0.78) 0%, rgba(5,15,30,0.55) 65%, rgba(5,15,30,0) 100%)' },
  safe: { flex: 1, backgroundColor: theme.background },
  page: { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },
  header: { position: 'absolute', left: 0, right: 0, elevation: 10, minHeight: 52, paddingHorizontal: 18, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 },
  search: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  banner: { position: 'absolute', left: 16, right: 16, zIndex: 3, minHeight: 48, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  bannerCopy: { flexGrow: 1, flexShrink: 1, flexBasis: 130, gap: 2 },
  bannerTitle: { color: theme.text, fontSize: 12, fontWeight: '600' },
  bannerSubtitle: { color: theme.muted, fontSize: 10 },
  bannerAction: { ...primaryControl, minHeight: 44, borderRadius: 24, paddingHorizontal: 12, justifyContent: 'center' },
  bannerActionText: { color: theme.white, fontSize: 11, fontWeight: '700' },
  exploration: { flex: 1 },
  map: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: spaceColor },
});
