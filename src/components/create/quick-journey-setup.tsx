import { theme } from '@/theme/mobile-theme';
import { useBuddyProtectedBounds, useBuddyScroll } from '@/hooks/use-buddy-geometry';
import type { ReactNode } from 'react';
import { ScrollView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Action, colors } from '../discovery/ui';
import { PlacePicker, formStyles } from './place-picker';
import type { CreateForm, Place } from '@/lib/create/model';
export function QuickJourneySetup({ form, disabled, editing = false, saving = false, feedback, dismissSearchVersion = 0, onTitle, onDestination, onChange, onStart }: {
  form: CreateForm; disabled: boolean; editing?: boolean; saving?: boolean; feedback?: ReactNode; dismissSearchVersion?: number; onTitle: (title: string) => void; onDestination: (place: Place) => void;
  onChange: (patch: Partial<CreateForm>) => void; onStart: () => void;
}) {
  const days = Number(form.days);
  const protection = useBuddyProtectedBounds(), scroll = useBuddyScroll();
  const accents = { solo: theme.lavender, couple: theme.lavender, friends: '#E5F0FC', family: theme.lavender };
  const symbols = { solo: '●', couple: '♥', friends: '♣', family: '⌂' };
  const fewerDisabled = disabled || !Number.isInteger(days) || days <= 1;
  const moreDisabled = disabled || !Number.isInteger(days) || days >= 365 || days < 1;
  return <View {...protection} style={editing ? [s.setup, s.editSetup] : s.setup}>
    <ScrollView {...scroll} accessibilityLabel="Journey setup controls" style={s.controls} contentContainerStyle={s.controlContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <View style={editing ? [s.destinationCard, s.editSurface] : s.destinationCard}>
    <PlacePicker label="Destination" compact premium memorySheet={editing} embeddedSuggestions dismissVersion={dismissSearchVersion} destinationOnly autoSuggest disabled={disabled} onSelect={onDestination} />
    {form.destination && <View accessibilityLiveRegion="polite" style={s.selectedPlace}><Text style={s.placeName} numberOfLines={1} accessibilityLabel={form.destination.label}>{form.destination.label}</Text></View>}
    </View>
    <View style={editing ? [s.detailsCard, s.editSurface] : s.detailsCard}>
    <View style={s.field}>
      <TextInput accessibilityLabel="Journey title" value={form.title} onChangeText={onTitle} editable={!disabled} maxLength={200} placeholder="Your journey title" style={[formStyles.input, editing ? [s.titleInput, s.editInput] : s.titleInput]} />
    </View>
    <View style={s.field}><Text style={[formStyles.label, editing && s.editLabel]}>Travelling with · required</Text>
      <View style={s.choices}>{(['solo', 'couple', 'friends', 'family'] as const).map(type => <Pressable key={type} accessibilityRole="button" accessibilityLabel={type}
        accessibilityState={{ selected: form.traveler === type, disabled }} disabled={disabled} onPress={() => onChange({ traveler: type })}
        style={[s.chip, { backgroundColor: accents[type] }, form.traveler === type && s.selected]}><Text accessible={false} style={[s.chipIcon, form.traveler === type && s.selectedText]}>{symbols[type]}</Text><Text style={[s.chipText, form.traveler === type && s.selectedText]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text></Pressable>)}</View>
    </View>
    <View style={s.durationRow}><View style={s.durationLabel}><Text style={[formStyles.label, editing && s.editLabel]}>Duration</Text></View>
      <View style={s.duration}>
        <Pressable accessibilityRole="button" style={({ pressed }) => [s.step, (pressed || fewerDisabled) && s.dimmed]} accessibilityLabel="One fewer day" accessibilityState={{ disabled: fewerDisabled }} disabled={fewerDisabled} onPress={() => onChange({ days: String(days - 1) })}><Text style={s.stepText}>−</Text></Pressable>
        <TextInput accessibilityLabel="Duration in days" value={form.days} editable={!disabled} keyboardType="number-pad" maxLength={3} onChangeText={value => onChange({ days: value })} style={[formStyles.input, editing ? [s.days, s.editInput] : s.days]} />
        <Pressable accessibilityRole="button" style={({ pressed }) => [s.step, (pressed || moreDisabled) && s.dimmed]} accessibilityLabel="One more day" accessibilityState={{ disabled: moreDisabled }} disabled={moreDisabled} onPress={() => onChange({ days: String(days + 1) })}><Text style={s.stepText}>+</Text></Pressable>
      </View>
    </View>
    </View>
    {editing && <View style={s.field}><Text style={s.editLabel}>Journey description (optional)</Text>
      <TextInput accessibilityLabel="Journey description (optional)" value={form.description} editable={!disabled} multiline maxLength={5000} onChangeText={description => onChange({ description })} placeholder="What made this journey special?" style={[formStyles.input, s.editInput, s.description]} />
    </View>}
    {feedback}
    <View style={s.start}>
    <Action compact vibrant={!editing} memorySheet={editing} label={saving ? 'Saving…' : editing ? 'Save Changes' : 'Create my journey'} disabled={disabled} onPress={onStart} />
    </View>
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  editSetup: { backgroundColor: '#EDF1F8', borderRadius: 22, boxShadow: 'none' },
  editSurface: { backgroundColor: '#EDF1F8' },
  editLabel: { color: '#202C43', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  editInput: { backgroundColor: '#F1F3F8', borderColor: '#FFFFFF', color: '#18243B', borderRadius: 18, boxShadow: 'inset 0 2px 4px rgba(35, 48, 78, 0.10)' },
  description: { minHeight: 76, textAlignVertical: 'top' },
  setup: { gap: 6, flexShrink: 1, minHeight: 0, padding: 12, borderRadius: 28, backgroundColor: theme.surface, borderWidth: 1, borderColor: '#FFFFFF', boxShadow: '0 3px 8px rgba(57, 49, 29, 0.16), inset 0 1px 2px rgba(255, 255, 255, 0.9)' },
  controls: { flexGrow: 0, flexShrink: 1 },
  controlContent: { gap: 6 },
  destinationCard: { gap: 6, padding: 0, borderRadius: 20, backgroundColor: theme.surface },
  detailsCard: { gap: 10, padding: 0, borderRadius: 20, backgroundColor: theme.surface },
  titleInput: { minHeight: 48, padding: 10, borderRadius: 16, backgroundColor: theme.inset, borderColor: theme.border, boxShadow: 'inset 0 1px 3px rgba(85, 72, 49, 0.08)' },
  selectedPlace: { gap: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.line },
  placeName: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  durationLabel: { flexShrink: 1, gap: 4 },
  start: { gap: 4, flexShrink: 0 }, field: { gap: 4 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 48, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', borderRadius: 16, backgroundColor: colors.pale, borderWidth: 1, borderColor: '#FFFFFF', boxShadow: '0 3px 5px rgba(53, 72, 56, 0.10)' },
  chipIcon: { color: colors.ink, fontSize: 13 },
  selected: { borderColor: '#326A8C', boxShadow: '0 0 0 1px #326A8C, 0 3px 5px rgba(50, 106, 140, 0.14)' }, chipText: { color: colors.ink, fontSize: 12, fontWeight: '600' }, selectedText: { color: '#163F57', fontWeight: '700' },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 4 }, days: { minWidth: 64, minHeight: 48, padding: 8, textAlign: 'center', borderColor: '#FFFFFF', backgroundColor: theme.surface, boxShadow: '0 2px 4px rgba(57, 49, 29, 0.14)' },
  step: { minWidth: 48, minHeight: 48, borderRadius: 14, backgroundColor: theme.lavender, borderWidth: 1, borderColor: '#FFFFFF', boxShadow: '0 2px 4px rgba(57, 49, 29, 0.14)', alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.5 },
  stepText: { color: colors.ink, fontSize: 22 },
});
