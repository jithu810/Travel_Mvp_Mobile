import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action } from '../discovery/ui';
import { PlacePicker } from './place-picker';
import type { Place, StopInput } from '@/lib/create/model';
import { useMemoryLocation } from '@/hooks/use-memory-location';
export function MemoryEditorSheet({ value, isNew, proximity, busy, blocked, error, onChange, onClose, onSave, onReload, photoControl, preparingPhoto = false, savingLabel }: {
  value: StopInput; isNew: boolean; proximity: Place | null; busy: boolean; blocked: boolean; error: string | null;
  photoControl?: ReactNode; preparingPhoto?: boolean; savingLabel?: string;
  onChange: (patch: Partial<StopInput>) => void; onClose: () => void; onSave: () => void; onReload?: () => void;
}) {
  const [nameOpen, setNameOpen] = useState(!isNew || Boolean(value.name));
  const [nameEdited, setNameEdited] = useState(!isNew);
  const [noteOpen, setNoteOpen] = useState(Boolean(value.description));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const location = useMemoryLocation(value, busy || blocked || preparingPhoto, onChange, () => setNameOpen(true));
  const disabled = busy || blocked || preparingPhoto || location.busy;
  const close = () => { location.cancel(); onClose(); };
  return <Modal visible transparent animationType="slide" onRequestClose={close}>
    <SafeAreaView style={s.overlay}>
      <KeyboardAvoidingView style={s.avoid} behavior="padding">
        <View style={s.panel}>
          <View accessible={false} style={s.handle} />
          <View style={s.header}><Text accessibilityRole="header" style={s.title}>{isNew ? 'Add memory' : 'Edit memory'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close memory editor" disabled={busy || preparingPhoto} onPress={close} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
          <Text style={s.subtitle}>{isNew ? 'Capture a place, moment or experience' : 'Refine the details of this memory'}</Text>
          <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <View style={s.modes}><View style={s.locationMode}><Text accessible={false} style={s.modeIcon}>⌖</Text><Text style={s.modeLabel}>Location</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Name it now, locate later" disabled={disabled} onPress={() => { setNameOpen(true); }} style={s.modeButton}><Text accessible={false} style={s.modeIcon}>✎</Text><Text style={s.modeLabel}>{value.latitude === null && value.longitude === null ? 'Name only' : 'Edit name'}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Use current location" accessibilityState={{ disabled, busy: location.busy }} disabled={disabled} onPress={location.start} style={s.modeButton}>
              <Text accessible={false} style={s.modeIcon}>⊕</Text><Text style={s.modeLabel}>{location.busy ? 'Locating…' : 'Current location'}</Text>
            </Pressable>
            </View>
            {location.error && <Text accessibilityRole="alert" style={s.note}>{location.error}</Text>}
            <PlacePicker memorySheet label="Find a place" inlineSearch proximity={proximity} disabled={disabled} autoSuggest onSelect={place => {
              onChange({ name: nameEdited && value.name.trim() ? value.name : place.name, latitude: place.latitude, longitude: place.longitude, mapboxId: place.mapboxId }); setNameOpen(true);
            }} />
            {value.latitude !== null && value.longitude !== null && <View style={s.selectedPlace}><Text style={s.placeTitle}>{value.name || 'Selected location'}</Text><Text style={s.note}>Location selected · {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}</Text></View>}
            {(nameOpen || !!value.name) && <View style={s.field}><Text style={s.label}>Place or memory name · required</Text>
              <TextInput accessibilityLabel="Memory name" value={value.name} editable={!disabled} onChangeText={name => { setNameEdited(true); onChange({ name }); }} maxLength={200} placeholder="A quiet beach, a roadside café…" style={s.input} /></View>}
            {value.latitude === null && <Text style={s.note}>{nameOpen || value.name ? 'This named memory stays private until you add a location and publish.' : 'Search for a place, or choose Name only to capture a moment.'}</Text>}
            {(nameOpen || !!value.name) && photoControl}
            {(nameOpen || !!value.name) && <Pressable accessibilityRole="button" accessibilityLabel="Add note" accessibilityState={{ expanded: noteOpen }} onPress={() => setNoteOpen(open => !open)} style={s.textAction}><Text style={s.link}>{noteOpen ? 'Note · optional' : '+ Add note'}</Text></Pressable>}
            {noteOpen && <TextInput accessibilityLabel="Memory note" value={value.description} editable={!disabled} multiline maxLength={1000} onChangeText={description => onChange({ description })} placeholder="What would you like to remember?" style={[s.input, s.noteInput]} />}
            {noteOpen && <Text style={s.counter}>{value.description.length}/1000</Text>}
            {(nameOpen || !!value.name) && <Pressable accessibilityRole="button" accessibilityLabel="More memory details" accessibilityState={{ expanded: detailsOpen }} onPress={() => setDetailsOpen(open => !open)} style={s.textAction}><Text style={s.link}>More details{value.day ? ' · Day ' + value.day : ''}{value.rating ? ' · ' + value.rating + '/5' : ''} {detailsOpen ? '⌃' : '⌄'}</Text></Pressable>}
            {detailsOpen && <View style={s.details}>
              <Text style={s.label}>Day · optional</Text><TextInput accessibilityLabel="Memory day" value={value.day} editable={!disabled} keyboardType="number-pad" maxLength={3} onChangeText={day => onChange({ day })} placeholder="Within journey duration" style={s.input} />
              <Text style={s.label}>Rating · optional</Text><TextInput accessibilityLabel="Memory rating" value={value.rating} editable={!disabled} keyboardType="decimal-pad" maxLength={5} onChangeText={rating => onChange({ rating })} placeholder="0–5" style={s.input} />
            </View>}
          </ScrollView>
          <View style={s.footer}>
            {error && <Text accessibilityRole="alert" style={s.note}>{error}</Text>}
            <Action memorySheet label={preparingPhoto ? 'Preparing photo...' : busy ? savingLabel || 'Saving memory…' : 'Save memory'} disabled={disabled} onPress={() => { if (!location.isBusy()) onSave(); }} />
            {blocked && onReload && <Action label="Reload saved draft" onPress={onReload} />}
            <Text style={s.note}>Saves this memory and all current journey changes privately.</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
const raised = { borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: '#F7F8FC', boxShadow: '0 3px 7px rgba(39, 54, 85, 0.12)' };
const shortcut = { ...raised, flex: 1, minWidth: 0, minHeight: 68, paddingHorizontal: 4, paddingVertical: 8, borderRadius: 20, gap: 4 };
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 24, 43, 0.38)' }, avoid: { flex: 1, justifyContent: 'flex-end' },
  panel: { maxHeight: '98%', width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: '#EDF1F8', experimental_backgroundImage: 'linear-gradient(135deg, #FFF8F1 0%, #EDF1F8 55%, #E2EAF6 100%)', borderWidth: 1, borderColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#B5BED0', alignSelf: 'center', marginTop: 8, marginBottom: 2 },
  title: { flex: 1, color: '#101B2E', fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { color: '#4A5364', fontSize: 13, lineHeight: 19, paddingHorizontal: 18, paddingBottom: 12 },
  closeText: { color: '#172239', fontSize: 30, lineHeight: 34 },
  modes: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8, paddingVertical: 4 },
  locationMode: { ...shortcut, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EBEEFF', borderColor: '#D1D8F8' },
  modeButton: { ...shortcut, alignItems: 'center', justifyContent: 'center' },
  modeIcon: { color: '#4D5BC3', fontSize: 26, lineHeight: 30 },
  modeLabel: { color: '#202C43', fontSize: 11, lineHeight: 15, textAlign: 'center', fontWeight: '600' },
  selectedPlace: { ...raised, paddingHorizontal: 14, paddingVertical: 10, gap: 3, borderRadius: 20 },
  placeTitle: { color: '#101B2E', fontSize: 21, lineHeight: 27, fontWeight: '700' },
  label: { color: '#202C43', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  input: { minHeight: 48, borderRadius: 18, borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: '#F1F3F8', paddingHorizontal: 14, paddingVertical: 10, color: '#18243B', fontSize: 16, boxShadow: 'inset 0 2px 4px rgba(35, 48, 78, 0.10)' },
  details: { padding: 12, borderRadius: 20, backgroundColor: '#E4EAF6', gap: 8 },
  counter: { color: '#556176', fontSize: 11, lineHeight: 16, textAlign: 'right' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 4, gap: 8 },
  close: { minHeight: 44, minWidth: 44, borderRadius: 22, borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: '#F0F3FA', alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1 }, content: { paddingHorizontal: 18, paddingBottom: 6, gap: 8 }, field: { gap: 6 },
  footer: { flexShrink: 0, paddingHorizontal: 18, paddingVertical: 10, gap: 7, backgroundColor: '#EAF0F9', borderTopWidth: 1, borderTopColor: '#FFFFFF' },
  textAction: { minHeight: 44, justifyContent: 'center' }, link: { color: '#4858AF', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  note: { color: '#505D73', fontSize: 11, lineHeight: 16 }, noteInput: { minHeight: 88, textAlignVertical: 'top' },
});
