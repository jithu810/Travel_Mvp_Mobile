import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { DiscoveryGlobe } from '../discovery/globe/discovery-globe';
import { discoveryPoints } from '@/lib/discovery/map';
import type { DestinationFocus } from '@/lib/discovery/destination-camera';
const points = discoveryPoints(null);
const route: [number, number][][] = [];
const noOpen = () => {};
export function CreateJourneyHeader({ destination = null, destinationVersion = 0, keyboardOpen = false }: { destination?: DestinationFocus | null; destinationVersion?: number; keyboardOpen?: boolean }) {
  const { height, width } = useWindowDimensions();
  const bannerHeight = keyboardOpen ? 72 : Math.max(112, Math.min(240, (width - 16) * 0.62, height - 590));
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  return <View style={[s.hero, { height: bannerHeight }]} onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    setViewport(old => old.width === width && old.height === height ? old : { width, height });
  }}>
    <View style={StyleSheet.absoluteFill}>
      {viewport.width > 0 && viewport.height > 0 && <DiscoveryGlobe preview destinationMode destination={destination} destinationVersion={destinationVersion}
        points={points} route={route} onOpen={noOpen} viewport={viewport} bottomInset={0} selectionId={null} locateVersion={0} sheetInteracting />}
    </View>
  </View>;
}
const s = StyleSheet.create({
  hero: { marginHorizontal: 8, marginTop: 4, marginBottom: 8, borderRadius: 24, overflow: 'hidden', backgroundColor: '#0B1823', flexShrink: 0, alignSelf: 'stretch' },
});
