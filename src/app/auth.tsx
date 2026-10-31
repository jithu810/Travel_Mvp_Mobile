import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, ui } from '@/components/auth/legacy-ui';
import { useSessionState } from '@/hooks/session-context';
import { useActionIntent } from '@/hooks/action-intent';
import { createAuthController, validateEmail, type AuthMode } from '@/lib/auth/model';
import { authenticate, checkRegistrationEmail } from '@/lib/auth/queries';
import { googleSignInSupported, isGoogleSignInPending, signInWithGoogle } from '@/lib/auth/google';
import { StatusBar } from 'expo-status-bar';
import { signupStyles as authStyles } from '@/components/auth/signup-styles';

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
  const requestVersion = useRef(0);
  const controller = useMemo(() => createAuthController(authenticate), []);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [registrationStep, setRegistrationStep] = useState<'email' | 'details'>('email');
  const registration = mode === 'register';
  const emailStep = registration && registrationStep === 'email';
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const focusedInput = useRef<number | null>(null);
  const [headerHeight, setHeaderHeight] = useState(52);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const availableHeight = viewportHeight || Math.max(0, height - insets.top - insets.bottom - headerHeight);
  const compact = availableHeight < 620;
  const needsScroll = contentHeight > availableHeight + 1;
  const revealInput = useCallback(() => {
    if (focusedInput.current !== null && Keyboard.isVisible()) {
      // Leave space for the email action below the last input as well as the caret.
      scroll.current?.scrollResponderScrollNativeHandleToKeyboard(focusedInput.current, 72, true);
    }
  }, []);
  useEffect(() => {
    revealInput();
    if (!needsScroll) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [viewportHeight, contentHeight, needsScroll, revealInput]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    mounted.current = true;
    setBusy(false);
    return () => { mounted.current = false; requestVersion.current++; submitLock.current = false; if (!finished.current && !isGoogleSignInPending()) cancelIntent(); };
  }, [cancelIntent]));
  function backAfterAuth() {
    finished.current = true;
    if (router.canGoBack()) router.back();
    else if (returnJourney) router.replace({ pathname: '/journey/[id]', params: { id: returnJourney } });
    else if (creating) router.replace('/create');
    else router.replace('/account');
  }
  function changeEmail() {
    if (submitLock.current) return;
    setRegistrationStep('email'); setPassword(''); setError(null); setMessage(null);
    focusedInput.current = null;
  }
  async function continueRegistration() {
    if (submitLock.current) return;
    setError(null); setMessage(null);
    const invalid = validateEmail(email);
    if (invalid) { setError(invalid); return; }
    submitLock.current = true; setBusy(true);
    const version = ++requestVersion.current;
    const normalizedEmail = email.trim();
    try {
      const exists = await checkRegistrationEmail(normalizedEmail);
      if (!mounted.current || version !== requestVersion.current) return;
      setEmail(normalizedEmail); setPassword(''); focusedInput.current = null;
      if (exists) {
        setMode('signin'); setName(''); setRegistrationStep('email');
        setMessage('This email is already registered. Sign in.');
      } else setRegistrationStep('details');
    } catch (error) {
      if (mounted.current && version === requestVersion.current) setError(error instanceof Error ? error.message : 'We could not check this email. Please try again.');
    } finally {
      if (mounted.current && version === requestVersion.current) { submitLock.current = false; setBusy(false); }
    }
  }
  async function submit() {
    if (submitLock.current) return;
    if (emailStep) { await continueRegistration(); return; }
    submitLock.current = true;
    setError(null); setMessage(null);
    setBusy(true);
    const version = ++requestVersion.current;
    const result = await controller.submit(mode, { email, password, name });
    if (!mounted.current || version !== requestVersion.current) return;
    submitLock.current = false;
    setPassword(''); setBusy(false);
    if (result.kind === 'signed-in') backAfterAuth();
    else if (result.kind === 'confirmation') { setMode('signin'); setRegistrationStep('email'); setMessage('If this is a new email, check your inbox to confirm your account, then sign in. Already registered? Sign in with your existing password. You are not signed in yet.'); }
    else if (result.kind === 'error') setError(result.message);
  }
  async function googleSignIn() {
    if (submitLock.current) return;
    submitLock.current = true; setBusy(true); setError(null); setMessage(null);
    Keyboard.dismiss();
    const version = ++requestVersion.current;
    try {
      const result = await signInWithGoogle(returnJourney, creating ? 'create' : undefined);
      if (!mounted.current || version !== requestVersion.current) return;
      if (result) backAfterAuth();
    } catch {
      if (mounted.current && version === requestVersion.current) setError('We could not complete Google sign-in. Check your connection and try again. If you recently updated the app, install the latest build.');
    } finally {
      if (mounted.current && version === requestVersion.current) { submitLock.current = false; setBusy(false); }
    }
  }
  return <View style={[ui.safe, authStyles.background]}>
    <>
      <StatusBar style="light" />
      <Image source={require('../../assets/auth/sunset-road.png')} accessible={false} importantForAccessibility="no" resizeMode="cover" style={authStyles.scenery} />
      <View pointerEvents="none" style={authStyles.shade} />
    </>
    <SafeAreaView style={[ui.safe, authStyles.transparent]}><View style={ui.page}>
    <View onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)} style={[ui.header, authStyles.header]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={busy} onPress={() => {
        if (submitLock.current) return;
        if (registration && !emailStep) changeEmail();
        else if (router.canGoBack()) router.back();
        else router.replace('/discover');
      }} style={authStyles.back}>
        <Text style={authStyles.backText}>‹</Text>
      </Pressable>
      <Text style={authStyles.headerTitle}>{registration ? 'Create account' : 'Sign in'}</Text>
    </View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
      <ScrollView ref={scroll}
        onLayout={event => setViewportHeight(event.nativeEvent.layout.height)}
        onContentSizeChange={(_width, measuredHeight) => setContentHeight(measuredHeight)}
        scrollEnabled={needsScroll} bounces={false} overScrollMode="never"
        contentContainerStyle={[ui.list, styles.form, authStyles.form, compact && authStyles.compactForm]}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {!compact && <View style={authStyles.scenicSpace} />}
        <View style={authStyles.intro}>
          {!compact && <Text style={[ui.eyebrow, authStyles.eyebrow]}>YOUR NEXT CHAPTER</Text>}
          <Text accessibilityRole="header" style={[ui.heading, authStyles.heading, compact && authStyles.compactHeading]}>{registration ? 'Make it yours.' : 'Welcome back.'}</Text>
          <Text style={authStyles.body}>{registration ? 'Save journeys. Make them yours.' : returnJourney ? 'Sign in to continue with your selected journey.' : creating ? 'Sign in to create your journey.' : 'Keep journeys for later and make a private remix.'}</Text>
        </View>
        {auth.loading ? <ActivityIndicator color={colors.white} /> : auth.session
          ? <Pressable accessibilityRole="button" onPress={backAfterAuth} style={[ui.action, authStyles.emailButton]}><Text style={[ui.actionLabel, authStyles.emailLabel]}>Continue</Text></Pressable>
          : <>
            {registration && !emailStep && <View style={[styles.field, authStyles.field]}>
              <Text style={[styles.label, authStyles.label]}>Email</Text><Text style={authStyles.body}>{email}</Text>
              <Pressable accessibilityRole="button" disabled={busy} onPress={changeEmail} style={authStyles.switch}><Text style={[styles.label, authStyles.label]}>Change email</Text></Pressable>
            </View>}
            {registration && !emailStep && <View style={[styles.field, authStyles.field]}><Text style={[styles.label, authStyles.label]}>Display name</Text><TextInput accessibilityLabel="Display name" value={name} onChangeText={setName} editable={!busy} maxLength={80} autoComplete="name" selectionColor="#FFD18B" onFocus={event => { focusedInput.current = event.nativeEvent.target; revealInput(); }}
              onBlur={() => { focusedInput.current = null; }}
              style={[styles.input, authStyles.input]} /></View>}
            {(!registration || emailStep) && <View style={[styles.field, authStyles.field]}><Text style={[styles.label, authStyles.label]}>Email</Text><TextInput accessibilityLabel="Email address" value={email} onChangeText={value => { if (!submitLock.current) setEmail(value); }} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" maxLength={254} returnKeyType={emailStep ? 'next' : 'default'} onSubmitEditing={emailStep ? continueRegistration : undefined} selectionColor="#FFD18B" onFocus={event => { focusedInput.current = event.nativeEvent.target; revealInput(); }}
              onBlur={() => { focusedInput.current = null; }}
              style={[styles.input, authStyles.input]} /></View>}
            {!emailStep && <View style={[styles.field, authStyles.field]}><Text style={[styles.label, authStyles.label]}>Password</Text><TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} returnKeyType="go" onSubmitEditing={() => { void submit(); }} selectionColor="#FFD18B" onFocus={event => { focusedInput.current = event.nativeEvent.target; revealInput(); }}
              onBlur={() => { focusedInput.current = null; }}
              style={[styles.input, authStyles.input]} /></View>}
            {error && <Text accessibilityRole="alert" style={[styles.feedback, authStyles.feedback]}>{error}</Text>}
            {message && <Text accessibilityLiveRegion="polite" style={[styles.feedback, authStyles.feedback]}>{message}</Text>}
            <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => { void submit(); }} style={[ui.action, authStyles.emailButton, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={[ui.actionLabel, authStyles.emailLabel]}>{mode === 'signin' ? 'Sign in with email' : emailStep ? 'Continue' : 'Register with email'}</Text>}
            </Pressable>
            <View style={authStyles.googleOption}>
              <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" accessibilityHint={googleSignInSupported ? 'Opens Google sign-in in your browser.' : 'Available in the mobile app.'} accessibilityState={{ disabled: busy || !googleSignInSupported }} disabled={busy || !googleSignInSupported} onPress={() => { void googleSignIn(); }} style={[authStyles.googleButton, busy && styles.disabled]}>
                <Image source={require('../../assets/auth/google-g.png')} accessible={false} style={authStyles.googleLogo} resizeMode="contain" />
                <View style={authStyles.googleCopy}>
                  <Text style={authStyles.googleLabel}>Continue with Google</Text>
                  {!googleSignInSupported && <Text style={authStyles.googleHint}>Available in the mobile app</Text>}
                </View>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => { if (submitLock.current) return; setMode(mode === 'signin' ? 'register' : 'signin'); setRegistrationStep('email'); setPassword(''); setError(null); setMessage(null); }} style={[styles.switch, authStyles.switch]}>
              <Text style={[styles.label, authStyles.label]}>{mode === 'signin' ? 'New here? Create an account' : 'Already registered? Sign in'}</Text>
            </Pressable>
          </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </View></SafeAreaView></View>;
}
const styles = StyleSheet.create({
  form: { gap: 18, paddingTop: 16 }, field: { gap: 8 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 14, color: colors.ink, fontSize: 16 },
  feedback: { color: colors.ink, fontSize: 13, lineHeight: 21 },
  switch: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.6 },
});
