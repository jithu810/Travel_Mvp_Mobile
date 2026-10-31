// Native OAuth requires the installed development/standalone app's URL scheme.
// Keep browser email authentication usable without a native module dependency.
export const googleSignInSupported = false;
export const isGoogleSignInPending = () => false;
export async function signInWithGoogle(_journeyId: string | null, _returnTo?: 'create'): Promise<{ journeyId: string | null; returnTo?: 'create' } | null> {
  throw new Error('Continue with Google is available in the mobile app.');
}
export async function completeGoogleSignIn(_url: string): Promise<{ journeyId: string | null; returnTo?: 'create' }> {
  throw new Error('Open the mobile app and start Google sign-in again.');
}
