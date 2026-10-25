import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

// World keeps native border geometry (shared with the globe); Locate/Explore use outline vector glyphs in a size-reserved box.
export function HomeControlIcon({ name, selected = false, size = 24 }: { name: 'world' | 'locate' | 'explore'; selected?: boolean; size?: 24 | 28 }) {
  const color = selected ? '#6555CF' : '#3873CE';
  if (name !== 'world') return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.glyph, { width: size, height: size }]}>
    {name === 'locate' ? <Ionicons name="locate-outline" size={size} color={color} /> : <MaterialCommunityIcons name="book-outline" size={size} color={color} />}
  </View>;
  const border = { borderColor: selected ? '#6555CF' : '#243E68' };
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.frame, size === 28 && s.large]}>
    <View style={[s.circle, border]} /><View style={[s.meridian, border]} /><View style={[s.equator, border]} />
  </View>;
}
const s = StyleSheet.create({
  glyph: { alignItems: 'center', justifyContent: 'center' },
  frame: { width: 24, height: 24 },
  large: { transform: [{ scale: 28 / 24 }] },
  circle: { position: 'absolute', left: 2, top: 2, width: 20, height: 20, borderWidth: 1.5, borderRadius: 10 },
  meridian: { position: 'absolute', left: 7, top: 2, width: 10, height: 20, borderWidth: 1.5, borderRadius: 10 },
  equator: { position: 'absolute', left: 3, top: 11, width: 18, borderTopWidth: 1.5 },
});
