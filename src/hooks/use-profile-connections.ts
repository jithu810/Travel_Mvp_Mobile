import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { connectionPort } from '@/lib/connections/queries';
import { createConnectionsController } from '@/lib/connections/model';
import type { ConnectionPort } from '@/lib/connections/types';
import { useSessionState } from './session-context';

export function useProfileConnections(targetId: string) {
  const auth = useSessionState();
  const userId = auth.session?.user.id ?? null;
  const token = auth.session?.access_token ?? null;
  const enabled = !auth.loading && !auth.error && !!userId && !!token;
  const controller = useMemo(() => {
    let port: ConnectionPort | null = null;
    if (enabled && userId && token) {
      try { port = connectionPort(targetId, userId, token); }
      catch {
        // A missing client/configuration must not interrupt public profile browsing.
        const unavailable = async () => { throw new Error('Connections are not available in this build yet.'); };
        port = { read: unavailable, list: unavailable, write: unavailable };
      }
    }
    return createConnectionsController(port, targetId, enabled ? userId : null, randomUUID);
  }, [targetId, userId, token, enabled]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => () => controller.dispose(), [controller]);
  useFocusEffect(useCallback(() => {
    let focused = true;
    if (AppState.currentState === 'active') controller.resume();
    const listener = AppState.addEventListener('change', next => {
      if (!focused) return;
      if (next === 'active') controller.resume(); else controller.suspend();
    });
    return () => { focused = false; listener.remove(); controller.suspend(); };
  }, [controller]));
  return { ...state, auth, owner: !!userId && targetId === userId, controller };
}
