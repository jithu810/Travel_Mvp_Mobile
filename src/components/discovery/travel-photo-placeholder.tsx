import { Image, StyleSheet, Text, View } from 'react-native';

export function TravelPhotoPlaceholder({ variant = 'home', compact = false, label = 'Default travel photo. No journey photo available' }: { variant?: 'home' | 'stop'; compact?: boolean; label?: string }) {
  return <View style={s.placeholder} accessible accessibilityLabel={label}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.placeholderArt}>
      <Image source={require('../../../assets/images/journey-photo-fallback.png')} style={s.image} resizeMode="cover" />
    </View>
    <View pointerEvents="none" style={[s.caption, compact && s.compactCaption]}><Text numberOfLines={2} style={[s.label, compact && s.compactLabel]}>{variant === 'stop' ? 'See this stop' : 'Explore journey'}</Text></View>
  </View>;
}
const s = StyleSheet.create({
  placeholder: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: '#EAF1FC' },
  placeholderArt: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  caption: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: 'rgba(5, 18, 22, 0.76)' },
  compactCaption: { paddingHorizontal: 6, paddingVertical: 4 },
  label: { color: '#FFFFFF', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  compactLabel: { fontSize: 10, lineHeight: 13 },
});
