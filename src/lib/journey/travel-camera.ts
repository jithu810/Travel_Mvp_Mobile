import type { Position } from './foreground-location';
import { navigationFix } from './navigation';
import type { TripStatus } from './trip-session';

export const NAVIGATION_ZOOM = 15.5;
export type TravelCameraCommand = {
  centerCoordinate: [number, number]; zoomLevel: number; heading: number; pitch: number;
  padding: { paddingTop: number; paddingBottom: number; paddingLeft: number; paddingRight: number };
  animationMode: 'easeTo'; animationDuration: number;
};
export type TravelCameraInput = {
  status: TripStatus; focused: boolean; foreground: boolean; ready: boolean;
  position: Position | null; locationStatus: string; reduceMotion: boolean;
  top: number; bottom: number;
};
export function cameraBlock(input: TravelCameraInput, now = Date.now()) {
  if (!input.focused || !input.foreground) return 'Location camera is unavailable while away';
  if (input.locationStatus === 'denied') return 'Location permission denied. Use Retry location or device settings';
  if (input.status !== 'active') return input.status === 'ready' ? 'Begin Trip to use My Location'
    : input.status === 'paused' ? 'Resume the trip to use My Location' : 'This trip has ended';
  if (!navigationFix(input.position, now)) return 'Waiting for accurate GPS: accuracy ≤50 m and age ≤15 seconds required';
  if (!input.ready) return 'Road map is still loading or unavailable';
  return '';
}

// Camera intent only: never requests permission, starts GPS or changes the trip.
export function createTravelCamera(move: (command: TravelCameraCommand) => void, cancel: () => void, now = Date.now) {
  let state = { following: true, message: '' };
  const listeners = new Set<() => void>();
  let lastKey = '', eligible = false, lastStatus: TripStatus | undefined;
  const publish = (following: boolean, message: string) => {
    if (state.following === following && state.message === message) return;
    state = { following, message }; listeners.forEach(listener => listener());
  };
  const stop = (force = true) => { if (eligible || force) cancel(); eligible = false; lastKey = ''; };
  const update = (input: TravelCameraInput, recenter = false) => {
    if ((input.status === 'ready' && lastStatus !== 'ready') || (input.status === 'active' && lastStatus === 'ready')) publish(true, '');
    lastStatus = input.status;
    const block = cameraBlock(input, now());
    if (block) { stop(false); if (recenter || state.message) publish(state.following, block); return false; }
    eligible = true;
    if (recenter) publish(true, 'Following your location');
    if (!state.following) return false;
    const position = input.position!;
    // Stationary fixes do not continually restart animations. Padding changes keep the dot above the sheet.
    const key = JSON.stringify([position.longitude, position.latitude, input.top, input.bottom, input.reduceMotion]);
    if (!recenter && key === lastKey) return true;
    lastKey = key;
    move({ centerCoordinate: [position.longitude, Math.max(-85.0511287798066, Math.min(85.0511287798066, position.latitude))],
      zoomLevel: NAVIGATION_ZOOM, heading: 0, pitch: 0,
      padding: { paddingTop: input.top, paddingBottom: input.bottom, paddingLeft: 28, paddingRight: 28 },
      animationMode: 'easeTo', animationDuration: input.reduceMotion ? 0 : 450 });
    publish(true, 'Following your location');
    return true;
  };
  return { get: () => state, update, stop,
    explore() { lastKey = ''; publish(false, 'Map exploration · Tap My Location to follow'); },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
