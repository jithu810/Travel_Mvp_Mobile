import { StyleSheet, View } from 'react-native';

// Decorative planned-route cue; it represents no real places or recorded travel.
export function DraftRouteIllustration() {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.scene}>
    <View style={[s.leg, s.first]} /><View style={[s.leg, s.second]} />
    <View style={[s.pin, s.start]}><View style={s.dot} /></View>
    <View style={[s.pin, s.middle]}><View style={s.dot} /></View>
    <View style={[s.pin, s.end]}><View style={s.dot} /></View>
  </View>;
}
const s = StyleSheet.create({
  scene: { width: 190, height: 48, alignSelf: 'center', opacity: 0.75 },
  leg: { position: 'absolute', height: 2, backgroundColor: '#849CC9', borderRadius: 2 },
  first: { left: 25, top: 25, width: 69, transform: [{ rotate: '-17deg' }] }, second: { left: 94, top: 22, width: 68, transform: [{ rotate: '14deg' }] },
  pin: { position: 'absolute', width: 20, height: 20, borderWidth: 1.5, borderColor: '#ABC8F3', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15243D' },
  start: { left: 10, top: 23 }, middle: { left: 86, top: 4 }, end: { right: 10, top: 22 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#B5CFFF' },
});
