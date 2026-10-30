import type { Position } from './foreground-location';
import type { JourneyStop } from '../../types/journey';
import type { TripStatus } from './trip-session';
import { createGuidance, geographicDistance, parseRouteSteps, type Guidance, type RouteStep } from './turn-guidance';
import { createOffRoute, distanceFromRoad, type OffRoutePolicy } from './off-route';

export const MAX_NAVIGATION_AGE_MS = 15_000;
export const MAX_NAVIGATION_ACCURACY_METERS = 50;
export const ROUTE_TIMEOUT_MS = 15_000;
export const ROUTE_RETRY_MS = 5_000;
export type RoadGeometry = { type: 'LineString'; coordinates: [number, number][] };
export type RoadRoute = { geometry: RoadGeometry; distance: number; duration: number | null; steps?: RouteStep[] | null };
export type Destination = Pick<JourneyStop, 'id' | 'name' | 'latitude' | 'longitude'>;
type Point = { latitude: number; longitude: number };
export type NavigationInput = { status: TripStatus; foreground: boolean; focused: boolean; position: Position | null; destination: Destination | undefined; session?: object; settingsOff?: boolean };
export type RerouteState = { phase: 'confirming' | 'cooldown' | 'loading' | 'failed'; message: string; retryAt?: number };
export type NavigationState = { session?: object; key: string; status: 'idle' | 'loading' | 'ready' | 'error'; message: string; route: RoadRoute | null; guidance?: Guidance | null; routeOutdated?: boolean; reroute?: RerouteState | null; retryAvailable?: boolean; gpsHeld?: boolean };
export function coordinates(point: { latitude: unknown; longitude: unknown } | null | undefined): point is Point {
  return !!point && typeof point.latitude === 'number' && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && typeof point.longitude === 'number' && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}
export function navigationFix(position: Position | null, now = Date.now()): position is Position & { accuracy: number } {
  return coordinates(position) && Number.isFinite(position.timestamp) && position.timestamp <= now && now - position.timestamp <= MAX_NAVIGATION_AGE_MS
    && typeof position.accuracy === 'number' && Number.isFinite(position.accuracy) && position.accuracy >= 0 && position.accuracy <= MAX_NAVIGATION_ACCURACY_METERS;
}
// Initial destination before a session begins. Active destinations come from the trip store.
export function firstNavigationStop(stops: readonly JourneyStop[]) { return [...stops].sort((a, b) => a.sequence - b.sequence)[0]; }
export function destinationKey(destination: Destination | undefined) {
  return destination && coordinates(destination) ? JSON.stringify([destination.id, destination.longitude, destination.latitude]) : '';
}
export function navigationBlock(input: NavigationInput, now = Date.now()) {
  if (!input.focused || !input.foreground) return 'Navigation stopped while away';
  if (input.status !== 'active') return input.status === 'paused' ? 'Navigation paused' : input.status === 'finished' || input.status === 'completed' ? 'Navigation stopped' : 'Begin Trip to calculate a driving route';
  if (!destinationKey(input.destination)) return 'Route unavailable: destination stop has no valid map coordinates';
  // Nothing reconnects by itself after a Location Accuracy decline, so never promise automatic recovery.
  if (input.settingsOff) return 'Location Accuracy is off · Guidance is paused until you turn it on';
  if (!navigationFix(input.position, now)) return 'GPS signal weak or delayed · Guidance resumes automatically when GPS recovers';
  return '';
}
export class RoutingError extends Error {}
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function parseRoadRoute(value: unknown): RoadRoute {
  const body = record(value);
  if (body.code === 'NoRoute' || body.code === 'NoSegment') throw new RoutingError('No driving route found to this stop');
  const route = record(Array.isArray(body.routes) ? body.routes[0] : null), geometry = record(route.geometry);
  if (body.code !== 'Ok' || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)
    || geometry.coordinates.length < 2 || geometry.coordinates.length > 100_000
    || !geometry.coordinates.every(p => Array.isArray(p) && p.length === 2 && coordinates({ longitude: p[0], latitude: p[1] }))
    || !nonnegative(route.distance) || (route.duration != null && !nonnegative(route.duration)))
    throw new RoutingError('Mapbox returned an invalid route response');
  const routeCoordinates = geometry.coordinates as [number, number][];
  let steps = parseRouteSteps(route.legs, routeCoordinates);
  if (steps && Math.abs(steps.reduce((sum, step) => sum + step.distance, 0) - route.distance) > Math.max(10, route.distance * 0.02)) steps = null;
  return { geometry: { type: 'LineString', coordinates: routeCoordinates }, distance: route.distance, duration: route.duration == null ? null : route.duration as number,
    steps };
}
export async function requestRoadRoute(origin: Point, destination: Point, token: string | undefined, signal: AbortSignal, transport: typeof fetch = fetch): Promise<RoadRoute> {
  if (!coordinates(origin) || !coordinates(destination)) throw new RoutingError('Route coordinates are unavailable');
  if (!token?.trim().startsWith('pk.')) throw new RoutingError('Driving route unavailable: Mapbox public token is not configured');
  // Form encoding works with native fetch; coordinates are never put in URLs or logs.
  const body = 'coordinates=' + encodeURIComponent(origin.longitude + ',' + origin.latitude + ';' + destination.longitude + ',' + destination.latitude)
    + '&geometries=geojson&overview=full&steps=true&alternatives=false&language=en';
  let response: Response;
  try {
    response = await transport('https://api.mapbox.com/directions/v5/mapbox/driving?access_token=' + encodeURIComponent(token.trim()), {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal,
    });
  } catch { throw new RoutingError('Network unavailable for driving route. Retry when connected'); }
  if (!response.ok) throw new RoutingError(response.status === 401 || response.status === 403 ? 'Mapbox token or access restrictions need attention'
    : response.status === 429 ? 'Mapbox request limit reached. Wait before retrying' : 'Mapbox routing is temporarily unavailable');
  try { return parseRoadRoute(await response.json()); }
  catch (error) { throw error instanceof RoutingError ? error : new RoutingError('Mapbox returned an invalid route response'); }
}
export function routeSummary(route: RoadRoute) {
  const distance = route.distance < 1000 ? Math.round(route.distance) + ' m' : (route.distance / 1000).toFixed(1) + ' km';
  return distance + (route.duration === null ? '' : ' · ~' + Math.max(1, Math.round(route.duration / 60)) + ' min drive');
}
type Timers = { set: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>; clear: (id: ReturnType<typeof setTimeout>) => void };
type Loader = (origin: Position, destination: Destination & Point, signal: AbortSignal) => Promise<RoadRoute>;
export function createNavigation(load: Loader, now = Date.now, timers: Timers = { set: (fn, ms) => setTimeout(fn, ms), clear: id => clearTimeout(id) }, options: Partial<OffRoutePolicy> = {}) {
  const progress = createGuidance(navigationFix, now);
  const deviation = createOffRoute(navigationFix, now, options), policy = deviation.policy;
  let state: NavigationState = { key: '', status: 'idle', message: 'Begin Trip to calculate a driving route', route: null };
  const listeners = new Set<() => void>();
  let input: NavigationInput | undefined, generation = 0, pending: AbortController | undefined, timeout: ReturnType<typeof setTimeout> | undefined;
  let attemptedAt = -Infinity, reroutedAt = -Infinity, referenceExpiresAt = 0;
  let currentSession: object | undefined, pendingReference: RoadRoute | null = null;
  let previousFix: Position | null = null, progressReplacement = false;
  const publish = (next: NavigationState) => {
    next = { ...next, session: currentSession, retryAvailable: next.status === 'error' && now() - attemptedAt >= ROUTE_RETRY_MS && now() >= (next.reroute?.retryAt ?? 0) };
    if (!next.route) { next = { ...next, guidance: null }; progress.reset(); }
    const a = state.guidance, b = next.guidance;
    if (state.session === next.session && state.key === next.key && state.status === next.status && state.message === next.message && state.route === next.route
      && a?.status === b?.status && a?.message === b?.message && a?.confirmingTurn === b?.confirmingTurn && a?.maneuver === b?.maneuver
      && a?.maneuverIndex === b?.maneuverIndex && a?.distanceToManeuver === b?.distanceToManeuver && a?.remainingDistance === b?.remainingDistance
      && !!state.routeOutdated === !!next.routeOutdated && state.reroute?.phase === next.reroute?.phase
      && state.reroute?.message === next.reroute?.message && state.reroute?.retryAt === next.reroute?.retryAt && state.retryAvailable === next.retryAvailable && state.gpsHeld === next.gpsHeld) return;
    state = next; listeners.forEach(listener => listener());
  };
  const cancel = () => { generation++; pending?.abort(); pending = undefined; pendingReference = null; if (timeout !== undefined) timers.clear(timeout); timeout = undefined; };
  const clear = () => { progressReplacement = false; cancel(); deviation.reset(); previousFix = null; referenceExpiresAt = 0; };
  const stop = () => { clear(); input = undefined; currentSession = undefined; publish({ key: '', status: 'idle', message: 'Navigation stopped while away', route: null }); };
  const backOnRoute = (route: RoadRoute, position: Position) => distanceFromRoad(position, route) + position.accuracy! <= policy.deviationMeters;
  const recover = (route: RoadRoute, next: NavigationInput) => {
    cancel(); deviation.reset(); referenceExpiresAt = 0;
    publish({ key: destinationKey(next.destination), status: 'ready', message: 'Back on the previous driving route', route, guidance: progress.update(route, next.position) });
  };
  const update = (next: NavigationInput, retry = false) => {
    input = next;
    const key = destinationKey(next.destination), block = navigationBlock(next, now());
    if (block) {
      if (next.status === 'active' && next.focused && next.foreground && key && key === state.key && currentSession === next.session) {
        // Retain accepted progress through poor GPS, but hide geometry/instructions until eligible again.
        const interrupted = !!pending;
        cancel(); deviation.reset(); previousFix = null;
        const guidance = state.route ? progress.update(state.route, null) : null;
        publish({ ...state, gpsHeld: true, guidance: state.routeOutdated ? null : guidance, route: state.routeOutdated ? null : state.route,
          status: interrupted ? (state.routeOutdated ? 'error' : state.route ? 'ready' : 'idle') : state.status,
          message: interrupted && state.routeOutdated ? 'Reroute interrupted by GPS loss. Retry route when GPS recovers.' : state.message });
        return;
      }
      clear(); currentSession = next.session; publish({ key, status: 'idle', message: block, route: null }); return;
    }
    if (state.gpsHeld) publish({ ...state, gpsHeld: false });
    if (state.key !== key || currentSession !== next.session) { clear(); currentSession = next.session; publish({ key, status: 'idle', message: '', route: null }); }
    // Recovery must also be a new, plausible fix: one GPS teleport must not cancel a reroute.
    const position = next.position!, gap = previousFix ? position.timestamp - previousFix.timestamp : 0;
    const recoveryReliable = !!previousFix && gap > 0 && gap <= policy.maxReadingGapMs
      && geographicDistance([previousFix.longitude, previousFix.latitude], [position.longitude, position.latitude]) <= policy.maxSpeedMps * gap / 1000 + policy.jumpAllowanceMeters;
    if (!previousFix || position.timestamp > previousFix.timestamp) previousFix = position;
    if (state.routeOutdated && state.route && now() >= referenceExpiresAt) {
      publish({ ...state, route: null, guidance: null, message: state.message.replace('Previous route may be outdated', 'Previous route hidden'),
        reroute: state.reroute ? { ...state.reroute, message: state.reroute.message.replace('Previous route may be outdated', 'Previous route hidden') } : null });
    }
    if (pending) {
      if (!progressReplacement && recoveryReliable && pendingReference && now() < referenceExpiresAt && backOnRoute(pendingReference, position)) recover(pendingReference, next);
      return;
    }
    let replacement = !!state.routeOutdated;
    if (state.status === 'ready' && state.route) {
      const evidence = deviation.update(state.route, next.position);
      const guidance = progress.update(state.route, next.position);
      if (evidence.status !== 'confirmed' && !guidance.recoveryRequested) {
        publish({ ...state, guidance, reroute: evidence.status === 'confirming' ? { phase: 'confirming', message: evidence.message } : null }); return;
      }
      progressReplacement = evidence.status !== 'confirmed' && guidance.recoveryRequested === true;
      replacement = true;
    }
    if (state.status === 'error' && !retry) {
      if (!progressReplacement && recoveryReliable && state.routeOutdated && state.route && backOnRoute(state.route, position)) { recover(state.route, next); return; }
      if (state.reroute) {
        const seconds = Math.max(0, Math.ceil((reroutedAt + policy.cooldownMs - now()) / 1000));
        publish({ ...state, reroute: { phase: 'failed', retryAt: reroutedAt + policy.cooldownMs,
          message: state.message + (seconds ? ' Retry in ' + seconds + ' s.' : ' Retry route when ready.') } });
      } else publish({ ...state });
      return;
    }
    if (replacement && now() - reroutedAt < policy.cooldownMs) {
      const seconds = Math.ceil((reroutedAt + policy.cooldownMs - now()) / 1000);
      publish({ ...state, guidance: null, reroute: { phase: state.status === 'error' ? 'failed' : 'cooldown', retryAt: reroutedAt + policy.cooldownMs,
        message: 'Reroute cooldown · Retry in ' + seconds + ' s' + (state.routeOutdated ? ' · Previous route may be outdated' : '') } }); return;
    }
    if (now() - attemptedAt < ROUTE_RETRY_MS) { publish({ ...state, message: 'Wait a few seconds before requesting another route' }); return; }
    const reference = replacement ? state.route : null, session = next.session;
    if (replacement) { reroutedAt = now(); if (!state.routeOutdated) referenceExpiresAt = now() + policy.referenceTtlMs; }
    cancel(); deviation.reset(); const version = generation, controller = new AbortController(); pending = controller; pendingReference = reference; attemptedAt = now();
    const fail = (message: string) => {
      if (!input || navigationBlock(input, now()) || destinationKey(input.destination) !== key || input.session !== session) { if (input) update(input); else stop(); return; }
      const retained = reference && now() < referenceExpiresAt ? reference : null;
      const body = replacement ? 'Reroute failed: ' + message + (retained ? ' · Previous route may be outdated' : ' · Previous route unavailable') : message;
      publish({ key, status: 'error', message: body, route: retained, guidance: null, routeOutdated: replacement,
        reroute: replacement ? { phase: 'failed', message: body, retryAt: reroutedAt + policy.cooldownMs } : null });
    };
    publish({ key, status: 'loading', message: replacement ? 'Recalculating driving route… · Previous route may be outdated' : 'Calculating driving route…',
      route: reference && now() < referenceExpiresAt ? reference : null, guidance: null, routeOutdated: replacement,
      reroute: replacement ? { phase: 'loading', message: 'Recalculating route · Previous route may be outdated' } : null });
    timeout = timers.set(() => {
      if (version !== generation) return;
      cancel(); fail('Driving route timed out. Retry route');
    }, ROUTE_TIMEOUT_MS);
    // Promise boundary also handles synchronous adapter errors.
    void Promise.resolve().then(() => {
      if (version !== generation) return null;
      return load(next.position!, next.destination as Destination & Point, controller.signal);
    }).then(route => {
      if (!route || version !== generation) return;
      if (!input || navigationBlock(input, now()) || destinationKey(input.destination) !== key || input.session !== session) { update(input ?? next); return; }
      if (route.geometry?.type !== 'LineString' || !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2 || route.geometry.coordinates.length > 100000
        || !route.geometry.coordinates.every(p => Array.isArray(p) && p.length === 2 && coordinates({ longitude: p[0], latitude: p[1] }))
        || !nonnegative(route.distance) || (route.duration != null && !nonnegative(route.duration))) throw new RoutingError('Mapbox returned an invalid route response');
      if (distanceFromRoad(input.position!, route) - input.position!.accuracy! > policy.deviationMeters)
        throw new RoutingError((replacement ? 'Replacement route' : 'Driving route') + ' does not match current GPS. Retry when position is stable');
      progressReplacement = false; progress.reset(); deviation.reset(); referenceExpiresAt = 0;
      publish({ key, status: 'ready', message: replacement ? 'Driving route updated' : 'Driving route · last calculation', route, guidance: progress.update(route, input.position), reroute: null });
    }).catch(error => {
      if (version === generation) fail(error instanceof RoutingError ? error.message : 'Network error calculating driving route');
    }).finally(() => {
      if (version !== generation) return;
      if (timeout !== undefined) timers.clear(timeout); timeout = undefined; pending = undefined; pendingReference = null;
    });
  };
  return { get: () => state, subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }, update, stop };
}

// Called only while the Travel screen is focused. Subscriptions invalidate requests synchronously.
export function observeNavigation(controller: ReturnType<typeof createNavigation>, read: () => NavigationInput,
  sources: { subscribe: (listener: () => void) => () => void }[],
  app: { addEventListener: (event: 'change', listener: () => void) => { remove: () => void } },
  clock: { set: (fn: () => void, ms: number) => ReturnType<typeof setInterval>; clear: (id: ReturnType<typeof setInterval>) => void } = { set: (fn, ms) => setInterval(fn, ms), clear: id => clearInterval(id) }) {
  let disposed = false;
  const sync = () => { if (!disposed) controller.update(read()); };
  const cleanups = sources.map(source => source.subscribe(sync));
  const subscription = app.addEventListener('change', sync), tick = clock.set(sync, 1000);
  sync();
  return () => { disposed = true; cleanups.forEach(cleanup => cleanup()); subscription.remove(); clock.clear(tick); controller.stop(); };
}
