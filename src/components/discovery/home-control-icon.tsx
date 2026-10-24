import { StyleSheet, View } from 'react-native';

// Native border geometry follows the existing Journey action icons, without fonts or dependencies.
export function HomeControlIcon({ name, selected = false, size = 24 }: { name: 'world' | 'locate' | 'story'; selected?: boolean; size?: 24 | 28 }) {
  const border = { borderColor: selected ? '#6555CF' : '#243E68' };
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.frame, size === 28 && s.large]}>
    {name === 'world' && <><View style={[s.circle, border]} /><View style={[s.meridian, border]} /><View style={[s.equator, border]} /></>}
    {name === 'locate' && <><View style={[s.target, border]} /><View style={[s.vertical, border]} /><View style={[s.horizontal, border]} /><View style={[s.center, border]} /></>}
    {name === 'story' && <><View style={[s.leftPage, border]} /><View style={[s.rightPage, border]} /><View style={[s.spine, border]} /></>}
  </View>;
}
const s = StyleSheet.create({
  frame: { width: 24, height: 24 },
  large: { transform: [{ scale: 28 / 24 }] },
  circle: { position: 'absolute', left: 2, top: 2, width: 20, height: 20, borderWidth: 1.5, borderRadius: 10 },
  meridian: { position: 'absolute', left: 7, top: 2, width: 10, height: 20, borderWidth: 1.5, borderRadius: 10 },
  equator: { position: 'absolute', left: 3, top: 11, width: 18, borderTopWidth: 1.5 },
  target: { position: 'absolute', left: 5, top: 5, width: 14, height: 14, borderWidth: 1.5, borderRadius: 7 },
  vertical: { position: 'absolute', left: 11, top: 1, height: 22, borderLeftWidth: 1.5 },
  horizontal: { position: 'absolute', left: 1, top: 11, width: 22, borderTopWidth: 1.5 },
  center: { position: 'absolute', left: 9, top: 9, width: 6, height: 6, borderWidth: 1.5, borderRadius: 3, backgroundColor: '#FFFFFF' },
  leftPage: { position: 'absolute', left: 2, top: 4, width: 11, height: 16, borderWidth: 1.5, borderTopLeftRadius: 3, borderBottomLeftRadius: 2, transform: [{ skewY: '8deg' }] },
  rightPage: { position: 'absolute', right: 2, top: 4, width: 11, height: 16, borderWidth: 1.5, borderTopRightRadius: 3, borderBottomRightRadius: 2, transform: [{ skewY: '-8deg' }] },
  spine: { position: 'absolute', left: 11, top: 5, height: 16, borderLeftWidth: 1.5 },
});
