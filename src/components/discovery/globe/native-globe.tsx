import Mapbox, { type Camera, type MapState } from '@rnmapbox/maps';
import { useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { selectedJourneyId, worldCamera, type DiscoveryPoints } from '@/lib/discovery/map';
import { discoveryPadding, locateCamera, locateDuration, maxDiscoveryZoom, type Viewport } from '@/lib/discovery/camera';
import { createLocateTransition, cinematicLocateDuration } from '@/lib/discovery/locate-transition';
import { createIdleMotion } from '@/lib/discovery/idle-motion';
import { colors } from '../ui';
import { globeAtmosphere, spaceColor } from '@/lib/discovery/presentation';
import { GlobeFallback, GlobeLoading } from './fallback';

let configured: string | null = null;
export async function configureGlobe(token: string) {
  if (configured !== token) { await Mapbox.setAccessToken(token); configured = token; }
}
export const NativeGlobe = memo(function NativeGlobe({ points, onOpen, retry, bottomInset, viewport, selectionId, locateVersion }: {
  points: DiscoveryPoints; onOpen: (id: string) => void; retry: () => void; bottomInset: number;
  viewport: Viewport; selectionId: string | null; locateVersion: number;
}) {
  const camera = useRef<Camera>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const requestKey = selectionId ? JSON.stringify([selectionId, locateVersion]) : null;
  const located = useRef<{ id: string; version: number } | null>(null);
  const transition = useMemo(() => createLocateTransition(command => camera.current?.setCamera(command)), []);
  const lastSelection = useRef<string | null>(null);
  const framed = useRef<{ selection: string; layout: string } | null>(null);
  const motion = useMemo(() => createIdleMotion(
    (value, duration) => camera.current?.setCamera({ ...value, animationMode: 'linearTo', animationDuration: duration }),
    // A zero-duration ease replaces the auto animator at the latest observed pose.
    value => { if (value) camera.current?.setCamera({ ...value, animationMode: 'easeTo', animationDuration: 0 }); },
  ), []);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    motion.configure({ focused: true });
    return () => { transition.cancel(); setFocused(false); motion.configure({ focused: false }); };
  }, [motion, transition]));
  useEffect(() => {
    let active = true;
    motion.configure({ active: AppState.currentState === 'active' });
    const app = AppState.addEventListener('change', state => { if (state !== 'active') transition.cancel(); setAppActive(state === 'active'); motion.configure({ active: state === 'active' }); });
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) motion.configure({ reduceMotion: value });
    }).catch(() => { /* Conservatively keep automatic motion disabled if the preference is unavailable. */ });
    const accessibility = AccessibilityInfo.addEventListener('reduceMotionChanged', value => motion.configure({ reduceMotion: value }));
    return () => { active = false; app.remove(); accessibility.remove(); transition.cancel(); motion.dispose(); };
  }, [motion, transition]);
  useEffect(() => { motion.configure({ ready: ready && !failed, selected: selectionId !== null }); }, [motion, ready, failed, selectionId]);
  useEffect(() => {
    if (ready || failed) return;
    const timeout = setTimeout(() => setFailed(true), 20000);
    return () => clearTimeout(timeout);
  }, [ready, failed]);
  useEffect(() => { transition.select(requestKey); }, [transition, requestKey]);
  const target = useMemo(() => locateCamera(points, viewport, bottomInset), [points, viewport, bottomInset]);
  const padding = useMemo(() => discoveryPadding(viewport, bottomInset), [viewport, bottomInset]);
  const selectionKey = selectionId ? JSON.stringify([selectionId, locateVersion, points.features]) : '';
  const layoutKey = JSON.stringify([viewport, padding]);
  useEffect(() => {
    if (!ready || failed || !focused || !appActive || viewport.width <= 0 || viewport.height <= 0) return;
    const clearingSelection = lastSelection.current !== null && selectionId === null;
    lastSelection.current = selectionId;
    let destination;
    if (selectionId) {
      // Ignore old points / empty detail while the newly selected public journey loads.
      if (!target || points.features[0]?.properties.journeyId !== selectionId) return;
      if (framed.current?.selection === selectionKey && framed.current.layout === layoutKey) return;
      destination = target;
    } else if (clearingSelection || !framed.current || framed.current.selection) {
      // Clearing selection retains the established return-to-world behavior.
      destination = { ...worldCamera, padding };
    } else {
      if (framed.current.layout === layoutKey) return;
      destination = { padding }; // Panel-only changes preserve the user's center, zoom and orientation.
    }
    if (selectionId && target && requestKey) {
      const newRequest = located.current?.id !== selectionId || located.current.version !== locateVersion;
      motion.pause(cinematicLocateDuration);
      transition.run(requestKey, target, newRequest);
      located.current = { id: selectionId, version: locateVersion };
    } else {
      transition.cancel();
      located.current = null;
      motion.pause(locateDuration);
      camera.current?.setCamera({ ...destination, animationMode: 'easeTo', animationDuration: locateDuration });
    }
    framed.current = { selection: selectionKey, layout: layoutKey };
  }, [ready, failed, focused, viewport, selectionId, selectionKey, layoutKey, target, padding, points, motion, transition, locateVersion, requestKey, appActive]);
  const observe = useCallback((state: MapState, idle = false) => {
    if (!idle && state.gestures.isGestureActive) transition.cancel();
    motion.observe({ centerCoordinate: state.properties.center, zoomLevel: state.properties.zoom,
      heading: state.properties.heading, pitch: state.properties.pitch }, !idle && state.gestures.isGestureActive);
  }, [motion, transition]);
  const reset = () => {
    transition.cancel();
    motion.pause(locateDuration);
    camera.current?.setCamera({ ...worldCamera, padding, animationMode: 'easeTo', animationDuration: locateDuration });
  };
  if (failed) return <GlobeFallback message="The map couldn’t load. Search and journeys are still available below." retry={retry} bottomInset={bottomInset} />;
  return <View style={s.frame}>
    <Mapbox.MapView style={s.map} projection="globe" styleURL={Mapbox.StyleURL.Outdoors}
      scrollEnabled zoomEnabled rotateEnabled pitchEnabled={false} surfaceView={false}
      requestDisallowInterceptTouchEvent compassEnabled compassFadeWhenNorth scaleBarEnabled={false} logoEnabled attributionEnabled
      compassPosition={{ top: 12, right: 12 }}
      logoPosition={{ left: 12, bottom: bottomInset + 10 }} attributionPosition={{ right: 12, bottom: bottomInset + 10 }}
      onTouchStart={() => { transition.cancel(); motion.touch(true); }} onTouchEnd={event => motion.touch(event.nativeEvent.touches.length > 0)}
      onTouchCancel={() => motion.touch(false)} onCameraChanged={state => observe(state)}
      onMapIdle={state => { observe(state, true); motion.idle(); }}
      onDidFinishLoadingMap={() => setReady(true)} onMapLoadingError={() => setFailed(true)}>
      <Mapbox.Atmosphere style={globeAtmosphere} />
      <Mapbox.Camera ref={camera} defaultSettings={worldCamera} minZoomLevel={0} maxZoomLevel={maxDiscoveryZoom} />
      <Mapbox.ShapeSource id="discovery-stops" shape={points} hitbox={{ width: 44, height: 44 }}
        onPress={event => { motion.pause(); const id = selectedJourneyId(event.features[0]?.properties, points); if (id) onOpen(id); }}>
        <Mapbox.CircleLayer id="discovery-pins" style={{ circleRadius: 8, circleColor: colors.ink, circleStrokeColor: '#FFFFFF', circleStrokeWidth: 3 }} />
        <Mapbox.SymbolLayer id="discovery-labels" style={{ textField: ['get', 'name'], textSize: 12,
          textColor: colors.ink, textHaloColor: '#FFFFFF', textHaloWidth: 2, textOffset: [0, 1.7] }} />
      </Mapbox.ShapeSource>
    </Mapbox.MapView>
    {!ready && <View style={[StyleSheet.absoluteFill, s.noTouches]}><GlobeLoading bottomInset={bottomInset} /></View>}
    <Pressable accessibilityRole="button" accessibilityLabel="Reset globe to world view" disabled={!ready}
      accessibilityState={{ disabled: !ready }} onPress={reset} style={[s.reset, { bottom: bottomInset + 40 }]}>
      <Text style={s.resetText}>↗ World</Text>
    </Pressable>
  </View>;
});
const s = StyleSheet.create({
  frame: { flex: 1, backgroundColor: spaceColor }, map: { flex: 1, backgroundColor: spaceColor },
  noTouches: { pointerEvents: 'none' },
  reset: { position: 'absolute', bottom: 38, left: 16, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 24, backgroundColor: colors.white, elevation: 2 },
  resetText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
});
