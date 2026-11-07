import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Message } from '@/components/discovery/ui';
import { useLoad } from '@/hooks/use-load';
import { spaceColor } from '@/lib/discovery/presentation';
import { memoryPinRoute, type MemoryPin } from '@/lib/profile/memory-map';
import { loadProfileMemoryMap, signMemoryPins } from '@/lib/profile/memory-map-queries';
import { theme } from '@/theme/mobile-theme';
import { MemoryMapView } from './memory-map-view';
import type { MemoryJourneyCover } from './memory-buddy-presentation';

// Mounted only while Map is selected, so the read is lazy and unmounting (tab change,
// leaving the profile) aborts it. A changed owner replaces the loader, which hides the
// previous owner's pins synchronously.
// refreshKey: soft profile refresh (focus) that may reuse the 45 s cache, so returning
// from Story neither refetches nor remounts the map. reloadKey: forced fresh read
// (pull-to-refresh, foreground).
export function ProfileMemoryMap({ ownerId, refreshKey = 0, reloadKey = 0, owner = false, fullBleed = false, mapHeight: requestedHeight = 300, onScreen = true, journeyCovers }: { ownerId: string; refreshKey?: number; reloadKey?: number; owner?: boolean; fullBleed?: boolean; mapHeight?: number; onScreen?: boolean; journeyCovers?: readonly MemoryJourneyCover[] }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
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
  const mapWidth = Math.max(1, Math.min(width, 560) - (fullBleed ? 0 : 32));
  const mapHeight = Math.max(160, requestedHeight);
  const initialViewport = useMemo(() => ({ width: mapWidth, height: mapHeight }), [mapWidth, mapHeight]);
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
  return <View style={[s.frame, { height: mapHeight }]}>
    {focused && <MemoryMapView key={ownerId} pins={pins} onOpen={open} initialViewport={initialViewport} cameraKey={ownerId.toLowerCase()} onScreen={onScreen} journeyCovers={journeyCovers} />}
    {state.error && <View style={s.error} accessibilityRole="alert" accessibilityLabel={state.error}><Text style={s.errorText}>Couldn’t refresh memories.</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry travel memories" onPress={state.retry} style={s.retry}><Text style={s.errorText}>Retry</Text></Pressable></View>}
  </View>;
}

const s = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: spaceColor },
  center: { alignItems: 'center', justifyContent: 'center' },
  error: { position: 'absolute', top: 68, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.surface, borderRadius: 12, paddingLeft: 10 },
  errorText: { color: theme.text, fontSize: 10, lineHeight: 14 }, retry: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
