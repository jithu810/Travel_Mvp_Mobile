import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase/client';
import { createGoogleSignIn, googleRedirect } from './google-model';

const controller = createGoogleSignIn({
  storage: AsyncStorage,
  async authorize() {
    if (!supabase) throw new Error('Authentication unavailable.');
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: googleRedirect, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } });
    if (error) throw error;
    return { url: data.url, flowId: data.flowId ?? null };
  },
  async exchange(code, flowId) {
    if (!supabase) return false;
    const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    return !error && Boolean(data.session && data.user);
  },
  async open(url) {
    // Lazy loading allows an older APK to keep email sign-in working; Google
    // needs a rebuilt binary containing this native module.
    const browser = await import('expo-web-browser');
    return browser.openAuthSessionAsync(url, googleRedirect);
  },
});
export const googleSignInSupported = true;
export const isGoogleSignInPending = controller.isPending;
export const signInWithGoogle = controller.start;
export const completeGoogleSignIn = controller.complete;
