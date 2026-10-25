import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, usePathname } from 'expo-router';
import { AppState } from 'react-native';
import { useBuddyApi } from './use-journey-buddy';
import type { BuddyRect } from '@/lib/buddy/model';

type MapProjection = { getPointInView(coordinate: number[]): Promise<number[]> };
type Projection = { key: string; epoch: number; bounds: BuddyRect; measurement: number; owner: object };
type PinCache = { key: string; rects: readonly BuddyRect[] };

// Ignore SDK notifications whose camera is visually unchanged. These values stay in memory only.
export function buddyCameraPoseKey(input: unknown): string | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>, center = value.center;
  if (!Array.isArray(center) || center.length < 2 || !Number.isFinite(center[0]) || !Number.isFinite(center[1]) || typeof value.zoom !== 'number' || !Number.isFinite(value.zoom)) return null;
  const heading = typeof value.heading === 'number' ? value.heading : typeof value.bearing === 'number' ? value.bearing : 0;
  const pitch = typeof value.pitch === 'number' ? value.pitch : 0;
  if (!Number.isFinite(heading) || !Number.isFinite(pitch)) return null;
  return JSON.stringify([Math.round(center[0] * 1e10), Math.round(center[1] * 1e10), Math.round(value.zoom * 1e6), Math.round(((heading % 360 + 360) % 360) * 1e5) % 36000000, Math.round(pitch * 1e5)]);
}
export function equivalentBuddyCameraPose(first: string | null, second: string | null): boolean {
  if (first === second) return true;
  if (!first || !second) return false;
  const a = JSON.parse(first) as number[], b = JSON.parse(second) as number[];
  if (Math.abs(a[2] - b[2]) > 100 || Math.min(Math.abs(a[3] - b[3]), 36000000 - Math.abs(a[3] - b[3])) > 1000 || Math.abs(a[4] - b[4]) > 1000) return false;
  const latitudeA = a[1] / 1e10, latitudeB = b[1] / 1e10;
  if (Math.abs(latitudeA) > 85 || Math.abs(latitudeB) > 85) return a[0] === b[0] && a[1] === b[1];
  const world = 512 * 2 ** (Math.max(a[2], b[2]) / 1e6);
  const longitude = Math.abs(a[0] - b[0]) / 1e10 % 360;
  const mercator = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360)) / (2 * Math.PI);
  return Math.min(longitude, 360 - longitude) / 360 * world <= 0.25 && Math.abs(mercator(latitudeA) - mercator(latitudeB)) * world <= 0.25;
}

// Project only current itinerary pins after movement settles. Android's native bridge returns dp;
// iOS returns CGPoint points. Cache map-relative rectangles so ancestor movement needs no new native query.
export function useBuddyMapPins(coordinates: readonly (readonly number[])[], ready: boolean) {
  const api = useBuddyApi(), path = usePathname(), owner = useRef({}), focused = useRef(false), generation = useRef(0);
  const map = useRef<MapProjection | null>(null), mapVersion = useRef(0), frame = useRef<BuddyRect | null>(null);
  const phase = useRef<'idle' | 'moving' | 'projecting'>('idle'), pose = useRef<string | null>(null), unknownPose = useRef(0);
  const key = JSON.stringify(coordinates), config = useRef({ coordinates, key, ready });
  const active = useRef<Projection | null>(null), cache = useRef<PinCache | null>(null), failure = useRef<{ key: string; until: number } | null>(null);
  const waiting = useRef<{ key: string; epoch: number } | null>(null), waitingTimedOut = useRef<string | null>(null), detached = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), quiet = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), deadline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearMoving = useCallback(() => { clearTimeout(quiet.current); clearTimeout(deadline.current); quiet.current = undefined; deadline.current = undefined; }, []);
  const clearProjection = useCallback(() => { generation.current++; active.current = null; waiting.current = null; clearTimeout(timeout.current); timeout.current = undefined; }, []);

  const project = useCallback(() => {
    if (!api || !focused.current || api.store.get().path !== path || !api.preference.get().enabled || AppState.currentState !== 'active') return;
    const token = owner.current, bounds = frame.current, target = map.current, measurement = api.store.get().measurement;
    clearMoving();
    const publish = (rects: readonly BuddyRect[]) => { api.store.protect(token, path, rects, measurement); api.store.geometryMotion(token, path, false); };
    if (!target || !bounds) {
      const waitingKey = JSON.stringify([mapVersion.current, config.current.key]);
      if (detached.current || !config.current.coordinates.length || bounds || (!target && waitingTimedOut.current === waitingKey)) {
        clearProjection(); phase.current = 'idle'; publish(!detached.current && config.current.coordinates.length && bounds ? [bounds] : []); return;
      }
      api.store.protect(token, path, null, measurement); api.store.geometryMotion(token, path, false);
      if (waiting.current?.key === waitingKey || waitingTimedOut.current === waitingKey) return;
      clearProjection(); phase.current = 'idle'; waiting.current = { key: waitingKey, epoch: generation.current };
      const epoch = generation.current;
      timeout.current = setTimeout(() => {
        if (!focused.current || epoch !== generation.current || api.store.get().path !== path) return;
        waiting.current = null; waitingTimedOut.current = waitingKey; timeout.current = undefined;
        api.store.protect(token, path, frame.current ? [frame.current] : map.current ? null : [], api.store.get().measurement);
      }, 1500);
      return;
    }
    waitingTimedOut.current = null;
    if (!config.current.coordinates.length) { clearProjection(); cache.current = null; phase.current = 'idle'; publish([]); return; }
    if (!config.current.ready) { clearProjection(); cache.current = null; phase.current = 'idle'; publish([bounds]); return; }
    const signature = JSON.stringify([mapVersion.current, config.current.key, bounds.width, bounds.height, pose.current ?? ['unknown', unknownPose.current]]);
    const valid = cache.current;
    if (valid?.key === signature) {
      if (active.current) clearProjection();
      phase.current = 'idle'; publish(valid.rects.map(rect => ({ ...rect, x: bounds.x + rect.x, y: bounds.y + rect.y })));
      return;
    }
    if (active.current?.key === signature && phase.current === 'projecting') {
      // Native idle/measure events can repeat while one query is in flight. Retarget its publication only.
      active.current.bounds = bounds; active.current.measurement = measurement;
      return;
    }
    if (failure.current?.key === signature && Date.now() < failure.current.until) { clearProjection(); phase.current = 'idle'; publish([bounds]); return; }
    clearProjection();
    const request: Projection = { key: signature, epoch: generation.current, bounds, measurement, owner: token };
    active.current = request; phase.current = 'projecting'; api.store.geometryMotion(token, path, true);
    const finish = (relative: readonly BuddyRect[] | null) => {
      if (!focused.current || active.current !== request || request.epoch !== generation.current || api.store.get().path !== path) return;
      clearTimeout(timeout.current); timeout.current = undefined; active.current = null; phase.current = 'idle';
      if (relative) { cache.current = { key: signature, rects: relative }; failure.current = null; }
      else failure.current = { key: signature, until: Date.now() + 2000 };
      const currentBounds = request.bounds;
      api.store.protect(request.owner, path, relative ? relative.map(rect => ({ ...rect, x: currentBounds.x + rect.x, y: currentBounds.y + rect.y })) : [currentBounds], request.measurement);
      api.store.geometryMotion(request.owner, path, false);
    };
    timeout.current = setTimeout(() => finish(null), 2000);
    const points = config.current.coordinates.slice(0, 100);
    Promise.resolve().then(() => Promise.all(points.map(coordinate => target.getPointInView([...coordinate])))).then(projected => {
      if (projected.some(point => !Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1]))) { finish(null); return; }
      finish(projected.filter(([x, y]) => x >= -32 && x <= bounds.width + 32 && y >= -32 && y <= bounds.height + 32).map(([x, y]) => ({ x: x - 32, y: y - 32, width: 64, height: 64 })));
    }, () => finish(null));
  }, [api, path, clearMoving, clearProjection]);

  useEffect(() => {
    config.current = { coordinates: JSON.parse(key) as number[][], key, ready };
    if (phase.current !== 'moving') project();
  }, [key, ready, project]);
  useFocusEffect(useCallback(() => {
    focused.current = true; clearProjection();
    const token = {}; owner.current = token;
    const stop = api?.store.onMeasure(() => { if (phase.current !== 'moving') project(); }); project();
    const cancel = () => { clearProjection(); clearMoving(); cache.current = null; failure.current = null; waitingTimedOut.current = null; phase.current = 'idle'; api?.store.geometryMotion(token, path, false); };
    const app = AppState.addEventListener('change', state => { if (state !== 'active') cancel(); else project(); });
    const preference = api?.preference.subscribe(() => { if (!api.preference.get().enabled) cancel(); });
    return () => { focused.current = false; cancel(); app.remove(); stop?.(); preference?.(); api?.store.removeProtection(token); };
  }, [api, path, project, clearProjection, clearMoving]));
  const mapRef = useCallback((node: MapProjection | null) => {
    if (map.current === node) return;
    map.current = node; detached.current = !node; mapVersion.current++; clearProjection(); clearMoving(); cache.current = null; failure.current = null; waitingTimedOut.current = null; pose.current = null; phase.current = 'idle';
    if (!node) { api?.store.protect(owner.current, path, []); api?.store.geometryMotion(owner.current, path, false); }
    else project();
  }, [api, path, project, clearProjection, clearMoving]);
  const setFrame = useCallback((rect: BuddyRect) => {
    if (JSON.stringify(frame.current) === JSON.stringify(rect)) return;
    frame.current = rect;
    if (phase.current !== 'moving') project();
  }, [project]);
  const cameraChanged = useCallback((properties?: unknown) => {
    if (!focused.current || api?.store.get().path !== path || !api.preference.get().enabled || AppState.currentState !== 'active' || !config.current.coordinates.length) return;
    const next = buddyCameraPoseKey(properties);
    if (next !== null && equivalentBuddyCameraPose(next, pose.current)) return;
    if (next !== null) pose.current = next;
    else { pose.current = null; cache.current = null; failure.current = null; }
    clearTimeout(quiet.current);
    if (phase.current !== 'moving') {
      if (next === null) unknownPose.current++;
      clearProjection(); phase.current = 'moving'; api.store.geometryMotion(owner.current, path, true);
      const epoch = generation.current, token = owner.current;
      deadline.current = setTimeout(() => {
        if (!focused.current || epoch !== generation.current || api.store.get().path !== path) return;
        clearProjection(); clearMoving(); phase.current = 'idle';
        api.store.protect(token, path, frame.current ? [frame.current] : map.current ? null : []); api.store.geometryMotion(token, path, false);
      }, 1500);
    }
    const epoch = generation.current;
    quiet.current = setTimeout(() => { if (focused.current && epoch === generation.current && phase.current === 'moving') project(); }, 250);
  }, [api, path, project, clearProjection, clearMoving]);
  const idle = useCallback((properties?: unknown) => {
    const next = buddyCameraPoseKey(properties);
    if (next !== null && !equivalentBuddyCameraPose(next, pose.current)) pose.current = next;
    project();
  }, [project]);
  return { mapRef, setFrame, cameraChanged, idle };
}
