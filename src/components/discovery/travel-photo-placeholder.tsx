import { StyleSheet, Text, View } from 'react-native';

export function TravelPhotoPlaceholder({ destination, caption = false, label = 'No journey photo available' }: { destination: string; caption?: boolean; label?: string }) {
  return <View style={s.placeholder} accessible accessibilityLabel={label}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.placeholderArt}>
      <View style={s.contourBlue} /><View style={s.contourLavender} /><View style={s.route} /><View style={s.routeStart} /><View style={s.routeEnd} />
    </View>
    {caption && <View style={s.caption}><Text numberOfLines={1} style={s.destination}>{destination}</Text><Text style={s.label}>Journey story</Text></View>}
  </View>;
}
const s = StyleSheet.create({
  placeholder: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: '#EAF1FC' },
  placeholderArt: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  contourBlue: { position: 'absolute', width: '110%', height: '170%', left: '-40%', top: '-75%', borderRadius: 150, borderWidth: 12, borderColor: '#D0E1F7', backgroundColor: '#E1ECFB', transform: [{ rotate: '-25deg' }] },
  contourLavender: { position: 'absolute', width: '95%', height: '150%', right: '-40%', bottom: '-90%', borderRadius: 130, borderWidth: 10, borderColor: '#DCDCF6', backgroundColor: '#E7E6FA', transform: [{ rotate: '-25deg' }] },
  route: { position: 'absolute', width: '44%', top: '35%', left: '30%', borderTopWidth: 3, borderStyle: 'dotted', borderColor: '#8299C9', transform: [{ rotate: '-20deg' }] },
  routeStart: { position: 'absolute', width: 12, height: 12, top: '40%', left: '28%', borderRadius: 6, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#668AC1' },
  routeEnd: { position: 'absolute', width: 16, height: 16, top: '22%', left: '70%', borderRadius: 8, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#8274C3' },
  caption: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(234, 241, 252, 0.88)' },
  destination: { color: '#243E68', fontSize: 18, lineHeight: 23, fontWeight: '700' },
  label: { color: '#516A91', fontSize: 11, lineHeight: 16 },
});
