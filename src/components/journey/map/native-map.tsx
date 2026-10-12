import Mapbox, { type Camera, type MapState } from '@rnmapbox/maps';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/components/discovery/ui';
import { globeAtmosphere, spaceColor } from '@/lib/discovery/presentation';
import { nextGlobeStyle, type GlobeStyle } from '@/lib/discovery/globe-style';
import { frameJourneyMap } from '@/lib/journey/map-camera';
import type { JourneyStop } from '@/types/journey';
import type { JourneyMapData } from '@/lib/journey/map-data';
import { MapFallback, type MapDisplayProps } from './map-frame';

let configuredToken: string | null = null;
export async function configureMap(token: string) {
  if (configuredToken === token) return;
  await Mapbox.setAccessToken(token);
  configuredToken = token;
}
export const NativeJourneyMap = memo(function NativeJourneyMap({ data, stops, retry, selectedId, onSelect, presentation = 'story', onExpand, currentPosition }: {
  data: JourneyMapData; stops: JourneyStop[]; retry: () => void; selectedId?: string | null; onSelect?: (id: string) => void;
} & MapDisplayProps) {
  const camera = useRef<Camera>(null);
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
  const frame = useMemo(() => frameJourneyMap(stops, viewport, presentation === 'preview'
    ? { paddingTop: 14, paddingBottom: 24, paddingLeft: 24, paddingRight: 80 }
    : { paddingTop: 72, paddingBottom: 32, paddingLeft: 28, paddingRight: 28 }), [stops, viewport, presentation]);
  const cancelTransition = useCallback(() => {
    const current = pose.current;
    if (transitioning.current && current) camera.current?.setCamera({
      centerCoordinate: current.center, zoomLevel: current.zoom, heading: current.heading, pitch: current.pitch,
      animationMode: 'easeTo', animationDuration: 0,
    });
    transitioning.current = false;
  }, []);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => {
      if (!mounted.current) return;
      foreground.current = state === 'active';
      if (!foreground.current) cancelTransition();
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
      properties: { id: marker.id, number: String(marker.number), selected: marker.id === selectedId },
    })),
  }), [data.markers, selectedId]);
  const fit = useCallback(() => {
    if (!frame || !ready || failed || !mounted.current || !foreground.current) return;
    transitioning.current = !reduceMotion;
    camera.current?.setCamera({ ...frame.camera, animationMode: 'easeTo', animationDuration: reduceMotion ? 0 : 450 });
  }, [frame, ready, failed, reduceMotion]);
  useEffect(() => {
    if (!ready || !appActive || !frame) return;
    // Accessibility updates must not reset a map the traveler has already panned.
    if (fitted.current?.frame === frame && fitted.current.style === style) return;
    fitted.current = { frame, style };
    fit();
  }, [ready, appActive, frame, style, fit]);
  useEffect(() => {
    if (!ready || failed || !mounted.current || !foreground.current) { lastSelection.current = selectedId; return; }
    if (selected && selectedId !== lastSelection.current) {
      transitioning.current = !reduceMotion;
      camera.current?.setCamera({
      centerCoordinate: [selected.coordinate[0], Math.max(-85.0511287798066, Math.min(85.0511287798066, selected.coordinate[1]))],
      animationMode: 'easeTo', animationDuration: reduceMotion ? 0 : 450,
      });
    }
    lastSelection.current = selectedId;
  }, [ready, failed, selected, selectedId, reduceMotion]);
  // Late native events from a replaced style cannot skip fallback steps or
  // mark the replacement ready. Each keyed style receives its own timeout.
  const mapError = useCallback(() => {
    if (!mounted.current || !foreground.current) return;
    setMapState(previous => previous.style === style ? { style: nextGlobeStyle(style), ready: false } : previous);
  }, [style, setMapState]);
  useEffect(() => {
    if (ready || failed || !frame || !appActive) return;
    const timeout = setTimeout(mapError, 20000);
    return () => clearTimeout(timeout);
  }, [ready, failed, frame, mapError, appActive]);
  if (failed) return <MapFallback message="The map couldn’t load. You can still browse the journey’s stops." retry={retry} compact={presentation === 'preview'} onExpand={onExpand} />;
  return <View style={[styles.card, presentation !== 'story' && { flex: 1, borderWidth: 0, borderRadius: 18 }]}>
    <View style={[styles.viewport, presentation !== 'story' && { height: undefined, flex: 1 }]} onLayout={event => {
      if (!mounted.current) return;
      const { width, height } = event.nativeEvent.layout;
      setViewport(previous => previous.width === width && previous.height === height ? previous : { width, height });
    }}>
      {frame && <Mapbox.MapView key={style} style={styles.map} projection={frame.projection} styleURL={style === 'satellite' ? Mapbox.StyleURL.SatelliteStreet : Mapbox.StyleURL.Outdoors}
        onPress={presentation === 'preview' ? () => { if (mounted.current) onExpand?.(); } : undefined}
        scrollEnabled={presentation !== 'preview'} zoomEnabled={presentation !== 'preview'} rotateEnabled={presentation !== 'preview'} pitchEnabled={false} surfaceView={false} requestDisallowInterceptTouchEvent
        compassEnabled={presentation !== 'preview'} compassPosition={{ top: 12, right: 12 }} scaleBarEnabled={false} logoEnabled attributionEnabled
        onCameraChanged={state => {
          if (!mounted.current) return;
          pose.current = state.properties;
          // Native Mapbox gestures interrupt its animator; do not fight the gesture with another command.
          if (state.gestures.isGestureActive) transitioning.current = false;
        }}
        onMapIdle={() => { if (mounted.current) transitioning.current = false; }}
        onDidFinishLoadingMap={() => {
          if (mounted.current) setMapState(previous => previous.style === style && !previous.ready ? { ...previous, ready: true } : previous);
        }} onMapLoadingError={mapError}>
        <Mapbox.Atmosphere style={globeAtmosphere} />
        <Mapbox.Camera ref={camera} defaultSettings={frame.camera} minZoomLevel={0} maxZoomLevel={16} />
        {currentPosition && Number.isFinite(currentPosition.latitude) && Math.abs(currentPosition.latitude) <= 90
          && Number.isFinite(currentPosition.longitude) && Math.abs(currentPosition.longitude) <= 180 && <Mapbox.ShapeSource id="travel-current-position" shape={{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [currentPosition.longitude, currentPosition.latitude] } }}>
          <Mapbox.CircleLayer id="travel-position-halo" style={{ circleRadius: 13, circleColor: '#2677D9', circleOpacity: 0.25 }} />
          <Mapbox.CircleLayer id="travel-position-dot" style={{ circleRadius: 7, circleColor: '#2677D9', circleStrokeWidth: 3, circleStrokeColor: '#FFFFFF' }} />
        </Mapbox.ShapeSource>}
        {frame.route.geometry.coordinates.length > 0 && <Mapbox.ShapeSource id="planned-line" shape={frame.route}>
          <Mapbox.LineLayer id="planned-line-halo" style={{ lineColor: '#FFFFFF', lineWidth: 6, lineOpacity: 0.75, lineJoin: 'round', lineCap: 'round' }} />
          <Mapbox.LineLayer id="planned-line-layer" style={{ lineColor: '#4A9D7C', lineWidth: 3, lineOpacity: 0.95, lineDasharray: [2, 2], lineJoin: 'round', lineCap: 'round' }} />
        </Mapbox.ShapeSource>}
        <Mapbox.ShapeSource id="planned-stops" shape={points} hitbox={{ width: 44, height: 44 }}
          onPress={event => {
            if (!mounted.current) return;
            const id = event.features[0]?.properties?.id;
            if (typeof id === 'string' && data.markers.some(marker => marker.id === id)) { onSelect?.(id); if (presentation === 'preview') onExpand?.(); }
          }}>
          <Mapbox.CircleLayer id="stop-circles" style={{
            circleRadius: ['case', ['get', 'selected'], presentation === 'preview' ? 12 : 18, presentation === 'preview' ? 10 : 14],
            circleColor: ['case', ['get', 'selected'], colors.ink, colors.green],
            circleStrokeWidth: ['case', ['get', 'selected'], 4, 2], circleStrokeColor: '#FFFFFF',
          }} />
          <Mapbox.SymbolLayer id="stop-numbers" style={{ textField: ['get', 'number'], textSize: 12, textColor: '#FFFFFF', textAllowOverlap: true, textIgnorePlacement: true }} />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>}
      {!ready && <View style={styles.loading} pointerEvents="none" accessibilityLabel="Loading journey map" accessibilityRole="progressbar"><ActivityIndicator color={colors.green} /><Text style={styles.note}>Loading map…</Text></View>}
      {presentation !== 'preview' && <Pressable accessibilityRole="button" accessibilityLabel="Fit journey and reset map orientation"
        accessibilityState={{ disabled: !ready || !frame }} disabled={!ready || !frame} onPress={fit} style={styles.fit}>
        <Text style={styles.fitLabel}>↗ Fit journey</Text>
      </Pressable>}
    </View>
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
  overviewNote: { color: colors.muted, fontSize: 11, lineHeight: 17, paddingHorizontal: 10, paddingVertical: 6 },
  caption: { padding: 16, gap: 6 }, selected: { color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 19 },
});
