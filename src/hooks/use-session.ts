import { observeSession } from '@/lib/auth/session';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import type { SessionState } from '@/types/session';

// Mounted once by SessionProvider; all screens share this subscription.
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const unsubscribe = observeSession(client.auth, state => {
      setSession(state.session); setLoading(state.loading); setError(state.error);
    });
    const updateRefresh = (state: string) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    const listener = Platform.OS !== 'web'
      ? AppState.addEventListener('change', updateRefresh)
      : null;
    if (Platform.OS !== 'web') updateRefresh(AppState.currentState);
    return () => {

      unsubscribe();
      listener?.remove();
      if (Platform.OS !== 'web') client.auth.stopAutoRefresh();
    };
  }, []);
  return { session, loading, error };
}

