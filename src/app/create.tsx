import { randomUUID, idsAvailable } from '@/lib/create/id';
import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, colors, Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { PlacePicker, formStyles } from '@/components/create/place-picker';
import { JourneyMap } from '@/components/journey/map/journey-map';
import { useSessionState } from '@/hooks/session-context';
import { addStop, createSaveController, moveStop, newForm, previewStops, type CreateForm, type StopInput } from '@/lib/create/model';
import { saveNewJourney } from '@/lib/create/queries';
const DraftMap = memo(function DraftMap({ geometry }: { geometry: string }) {
  const stops = useMemo(() => previewStops(JSON.parse(geometry) as StopInput[]), [geometry]);
  return <JourneyMap stops={stops} />;
});
function Field({ label, value, onChange, disabled, multiline = false, maxLength, numeric = false, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; disabled: boolean; multiline?: boolean; maxLength?: number; numeric?: boolean; placeholder?: string;
}) {
  return <View style={{ gap: 8 }}><Text style={formStyles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} multiline={multiline}
    maxLength={maxLength} placeholder={placeholder} keyboardType={numeric ? 'decimal-pad' : 'default'} style={[formStyles.input, multiline && { minHeight: 100, textAlignVertical: 'top' }]} /></View>;
}
function NewJourneyEditor({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<CreateForm>(() => newForm(randomUUID()));
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    if (lifetime.current.signal.aborted) lifetime.current = new AbortController();
    const current = lifetime.current;
    return () => current.abort();
  }, []);
  const controller = useMemo(() => createSaveController((payload, signal) => saveNewJourney(payload, ownerId, signal)), [ownerId]);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [message, setMessage] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false), [attemptedStatus, setAttemptedStatus] = useState<'draft' | 'published'>('draft');
  const [active, setActive] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const lock = useRef(false), focus = useRef({ active: false, generation: 0 });
  useFocusEffect(useCallback(() => { focus.current.active = true; focus.current.generation++; return () => { focus.current.active = false; focus.current.generation++; }; }, []));
  const disabled = busy || uncertain;
  const geometry = JSON.stringify(form.stops.map(stop => ({ id: stop.id, name: stop.name, latitude: stop.latitude, longitude: stop.longitude })));
  function change(patch: Partial<CreateForm>) { if (!disabled) { setForm(current => ({ ...current, ...patch })); setError(null); setMessage(null); } }
  function editStop(id: string, patch: Partial<StopInput>) { change({ stops: form.stops.map(stop => stop.id === id ? { ...stop, ...patch } : stop) }); }
  async function save(status: 'draft' | 'published') {
    if (lock.current || uncertain) return;
    lock.current = true; setBusy(true); setError(null); setMessage(null); setAttemptedStatus(status);
    const generation = focus.current.generation;
    const result = await controller.save(form, status, lifetime.current.signal);
    lock.current = false;
    setBusy(false);
    if (result.kind === 'error') { setError(result.message); setUncertain(Boolean(result.uncertain)); }
    if (result.kind === 'saved') {
      setForm(current => ({ ...current, updatedAt: result.saved.updated_at }));
      if (result.saved.status === 'published') setPublishedId(result.saved.id);
      setMessage(result.saved.status === 'draft' ? 'Draft saved. Only you can open it.' : 'Your journey is published.');
      if (focus.current.active && focus.current.generation === generation) router.push({ pathname: result.saved.status === 'draft' ? '/draft/[id]' : '/journey/[id]', params: { id: result.saved.id } });
    }
  }
  if (publishedId) return <View style={[ui.list, { gap: 18 }]}>
    <Text style={ui.heading}>Journey published.</Text><Text style={ui.body}>Your route is public and ready to share.</Text>
    <Action label="View published journey" onPress={() => router.push({ pathname: '/journey/[id]', params: { id: publishedId } })} />
    <Action label="Back to Discover" onPress={() => router.replace('/discover')} />
  </View>;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={[ui.list, { gap: 22, paddingTop: 12 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={ui.eyebrow}>EVERY ROUTE HAS A STORY</Text><Text accessibilityRole="header" style={ui.heading}>Make a journey yours.</Text>
      <Text style={ui.body}>Add the places you visited, in the order you want to share them.</Text>
      <Field label="Journey title" value={form.title} onChange={title => change({ title })} disabled={disabled} maxLength={200} placeholder="3 days in Varkala" />
      <PlacePicker label="Destination" destinationOnly disabled={disabled} onSelect={destination => change({ destination })} />
      {form.destination && <Text style={ui.body}>Selected destination: {form.destination.name} · {form.destination.latitude}, {form.destination.longitude}</Text>}
      <Text style={formStyles.label}>Who are you travelling with?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['solo','couple','friends','family'] as const).map(type => <Pressable key={type} accessibilityRole="button" accessibilityLabel={type.charAt(0).toUpperCase() + type.slice(1)}
        accessibilityState={{ selected: form.traveler === type, disabled }} disabled={disabled} onPress={() => change({ traveler: type })} style={{ minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: form.traveler === type ? colors.ink : colors.pale }}>
        <Text style={[formStyles.label, form.traveler === type && { color: colors.white }]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
      </Pressable>)}</View>
      <Field label="Duration in days" value={form.days} onChange={days => change({ days })} disabled={disabled} numeric maxLength={3} />
      <Field label="Journey description (optional)" value={form.description} onChange={description => change({ description })} disabled={disabled} multiline maxLength={5000} placeholder="What made this journey special?" />
      <Text style={ui.body}>Photos can be added in a later update. You can save and publish without a cover.</Text>
      <Text accessibilityRole="header" style={ui.sectionTitle}>Your stops · {form.stops.length}/50</Text>
      <PlacePicker label="Stop location" proximity={form.destination} disabled={disabled || form.stops.length >= 50} onSelect={place => {
        const stops = addStop(form.stops, place, randomUUID());
        if (stops === form.stops) setError('That location is already in your stops, or the 50-stop limit was reached.');
        else { change({ stops }); setActive(stops[stops.length - 1].id); }
      }} />
      <Action label="Add a stop without location" disabled={disabled || form.stops.length >= 50} onPress={() => {
        const id = randomUUID(); change({ stops: [...form.stops, { id, name: '', description: '', latitude: null, longitude: null, mapboxId: null, day: '', rating: '' }] }); setActive(id);
      }} />
      <Text style={ui.body}>A named stop without a location can stay in a private draft. Select its location before publishing.</Text>
      {!form.stops.length && <Text style={ui.body}>No stops yet. Search and select your first place.</Text>}
      {form.stops.map((stop, index) => <View key={stop.id} style={{ gap: 12, padding: 16, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }}>
        <Pressable accessibilityRole="button" accessibilityLabel={'Edit stop ' + (index + 1)} onPress={() => setActive(active === stop.id ? null : stop.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={ui.sectionTitle}>{index + 1}. {stop.name || 'Name your stop'}</Text><Text style={ui.body}>{active === stop.id ? 'Hide details' : 'Edit details'}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Action accessibilityLabel={'Move stop ' + (index + 1) + ' up'} label="↑" disabled={disabled || index === 0} onPress={() => change({ stops: moveStop(form.stops, index, -1) })} />
          <Action accessibilityLabel={'Move stop ' + (index + 1) + ' down'} label="↓" disabled={disabled || index === form.stops.length - 1} onPress={() => change({ stops: moveStop(form.stops, index, 1) })} />
          <Action accessibilityLabel={'Remove stop ' + (index + 1)} label="Remove" disabled={disabled} onPress={() => change({ stops: form.stops.filter(item => item.id !== stop.id) })} />
        </View>
        <Text style={ui.body}>{stop.latitude === null || stop.longitude === null ? 'No location selected · draft only' : 'Location: ' + stop.latitude + ', ' + stop.longitude}</Text>
        {active === stop.id && <>
          <Field label={'Stop ' + (index + 1) + ' name'} value={stop.name} onChange={name => editStop(stop.id, { name })} disabled={disabled} maxLength={200} />
          <PlacePicker label={'Stop ' + (index + 1) + ' new location'} proximity={form.destination} disabled={disabled} onSelect={place => {
            if (form.stops.some(item => item.id !== stop.id && item.latitude === place.latitude && item.longitude === place.longitude)) { setError('That location is already in your stops.'); return; }
            editStop(stop.id, { latitude: place.latitude, longitude: place.longitude, mapboxId: place.mapboxId });
          }} />
          <Field label={'Stop ' + (index + 1) + ' description'} value={stop.description} onChange={description => editStop(stop.id, { description })} disabled={disabled} multiline maxLength={1000} />
          <Field label={'Stop ' + (index + 1) + ' day (optional)'} value={stop.day} onChange={day => editStop(stop.id, { day })} disabled={disabled} numeric maxLength={3} placeholder="Within journey duration" />
          <Field label={'Stop ' + (index + 1) + ' rating (optional)'} value={stop.rating} onChange={rating => editStop(stop.id, { rating })} disabled={disabled} numeric maxLength={5} placeholder="0–5" />
        </>}
      </View>)}
      <Text accessibilityRole="header" style={ui.sectionTitle}>Map preview</Text><DraftMap geometry={geometry} />
      <Text style={ui.body}>Drafts stay private. Publish when every stop has a valid selected location.</Text>
      {busy && <ActivityIndicator accessibilityLabel="Saving journey" />}
      {error && <Text accessibilityRole="alert" style={ui.body}>{error}</Text>}
      {message && <Text accessibilityLiveRegion="polite" style={ui.body}>{message}</Text>}
      <Action label={busy ? 'Saving…' : 'Save Draft'} disabled={disabled} onPress={() => { void save('draft'); }} />
      <Action label="Publish Journey" disabled={disabled} onPress={() => { void save('published'); }} />
      {uncertain && <><Action label="Check Account drafts" onPress={() => router.push('/account')} />
        {attemptedStatus === 'published' && <Action label="Check public journey" onPress={() => router.push({ pathname: '/journey/[id]', params: { id: form.id } })} />}
        <Text style={ui.body}>The form is preserved. Check the save result before starting another journey.</Text></>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
export default function CreateScreen() {
  const router = useRouter(), auth = useSessionState(), prompted = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!auth.loading && !auth.session && !prompted.current) { prompted.current = true; router.push({ pathname: '/auth', params: { context: 'create' } }); }
  }, [auth.loading, auth.session, router]));
  return <SafeAreaView style={ui.safe}><View style={ui.page}><ScreenHeader title="Create Journey" back />
    {auth.loading ? <ActivityIndicator /> : !auth.session ? <View style={ui.list}><Message title="Make your next chapter" body="Sign in to create a journey. Nothing is created until you save or publish." retry={() => router.push({ pathname: '/auth', params: { context: 'create' } })} action="Sign in to create" /></View>
      : !idsAvailable ? <View style={ui.list}><Message title="An app update is needed" body="Update this development client before creating journeys. Existing journeys remain available." /></View> : <NewJourneyEditor key={auth.session.user.id} ownerId={auth.session.user.id} />}
  </View></SafeAreaView>;
}
