import type { Session } from '@supabase/supabase-js';
import type { SessionState } from '../../types/session';
type AuthPort = {
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => { data: { subscription: { unsubscribe: () => void } } };
  getSession: () => Promise<{ data: { session: Session | null }; error: unknown }>;
};
// Subscribe before reading storage. A late restoration must never overwrite a
// newer sign-in/sign-out event, including when the restoration request rejects.
export function observeSession(auth: AuthPort, update: (state: SessionState) => void) {
  let mounted = true;
  let changed = false;
  const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
    changed = true;
    if (mounted) update({ session, loading: false, error: null });
  });
  void auth.getSession().then(({ data, error }) => {
    if (mounted && !changed) update({ session: data.session, loading: false, error: error ? 'Unable to restore your session.' : null });
  }).catch(() => {
    if (mounted && !changed) update({ session: null, loading: false, error: 'Unable to restore your session.' });
  });
  return () => { mounted = false; subscription.unsubscribe(); };
}
