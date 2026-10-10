import Mapbox, { type Camera } from '@rnmapbox/maps';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/components/discovery/ui';
import type { JourneyMapData } from '@/lib/journey/map-data';
import { MapFallback } from './map-frame';

let configuredToken: string | null = null;
export async function configureMap(token: string) {
  if (configuredToken === token) return;
  await Mapbox.setAccessToken(token);
  configuredToken = token;
}
export const NativeJourneyMap = memo(function NativeJourneyMap({ data, retry }: { data: JourneyMapData; retry: () => void }) {
  const camera = useRef<Camera>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const selected = data.markers.find(marker => marker.id === selectedId);
  const boundsKey = JSON.stringify(data.bounds);
  const cameraSettings = useMemo(() => {
    const bounds = JSON.parse(boundsKey) as NonNullable<JourneyMapData['bounds']>;
    return bounds.ne[0] === bounds.sw[0] && bounds.ne[1] === bounds.sw[1]
      ? { centerCoordinate: bounds.ne, zoomLevel: 12, heading: 0, pitch: 0 }
      : { bounds, padding: { paddingTop: 45, paddingBottom: 45, paddingLeft: 45, paddingRight: 45 }, heading: 0, pitch: 0 };
  }, [boundsKey]);
  const points = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: data.markers.map(marker => ({
      type: 'Feature' as const, id: marker.id,
      geometry: { type: 'Point' as const, coordinates: marker.coordinate },
      properties: { id: marker.id, number: String(marker.number), selected: marker.id === selectedId },
    })),
  }), [data.markers, selectedId]);
  const fit = useCallback(() => {
    camera.current?.setCamera({ ...cameraSettings, animationMode: 'easeTo', animationDuration: 450 });
  }, [cameraSettings]);
  useEffect(() => { if (ready) fit(); }, [ready, fit]);
  useEffect(() => {
    if (ready || failed) return;
    const timeout = setTimeout(() => setFailed(true), 20000);
    return () => clearTimeout(timeout);
  }, [ready, failed]);
  if (failed) return <MapFallback message="The map couldn’t load. Your story is still available below." retry={retry} />;
  return <View style={styles.card}>
    <View style={styles.viewport}>
      <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Outdoors}
        scrollEnabled zoomEnabled rotateEnabled pitchEnabled={false} surfaceView={false} requestDisallowInterceptTouchEvent
        compassEnabled logoEnabled attributionEnabled
        onDidFinishLoadingMap={() => setReady(true)} onMapLoadingError={() => setFailed(true)}>
        <Mapbox.Camera ref={camera} defaultSettings={cameraSettings} />
        {data.line.geometry.coordinates.length > 0 && <Mapbox.ShapeSource id="planned-line" shape={data.line}>
          <Mapbox.LineLayer id="planned-line-layer" style={{ lineColor: colors.green, lineWidth: 3, lineOpacity: 0.8, lineJoin: 'round', lineCap: 'round' }} />
        </Mapbox.ShapeSource>}
        <Mapbox.ShapeSource id="planned-stops" shape={points} hitbox={{ width: 44, height: 44 }}
          onPress={event => {
            const id = event.features[0]?.properties?.id;
            if (typeof id === 'string' && data.markers.some(marker => marker.id === id)) setSelectedId(id);
          }}>
          <Mapbox.CircleLayer id="stop-circles" style={{
            circleRadius: ['case', ['get', 'selected'], 18, 14],
            circleColor: ['case', ['get', 'selected'], colors.ink, colors.green],
            circleStrokeWidth: ['case', ['get', 'selected'], 4, 2],
            circleStrokeColor: '#FFFFFF',
          }} />
          <Mapbox.SymbolLayer id="stop-numbers" style={{
            textField: ['get', 'number'], textSize: 12, textColor: '#FFFFFF',
            textAllowOverlap: true, textIgnorePlacement: true,
          }} />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
      {!ready && <View style={styles.loading} pointerEvents="none" accessibilityLabel="Loading journey map"><ActivityIndicator color={colors.green} /><Text style={styles.note}>Loading map…</Text></View>}
      <Pressable accessibilityRole="button" accessibilityLabel="Fit journey and reset map orientation"
        accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={fit} style={styles.fit}>
        <Text style={styles.fitLabel}>↗ Fit journey</Text>
      </Pressable>
    </View>
    <View style={styles.caption} accessibilityLiveRegion="polite">
      <Text style={styles.selected}>{selected ? selected.number + ' · ' + selected.name : 'Tap a numbered stop to explore'}</Text>
      <Text style={styles.note}>Pan or pinch to explore · Rotate with two fingers</Text>
    </View>
  </View>;
});
const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', backgroundColor: colors.paper },
  viewport: { height: 280, position: 'relative' },
  map: { flex: 1 },
  loading: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', gap: 10 },
  fit: { position: 'absolute', top: 12, right: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, backgroundColor: colors.paper, borderRadius: 14 },
  fitLabel: { fontSize: 12, color: colors.green, fontWeight: '600' },
  caption: { padding: 14, gap: 5 },
  selected: { color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 11, lineHeight: 18 },
});
