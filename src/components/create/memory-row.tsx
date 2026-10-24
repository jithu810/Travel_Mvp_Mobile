import type { GestureResponderHandlers } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThumbnailPhoto } from '../discovery/thumbnail-photo';
import { colors } from '../discovery/ui';
import type { StopInput } from '@/lib/create/model';
export function MemoryRow({ stop, index, total, photo, photoThumbnail, cardWidth = 248, selected = false, localPhoto = false, disabled, onEdit, onMove, onRemove, onPhotoError, deck = false, swipeHandlers, canInteract }: {
  stop: StopInput; index: number; total: number; photo: string | null; photoThumbnail?: string | null; cardWidth?: number; selected?: boolean; localPhoto?: boolean; disabled: boolean;
  swipeHandlers?: GestureResponderHandlers; canInteract?: () => boolean; deck?: boolean; onPhotoError?: () => void; onEdit: () => void; onMove: (offset: number) => void; onRemove: () => void;
}) {
  return <View style={[s.card, { width: cardWidth }, selected && !deck && { borderColor: '#326A8C', borderWidth: 2 }, deck && { borderColor: '#FFFFFF' }]}>
    <View {...swipeHandlers} testID="draft-memory-swipe"><Pressable accessibilityRole="button" accessibilityLabel={'Edit memory ' + (index + 1) + ': ' + (stop.name || 'Unnamed')} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => { if (!canInteract || canInteract()) onEdit(); }} style={deck ? [s.main, s.deckMain] : s.main}>
      <View style={[s.thumb, deck && s.deckThumb]}><ThumbnailPhoto uri={photo} thumbnailUri={localPhoto ? null : photoThumbnail} label={stop.name + ' photo'} ratio={deck ? 16 / 9 : 1.6} variant="stop" onOriginalError={onPhotoError} />{deck && <View pointerEvents="none" style={s.deckShade} />}</View>
      <View style={[s.text, deck && s.deckText]}><Text numberOfLines={2} style={s.name}>{index + 1}. {stop.name || 'Name this memory'}</Text>
        {(stop.day || stop.rating) && <Text style={s.meta}>{[stop.day && ('Day ' + stop.day), stop.rating && (stop.rating + '/5 ★')].filter(Boolean).join(' · ')}</Text>}
        {localPhoto && <Text style={s.note}>Photo - Not saved</Text>}
        {!!stop.description && <Text numberOfLines={2} style={s.note}>{stop.description}</Text>}
        <Text style={s.note}>{stop.latitude === null || stop.longitude === null ? 'Location needed before publishing' : 'Located'} · Edit ↗</Text>
      </View>
    </Pressable></View>
    <View style={[s.tools, deck && s.deckTools]}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Move memory ' + (index + 1) + ' earlier'} disabled={disabled || index === 0} onPress={() => { if (!canInteract || canInteract()) onMove(-1); }} style={s.tool}><Text style={[s.toolText, index === 0 && s.muted]}>← Earlier</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={'Move memory ' + (index + 1) + ' later'} disabled={disabled || index === total - 1} onPress={() => { if (!canInteract || canInteract()) onMove(1); }} style={s.tool}><Text style={[s.toolText, index === total - 1 && s.muted]}>Later →</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={'Remove memory ' + (index + 1)} disabled={disabled} onPress={() => { if (!canInteract || canInteract()) onRemove(); }} style={s.tool}><Text style={s.toolText}>Remove</Text></Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  deckShade: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 72, experimental_backgroundImage: 'linear-gradient(90deg, rgba(5,15,30,0) 0%, rgba(5,15,30,0.55) 100%)' },
  deckMain: { padding: 0, gap: 0 }, deckThumb: { aspectRatio: 16 / 9, borderRadius: 0 }, deckText: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 }, deckTools: { backgroundColor: 'transparent', borderTopWidth: 0 },
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
