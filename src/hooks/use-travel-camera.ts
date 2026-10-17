import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { createTravelCamera, type TravelCameraCommand } from '@/lib/journey/travel-camera';
import { tripStore } from '@/lib/journey/trip-session';
import type { createForegroundLocation } from '@/lib/journey/foreground-location';

export type TravelCameraSource = { journeyId: string; location: ReturnType<typeof createForegroundLocation> };
export function useTravelCamera(source: TravelCameraSource | undefined, move: (command: TravelCameraCommand) => void, cancel: () => void,
  options: { ready: boolean; reduceMotion: boolean; top: number; bottom: number }) {
  const [controller] = useState(() => createTravelCamera(move, cancel));
  const journeyId = source?.journeyId, location = source?.location;
  const { ready, reduceMotion, top, bottom } = options;
  const focused = useRef(false);
  const latest = useRef(options);
  const state = useSyncExternalStore(controller.subscribe, controller.get, controller.get);
  const read = useCallback(() => ({ ...latest.current,
    status: journeyId ? tripStore.get(journeyId).status : 'ready' as const,
    focused: focused.current, foreground: AppState.currentState === 'active',
    position: location?.get().position ?? null, locationStatus: location?.get().status ?? 'unavailable',
  }), [journeyId, location]);
  const sync = useCallback(() => { if (journeyId) controller.update(read()); }, [controller, read, journeyId]);
  useEffect(() => { latest.current = { ready, reduceMotion, top, bottom }; sync(); }, [ready, reduceMotion, top, bottom, sync]);
  useFocusEffect(useCallback(() => {
    if (!journeyId || !location) return;
    focused.current = true;
    let disposed = false;
    const update = () => { if (!disposed) controller.update(read()); };
    const unsubscribeTrip = tripStore.subscribe(update), unsubscribeLocation = location.subscribe(update);
    const app = AppState.addEventListener('change', update);
    const tick = setInterval(update, 1000); // Invalidates a fix at 15 seconds even if no GPS callback arrives.
    update();
    return () => {
      disposed = true; focused.current = false;
      unsubscribeTrip(); unsubscribeLocation(); app.remove(); clearInterval(tick); controller.stop();
    };
  }, [controller, read, journeyId, location]));
  const canMove = useCallback(() => focused.current && AppState.currentState === 'active', []);
  return { ...state, recenter: () => { const moved = controller.update(read(), true); return { moved, message: controller.get().message }; }, explore: controller.explore, canMove };
}
