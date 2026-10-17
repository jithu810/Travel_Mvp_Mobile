import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../discovery/ui';
import type { LocalPhoto } from '@/lib/create/photo-model';
export function PhotoField({ label, candidate, savedUri, busy, disabled, error, onSelect, onTakePhoto, onRemove, hasSavedPhoto = false, onRemoveSaved, onPreviewError, compact = false, memorySheet = false }: {
  label: string; candidate?: LocalPhoto; savedUri?: string | null; busy: boolean; disabled: boolean; error?: string; compact?: boolean; memorySheet?: boolean;
  hasSavedPhoto?: boolean; onRemoveSaved?: () => void; onPreviewError?: () => void;
  onSelect: () => void; onTakePhoto: () => void; onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const uri = candidate?.uri || savedUri;
  const showActions = !compact || expanded || !!error || busy;
  const preview = uri ? <Image source={{ uri }} onError={onPreviewError} resizeMode="contain" accessibilityLabel={label + (candidate ? ' local preview, not saved' : ' saved photo')} style={compact ? s.coverPreview : s.preview} /> : <View accessible={false} style={[s.placeholder, compact && s.coverPlaceholder]}><Text style={[s.icon, memorySheet && s.memoryIcon]}>▧</Text></View>;
  return <View style={[s.field, compact && s.coverField, memorySheet && s.memoryField]}>
    {compact ? <Pressable accessibilityRole="button" accessibilityLabel={'Edit ' + label.toLowerCase()} accessibilityState={{ expanded: showActions, disabled }} disabled={disabled} onPress={() => setExpanded(open => !open)} style={s.coverSummary}>
      {preview}<View style={s.summaryCopy}><Text style={[s.label, memorySheet && s.memoryText]}>{label}</Text><Text style={s.note}>{candidate ? 'New photo · Not saved' : uri ? 'Change your journey photo' : hasSavedPhoto ? 'Saved photo · Preview unavailable' : 'Add a photo to make your journey special'}</Text></View><Text accessible={false} style={s.chevron}>{showActions ? '⌃' : '›'}</Text>
    </Pressable> : <Text style={[s.label, memorySheet && s.memoryText]}>{label} · optional</Text>}
    {candidate && <Text accessibilityLiveRegion="polite" style={s.badge}>Not saved</Text>}
    <View style={{ display: showActions ? 'flex' : 'none' }}>
      <View style={s.mediaRow}>
        {!compact && uri && preview}
        <View style={s.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={'Choose from Gallery for ' + label} disabled={disabled} onPress={onSelect} style={compact ? s.compactButton : memorySheet ? [s.button, s.memoryButton, disabled && { opacity: 0.5 }] : s.button}><Text accessible={false} style={[s.icon, memorySheet && s.memoryIcon]}>▧</Text><Text style={[s.link, memorySheet && s.memoryText]}>{busy ? 'Preparing…' : compact ? 'Gallery' : 'Choose from gallery'}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={'Take Photo for ' + label} disabled={disabled} onPress={onTakePhoto} style={compact ? s.compactButton : memorySheet ? [s.button, s.memoryButton, disabled && { opacity: 0.5 }] : s.button}><Text accessible={false} style={[s.icon, memorySheet && s.memoryIcon]}>◎</Text><Text style={[s.link, memorySheet && s.memoryText]}>Take photo</Text></Pressable>
          {candidate && <Pressable accessibilityRole="button" accessibilityLabel={'Remove unsaved ' + label} disabled={disabled} onPress={onRemove} style={compact ? s.compactButton : memorySheet ? [s.button, s.memoryButton, disabled && { opacity: 0.5 }] : s.button}><Text accessible={false} style={[s.icon, memorySheet && s.memoryIcon]}>×</Text><Text style={[s.link, memorySheet && s.memoryText]}>Remove selection</Text></Pressable>}
          {!candidate && hasSavedPhoto && onRemoveSaved && <Pressable accessibilityRole="button" accessibilityLabel={'Remove saved ' + label} disabled={disabled} onPress={onRemoveSaved} style={compact ? s.compactButton : memorySheet ? [s.button, s.memoryButton, disabled && { opacity: 0.5 }] : s.button}><Text accessible={false} style={[s.icon, memorySheet && s.memoryIcon]}>×</Text><Text style={[s.link, memorySheet && s.memoryText]}>Remove photo</Text></Pressable>}
          {!candidate && hasSavedPhoto && !savedUri && onPreviewError && <Pressable accessibilityRole="button" accessibilityLabel={'Refresh ' + label + ' preview'} onPress={onPreviewError} style={compact ? s.compactButton : memorySheet ? [s.button, s.memoryButton, disabled && { opacity: 0.5 }] : s.button}><Text style={[s.link, memorySheet && s.memoryText]}>Refresh preview</Text></Pressable>}
        </View>
      </View>
    </View>
    {candidate && showActions && <Text style={s.note}>Uploads only when you save the journey or memory. Until then, this selection is not saved.</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.note}>{error}</Text>}
  </View>;
}
const s = StyleSheet.create({
  memoryField: { backgroundColor: '#F3F5FB', borderColor: '#FFFFFF', padding: 10, boxShadow: '0 3px 7px rgba(39, 54, 85, 0.10)' },
  memoryButton: { backgroundColor: '#FAFBFF', borderColor: '#FFFFFF', borderRadius: 17, minHeight: 68, boxShadow: '0 3px 5px rgba(39, 54, 85, 0.14)' },
  memoryIcon: { color: '#5360C5', fontSize: 26, lineHeight: 30 },
  memoryText: { color: '#202C43' },
  field: { gap: 8, padding: 12, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  coverField: { marginTop: -12, zIndex: 1, backgroundColor: '#FFFDFA', borderColor: '#FFFFFF', boxShadow: '0 3px 8px rgba(57, 49, 29, 0.13)' },
  coverSummary: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryCopy: { flex: 1, minWidth: 0, gap: 4 }, chevron: { color: colors.ink, fontSize: 24 },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' },
  preview: { width: 72, height: 72, borderRadius: 16, backgroundColor: colors.paper },
  coverPreview: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.paper },
  coverPlaceholder: { width: 52, height: 52, backgroundColor: '#F6E6DF', borderWidth: 1, borderColor: '#FFFFFF' },
  placeholder: { width: 72, height: 72, borderRadius: 16, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '600' }, badge: { color: colors.ink, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  actions: { flex: 1, minWidth: 144, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  button: { minHeight: 72, flexGrow: 1, flexBasis: 64, minWidth: 64, paddingHorizontal: 6, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: '#F7F8F1', alignItems: 'center', justifyContent: 'center', gap: 4 },
  compactButton: { minHeight: 44, flexGrow: 1, flexBasis: 70, minWidth: 64, padding: 6, borderRadius: 12, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', gap: 2 },
  icon: { color: colors.ink, fontSize: 22, lineHeight: 24 }, link: { color: colors.ink, fontSize: 11, lineHeight: 15, textAlign: 'center' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
