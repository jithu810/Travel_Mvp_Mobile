import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, ScreenHeader, ui } from '@/components/discovery/ui';
import { useSessionState } from '@/hooks/session-context';
import { useActionIntent } from '@/hooks/action-intent';
import { createAuthController, type AuthMode } from '@/lib/auth/model';
import { authenticate } from '@/lib/auth/queries';

export default function AuthScreen() {
  const router = useRouter();
  const creating = useLocalSearchParams<{ context?: string }>().context === 'create';
  const auth = useSessionState();
  const intent = useActionIntent();
  const [returnJourney] = useState(intent.pending?.journeyId ?? null);
  const cancelIntent = intent.cancel;
  const finished = useRef(false);
  const mounted = useRef(false);
  const submitLock = useRef(false);
  const controller = useMemo(() => createAuthController(authenticate), []);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (!finished.current) cancelIntent(); };
  }, [cancelIntent]));
  function backAfterAuth() {
    finished.current = true;
    if (router.canGoBack()) router.back();
    else if (returnJourney) router.replace({ pathname: '/journey/[id]', params: { id: returnJourney } });
    else router.replace('/account');
  }
  async function submit() {
    if (submitLock.current) return;
    submitLock.current = true;
    setError(null); setMessage(null);
    setBusy(true);
    const result = await controller.submit(mode, { email, password, name });
    submitLock.current = false;
    if (!mounted.current) return;
    setPassword(''); setBusy(false);
    if (result.kind === 'signed-in') backAfterAuth();
    else if (result.kind === 'confirmation') { setMode('signin'); setMessage('Check your email to confirm your account, then return here and sign in. You are not signed in yet.'); }
    else if (result.kind === 'error') setError(result.message);
  }
  return <SafeAreaView style={ui.safe}><View style={ui.page}>
    <ScreenHeader title={mode === 'signin' ? 'Sign in' : 'Create account'} back />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[ui.list, styles.form]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={ui.eyebrow}>YOUR NEXT CHAPTER</Text>
        <Text accessibilityRole="header" style={ui.heading}>{mode === 'signin' ? 'Welcome back.' : 'Make it yours.'}</Text>
        <Text style={ui.body}>{returnJourney ? 'Sign in to continue with your selected journey.' : creating ? 'Sign in to create your journey.' : 'Keep journeys for later and make a private remix.'}</Text>
        {auth.loading ? <ActivityIndicator color={colors.ink} /> : auth.session
          ? <Pressable accessibilityRole="button" onPress={backAfterAuth} style={ui.action}><Text style={ui.actionLabel}>Continue</Text></Pressable>
          : <>
            {mode === 'register' && <View style={styles.field}><Text style={styles.label}>Display name</Text><TextInput accessibilityLabel="Display name" value={name} onChangeText={setName} editable={!busy} maxLength={80} autoComplete="name" style={styles.input} /></View>}
            <View style={styles.field}><Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Email address" value={email} onChangeText={setEmail} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" maxLength={254} style={styles.input} /></View>
            <View style={styles.field}><Text style={styles.label}>Password</Text><TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} returnKeyType="go" onSubmitEditing={() => { void submit(); }} style={styles.input} /></View>
            {error && <Text accessibilityRole="alert" style={styles.feedback}>{error}</Text>}
            {message && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{message}</Text>}
            <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => { void submit(); }} style={[ui.action, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={ui.actionLabel}>{mode === 'signin' ? 'Sign in with email' : 'Register with email'}</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setPassword(''); setError(null); setMessage(null); }} style={styles.switch}>
              <Text style={styles.label}>{mode === 'signin' ? 'New here? Create an account' : 'Already registered? Sign in'}</Text>
            </Pressable>
          </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  form: { gap: 18, paddingTop: 16 }, field: { gap: 8 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 14, color: colors.ink, fontSize: 16 },
  feedback: { color: colors.ink, fontSize: 13, lineHeight: 21 },
  switch: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.6 },
});
