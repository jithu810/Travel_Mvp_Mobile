import { JourneyActionIcon } from '@/components/journey/journey-action-icon';
import { nearbyFocus, type NearbyPoint } from '@/lib/journey/nearby';
import { NearbyLocations } from '../nearby-locations';
import { useFocusEffect } from 'expo-router';
import { JourneyOverlays } from '@/components/discovery/globe/journey-overlays';
import Mapbox, { type Camera, type MapState } from '@rnmapbox/maps';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/components/discovery/ui';
import { globeAtmosphere, spaceColor } from '@/lib/discovery/presentation';
import { nextGlobeStyle, type GlobeStyle } from '@/lib/discovery/globe-style';
import { frameJourneyMap } from '@/lib/journey/map-camera';
import { useTravelCamera } from '@/hooks/use-travel-camera';
import type { TravelCameraCommand } from '@/lib/journey/travel-camera';
import type { JourneyStop } from '@/types/journey';
import type { JourneyMapData } from '@/lib/journey/map-data';
import { MapFallback, type MapDisplayProps } from './map-frame';

// Bundled PNG keeps the navigation arrow independent of map fonts and networking.
const travelArrowImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAAeElEQVR4nO3TUQqAIBCEYU/TFTtrpzGIAhvcds3ZLcQfetP56qGUZn8on40JZmgs8EKWdTsedzQURMwdDQUlzA0NBTXsE5CKhoJWjIZqvwIVrI1KUVAc0+oCy5FaeA7hZlT6Ctb5x8vmtxRg86UW6PUOA4rYnN3aARXgn2yondtvAAAAAElFTkSuQmCC' };

const travelArrowImages = { 'travel-direction-arrow': travelArrowImage };

let configuredToken: string | null = null;
export async function configureMap(token: string) {
  if (configuredToken === token) return;
  await Mapbox.setAccessToken(token);
  configuredToken = token;
}
export const NativeJourneyMap = memo(function NativeJourneyMap({ data, stops, retry, selectedId, onSelect, presentation = 'story', onExpand, currentPosition, navigationRoute, navigationMode = false, navigationPadding, destinationId, travelCamera, memoryPhotos, animateMemoryRoute = true, playRouteWithSelection = false, controlTopInset = 0 }: {
  data: JourneyMapData; stops: JourneyStop[]; retry: () => void; selectedId?: string | null; onSelect?: (id: string) => void;
} & MapDisplayProps) {
  const camera = useRef<Camera>(null);
  const memoryPreview = memoryPhotos !== undefined && !navigationMode;
  const [focused, setFocused] = useState(true);
  const [memoryIdle, setMemoryIdle] = useState(false);
  const [nearby, setNearby] = useState<NearbyPoint[]>([]);
  const nearbyPoints = useMemo(() => data.markers.map(m => ({ id: m.id, name: m.name, coordinate: m.coordinate })), [data.markers]);
  const touching = useRef(false);
  const lastSelection = useRef(selectedId);
  const mounted = useRef(false);
  const foreground = useRef(AppState.currentState === 'active');
  const pose = useRef<MapState['properties'] | null>(null);
  const transitioning = useRef(false);
  const fitted = useRef<{ frame: NonNullable<ReturnType<typeof frameJourneyMap>>; style: GlobeStyle } | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [mapState, setMapState] = useState<{ style: GlobeStyle; ready: boolean }>({ style: 'satellite', ready: false });
  const [reduceMotion, setReduceMotion] = useState(true);
  const { style, ready } = mapState;
  const failed = style === 'failed';
  const selected = data.markers.find(marker => marker.id === selectedId);
  const frame = useMemo(() => frameJourneyMap(stops, viewport, navigationMode
    ? { paddingTop: navigationPadding?.top ?? 80, paddingBottom: navigationPadding?.bottom ?? 220, paddingLeft: 28, paddingRight: 28 }
    : presentation === 'preview'
    ? { paddingTop: 14, paddingBottom: 24, paddingLeft: 24, paddingRight: 80 }
    : { paddingTop: 72, paddingBottom: 32, paddingLeft: 28, paddingRight: 28 }), [stops, viewport, presentation, navigationMode, navigationPadding?.top, navigationPadding?.bottom]);
  const cancelTransition = useCallback(() => {
    const current = pose.current;
    if (transitioning.current && current) camera.current?.setCamera({
      centerCoordinate: current.center, zoomLevel: current.zoom, heading: current.heading, pitch: current.pitch,
      animationMode: 'easeTo', animationDuration: 0,
    });
    transitioning.current = false;
  }, []);
  useFocusEffect(useCallback(() => {
    if (!memoryPreview) return;
    setFocused(true);
    return () => { touching.current = false; setNearby([]); setFocused(false); setMemoryIdle(false); cancelTransition(); };
  }, [memoryPreview, cancelTransition]));
  const selectMemory = useCallback((id: string) => {
    if (!mounted.current || !foreground.current) return;
    if (memoryPreview) setMemoryIdle(false);
    const group = !navigationMode ? nearbyFocus(nearbyPoints, id, pose.current?.zoom ?? 0) : null;
    if (group && group.choices.length > 1) { setNearby(group.choices); return; }
    if (group && id === lastSelection.current) camera.current?.setCamera({ centerCoordinate: group.centerCoordinate, zoomLevel: group.zoomLevel, animationMode: 'easeTo', animationDuration: reduceMotion ? 0 : 450 });
    onSelect?.(id);
  }, [memoryPreview, onSelect, navigationMode, nearbyPoints, reduceMotion]);
  const memoryPoints = useMemo(() => ({ type: 'FeatureCollection' as const, features: data.markers.map(marker => ({
    type: 'Feature' as const, id: marker.id, geometry: { type: 'Point' as const, coordinates: marker.coordinate },
    properties: { journeyId: marker.id, name: marker.name, photo: memoryPhotos?.[marker.id] || null, photoThumbnail: stops.find(stop => stop.id === marker.id)?.photoThumbnail || null },
  })) }), [data.markers, memoryPhotos, stops]);
  const moveToLocation = useCallback((command: TravelCameraCommand) => {
    // GPS/camera observers can receive AppState before this component's listener.
    if (!mounted.current || AppState.currentState !== 'active') return;
    transitioning.current = command.animationDuration > 0;
    camera.current?.setCamera(command);
  }, []);
  const follow = useTravelCamera(navigationMode ? travelCamera : undefined, moveToLocation, cancelTransition, {
    ready: ready && !failed, reduceMotion, top: navigationPadding?.top ?? 80, bottom: navigationPadding?.bottom ?? 220,
  });
  const { canMove, explore } = follow;
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => {
      if (!mounted.current) return;
      foreground.current = state === 'active';
      if (!foreground.current) { cancelTransition(); touching.current = false; setMemoryIdle(false); }
      setAppActive(foreground.current);
    });
    return () => { mounted.current = false; cancelTransition(); subscription.remove(); };
  }, [cancelTransition]);
  useEffect(() => {
    let active = true;
    let changed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active && !changed) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; if (active) setReduceMotion(value); });
    return () => { active = false; subscription.remove(); };
  }, []);
  const points = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: data.markers.map(marker => ({
      type: 'Feature' as const, id: marker.id,
      geometry: { type: 'Point' as const, coordinates: marker.coordinate },
      properties: { id: marker.id, number: String(marker.number), selected: marker.id === selectedId, destination: navigationMode && marker.id === destinationId },
    })),
  }), [data.markers, selectedId, navigationMode, destinationId]);
  const fit = useCallback(() => {
    if (!frame || !ready || failed || !mounted.current || !foreground.current || (memoryPreview && !focused)) return;
    if (navigationMode && travelCamera && !canMove()) return;
    transitioning.current = !reduceMotion;
    camera.current?.setCamera({ ...frame.camera, animationMode: 'easeTo', animationDuration: reduceMotion ? 0 : 450 });
  }, [frame, ready, failed, reduceMotion, navigationMode, travelCamera, canMove, memoryPreview, focused]);
  useEffect(() => {
    if (!ready || !appActive || !frame) return;
    // Accessibility updates must not reset a map the traveler has already panned.
    if (fitted.current?.frame === frame && fitted.current.style === style) return;
    fitted.current = { frame, style };
    // Following owns Travel's camera. Sheet measurements must not refit over GPS or exploration.
    if (navigationMode && travelCamera) return;
    fit();
  }, [ready, appActive, frame, style, fit, navigationMode, travelCamera]);
  useEffect(() => {
    if (!ready || failed || !mounted.current || !foreground.current || (memoryPreview && !focused) || (navigationMode && travelCamera && !canMove())) { if (!memoryPreview) lastSelection.current = selectedId; return; }
    if (selected && selectedId !== lastSelection.current) {
      if (navigationMode) explore();
      transitioning.current = !reduceMotion;
      const currentZoom = pose.current?.zoom ?? frame?.camera.zoomLevel ?? 0;
      const local = !navigationMode ? nearbyFocus(nearbyPoints, selected.id, currentZoom) : null;
      camera.current?.setCamera({
      ...(local && local.zoomLevel > currentZoom + 0.01 ? { zoomLevel: local.zoomLevel } : {}),
      centerCoordinate: [selected.coordinate[0], Math.max(-85.0511287798066, Math.min(85.0511287798066, selected.coordinate[1]))],
      animationMode: 'easeTo', animationDuration: reduceMotion ? 0 : 450,
      });
    }
    lastSelection.current = selectedId;
  }, [ready, failed, selected, selectedId, reduceMotion, navigationMode, travelCamera, explore, canMove, memoryPreview, focused, nearbyPoints, frame]);
  // Late native events from a replaced style cannot skip fallback steps or
  // mark the replacement ready. Each keyed style receives its own timeout.
  const mapError = useCallback(() => {
    if (!mounted.current || !foreground.current) return;
    setMapState(previous => previous.style === style ? { style: navigationMode ? 'failed' : nextGlobeStyle(style), ready: false } : previous);
  }, [style, setMapState, navigationMode]);
  useEffect(() => {
    if (ready || failed || !frame || !appActive) return;
    const timeout = setTimeout(mapError, 20000);
    return () => clearTimeout(timeout);
  }, [ready, failed, frame, mapError, appActive]);
  if (failed) return <MapFallback message={navigationMode ? "Road map unavailable. Check the connection and Mapbox style access, then retry." : "The map couldn’t load. You can still browse the journey’s stops."} retry={retry} compact={presentation === 'preview'} onExpand={onExpand} />;
  return <View style={[styles.card, presentation !== 'story' && { flex: 1, borderWidth: 0, borderRadius: navigationMode ? 0 : 18 }]}>
    <View style={[styles.viewport, presentation !== 'story' && { height: undefined, flex: 1 }]} onLayout={event => {
      if (!mounted.current) return;
      const { width, height } = event.nativeEvent.layout;
      setViewport(previous => previous.width === width && previous.height === height ? previous : { width, height });
    }}>
      {frame && <Mapbox.MapView key={style} style={styles.map} projection={navigationMode ? 'mercator' : frame.projection} styleURL={navigationMode ? Mapbox.StyleURL.Street : style === 'satellite' ? Mapbox.StyleURL.SatelliteStreet : Mapbox.StyleURL.Outdoors}
        onPress={presentation === 'preview' ? () => { if (mounted.current) onExpand?.(); } : undefined}
        scrollEnabled={presentation !== 'preview'} zoomEnabled={presentation !== 'preview'} rotateEnabled={presentation !== 'preview'} pitchEnabled={false} surfaceView={false} requestDisallowInterceptTouchEvent
        compassEnabled={presentation !== 'preview'} compassPosition={navigationMode ? { bottom: (navigationPadding?.bottom ?? 220) + 36, right: 12 } : { top: 12 + Math.max(0, controlTopInset), right: 12 }} scaleBarEnabled={false} logoEnabled attributionEnabled
        logoPosition={navigationMode ? { bottom: (navigationPadding?.bottom ?? 220) + 8, left: 12 } : undefined}
        attributionPosition={navigationMode ? { bottom: (navigationPadding?.bottom ?? 220) + 8, right: 12 } : undefined}
        onCameraChanged={state => {
          if (!mounted.current || (navigationMode && travelCamera && !canMove())) return;
          pose.current = state.properties;
          // Native Mapbox gestures interrupt its animator; do not fight the gesture with another command.
          if (state.gestures.isGestureActive) { if (memoryPreview) setMemoryIdle(false); transitioning.current = false; if (navigationMode) follow.explore(); }
        }}
        onTouchStart={memoryPreview ? () => { touching.current = true; setMemoryIdle(false); cancelTransition(); } : undefined}
        onTouchEnd={memoryPreview ? () => { touching.current = false; } : undefined}
        onTouchCancel={memoryPreview ? () => { touching.current = false; } : undefined}
        onMapIdle={() => { if (mounted.current) { transitioning.current = false; if (memoryPreview && !touching.current) setMemoryIdle(true); } }}
        onDidFinishLoadingMap={() => {
          if (mounted.current) setMapState(previous => previous.style === style && !previous.ready ? { ...previous, ready: true } : previous);
        }} onMapLoadingError={mapError}>
        {navigationMode && <Mapbox.Images images={travelArrowImages} />}
        {!navigationMode && <Mapbox.Atmosphere style={globeAtmosphere} />}
        <Mapbox.Camera ref={camera} defaultSettings={frame.camera} minZoomLevel={0} maxZoomLevel={16} />
        {frame.route.geometry.coordinates.length > 0 && <Mapbox.ShapeSource id="planned-line" shape={frame.route}>
          <Mapbox.LineLayer id="planned-line-halo" style={{ lineColor: '#FFFFFF', lineWidth: 6, lineOpacity: 0.75, lineJoin: 'round', lineCap: 'round' }} />
          <Mapbox.LineLayer id="planned-line-layer" style={{ lineColor: '#4A9D7C', lineWidth: 3, lineOpacity: 0.95, lineDasharray: [2, 2], lineJoin: 'round', lineCap: 'round' }} />
        </Mapbox.ShapeSource>}
        {navigationRoute && appActive && <Mapbox.ShapeSource id="travel-road-route" shape={{ type: 'Feature', properties: {}, geometry: navigationRoute }}>
          <Mapbox.LineLayer id="travel-road-outline" style={{ lineColor: '#FFFFFF', lineWidth: 7, lineJoin: 'round', lineCap: 'round' }} />
          <Mapbox.LineLayer id="travel-road-line" style={{ lineColor: '#2677D9', lineWidth: 4, lineJoin: 'round', lineCap: 'round' }} />
        </Mapbox.ShapeSource>}
        <Mapbox.ShapeSource id="planned-stops" shape={points} hitbox={{ width: 44, height: 44 }}
          onPress={event => {
            if (!mounted.current) return;
            const id = event.features[0]?.properties?.id;
            if (typeof id === 'string' && data.markers.some(marker => marker.id === id)) { selectMemory(id); if (presentation === 'preview') onExpand?.(); }
          }}>
          <Mapbox.CircleLayer id="stop-circles" style={{
            circleRadius: navigationMode ? 10 : ['case', ['get', 'selected'], presentation === 'preview' ? 12 : 18, presentation === 'preview' ? 10 : 14],
            circleColor: ['case', ['get', 'destination'], '#2677D9', ['get', 'selected'], colors.ink, colors.green],
            circleStrokeWidth: ['case', ['get', 'selected'], 4, 2], circleStrokeColor: '#FFFFFF',
          }} />
          <Mapbox.SymbolLayer id="stop-numbers" style={{ textField: ['get', 'number'], textSize: 12, textColor: '#FFFFFF', textAllowOverlap: true, textIgnorePlacement: true }} />
        </Mapbox.ShapeSource>
        {currentPosition && Number.isFinite(currentPosition.latitude) && Math.abs(currentPosition.latitude) <= 90
          && Number.isFinite(currentPosition.longitude) && Math.abs(currentPosition.longitude) <= 180 && <Mapbox.ShapeSource id="travel-current-position" shape={{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [currentPosition.longitude, currentPosition.latitude] } }}>
          <Mapbox.CircleLayer id="travel-position-halo" style={{ circleRadius: 9, circleColor: '#2677D9', circleOpacity: 0.18 }} />
          {typeof currentPosition.direction === 'number' ? <Mapbox.SymbolLayer id="travel-position-arrow" style={{
            iconImage: 'travel-direction-arrow', iconSize: 1,
            iconRotate: currentPosition.direction, iconRotationAlignment: 'map', iconPitchAlignment: 'map', iconAllowOverlap: true, iconIgnorePlacement: true,
          }} /> : <Mapbox.CircleLayer id="travel-position-dot" style={{ circleRadius: 5, circleColor: '#2677D9', circleStrokeWidth: 2, circleStrokeColor: '#FFFFFF' }} />}
        </Mapbox.ShapeSource>}
        {ready && memoryPreview && <JourneyOverlays points={memoryPoints} route={data.line.geometry.coordinates} onOpen={selectMemory}
          drawRoute={false} durationScale={3} selectedId={selectedId} playbackKey={JSON.stringify(data.line.geometry.coordinates)}
          playing={nearby.length === 0 && animateMemoryRoute && focused && appActive && !reduceMotion && memoryIdle && (!selectedId || playRouteWithSelection)} />}
      </Mapbox.MapView>}
      {!ready && <View style={styles.loading} pointerEvents="none" accessibilityLabel="Loading journey map" accessibilityRole="progressbar"><ActivityIndicator color={colors.green} /><Text style={styles.note}>Loading map…</Text></View>}
      {presentation !== 'preview' && <Pressable accessibilityRole="button" accessibilityLabel="Fit journey and reset map orientation"
        accessibilityState={{ disabled: !ready || !frame }} disabled={!ready || !frame} onPress={() => { if (navigationMode) follow.explore(); fit(); }} style={[styles.fit, { top: 12 + Math.max(0, controlTopInset) }, !navigationMode && { width: 44, paddingHorizontal: 10, borderRadius: 22 }, navigationMode && { top: undefined, bottom: (navigationPadding?.bottom ?? 220) + 36 }]}>
        {navigationMode ? <Text style={styles.fitLabel}>↗ Fit journey</Text> : <JourneyActionIcon name="fit" />}
      </Pressable>}
      {navigationMode && travelCamera && <View pointerEvents="box-none" style={[styles.locationControls, { bottom: (navigationPadding?.bottom ?? 220) + 36 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="My Location, recenter map" accessibilityHint="Centers on accurate foreground GPS and resumes following. Does not start the trip."
          accessibilityState={{ selected: follow.following }} onPress={() => { const result = follow.recenter(); if (!result.moved) Alert.alert('My Location', result.message); }} style={[styles.recenter, follow.following && { borderColor: colors.green }]}>
          <Text style={styles.fitLabel}>◎ My Location</Text>
        </Pressable>
      </View>}
    </View>
    <NearbyLocations points={nearby} onClose={() => setNearby([])} onSelect={id => { setNearby([]); onSelect?.(id); }} />
    {frame && !frame.fitsViewport && presentation !== 'preview' && <Text style={styles.overviewNote} accessibilityLiveRegion="polite">{frame.latitudeClamped ? 'Some polar locations cannot be shown on this overview. All stops remain in the story.' : 'This overview cannot show every stop at once. Select a stop to explore.'}</Text>}
    {presentation === 'story' && <View style={styles.caption} accessibilityLiveRegion="polite">
      <Text style={styles.selected}>{selected ? selected.number + ' · ' + selected.name : 'Tap a stop to read its story'}</Text>
      <Text style={styles.note}>Pan or pinch to explore · Rotate with two fingers</Text>
    </View>}
  </View>;
});
const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', backgroundColor: colors.paper },
  viewport: { height: 310, position: 'relative' }, map: { flex: 1, backgroundColor: spaceColor },
  loading: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', gap: 10 },
  fit: { position: 'absolute', top: 12, left: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, backgroundColor: colors.paper, borderRadius: 14 },
  fitLabel: { fontSize: 12, color: colors.green, fontWeight: '600' },
  locationControls: { position: 'absolute', right: 62, alignItems: 'flex-end', maxWidth: 170, gap: 6 },
  recenter: { minHeight: 48, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, justifyContent: 'center', elevation: 3 },
  overviewNote: { color: colors.muted, fontSize: 11, lineHeight: 17, paddingHorizontal: 10, paddingVertical: 6 },
  caption: { padding: 16, gap: 6 }, selected: { color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 19 },
});
