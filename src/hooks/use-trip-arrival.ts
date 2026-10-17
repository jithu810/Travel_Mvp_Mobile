import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { arrivalBlock, createArrival, observeArrival, type ArrivalPrompt } from '@/lib/journey/arrival';
import { destinationKey } from '@/lib/journey/navigation';
import { tripDestination, tripStore, type TripSession } from '@/lib/journey/trip-session';
import type { createForegroundLocation } from '@/lib/journey/foreground-location';
import type { PublicJourney } from '@/types/journey';

export function useTripArrival(journey: PublicJourney, session: TripSession, location: ReturnType<typeof createForegroundLocation>) {
  const [controller] = useState(() => createArrival());
  const focused = useRef(false);
  const state = useSyncExternalStore(controller.subscribe, controller.get, controller.get);
  const read = useCallback(() => {
    const snapshot = location.get(), current = tripStore.get(journey.id);
    return { status: current.status, focused: focused.current, foreground: AppState.currentState === 'active',
      destination: tripDestination(journey, current), position: snapshot.position, locationStatus: snapshot.status };
  }, [journey, location]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    const cleanup = observeArrival(controller, read, [tripStore, location], AppState);
    return () => { focused.current = false; cleanup(); };
  }, [controller, read, location]));
  const destination = tripDestination(journey, session), snapshot = location.get();
  // Blur clears the observable prompt synchronously; event handlers also recheck live focus.
  const prompt = state.prompt && state.prompt.key === destinationKey(destination) && !arrivalBlock({
    status: session.status, focused: true, foreground: AppState.currentState === 'active', destination,
    position: snapshot.position, locationStatus: snapshot.status,
  }) ? state.prompt : null;
  return { ...state, prompt,
    dismiss: (expected: ArrivalPrompt) => controller.dismiss(expected, read()),
    confirm: (expected: ArrivalPrompt) => {
      // Same atomic ordered action used by the manual confirmation dialog. Never capture a new session for an old prompt.
      if (tripStore.get(journey.id) !== session || !controller.canConfirm(expected, read())) return false;
      return tripStore.completeStop(journey.id, expected.stopId, session);
    },
  };
}
