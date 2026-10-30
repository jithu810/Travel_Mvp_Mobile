export type AuthMode = 'signin' | 'register';
export type AuthValues = { email: string; password: string; name: string };
export function validateAuth(values: AuthValues, mode: AuthMode): string | null {
  const email = values.email.trim();
  if (!email || !values.password) return 'Enter your email and password.';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  if (mode === 'register' && (!values.name.trim() || values.name.trim().length > 80)) return 'Enter a display name of 1–80 characters.';
  if (mode === 'register' && values.password.length < 8) return 'Choose a password with at least 8 characters.';
  return null;
}
// A failed account check (offline or an auth outage) is not a signed-out user. The caller still blocks either way; only the message differs.
export function accountCheckMessage(error: unknown, signedOut: string): string {
  const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
  return name === 'AuthRetryableFetchError' ? 'Couldn’t confirm your account right now. Check your connection and retry.' : signedOut;
}
export function authError(error: unknown, mode: AuthMode): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'invalid_credentials') return 'The email or password is incorrect. Please try again.';
  if (code === 'email_not_confirmed') return 'Confirm your email first, then sign in.';
  if (code === 'weak_password') return 'Choose a stronger password with at least 8 characters.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return 'Too many attempts. Please wait a little before trying again.';
  return mode === 'register' ? 'Registration couldn’t be confirmed. Check your email before trying again, or sign in if you already have an account.'
    : 'We couldn’t sign you in. Check your connection and try again.';
}
export type AuthPort = (mode: AuthMode, values: AuthValues) => Promise<'signed-in' | 'confirmation'>;
export function createAuthController(port: AuthPort) {
  let busy = false;
  return { async submit(mode: AuthMode, values: AuthValues) {
    if (busy) return { kind: 'busy' as const };
    const invalid = validateAuth(values, mode);
    if (invalid) return { kind: 'error' as const, message: invalid };
    busy = true;
    try { return { kind: await port(mode, { ...values, email: values.email.trim(), name: values.name.trim() }) }; }
    catch (error) { return { kind: 'error' as const, message: authError(error, mode) }; }
    finally { busy = false; }
  } };
}
