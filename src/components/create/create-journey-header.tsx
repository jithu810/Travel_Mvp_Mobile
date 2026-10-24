import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiscoveryGlobe } from '../discovery/globe/discovery-globe';
import { discoveryPoints } from '@/lib/discovery/map';
import type { DestinationFocus } from '@/lib/discovery/destination-camera';
const points = discoveryPoints(null);
const route: [number, number][][] = [];
const noOpen = () => {};
export function CreateJourneyHeader({ destination = null, destinationVersion = 0, keyboardOpen = false }: { destination?: DestinationFocus | null; destinationVersion?: number; keyboardOpen?: boolean }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(0, insets.top);
  const bannerHeight = topInset + (keyboardOpen ? 72 : Math.max(112, Math.min(240, width * 0.62, height - topInset - 590)));
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  return <View style={[s.hero, { height: bannerHeight, flexGrow: keyboardOpen ? 0 : 1 }]} onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    setViewport(old => old.width === width && old.height === height ? old : { width, height });
  }}>
    <View style={StyleSheet.absoluteFill}>
      {viewport.width > 0 && viewport.height > 0 && <DiscoveryGlobe preview destinationMode destination={destination} destinationVersion={destinationVersion}
        points={points} route={route} onOpen={noOpen} viewport={viewport} headerInset={topInset} bottomInset={0} selectionId={null} locateVersion={0} sheetInteracting />}
    </View>
    <View pointerEvents="none" testID="create-status-shade" style={[s.statusShade, { height: topInset + 12 }]} />
  </View>;
}
const s = StyleSheet.create({
  hero: { marginBottom: 8, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden', backgroundColor: '#0B1823', flexShrink: 0, alignSelf: 'stretch' },
  statusShade: { position: 'absolute', top: 0, left: 0, right: 0, experimental_backgroundImage: 'linear-gradient(180deg, rgba(5,15,30,0.98) 0%, rgba(5,15,30,0.94) 75%, rgba(5,15,30,0) 100%)' },
});
