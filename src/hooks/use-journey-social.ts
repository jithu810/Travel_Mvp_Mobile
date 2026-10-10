import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useSessionState } from './session-context';
import { createSocialController } from '@/lib/social/model';
import { socialPort } from '@/lib/social/queries';

export function useJourneySocial(id: string, initialLikes: number | null) {
  const auth = useSessionState();
  const userId = auth.session?.user.id ?? null;
  const controller = useMemo(() => createSocialController(userId ? socialPort(id, userId) : null, initialLikes), [id, userId, initialLikes]);
  const value = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useFocusEffect(useCallback(() => {
    void controller.load();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void controller.load(); });
    return () => listener.remove();
  }, [controller]));
  // Account/route changes replace the store; old request completions have no UI subscription.
  return { ...value, auth, load: controller.load, act: controller.act };
}
