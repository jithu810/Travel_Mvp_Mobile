import { theme } from '@/theme/mobile-theme';
import { BrandedLoading } from '@/components/branded-loading';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, colors, Message, ui } from '@/components/discovery/ui';
import { JourneyPhoto } from '@/components/discovery/journey-photo';
import { useSessionState } from '@/hooks/session-context';
import { useLoad } from '@/hooks/use-load';
import { useLocalPhotos } from '@/hooks/use-local-photos';
import { createProfileSaver, ProfileEditFailure, type OwnProfile, type ProfileFields } from '@/lib/profile/edit-model';
import { loadOwnProfile, updateOwnProfile, uploadProfileAvatar } from '@/lib/profile/edit-queries';

function EditHeader({ onBack }: { onBack: () => void }) {
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return;
    const entry = StatusBar.pushStackEntry({ barStyle: 'dark-content' });
    return () => StatusBar.popStackEntry(entry);
  }, []));
  return <SafeAreaView edges={['top']} style={s.navy}><View style={s.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
    <Text accessibilityRole="header" style={s.heading}>Edit Profile</Text><View style={s.back} />
  </View></SafeAreaView>;
}
const fields = ({ displayName, username, bio, avatarPath }: OwnProfile): ProfileFields => ({ displayName, username, bio, avatarPath });

export function ProfileEditor({ profile, ownerId, onReload }: { profile: OwnProfile; ownerId: string; onReload: () => void }) {
  const router = useRouter(), navigation = useNavigation();
  const [baseline, setBaseline] = useState(profile), [form, setForm] = useState<ProfileFields>(() => fields(profile));
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState<string | null>(null), [saved, setSaved] = useState(false);
  const photos = useLocalPhotos(), candidate = photos.candidates.avatar;
  const lock = useRef(false), alive = useRef(true), request = useRef(new AbortController());
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current.abort(); }; }, []);
  const saver = useRef<ReturnType<typeof createProfileSaver> | null>(null);
  useEffect(() => {
    saver.current = createProfileSaver({ upload: photo => uploadProfileAvatar(photo, ownerId, request.current.signal), update: input => updateOwnProfile(input, ownerId, request.current.signal) });
    return () => { saver.current = null; };
  }, [ownerId]);
  const dirty = JSON.stringify(form) !== JSON.stringify(fields(baseline)) || !!candidate;
  const disabled = busy || photos.busyKey !== null || uncertain;
  usePreventRemove(dirty || busy || photos.busyKey !== null, ({ data }) => {
    if (lock.current || photos.isBusy()) { Alert.alert('Please wait', 'Wait for the current save or photo preparation to finish.'); return; }
    Alert.alert('Discard unsaved profile changes?', 'Your last saved profile stays unchanged. Local photo previews will be removed.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => { if (alive.current && !lock.current && !photos.isBusy()) navigation.dispatch(data.action); } },
    ]);
  });
  function change(key: keyof ProfileFields, value: string | null) {
    if (disabled || lock.current || photos.isBusy()) return;
    setForm(current => ({ ...current, [key]: value })); setError(null); setSaved(false);
  }
  function choosePhoto() {
    if (disabled || lock.current || photos.isBusy()) return;
    Alert.alert('Change profile photo', 'Choose a photo to preview. It uploads only when you save.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Photo library', onPress: () => { if (alive.current && !lock.current && !photos.isBusy()) photos.select('avatar'); } },
      { text: 'Take photo', onPress: () => { if (alive.current && !lock.current && !photos.isBusy()) photos.select('avatar', 'camera'); } },
    ]);
  }
  async function save() {
    if (lock.current || disabled || photos.isBusy() || !dirty) return;
    lock.current = true; setBusy(true); setError(null); setSaved(false);
    request.current = new AbortController();
    const timer = setTimeout(() => request.current.abort(), 20000);
    try {
      if (!saver.current) throw new ProfileEditFailure('Profile editing is still loading. Please retry.');
      const result = await saver.current.save(form, candidate);
      if (!alive.current) return;
      if (!result.avatarPreview && result.avatarPath === baseline.avatarPath) result.avatarPreview = baseline.avatarPreview;
      setBaseline(result); setForm(fields(result));
      if (candidate) photos.acceptSaved({ avatar: candidate });
      setSaved(true);
    } catch (failure) {
      if (!alive.current) return;
      setError(failure instanceof ProfileEditFailure ? failure.message : 'Couldn’t save your profile. Please retry.');
      setUncertain(failure instanceof ProfileEditFailure && failure.uncertain);
    } finally { clearTimeout(timer); lock.current = false; if (alive.current) setBusy(false); }
  }
  function reload() {
    if (lock.current || photos.isBusy()) return;
    Alert.alert('Reload saved profile?', 'This discards unsaved text and local photo changes and reads the server result.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reload', onPress: () => { if (alive.current && !lock.current && !photos.isBusy()) onReload(); } }]);
  }
  const avatar = candidate?.uri || (form.avatarPath ? baseline.avatarPreview : null);
  return <SafeAreaView edges={['left','right','bottom']} style={ui.safe}><View style={ui.page}>
    <EditHeader onBack={() => saved ? router.replace('/account') : router.canGoBack() ? router.back() : router.replace('/account')} />
    <KeyboardAvoidingView style={s.grow} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={s.avatarArea}><View style={s.avatar}>{avatar ? <JourneyPhoto uri={avatar} ratio={1} thumbnail label="Profile photo preview" /> : <Text style={s.initial}>{(form.displayName || form.username || 'Traveler').slice(0,1).toUpperCase()}</Text>}</View>
          <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" disabled={disabled} onPress={choosePhoto} style={s.photoButton}><Text style={s.photoLabel}>{photos.busyKey ? 'Preparing photo…' : 'Change Photo'}</Text></Pressable>
          {(candidate || form.avatarPath) && <Pressable accessibilityRole="button" accessibilityLabel="Remove profile photo" disabled={disabled} onPress={() => { if (!disabled && !lock.current && !photos.isBusy()) { photos.remove('avatar'); change('avatarPath', null); } }} style={s.remove}><Text style={ui.body}>Remove photo</Text></Pressable>}
          <Text style={s.hint}>{candidate ? 'New photo · Not saved' : form.avatarPath && !avatar ? 'Saved photo · Preview unavailable' : 'Your public traveler photo'}</Text>
          {photos.errors.avatar && <Text accessibilityRole="alert" style={s.error}>{photos.errors.avatar}</Text>}
        </View>
        <View style={s.form}>
          <Text style={s.label}>Display name</Text><TextInput accessibilityLabel="Display name" value={form.displayName} editable={!disabled} maxLength={80} onChangeText={value => change('displayName', value)} placeholder="Your name" autoCapitalize="words" style={s.input} />
          <Text style={s.label}>Username</Text><TextInput accessibilityLabel="Username" value={form.username} editable={!disabled} maxLength={30} onChangeText={value => change('username', value)} placeholder="your_username" autoCapitalize="none" autoCorrect={false} style={s.input} />
          <Text style={s.hint}>3–30 letters, numbers or underscores. Your public profile link uses this name.</Text>
          <Text style={s.label}>Bio</Text><TextInput accessibilityLabel="Bio" value={form.bio} editable={!disabled} maxLength={500} onChangeText={value => change('bio', value)} placeholder="A little about you and your travels" multiline textAlignVertical="top" style={[s.input, s.bio]} />
          <Text style={s.counter}>{form.bio.length}/500</Text>
        </View>
        {error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        {saved && <Text accessibilityLiveRegion="polite" style={s.success}>Changes saved. Your profile is up to date.</Text>}
        {uncertain && <Action label="Reload saved profile" secondary onPress={reload} />}
      </ScrollView>
      <View style={s.footer}><Action label={busy ? 'Saving changes…' : 'Save Changes'} disabled={disabled || !dirty} onPress={() => { void save(); }} />
        {saved && <Action label="Back to Profile" secondary onPress={() => router.replace('/account')} />}
      </View>
    </KeyboardAvoidingView>
  </View></SafeAreaView>;
}
function ProfileEntry({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const loader = useCallback((signal: AbortSignal) => { void revision; return loadOwnProfile(ownerId, signal); }, [ownerId, revision]);
  const state = useLoad(loader);
  if (state.data) return <ProfileEditor key={ownerId + ':' + revision} profile={state.data} ownerId={ownerId} onReload={() => setRevision(n => n + 1)} />;
  return <SafeAreaView edges={['left','right','bottom']} style={ui.safe}><View style={ui.page}><EditHeader onBack={() => router.canGoBack() ? router.back() : router.replace('/account')} /><View style={s.content}>
    {state.loading ? <BrandedLoading message="Opening your profile…" /> : <Message title="Profile unavailable" body={state.error || 'Your profile could not be loaded.'} retry={state.retry} />}
  </View></View></SafeAreaView>;
}
export default function EditProfileScreen() {
  const auth = useSessionState(), router = useRouter();
  if (auth.session && !auth.loading) return <ProfileEntry key={auth.session.user.id} ownerId={auth.session.user.id} />;
  return <SafeAreaView edges={['left','right','bottom']} style={ui.safe}><View style={ui.page}><EditHeader onBack={() => router.canGoBack() ? router.back() : router.replace('/account')} /><View style={s.content}>
    {auth.loading ? <ActivityIndicator accessibilityLabel="Loading account" /> : <Message title="Sign in to edit your profile" body="Your profile changes are saved to your existing account." retry={() => router.push('/auth')} action="Sign in" />}
  </View></View></SafeAreaView>;
}
const s = StyleSheet.create({
  grow: { flex: 1, minHeight: 0 }, navy: { backgroundColor: theme.background }, header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  back: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, backText: { color: theme.accent, fontSize: 32, lineHeight: 36 }, heading: { flex: 1, color: theme.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  content: { padding: 18, gap: 14 }, avatarArea: { alignItems: 'center', gap: 4 }, avatar: { width: 104, height: 104, borderRadius: 52, overflow: 'hidden', backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white },
  initial: { color: colors.ink, fontSize: 36, fontWeight: '600' }, photoButton: { minHeight: 48, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: theme.lavender, borderRadius: 22, marginTop: 8 }, photoLabel: { color: colors.ink, fontWeight: '600', fontSize: 14 }, remove: { minHeight: 48, justifyContent: 'center' },
  form: { gap: 8 }, label: { color: colors.ink, fontSize: 14, fontWeight: '600', marginTop: 4 }, input: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: theme.surface, paddingHorizontal: 14, paddingVertical: 10, color: colors.ink, fontSize: 15 }, bio: { minHeight: 88 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }, counter: { color: colors.muted, fontSize: 12, textAlign: 'right' }, error: { color: '#8B3933', fontSize: 14, lineHeight: 21 }, success: { color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '600' }, footer: { paddingHorizontal: 18, paddingVertical: 10, gap: 8, backgroundColor: colors.paper },
});
