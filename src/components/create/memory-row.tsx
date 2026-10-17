import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JourneyPhoto } from '../discovery/journey-photo';
import { colors } from '../discovery/ui';
import type { StopInput } from '@/lib/create/model';
export function MemoryRow({ stop, index, total, photo, cardWidth = 248, selected = false, localPhoto = false, disabled, onEdit, onMove, onRemove, onPhotoError }: {
  stop: StopInput; index: number; total: number; photo: string | null; cardWidth?: number; selected?: boolean; localPhoto?: boolean; disabled: boolean;
  onPhotoError?: () => void; onEdit: () => void; onMove: (offset: number) => void; onRemove: () => void;
}) {
  return <View style={[s.card, { width: cardWidth }, selected && { borderColor: '#326A8C', borderWidth: 2 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={'Edit memory ' + (index + 1) + ': ' + (stop.name || 'Unnamed')} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onEdit} style={s.main}>
      <View style={s.thumb}>{photo ? <JourneyPhoto uri={photo} label={stop.name + ' photo'} ratio={1.6} thumbnail onError={onPhotoError} /> : <Text style={s.symbol}>⌖</Text>}</View>
      <View style={s.text}><Text numberOfLines={2} style={s.name}>{index + 1}. {stop.name || 'Name this memory'}</Text>
        {(stop.day || stop.rating) && <Text style={s.meta}>{[stop.day && ('Day ' + stop.day), stop.rating && (stop.rating + '/5 ★')].filter(Boolean).join(' · ')}</Text>}
        {localPhoto && <Text style={s.note}>Photo - Not saved</Text>}
        {!!stop.description && <Text numberOfLines={2} style={s.note}>{stop.description}</Text>}
        <Text style={s.note}>{stop.latitude === null || stop.longitude === null ? 'Location needed before publishing' : 'Located'} · Edit ↗</Text>
      </View>
    </Pressable>
    <View style={s.tools}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Move memory ' + (index + 1) + ' earlier'} disabled={disabled || index === 0} onPress={() => onMove(-1)} style={s.tool}><Text style={[s.toolText, index === 0 && s.muted]}>← Earlier</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={'Move memory ' + (index + 1) + ' later'} disabled={disabled || index === total - 1} onPress={() => onMove(1)} style={s.tool}><Text style={[s.toolText, index === total - 1 && s.muted]}>Later →</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={'Remove memory ' + (index + 1)} disabled={disabled} onPress={onRemove} style={s.tool}><Text style={s.toolText}>Remove</Text></Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  card: { borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: '#E9E5DE', overflow: 'hidden' },
  main: { minHeight: 84, padding: 10, flexGrow: 1, alignItems: 'stretch', gap: 10 },
  thumb: { width: '100%', aspectRatio: 1.6, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  meta: { color: '#546887', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  symbol: { fontSize: 24, color: colors.ink }, text: { minWidth: 0, gap: 3 },
  name: { color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: '600' }, note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  tools: { backgroundColor: '#F2F0F7', flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line, paddingHorizontal: 6 },
  tool: { flex: 1, minHeight: 44, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  toolText: { color: colors.ink, fontSize: 11, textAlign: 'center' }, muted: { opacity: 0.4 },
});