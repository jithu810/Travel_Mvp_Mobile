import { isJourneyId, object } from '../discovery/model';
export type SocialAction = 'like' | 'save';
export type SocialState = { liked: boolean; saved: boolean; likes: number | null };
export function normalizeSocialState(value: unknown, id: string): SocialState | null {
  const row = object(value);
  if (!row || !isJourneyId(id) || row.id !== id || row.status !== 'published' || row.is_demo !== false
    || typeof row.liked !== 'boolean' || typeof row.saved !== 'boolean') return null;
  return {
    liked: row.liked, saved: row.saved,
    likes: typeof row.likes_count === 'number' && Number.isSafeInteger(row.likes_count) && row.likes_count >= 0 ? row.likes_count : null,
  };
}
export type SocialPort = { read: () => Promise<SocialState>; write: (action: SocialAction, enabled: boolean) => Promise<SocialState> };
export type SocialSnapshot = { state: SocialState | null; busy: 'load' | SocialAction | null; error: string | null; message: string | null };
export function createSocialController(port: SocialPort | null, initialLikes: number | null) {
  let snapshot: SocialSnapshot = { state: port ? null : { liked: false, saved: false, likes: initialLikes }, busy: null, error: null, message: null };
  let disposed = false;
  const listeners = new Set<() => void>();
  const publish = (next: SocialSnapshot) => { if (!disposed) { snapshot = next; listeners.forEach(listener => listener()); } };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    // Account/route changes detach old results. No previous-account data survives.
    dispose: () => { disposed = true; listeners.clear(); },
    async load() {
      if (disposed || !port || snapshot.busy) return;
      publish({ ...snapshot, busy: 'load', error: null, message: null });
      try { const state = await port.read(); publish({ state, busy: null, error: null, message: null }); }
      catch { publish({ state: null, busy: null, error: 'Couldn’t verify your Like and Saved state. Check your connection and retry.', message: null }); }
    },
    async act(action: SocialAction, desired?: boolean) {
      if (disposed || snapshot.busy) return;
      if (!port) { publish({ ...snapshot, message: 'Sign in required. Like and Save need a Journey Creator account.' }); return; }
      if (!snapshot.state) return;
      const current = action === 'like' ? snapshot.state.liked : snapshot.state.saved;
      const enabled = desired ?? !current;
      if (current === enabled) return;
      publish({ ...snapshot, busy: action, error: null, message: null });
      try {
        const state = await port.write(action, enabled);
        if ((action === 'like' ? state.liked : state.saved) !== enabled) throw new Error('State unverified');
        publish({ state, busy: null, error: null, message: action === 'like'
          ? (state.liked ? 'Journey liked.' : 'Like removed.')
          : (state.saved ? 'Saved for later.' : 'Removed from Saved.') });
      } catch {
        // A timeout can happen after a committed write. Never blindly invert or
        // pretend the old state is current. Re-read before permitting another action.
        publish({ state: null, busy: null, error: 'The update couldn’t be confirmed. It may have reached the server. Retry to check the current state before changing it again.', message: null });
      }
    },
  };
}
