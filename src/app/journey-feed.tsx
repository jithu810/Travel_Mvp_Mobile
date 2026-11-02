import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JourneyStoryContent } from './journey/[id]';
import { useSessionState } from '@/hooks/session-context';
import { useLoad } from '@/hooks/use-load';
import { BrandedLoading } from '@/components/branded-loading';
import { Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { journeyFeedSessions } from '@/lib/discovery/journey-feed-session';
import { journeyDetailCache } from '@/lib/discovery/journey-detail-cache';
import { loadPublicJourneyCard, loadPublicJourneyMetadata, resolvePhotos } from '@/lib/discovery/queries';
import { prefetchFirstImage } from '@/lib/discovery/journey-feed-prefetch';

export default function JourneyFeedScreen() {
  const params = useLocalSearchParams<{ session?: string }>();
  const token = typeof params.session === 'string' ? params.session : '';
  const auth = useSessionState();
  const account = auth.session?.user.id || 'anonymous';
  const session = !auth.loading && !auth.error ? journeyFeedSessions.get(token, account) : null;
  const [index, setIndex] = useState(session?.index || 0);
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [available, setAvailable] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [notice, setNotice] = useState('');
  const [reducedMotion, setReducedMotion] = useState(true);
  const [revision, setRevision] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const transition = useRef(0), locked = useRef(false);
  const routeFocused = useRef(false), permitted = useRef(false);
  const detailRequest = useRef<AbortController | null>(null), speculativeRequest = useRef<AbortController | null>(null);
  const cancelTransition = useCallback(() => {
    transition.current++; locked.current = false; offset.stopAnimation(); offset.setValue(0); setTransitioning(false);
  }, [offset]);
  const stopWork = useCallback(() => {
    permitted.current = false; detailRequest.current?.abort(); speculativeRequest.current?.abort(); cancelTransition();
  }, [cancelTransition]);
  const { height } = useWindowDimensions();
  const active = focused && foreground && !!session;
  const id = session?.ids[index] || '';
  useEffect(() => { if (!auth.loading) journeyDetailCache.account(account); }, [account, auth.loading]);
  useFocusEffect(useCallback(() => { routeFocused.current = true; permitted.current = AppState.currentState === 'active'; setFocused(true); setRevision(value => value + 1); return () => { routeFocused.current = false; stopWork(); setFocused(false); }; }, [stopWork]));
  useEffect(() => {
    const listener = AppState.addEventListener('change', next => {
      setForeground(next === 'active');
      if (next !== 'active') stopWork(); else permitted.current = routeFocused.current;
    });
    return () => listener.remove();
  }, [stopWork]);
  useEffect(() => {
    let alive = true, changed = false;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive && !changed) setReducedMotion(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; setReducedMotion(value); });
    return () => { alive = false; listener.remove(); };
  }, []);
  const loader = useCallback(async (signal: AbortSignal) => {
    if (!active || !id || revision === 0) return null;
    journeyDetailCache.account(account);
    const controller = new AbortController();
    detailRequest.current = controller;
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted || !permitted.current) controller.abort();
    const requestSignal = controller.signal;
    try {
    // Recheck membership even for cached details, on every activation/refocus.
    const card = await loadPublicJourneyCard(id, requestSignal);
    if (!card) { journeyDetailCache.clear(); return null; }
    const raw = await journeyDetailCache.get(id, requestSignal, upstream => loadPublicJourneyMetadata(id, upstream));
    if (!raw || requestSignal.aborted) return null;
    return (await resolvePhotos([raw], requestSignal))[0];
    } finally { signal.removeEventListener('abort', abort); if (detailRequest.current === controller) detailRequest.current = null; }
  }, [active, id, revision, account]);
  const state = useLoad(loader);
  const refresh = useCallback(() => { journeyDetailCache.clear(); setRevision(value => value + 1); }, []);
  const onStop = useCallback((stop: string) => { if (id) journeyFeedSessions.selectStop(token, account, id, stop); }, [token, account, id]);
  // An unavailable Story has no mounted sheet to own gestures. Do not retain
  // the dismissed Story's modal fence on its recovery controls.
  const storyMounted = active && !!state.data;
  const pagingAvailable = !storyMounted || available;
  const latest = useRef({ active, available: pagingAvailable, storyMounted, index, session, height, reducedMotion });
  useEffect(() => { latest.current = { active, available: pagingAvailable, storyMounted, index, session, height, reducedMotion }; }, [active, pagingAvailable, storyMounted, index, session, height, reducedMotion]);
  const onAvailability = useCallback((value: boolean) => {
    latest.current.available = value;
    if (!value) { speculativeRequest.current?.abort(); cancelTransition(); }
    setAvailable(value);
  }, [cancelTransition]);
  const page = useCallback((step: number) => {
    const current = latest.current;
    if (!step || !permitted.current || !current.active || !current.available || locked.current || !current.session) return;
    const next = current.index + step;
    if (next < 0 || next >= current.session.ids.length) {
      const message = next < 0 ? 'First journey in these results.' : 'End of these results.';
      setNotice(message); AccessibilityInfo.announceForAccessibility(message); offset.setValue(0); return;
    }
    locked.current = true; setTransitioning(true); setNotice('');
    const generation = ++transition.current;
    const commit = () => {
      if (generation !== transition.current || !permitted.current || !latest.current.active || !latest.current.available) return;
      current.session!.index = next; setIndex(next); setAvailable(true);
      offset.setValue(current.reducedMotion ? 0 : step * current.height * 0.24);
    };
    if (current.reducedMotion) commit();
    else Animated.timing(offset, { toValue: -step * current.height, duration: 150, useNativeDriver: true }).start(({ finished }) => { if (finished) commit(); });
  }, [offset]);
  useEffect(() => {
    if (!active || state.loading || !locked.current) return;
    const generation = transition.current;
    const finish = () => { if (generation === transition.current) { locked.current = false; setTransitioning(false); } };
    if (reducedMotion) { offset.setValue(0); finish(); }
    else Animated.timing(offset, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => { if (finished) finish(); });
  }, [active, id, state.loading, reducedMotion, offset]);
  const drag = useCallback((dy: number) => { if (permitted.current && !locked.current && latest.current.active && latest.current.storyMounted && latest.current.available && !latest.current.reducedMotion) offset.setValue(Math.max(-110, Math.min(110, dy * 0.45))); }, [offset]);
  useEffect(() => {
    const next = session?.ids[index + 1];
    if (!active || !available || transitioning || state.loading || !state.data || !next) return;
    const controller = new AbortController();
    speculativeRequest.current = controller;
    const signal = controller.signal;
    void (async () => {
      const raw = await journeyDetailCache.get(next, signal, upstream => loadPublicJourneyMetadata(next, upstream));
      if (!raw || signal.aborted) return;
      // Sign and fetch only the first displayed photo; never preload the gallery.
      const remembered = session?.stops.get(next);
      const first = raw.stops.find(stop => stop.id === remembered) || raw.stops[0];
      // Photo-less and empty decks render StopArt, never the journey cover.
      if (!first?.photo) return;
      const [resolved] = await resolvePhotos([{ ...raw, cover: null, stops: [{ ...first }] }], signal);
      const uri = resolved.stops[0]?.photo;
      if (!uri || signal.aborted) return;
      // Installed Android RN supports request-id callbacks; iOS remains bounded.
      const start = (url: string, request: (id: number) => void) => Platform.OS === 'android'
        ? (Image.prefetch as (url: string, request: (id: number) => void) => Promise<boolean>)(url, request) : Image.prefetch(url);
      await prefetchFirstImage(uri, signal, start, Image.abortPrefetch);
    })().catch(() => { /* Speculative failure never replaces the active journey. */ });
    return () => { controller.abort(); if (speculativeRequest.current === controller) speculativeRequest.current = null; };
  }, [active, available, transitioning, state.loading, state.data, session, index, account]);
  return <SafeAreaView style={ui.safe} edges={state.data && active ? ['left', 'right', 'bottom'] : ['top', 'left', 'right', 'bottom']}>
    <Stack.Screen options={{ statusBarStyle: 'light' }} />
    {active && state.data ? <Animated.View style={[styles.page, { transform: [{ translateY: offset }] }]}><JourneyStoryContent key={id} journey={state.data} refresh={refresh} refreshing={state.refreshing} error={state.error}
        feed={{ index, count: session?.ids.length || 0, enabled: active && !transitioning, initialStop: session?.stops.get(id), onStop, onAvailability, onPage: page, onDrag: drag }} /></Animated.View>
        : <View style={styles.page}><ScreenHeader title="Journey Story" back />{auth.loading || (active && state.loading) ? <BrandedLoading message="Opening the journey…" />
          : <View style={styles.message}><Message title={!session ? 'These results have expired' : state.error ? 'A small detour' : 'Journey unavailable'} body={!session ? 'Go back to Search and open a journey again.' : state.error || 'This journey may no longer be public.'} retry={session ? refresh : undefined} />
            {session && <View style={styles.errorActions}>{[-1, 1].map(step => {
              const disabled = transitioning || index + step < 0 || index + step >= session.ids.length;
              const label = step < 0 ? 'Previous journey' : 'Next journey';
              return <Pressable key={step} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={() => page(step)} style={[styles.next, disabled && { opacity: 0.45 }]}><Text style={styles.actionText}>{label}</Text></Pressable>;
            })}</View>}
          </View>}</View>}
    {!!notice && <Text pointerEvents="none" accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1, minHeight: 0 }, message: { padding: 22 }, next: { minHeight: 48, paddingVertical: 16, paddingHorizontal: 8 }, actionText: { color: '#FFFFFF' }, errorActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, notice: { position: 'absolute', top: 40, alignSelf: 'center', color: '#FFFFFF', backgroundColor: '#18243B', padding: 8, borderRadius: 12 } });
