import { StyleSheet, View } from 'react-native';
export function EditorActionIcon({ name, light = false }: { name: 'add' | 'save' | 'settings' | 'cover'; light?: boolean }) {
  const color = light ? '#FFFFFF' : '#243E68';
  return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={s.frame}>
    {name === 'cover' ? <><View style={[s.photo, { borderColor: color }]} /><View style={[s.sun, { backgroundColor: color }]} /><View style={[s.mountain, { borderColor: color }]} /></> : name === 'add' ? <><View style={[s.horizontal, { backgroundColor: color }]} /><View style={[s.vertical, { backgroundColor: color }]} /></> : name === 'save' ? <><View style={[s.save, { borderColor: color }]} /><View style={[s.saveTop, { borderColor: color }]} /><View style={[s.saveBottom, { borderColor: color }]} /></> : <><View style={[s.settings, { borderColor: color }]} /><View style={[s.center, { borderColor: color }]} /><View style={[s.tooth, { backgroundColor: color }]} /><View style={[s.tooth, { backgroundColor: color, transform: [{ rotate: '90deg' }] }]} /></>}
  </View>;
}
const s = StyleSheet.create({
  photo: { position: 'absolute', top: 3, left: 2, width: 20, height: 18, borderWidth: 2, borderRadius: 3 }, sun: { position: 'absolute', top: 7, left: 7, width: 4, height: 4, borderRadius: 2 }, mountain: { position: 'absolute', right: 4, bottom: 4, width: 9, height: 9, borderTopWidth: 2, borderLeftWidth: 2, transform: [{ rotate: '45deg' }] },
  frame: { width: 24, height: 24 }, horizontal: { position: 'absolute', left: 3, top: 11, width: 18, height: 2 }, vertical: { position: 'absolute', top: 3, left: 11, width: 2, height: 18 },
  save: { position: 'absolute', top: 2, left: 3, width: 18, height: 20, borderWidth: 2, borderRadius: 2 }, saveTop: { position: 'absolute', left: 8, top: 2, width: 8, height: 7, borderWidth: 2 }, saveBottom: { position: 'absolute', left: 7, bottom: 2, width: 10, height: 8, borderWidth: 2, borderRadius: 2 },
  settings: { position: 'absolute', top: 4, left: 4, width: 16, height: 16, borderWidth: 2, borderRadius: 8 }, center: { position: 'absolute', top: 9, left: 9, width: 6, height: 6, borderWidth: 2, borderRadius: 3 }, tooth: { position: 'absolute', top: 1, left: 10, height: 4, width: 4 },
});
