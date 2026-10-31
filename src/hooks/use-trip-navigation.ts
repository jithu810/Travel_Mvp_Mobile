import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { createNavigation, destinationKey, navigationBlock, observeNavigation, requestRoadRoute } from '@/lib/journey/navigation';
import { tripDestination, tripStore, type TripSession } from '@/lib/journey/trip-session';
import type { createForegroundLocation } from '@/lib/journey/foreground-location';
import type { PublicJourney } from '@/types/journey';

export function useTripNavigation(journey: PublicJourney, session: TripSession, location: ReturnType<typeof createForegroundLocation>) {
  const [controller] = useState(() => createNavigation((origin, destination, signal) => requestRoadRoute(origin, destination, process.env.EXPO_PUBLIC_MAPBOX_TOKEN, signal)));
  const focused = useRef(false);
  const state = useSyncExternalStore(controller.subscribe, controller.get, controller.get);
  const destination = tripDestination(journey, session);
  const settingsOff = useCallback(() => { const now = location.get(); return now.status === 'unavailable' && now.reason === 'settings-declined'; }, [location]);
  const read = useCallback(() => {
    const current = tripStore.get(journey.id);
    return { status: current.status, session: current, foreground: AppState.currentState === 'active', focused: focused.current,
      position: location.get().position, destination: tripDestination(journey, current), settingsOff: settingsOff() };
  }, [journey, location, settingsOff]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    const cleanup = observeNavigation(controller, read, [tripStore, location], AppState);
    return () => { focused.current = false; cleanup(); };
  }, [controller, read, location]));
  // Guard current render as well as async callbacks; preview selection never changes destination.
  const block = navigationBlock({ status: session.status, focused: true, foreground: AppState.currentState === 'active', position: location.get().position, destination, settingsOff: settingsOff() });
  const sameActiveTrip = state.session === session && session.status === 'active' && AppState.currentState === 'active' && destinationKey(destination) === state.key;
  const visible = !block && sameActiveTrip;
  // Retain only this active controller's accepted route during GPS interruption.
  const retained = sameActiveTrip && state.gpsHeld && !!state.route && !state.routeOutdated;
  return { ...state, route: visible || retained ? state.route : null, remainingGeometry: visible || retained ? state.guidance?.remainingGeometry ?? state.route?.geometry : null, guidance: visible ? state.guidance : null, reroute: visible ? state.reroute : null,
    canRetry: visible && state.retryAvailable === true, message: block || state.message, destination,
    retry: () => controller.update(read(), true) };
}
