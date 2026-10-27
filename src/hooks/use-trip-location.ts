import { useCallback, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState, Platform } from 'react-native';
import { createForegroundLocation } from '@/lib/journey/foreground-location';
import { locationPort } from '@/lib/journey/location-port';
import { tripStore, type TripSession } from '@/lib/journey/trip-session';
import type { PublicJourney } from '@/types/journey';
import { useBuddyCelebration } from '@/hooks/use-journey-buddy';

export function useTripLocation(journey: PublicJourney, session: TripSession) {
  const celebrate = useBuddyCelebration();
  // TravelModeContent is keyed by journey ID; each mounted journey owns one controller.
  const [controller] = useState(() => createForegroundLocation(locationPort));
  const snapshot = useSyncExternalStore(controller.subscribe, controller.get, controller.get);
  useFocusEffect(useCallback(() => {
    let wasReadyInForeground = false;
    const sync = () => {
      const status = tripStore.get(journey.id).status;
      const active = AppState.currentState === 'active';
      controller.sync(status, active, true, AppState.currentState, tripStore.get(journey.id).journey);
      const readyInForeground = status === 'ready' && active;
      if (Platform.OS !== 'web' && readyInForeground && !wasReadyInForeground) void controller.prepare();
      wasReadyInForeground = readyInForeground;
    };
    sync();
    const app = AppState.addEventListener('change', sync);
    // Stop synchronously on Pause/Finish, before React's next render.
    const unsubscribe = tripStore.subscribe(sync);
    return () => { app.remove(); unsubscribe(); controller.sync(tripStore.get(journey.id).status, false, false); };
  }, [controller, journey.id]));
  return { ...snapshot, source: controller,
    begin: () => controller.begin(() => {
      const accepted = tripStore.transition(journey, 'begin', session);
      if (accepted) celebrate('run', tripStore.get(journey.id));
      return accepted;
    }),
    retry: () => controller.retry(),
  };
}
