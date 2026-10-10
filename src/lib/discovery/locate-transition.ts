import type { locateCamera } from './camera';
import { worldCamera } from './map';

type Target = NonNullable<ReturnType<typeof locateCamera>>;
type Command = Target & { animationMode: 'easeTo' | 'flyTo'; animationDuration: number };
type Clock = { set: (callback: () => void, delay: number) => unknown; clear: (handle: unknown) => void };
export const worldExitDuration = 800;
export const worldPauseDuration = 200;
export const journeyEnterDuration = 1350;
export const cinematicLocateDuration = worldExitDuration + worldPauseDuration + journeyEnterDuration;
export function createLocateTransition(send: (command: Command) => void, clock: Clock = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}) {
  let timer: unknown = null, generation = 0;
  let destination: Target | null = null;
  let latestRequest: string | null = null, activeRequest: string | null = null;
  function clear() { generation++; if (timer !== null) clock.clear(timer); timer = null; }
  function cancel() { clear(); activeRequest = null; destination = null; }
  return {
    cancel,
    // Register the request before detail loading completes. A canceled request
    // cannot be revived by late data, a layout event, or returning to Home.
    select(request: string | null) {
      if (request === latestRequest) return;
      clear(); latestRequest = request; activeRequest = request; destination = null;
    },
    run(request: string, target: Target, viaWorld = true) {
      if (request !== activeRequest) return false;
      destination = target;
      // A panel refit while zooming out updates the eventual fitted target,
      // without skipping the world hold or restarting its timer.
      if (!viaWorld && timer !== null) return true;
      clear();
      if (!viaWorld) {
        send({ ...target, animationMode: 'flyTo', animationDuration: journeyEnterDuration });
        return true;
      }
      const version = generation;
      send({ ...worldCamera, padding: target.padding, animationMode: 'easeTo', animationDuration: worldExitDuration });
      timer = clock.set(() => {
        if (version !== generation || request !== activeRequest || !destination) return;
        timer = null;
        send({ ...destination, animationMode: 'flyTo', animationDuration: journeyEnterDuration });
      }, worldExitDuration + worldPauseDuration);
      return true;
    },
  };
}
