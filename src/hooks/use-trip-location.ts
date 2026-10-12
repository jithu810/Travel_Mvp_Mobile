import { useCallback, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { createForegroundLocation } from '@/lib/journey/foreground-location';
import { locationPort } from '@/lib/journey/location-port';
import { tripStore, type TripSession } from '@/lib/journey/trip-session';
import type { PublicJourney } from '@/types/journey';

export function useTripLocation(journey: PublicJourney, session: TripSession) {
  // TravelModeContent is keyed by journey ID; each mounted journey owns one controller.
  const [controller] = useState(() => createForegroundLocation(locationPort));
  const snapshot = useSyncExternalStore(controller.subscribe, controller.get, controller.get);
  useFocusEffect(useCallback(() => {
    const sync = () => controller.sync(tripStore.get(journey.id).status, AppState.currentState === 'active', true, AppState.currentState);
    sync();
    const app = AppState.addEventListener('change', sync);
    // Stop synchronously on Pause/Finish, before React's next render.
    const unsubscribe = tripStore.subscribe(sync);
    return () => { app.remove(); unsubscribe(); controller.sync(tripStore.get(journey.id).status, false, false); };
  }, [controller, journey.id]));
  return { ...snapshot,
    begin: () => controller.begin(() => tripStore.transition(journey, 'begin', session)),
    retry: () => controller.retry(),
  };
}
