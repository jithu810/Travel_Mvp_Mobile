import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Message } from '@/components/discovery/ui';
import { useLoad } from '@/hooks/use-load';
import { spaceColor } from '@/lib/discovery/presentation';
import { memoryMapJourneyLimit, memoryPinRoute, type MemoryPin } from '@/lib/profile/memory-map';
import { loadProfileMemoryMap, signMemoryPins } from '@/lib/profile/memory-map-queries';
import { theme } from '@/theme/mobile-theme';
import { MemoryMapView } from './memory-map-view';

// Mounted only while Map is selected, so the read is lazy and unmounting (tab change,
// leaving the profile) aborts it. A changed owner replaces the loader, which hides the
// previous owner's pins synchronously.
// refreshKey: soft profile refresh (focus) that may reuse the 45 s cache, so returning
// from Story neither refetches nor remounts the map. reloadKey: forced fresh read
// (pull-to-refresh, foreground).
export function ProfileMemoryMap({ ownerId, refreshKey = 0, reloadKey = 0, owner = false }: { ownerId: string; refreshKey?: number; reloadKey?: number; owner?: boolean }) {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const fresh = useRef(false);
  const loader = useCallback((signal: AbortSignal) => {
    const options = { fresh: fresh.current };
    fresh.current = false;
    return loadProfileMemoryMap(ownerId, signal, options);
  }, [ownerId]);
  const state = useLoad(loader);
  const refresh = state.refresh;
  const lastRefresh = useRef(refreshKey), lastReload = useRef(reloadKey);
  useEffect(() => {
    const reload = lastReload.current !== reloadKey;
    if (!reload && lastRefresh.current === refreshKey) return;
    lastRefresh.current = refreshKey; lastReload.current = reloadKey;
    if (reload) fresh.current = true;
    refresh();
  }, [refreshKey, reloadKey, refresh]);
  const data = state.data;
  // Pins show first; photos are signed afterwards and best-effort (art until/unless signed).
  const photoLoader = useCallback((signal: AbortSignal) => data ? signMemoryPins(data.pins, signal) : Promise.resolve(null), [data]);
  const photos = useLoad(photoLoader);
  const pins = useMemo(() => photos.data && data && photos.data.length === data.pins.length ? photos.data : data?.pins ?? [], [photos.data, data]);
  // One navigation per tap: a marker and the dot beneath it, or a fast double tap,
  // cannot push Story twice. Released when this profile is focused again.
  const navigating = useRef(false);
  // One active Mapbox map: the native map exists only while this profile is focused, so
  // Story's map can load. Data stays cached (45 s), so a focus return does not refetch,
  // and the native map resumes its last camera.
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    navigating.current = false;
    setFocused(true);
    return () => setFocused(false);
  }, []));
  const open = useCallback((pin: MemoryPin) => {
    if (navigating.current) return;
    navigating.current = true;
    router.push(memoryPinRoute(pin));
  }, [router]);
  const mapHeight = Math.round(Math.max(300, Math.min(460, height * 0.5)));
  // Estimated before the first native layout so the map never waits on a measurement.
  const initialViewport = useMemo(() => ({ width: Math.max(1, Math.min(width, 560) - 32), height: mapHeight }), [width, mapHeight]);
  if (!data) return state.loading
    ? <View style={[s.frame, { height: mapHeight }, s.center]} accessibilityLabel="Loading travel map" accessibilityRole="progressbar"><ActivityIndicator color={theme.accent} /></View>
    : <Message title="Couldn’t load the travel map" body={state.error || 'Something went wrong. Please try again.'} retry={state.retry} />;
  const refreshError = state.error ? <Message title="Couldn’t refresh the travel map" body={state.error} retry={state.retry} /> : null;
  if (!data.pins.length) return <View>
    {refreshError}
    <Message title="No mapped places yet" body={owner
      ? 'Stops with a location from journeys you publish will appear here. Drafts stay private and never show on this map.'
      : 'Places from this creator’s published journeys will appear here once they add locations.'} />
  </View>;
  const places = data.pins.length;
  const placesText = places + (places === 1 ? ' place' : ' places');
  const summary = data.limited
    ? 'Showing ' + (owner ? 'your ' : 'their ') + memoryMapJourneyLimit + ' most recent journeys · ' + placesText
    : placesText + ' from ' + data.journeyCount + ' published ' + (data.journeyCount === 1 ? 'journey' : 'journeys');
  return <View style={s.section}>
    {refreshError}
    <Text style={s.summary} accessibilityLiveRegion="polite">{summary}</Text>
    <View style={[s.frame, { height: mapHeight }]} accessibilityLabel={'Travel map, ' + placesText}
      accessibilityHint="Photo pins open their stop in the journey story. To reach every journey with a screen reader, use the Journeys tab.">
      {focused ? <MemoryMapView pins={pins} onOpen={open} initialViewport={initialViewport} cameraKey={ownerId.toLowerCase()} /> : null}
    </View>
    <Text style={s.note}>{places > data.featuredCount
      ? 'Photos show for ' + data.featuredCount + ' recent places. Tap a pin or dot to open its stop; every journey is also listed in the Journeys tab.'
      : 'Tap a pin to open its stop in the journey story. Every journey is also listed in the Journeys tab.'}</Text>
  </View>;
}

const s = StyleSheet.create({
  section: { gap: 8, paddingBottom: 8 },
  frame: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, backgroundColor: spaceColor },
  center: { alignItems: 'center', justifyContent: 'center' },
  summary: { color: theme.muted, fontSize: 12, lineHeight: 18 },
  note: { color: theme.muted, fontSize: 11, lineHeight: 17 },
});
