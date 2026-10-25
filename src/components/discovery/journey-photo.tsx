import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { StaticMapLayer, useStaticMap, type MapFallback } from './static-map-photo';
import { colors } from './ui';

export function JourneyPhoto({ uri, label, ratio = 1.9, fill = false, thumbnail = false, onError, fit = 'cover', map, mapLabel }: { uri: string | null; label: string; ratio?: number; fill?: boolean; thumbnail?: boolean; fit?: 'cover' | 'contain'; onError?: () => void; map?: MapFallback | null; mapLabel?: string }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const mapState = useStaticMap(map);
  const available = uri && failedUri !== uri;
  return <View style={[styles.frame, fill ? { flex: 1, height: '100%' } : { aspectRatio: ratio }]}>
    {available ? <>
      <Image key={uri} source={{ uri }} accessibilityLabel={label} style={styles.image} resizeMode={fit}
        onLoad={() => setLoadedUri(uri)} onError={() => { setFailedUri(uri); onError?.(); }} />
      {loadedUri !== uri && <View pointerEvents="none" style={styles.loading} accessibilityLabel="Loading photo" accessibilityRole="progressbar"><ActivityIndicator color={colors.ink} /></View>}
    </> : mapState.active ? <View style={styles.map} accessible accessibilityRole="image" accessibilityLabel={mapLabel || 'Map preview. No photo yet. ' + label}><StaticMapLayer state={mapState} /></View>
      : <View style={[styles.fallback, thumbnail && { padding: 0, gap: 0 }]} accessible accessibilityLabel="No journey photo available">
      <Text style={[styles.symbol, thumbnail && { fontSize: 20 }]}>↗</Text>{!thumbnail && <Text style={styles.label}>A journey worth discovering</Text>}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: '100%', backgroundColor: colors.pale, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  map: { flex: 1 },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.pale, justifyContent: 'center', alignItems: 'center' },
  fallback: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 },
  symbol: { color: colors.green, fontSize: 38 },
  label: { color: colors.ink, fontWeight: '500', fontSize: 13 },
});
