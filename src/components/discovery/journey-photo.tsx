import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { colors } from './ui';

export function JourneyPhoto({ uri, label, ratio = 1.9 }: { uri: string | null; label: string; ratio?: number }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const available = uri && failedUri !== uri;
  return <View style={[styles.frame, { aspectRatio: ratio }]}>
    {available ? <>
      <Image key={uri} source={{ uri }} accessibilityLabel={label} style={styles.image} resizeMode="cover"
        onLoad={() => setLoadedUri(uri)} onError={() => setFailedUri(uri)} />
      {loadedUri !== uri && <View pointerEvents="none" style={styles.loading} accessibilityLabel="Loading photo" accessibilityRole="progressbar"><ActivityIndicator color={colors.ink} /></View>}
    </> : <View style={styles.fallback} accessible accessibilityLabel="No journey photo available">
      <Text style={styles.symbol}>↗</Text><Text style={styles.label}>A journey worth discovering</Text>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: '100%', backgroundColor: colors.pale, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.pale, justifyContent: 'center', alignItems: 'center' },
  fallback: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 },
  symbol: { color: colors.green, fontSize: 38 },
  label: { color: colors.ink, fontWeight: '500', fontSize: 13 },
});
