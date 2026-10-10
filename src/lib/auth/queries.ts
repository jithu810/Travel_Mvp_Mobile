import { supabase } from '../supabase/client';
import type { AuthMode, AuthValues } from './model';
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
