import { nearbyFocus, type NearbyPoint } from '@/lib/journey/nearby';
import { NearbyLocations } from '@/components/journey/nearby-locations';
import { destinationCamera, destinationMarker, type DestinationFocus } from '@/lib/discovery/destination-camera';
import Mapbox, { type Camera, type MapState } from '@rnmapbox/maps';
import { useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { selectedJourneyId, worldCamera, type DiscoveryPoints } from '@/lib/discovery/map';
import { discoveryPadding, locateCamera, locateDuration, maxDiscoveryZoom, type Viewport } from '@/lib/discovery/camera';
import { createLocateTransition, cinematicLocateDuration } from '@/lib/discovery/locate-transition';
import { createIdleMotion } from '@/lib/discovery/idle-motion';
import { nextGlobeStyle, globeLogoPosition, globeAttributionPosition, worldCountryLabels, type GlobeStyle } from '@/lib/discovery/globe-style';
import { colors } from '../ui';
import { HomeControlIcon } from '../home-control-icon';
import { globeAtmosphere, spaceColor } from '@/lib/discovery/presentation';
import { GlobeFallback, GlobeLoading } from './fallback';
import { JourneyOverlays } from './journey-overlays';
import { useBuddyProtectedBounds } from '@/hooks/use-buddy-geometry';
import { globeBuddyControls } from '@/lib/buddy/map-controls';
import { useBuddyMapPins } from '@/hooks/use-buddy-map-pins';

const previewCamera = { ...worldCamera, zoomLevel: 0 };
let configured: string | null = null;
export async function configureGlobe(token: string) {
  if (configured !== token) { await Mapbox.setAccessToken(token); configured = token; }
}
export const NativeGlobe = memo(function NativeGlobe({ points, route, onOpen, retry, bottomInset, headerInset = 0, viewport, selectionId, locateVersion, sheetInteracting, preview = false, homeSearch = false, onCenterChange, destinationMode = false, destination = null, destinationVersion = 0 }: {
  points: DiscoveryPoints; route: [number, number][][]; onOpen: (id: string) => void; retry: () => void; bottomInset: number; headerInset?: number;
  viewport: Viewport; selectionId: string | null; locateVersion: number; sheetInteracting: boolean; preview?: boolean; homeSearch?: boolean; onCenterChange?: (center: [number, number]) => void; destinationMode?: boolean; destination?: DestinationFocus | null; destinationVersion?: number;
}) {
  const overview = preview ? previewCamera : worldCamera;
  const projectWorld = useCallback((rect: { x: number; y: number; width: number; height: number }) => [{ x: rect.x - 4, y: rect.y - 4, width: rect.width + 8, height: rect.height + 8 }], []);
  const worldProtection = useBuddyProtectedBounds(projectWorld);
  const camera = useRef<Camera>(null);
  const [nearby, setNearby] = useState<NearbyPoint[]>([]);
  const zoom = useRef(0);
  const nearbyPoints = useMemo(() => points.features.map(p => ({ id: String(p.id), name: p.properties.name, coordinate: p.geometry.coordinates })), [points]);
  const mapTouch = useRef(false);
  const destinationFramed = useRef<{ key: string; layout: string } | null>(null);
  const [travel, setTravel] = useState<{ request: string; version: number } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [ready, setReady] = useState(false);
  const [style, setStyle] = useState<GlobeStyle>('satellite');
  const failed = style === 'failed';
  const pinCoordinates = useMemo(() => points.features.map(point => point.geometry.coordinates), [points]);
  const pins = useBuddyMapPins(pinCoordinates, ready && !failed);
  const { setFrame: setPinFrame } = pins;
  const projectControls = useCallback((rect: { x: number; y: number; width: number; height: number }) => { setPinFrame(rect); return globeBuddyControls(rect, headerInset, !preview || destinationMode); }, [setPinFrame, headerInset, preview, destinationMode]);
  const controlsProtection = useBuddyProtectedBounds(projectControls);
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const requestKey = selectionId ? JSON.stringify([selectionId, locateVersion]) : null;
  const located = useRef<{ id: string; version: number } | null>(null);
  const transition = useMemo(() => createLocateTransition(command => camera.current?.setCamera(command), undefined,
    request => setTravel(previous => previous?.request === request ? previous : ({ request, version: (previous?.version || 0) + 1 }))), []);
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
    return () => { mapTouch.current = false; setNearby([]); setTravel(null); transition.cancel(); setFocused(false); motion.configure({ focused: false }); };
  }, [motion, transition]));
  useEffect(() => {
    let active = true;
    motion.configure({ active: AppState.currentState === 'active' });
    const app = AppState.addEventListener('change', state => { if (state !== 'active') { mapTouch.current = false; setTravel(null); transition.cancel(); } setAppActive(state === 'active'); motion.configure({ active: state === 'active' }); });
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) { motion.configure({ reduceMotion: value }); setReduceMotion(value); }
    }).catch(() => { /* Conservatively keep automatic motion disabled if the preference is unavailable. */ });
    const accessibility = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { motion.configure({ reduceMotion: value }); setReduceMotion(value); });
    return () => { active = false; app.remove(); accessibility.remove(); transition.cancel(); motion.dispose(); };
  }, [motion, transition]);
  useEffect(() => { motion.configure({ ready: ready && !failed && viewport.width > 0 && viewport.height > 0, selected: destinationMode || selectionId !== null, interacting: sheetInteracting }); }, [motion, ready, failed, selectionId, destinationMode, sheetInteracting, viewport.width, viewport.height]);
  const mapError = useCallback(() => {
    destinationFramed.current = null;
    mapTouch.current = false; setTravel(null); transition.cancel(); motion.configure({ ready: false }); setReady(false);
    // Coalesce errors from the same style render instead of skipping Outdoors.
    setStyle(nextGlobeStyle(style));
  }, [motion, transition, style]);
  useEffect(() => {
    if (ready || failed) return;
    const timeout = setTimeout(mapError, 20000);
    return () => clearTimeout(timeout);
  }, [ready, failed, style, mapError]);
  useEffect(() => { transition.select(requestKey); }, [transition, requestKey]);
  const padding = useMemo(() => {
    if (preview) return { paddingTop: headerInset + 4, paddingBottom: 4, paddingLeft: 4, paddingRight: 4 };
    const base = discoveryPadding(viewport, bottomInset);
    return { ...base, paddingTop: headerInset > 0 ? Math.min(Math.max(base.paddingTop, headerInset + 24), Math.max(0, viewport.height - base.paddingBottom - 1)) : base.paddingTop };
  }, [viewport, bottomInset, preview, headerInset]);
  const target = useMemo(() => {
    const frame = locateCamera(points, headerInset > 0 ? { ...viewport, height: Math.max(1, viewport.height - headerInset - 24) } : viewport, bottomInset);
    return frame && headerInset > 0 ? { ...frame, padding } : frame;
  }, [points, viewport, bottomInset, headerInset, padding]);
  const selectionKey = selectionId ? JSON.stringify([selectionId, locateVersion, points.features]) : '';
  const layoutKey = JSON.stringify([viewport, padding]);
  useEffect(() => {
    if (destinationMode || !ready || failed || !focused || !appActive || viewport.width <= 0 || viewport.height <= 0) return;
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
      destination = { ...overview, padding };
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
      motion.pause(locateDuration + 50); // Allow the final native camera snapshot to cross the bridge.
      camera.current?.setCamera({ ...destination, animationMode: 'easeTo', animationDuration: locateDuration });
    }
    framed.current = { selection: selectionKey, layout: layoutKey };
  }, [ready, failed, focused, viewport, destinationMode, selectionId, selectionKey, layoutKey, target, padding, points, motion, transition, locateVersion, requestKey, appActive, overview]);
  const destinationKey = JSON.stringify([destinationVersion, destination]);
  const marker = useMemo(() => destinationMarker(destination), [destination]);
  useEffect(() => {
    if (!destinationMode || !ready || failed || !focused || !appActive || viewport.width <= 0 || viewport.height <= 0) return;
    const layout = JSON.stringify([viewport, homeSearch && padding]), previous = destinationFramed.current;
    if (previous?.key === destinationKey && previous.layout === layout) return;
    const target = destinationCamera(destination, viewport);
    const destinationPadding = homeSearch ? padding : target?.padding || { paddingTop: 4, paddingBottom: 4, paddingLeft: 4, paddingRight: 4 };
    setTravel(null); transition.cancel(); motion.pause();
    // A new native command replaces an unfinished flight. Layout-only changes retain a user's exploration pose.
    if (!previous || previous.key !== destinationKey) camera.current?.setCamera({ ...(target || overview), padding: destinationPadding,
      animationMode: reduceMotion ? 'easeTo' : 'flyTo', animationDuration: reduceMotion || !target ? 0 : 1000 });
    else camera.current?.setCamera({ padding: destinationPadding, animationMode: 'easeTo', animationDuration: 0 });
    destinationFramed.current = { key: destinationKey, layout };
  }, [destinationMode, destination, destinationKey, ready, failed, focused, appActive, viewport, reduceMotion, overview, motion, transition, homeSearch, padding]);
  const openPoint = useCallback((id: string) => {
    const point = points.features.find(p => String(p.id) === id);
    if (!point || !ready || !focused || !appActive) return;
    const target = nearbyFocus(nearbyPoints, id, zoom.current);
    setTravel(null); transition.cancel(); motion.pause();
    if (target && target.choices.length > 1) { setNearby(target.choices); return; }
    if (target && target.zoomLevel > zoom.current + 0.1) {
      camera.current?.setCamera({ centerCoordinate: target.centerCoordinate, zoomLevel: target.zoomLevel, animationMode: 'easeTo', animationDuration: reduceMotion ? 0 : 650 });
      return; // A second tap opens the journey once the local locations are distinguishable.
    }
    onOpen(point.properties.journeyId);
  }, [points, nearbyPoints, ready, focused, appActive, transition, motion, reduceMotion, onOpen]);
  const observe = useCallback((state: MapState, idle = false) => {
    zoom.current = state.properties.zoom;
    if (!idle && mapTouch.current && state.gestures.isGestureActive) { setTravel(null); transition.cancel(); }
    if (idle && onCenterChange) {
      const center = state.properties.center;
      if (center.length === 2 && center.every(Number.isFinite) && Math.abs(center[0]) <= 180 && Math.abs(center[1]) <= 90) onCenterChange([center[0], center[1]]);
    }
    motion.observe({ centerCoordinate: state.properties.center, zoomLevel: state.properties.zoom,
      heading: state.properties.heading, pitch: state.properties.pitch }, !idle && state.gestures.isGestureActive);
  }, [motion, transition, onCenterChange]);
  const reset = () => {
    setTravel(null); transition.cancel();
    motion.pause(locateDuration + 50); // Allow the final native camera snapshot to cross the bridge.
    camera.current?.setCamera({ ...overview, padding, animationMode: 'easeTo', animationDuration: locateDuration });
  };
  if (failed) return <GlobeFallback message="The map couldn’t load. Search and journeys are still available below." retry={retry} bottomInset={bottomInset} compact={preview} />;
  return <View {...controlsProtection} style={s.frame}>
    <Mapbox.MapView ref={pins.mapRef} style={s.map} projection="globe" styleURL={style === 'satellite' ? Mapbox.StyleURL.SatelliteStreet : Mapbox.StyleURL.Outdoors}
      scrollEnabled={!preview || destinationMode} zoomEnabled={!preview || destinationMode} rotateEnabled={!preview || destinationMode} pitchEnabled={false} surfaceView={false}
      requestDisallowInterceptTouchEvent compassEnabled={!preview || destinationMode} compassFadeWhenNorth scaleBarEnabled={false} logoEnabled attributionEnabled
      compassPosition={{ top: headerInset + 12, right: 12 }}
      logoPosition={{ ...globeLogoPosition, top: globeLogoPosition.top + headerInset }} attributionPosition={{ ...globeAttributionPosition, top: globeAttributionPosition.top + headerInset }}
      onTouchStart={() => { if (destinationMode) Keyboard.dismiss(); mapTouch.current = true; setTravel(null); transition.cancel(); motion.touch(true); }}
      onTouchEnd={event => { mapTouch.current = event.nativeEvent.touches.length > 0; motion.touch(mapTouch.current); }}
      onTouchCancel={() => { mapTouch.current = false; motion.touch(false); }} onCameraChanged={state => { pins.cameraChanged(state.properties); observe(state); }}
      onMapIdle={state => { pins.idle(state.properties); observe(state, true); motion.idle(); }}
      onDidFinishLoadingMap={() => setReady(true)} onMapLoadingError={mapError}>
      <Mapbox.Atmosphere style={globeAtmosphere} />
      {ready && style === 'satellite' && <Mapbox.SymbolLayer {...worldCountryLabels} belowLayerID="country-label"
        filter={['all', ['==', ['get', 'class'], 'country'], ['<=', ['get', 'symbolrank'], 3]]}
        style={{ visibility: 'visible', symbolPlacement: 'point',
          textField: ['coalesce', ['get', 'name_en'], ['get', 'name']],
          textFont: ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
          textSize: 13, textMaxWidth: 8, symbolSortKey: ['get', 'symbolrank'],
          textVariableAnchor: ['center', 'top', 'bottom', 'left', 'right'], textRadialOffset: 0.3,
          textPitchAlignment: 'map', textRotationAlignment: 'map',
          textOpacity: ['step', ['zoom'], 1, 1, 0],
          textColor: '#FFFFFF', textHaloColor: '#15202C', textHaloWidth: 1.5,
          textAllowOverlap: false, textIgnorePlacement: false }} />}
      <Mapbox.Camera ref={camera} defaultSettings={overview} minZoomLevel={0} maxZoomLevel={destinationMode && !homeSearch ? 14 : maxDiscoveryZoom} />
      {destinationMode && <Mapbox.ShapeSource id="create-destination" shape={marker}>
        <Mapbox.CircleLayer id="create-destination-pin" style={{ circleRadius: 10, circleColor: colors.ink, circleStrokeColor: '#FFFFFF', circleStrokeWidth: 3 }} />
        <Mapbox.SymbolLayer id="create-destination-name" style={{ textField: ['get', 'name'], textSize: 13, textColor: colors.ink, textHaloColor: '#FFFFFF', textHaloWidth: 2, textOffset: [0, 1.8] }} />
      </Mapbox.ShapeSource>}
      <Mapbox.ShapeSource id="discovery-stops" shape={points} hitbox={{ width: 44, height: 44 }}
        onPress={event => { motion.pause(); const feature = event.features[0]; const point = points.features.find(p => String(p.id) === String(feature?.id)) || points.features.find(p => p.properties.journeyId === selectedJourneyId(feature?.properties, points)); if (point) openPoint(String(point.id)); }}>
        <Mapbox.CircleLayer id="discovery-pins" style={{ circleRadius: 8, circleColor: colors.ink, circleStrokeColor: '#FFFFFF', circleStrokeWidth: 3 }} />
        <Mapbox.SymbolLayer id="discovery-labels" filter={['==', ['coalesce', ['get', 'photo'], ''], '']} style={{ textField: ['get', 'name'], textSize: 12,
          textColor: colors.ink, textHaloColor: '#FFFFFF', textHaloWidth: 2, textOffset: [0, 1.7] }} />
        <Mapbox.SymbolLayer id="discovery-photo-labels" filter={['!=', ['coalesce', ['get', 'photo'], ''], '']}
          style={{ textField: ['get', 'name'], textSize: 12, textColor: colors.ink,
            textHaloColor: '#FFFFFF', textHaloWidth: 2, textOffset: [0, 2.8] }} />
      </Mapbox.ShapeSource>
      {ready && points.features[0]?.properties.journeyId === selectionId && <JourneyOverlays
        key={selectionId} playbackKey={travel?.request + ':' + travel?.version} points={points} route={route} onOpen={onOpen} onPointOpen={openPoint} walkingBuddy={!preview && homeSearch}
        playing={nearby.length === 0 && travel?.request === requestKey && focused && appActive && !reduceMotion} />}
    </Mapbox.MapView>
    <NearbyLocations points={nearby} onClose={() => setNearby([])} onSelect={id => { setNearby([]); const point = points.features.find(p => String(p.id) === id); if (point) onOpen(point.properties.journeyId); }} />
    {!ready && <View style={[StyleSheet.absoluteFill, s.noTouches]}><GlobeLoading bottomInset={bottomInset} /></View>}
    {(!preview || (destinationMode && viewport.height - headerInset >= 112)) && <Pressable {...worldProtection} accessibilityRole="button" accessibilityLabel="Reset globe to world view" disabled={!ready}
      accessibilityState={{ disabled: !ready }} onPress={reset} hitSlop={homeSearch ? { top: 4, bottom: 4, left: 4, right: 4 } : undefined} style={[s.reset, (homeSearch || (preview && destinationMode)) && s.compactReset, { bottom: homeSearch ? bottomInset + 16 : preview && destinationMode ? 8 : headerInset > 0 ? undefined : destinationMode ? 8 : bottomInset + 40, top: !homeSearch && !preview && headerInset > 0 ? headerInset + 40 : undefined }]}>
      {homeSearch || (preview && destinationMode) ? <View style={s.worldSurface}><HomeControlIcon name="world" /></View> : <Text style={s.resetText}>↗ World</Text>}
    </Pressable>}
  </View>;
});
const s = StyleSheet.create({
  frame: { flex: 1, backgroundColor: spaceColor }, map: { flex: 1, backgroundColor: spaceColor },
  noTouches: { pointerEvents: 'none' },
  reset: { position: 'absolute', bottom: 38, left: 16, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 24, backgroundColor: colors.white, elevation: 2 },
  compactReset: { width: 44, minHeight: 44, paddingHorizontal: 0, alignItems: 'center', backgroundColor: 'transparent', elevation: 0 },
  worldSurface: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, elevation: 2 },
  resetText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
});
