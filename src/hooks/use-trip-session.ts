import { useCallback, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { elapsedTime, observeTripTimer, tripStore, type TripSession } from '@/lib/journey/trip-session';

export function useTripSnapshot(id: string) {
  const get = useCallback(() => tripStore.get(id), [id]);
  return useSyncExternalStore(tripStore.subscribe, get, get);
}
export function useTripElapsed(session: TripSession) {
  // The counter only requests a render. Duration always comes from timestamps.
  const [, redraw] = useState(0);
  useFocusEffect(useCallback(() => {
    if (session.status !== 'active') return;
    return observeTripTimer(AppState, () => redraw(value => value + 1));
  }, [session.status]));
  return elapsedTime(session, tripStore.now());
}
