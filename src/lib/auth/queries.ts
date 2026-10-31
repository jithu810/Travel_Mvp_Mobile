import { supabase } from '../supabase/client';
import { validateEmail, type AuthMode, type AuthValues } from './model';
export async function checkRegistrationEmail(email: string): Promise<boolean> {
  const invalid = validateEmail(email);
  if (invalid) throw new Error(invalid);
  const unavailable = 'We could not check this email. Check your connection and try again.';
  if (!supabase) throw new Error(unavailable);
  let result;
  try {
    result = await supabase.functions.invoke('registration-email-check', { body: { email: email.trim() } });
  } catch {
    throw new Error(unavailable);
  }
  if (!result || typeof result !== 'object') throw new Error(unavailable);
  if (result.error) {
    const status = typeof Response !== 'undefined' && result.error.context instanceof Response ? result.error.context.status : undefined;
    if (status === 429) throw new Error('Too many email checks. Please wait a little before trying again.');
    if (status === 400) throw new Error('Enter a valid email address.');
    throw new Error(unavailable);
  }
  const data: unknown = result.data;
  if (!data || typeof data !== 'object' || !('exists' in data) || typeof data.exists !== 'boolean') throw new Error(unavailable);
  return data.exists;
}
export async function authenticate(mode: AuthMode, values: AuthValues): Promise<'signed-in' | 'confirmation'> {
  if (!supabase) throw new Error('Authentication unavailable.');
  if (mode === 'register') {
    // Use the existing project's confirmation email/redirect configuration.
    // Confirm in the browser, then sign in here; no new redirect allowlist.
    const { data, error } = await supabase.auth.signUp({
      email: values.email, password: values.password, options: { data: { display_name: values.name } },
    });
    if (error) throw error;
    return data.session ? 'signed-in' : 'confirmation';
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
  if (error) throw error;
  if (!data.session) throw new Error('No authenticated session.');
  return 'signed-in';
}
export async function signOutAccount() {
  if (!supabase) throw new Error('Authentication unavailable.');
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw new Error('We couldn’t sign you out. Check your connection and retry.');
}
