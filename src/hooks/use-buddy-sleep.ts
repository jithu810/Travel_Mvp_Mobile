import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import type { useBuddyApi } from './use-journey-buddy';

type Api = NonNullable<ReturnType<typeof useBuddyApi>>;
export const BUDDY_SLEEP_DELAY = 60000;
// A single inactivity clock. Artwork/roaming renders never renew this deadline.
export function createBuddySleepClock(canSleep: () => boolean, timers = { setTimeout, clearTimeout }) {
  let sleeping = false, eligible = false, interacting = false, disposed = false, generation = 0;
  let pendingWake = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const setSleeping = (value: boolean) => { if (sleeping !== value) { sleeping = value; listeners.forEach(fn => fn()); } };
  const cancel = () => { generation++; timers.clearTimeout(timer); timer = undefined; };
  const schedule = () => {
    cancel();
    if (disposed || !eligible || interacting || sleeping) return;
    const epoch = generation;
    timer = timers.setTimeout(() => {
      timer = undefined;
      if (!disposed && epoch === generation && eligible && !interacting && canSleep()) setSleeping(true);
    }, BUDDY_SLEEP_DELAY);
  };
  return {
    get: () => sleeping,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    configure(nextEligible: boolean, nextInteracting: boolean) {
      if (disposed || (nextEligible === eligible && nextInteracting === interacting)) return;
      if (nextInteracting && !interacting && sleeping) pendingWake = true;
      if (!nextInteracting) pendingWake = false;
      eligible = nextEligible; interacting = nextInteracting;
      setSleeping(false); schedule();
    },
    wake() {
      const wasSleeping = sleeping || pendingWake;
      pendingWake = false; setSleeping(false); schedule();
      return wasSleeping;
    },
    resume() { disposed = false; },
    dispose() { disposed = true; cancel(); eligible = false; interacting = false; pendingWake = false; sleeping = false; },
  };
}

export function useBuddySleep(api: Api, path: string, blocked: boolean, interacting: boolean) {
  const [clock] = useState(() => createBuddySleepClock(() => {
    const current = api.store.current();
    return AppState.currentState === 'active' && api.preference.get().enabled && api.store.get().path === path
      && !current.suppressed && !current.interacting && !current.state?.travel && !path.startsWith('/travel/')
      && !api.store.getCelebration() && !api.store.getMapHelp() && api.store.getTour() === null;
  }));
  const asleep = useSyncExternalStore(clock.subscribe, clock.get, clock.get);
  useEffect(() => { clock.resume(); return () => clock.dispose(); }, [clock]);
  useEffect(() => {
    const configure = () => clock.configure(!blocked && !path.startsWith('/travel/') && AppState.currentState === 'active', interacting);
    configure();
    const listener = AppState.addEventListener('change', configure);
    return () => listener.remove();
  }, [clock, blocked, interacting, path]);
  return { asleep, wake: clock.wake };
}
