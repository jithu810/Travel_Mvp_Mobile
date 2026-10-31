import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTravelPreferences } from '@/hooks/use-travel-preferences';
import { TRAVEL_INTERESTS, TRAVEL_PACES, type TravelInterest, type TravelPace } from '@/lib/buddy/travel-preferences';
import { colors } from '@/components/discovery/ui';

type PreferenceHook = ReturnType<typeof useTravelPreferences>;
export function TravelPreferencesSettings() {
  const preferences = useTravelPreferences();
  return <View style={s.section}>
    <Text accessibilityRole="header" style={s.title}>Travel preferences</Text>
    <Text style={s.body}>Optional tips for Buddy, on this phone only, never synced. They do not change search results or routes, or turn Buddy on.</Text>
    <Text style={s.body}>Kept after sign-out, hidden from guests and other accounts, and shown when this account signs in again on this phone. Use Forget to remove them.</Text>
    {!preferences.available ? <Text style={s.body}>Sign in to view or change preferences for this account. Guests get general tips.</Text>
      : !preferences.loaded ? <View><Text accessibilityRole={preferences.error ? 'alert' : undefined} style={s.body}>{preferences.error ?? 'Loading preferences...'}</Text>{preferences.error && <Control label="Retry preferences" onPress={preferences.retry} />}</View>
        : <PreferenceEditor key={preferences.owner} preferences={preferences} />}
  </View>;
}
function PreferenceEditor({ preferences: p }: { preferences: PreferenceHook }) {
  const [editing, setEditing] = useState(false);
  const [interests, setInterests] = useState<TravelInterest[]>([]);
  const [pace, setPace] = useState<TravelPace | null>(null);
  const edit = () => { setInterests([...p.value.interests]); setPace(p.value.pace); setEditing(true); };
  return <View style={s.section}>
    {editing ? <>
      <Text style={s.title}>Interests (optional)</Text>
      <View style={s.choices}>{TRAVEL_INTERESTS.map(interest => <Control key={interest} label={interest} selected={interests.includes(interest)} disabled={p.busy} onPress={() => setInterests(current => current.includes(interest) ? current.filter(i => i !== interest) : [...current, interest])} />)}</View>
      <Text style={s.title}>Pace (optional)</Text>
      <View style={s.choices}>{[null, ...TRAVEL_PACES].map(option => <Control key={option ?? 'unset'} label={option ?? 'No pace preference'} selected={pace === option} disabled={p.busy} onPress={() => setPace(option)} />)}</View>
      <Control label={p.busy ? 'Saving preferences...' : 'Save on this phone'} disabled={p.busy} onPress={() => { void p.save({ interests, pace }).then(saved => { if (saved) setEditing(false); }); }} />
      <Control label="Cancel preference edits" disabled={p.busy} onPress={() => setEditing(false)} />
    </> : <>
      <Text style={s.body}>{p.value.interests.length ? 'Interests: ' + p.value.interests.join(', ') : 'No interests selected'}</Text>
      <Text style={s.body}>{p.value.pace ? 'Pace: ' + p.value.pace : 'No pace preference'}</Text>
      <Control label="Edit travel preferences" disabled={p.busy} onPress={edit} />
      <Control label={p.busy ? 'Updating preferences...' : 'Forget travel preferences'} disabled={p.busy} onPress={() => { void p.forget(); }} />
    </>}
    {p.error && <Text accessibilityRole="alert" style={s.body}>{p.error}</Text>}
    {p.message && <Text accessibilityLiveRegion="polite" style={s.body}>{p.message}</Text>}
  </View>;
}
function Control({ label, selected, disabled = false, onPress }: { label: string; selected?: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={[s.control, selected && s.selected, disabled && s.disabled]}><Text style={s.body}>{label}</Text></Pressable>;
}
const s = StyleSheet.create({
  section: { gap: 10, marginVertical: 10 }, title: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  body: { color: colors.ink, fontSize: 13, lineHeight: 19 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  control: { minWidth: 48, minHeight: 48, maxWidth: '100%', flexShrink: 1, padding: 10, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 16 },
  selected: { backgroundColor: colors.pale, borderColor: colors.green }, disabled: { opacity: 0.5 },
});
