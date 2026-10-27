import { useCallback, useEffect, useRef, useState } from 'react';
import { liveBuddyClear } from '@/lib/buddy/map-presentation';
import type { BuddyRect } from '@/lib/buddy/model';

type Projection = { getPointInView(coordinate: number[]): Promise<number[]> };
// GPS following moves the camera and changes the fix about once a second. Settle
// briefly and project at most once per interval instead of on every fix/frame.
export const LIVE_PROJECTION_DEBOUNCE = 300;
export const LIVE_PROJECTION_INTERVAL = 1000;
export function useLiveBuddySafety(coordinates: number[][], viewport: { width: number; height: number }, controls: readonly BuddyRect[], enabled: boolean) {
  const map = useRef<Projection | null>(null), generation = useRef(0), settled = useRef(false), lastRun = useRef(-Infinity);
  const [projection, setProjection] = useState<{ key: string; clear: boolean } | null>(null), [idle, setIdle] = useState(0);
  // Last settled answer. Motion or a newer fix only makes the answer pending; it is
  // forgotten when the companion becomes unavailable, the map changes or projection fails.
  const [held, setHeld] = useState(false), [wasEnabled, setWasEnabled] = useState(enabled);
  if (wasEnabled !== enabled) { setWasEnabled(enabled); if (!enabled) { setHeld(false); setProjection(null); } }
  const key = JSON.stringify(coordinates), controlKey = JSON.stringify(controls);
  const { width, height } = viewport;
  const signature = JSON.stringify([key, controlKey, width, height]);
  useEffect(() => {
    const epoch = ++generation.current;
    const points = JSON.parse(key) as number[][];
    if (!enabled || !settled.current || !map.current || !points.length) return;
    let alive = true, timeout: ReturnType<typeof setTimeout> | undefined;
    const fail = () => { if (alive && epoch === generation.current) { generation.current++; setProjection(null); setHeld(false); } };
    const run = () => {
      if (!alive || epoch !== generation.current || !map.current) return;
      lastRun.current = Date.now();
      timeout = setTimeout(fail, 1500);
      Promise.all(points.slice(0, 101).map(coordinate => map.current!.getPointInView(coordinate))).then(projected => {
        if (!alive || epoch !== generation.current) return;
        clearTimeout(timeout);
        const clear = liveBuddyClear(projected[0], projected.slice(1), { width, height }, JSON.parse(controlKey));
        setProjection({ key: signature, clear }); setHeld(clear);
      }, () => { clearTimeout(timeout); fail(); });
    };
    const delay = Math.max(LIVE_PROJECTION_DEBOUNCE, LIVE_PROJECTION_INTERVAL - (Date.now() - lastRun.current));
    const schedule = setTimeout(run, delay);
    return () => { alive = false; clearTimeout(schedule); clearTimeout(timeout); };
  }, [key, controlKey, width, height, signature, enabled, idle]);
  const mapRef = useCallback((node: Projection | null) => { if (map.current === node) return; map.current = node; generation.current++; settled.current = false; setProjection(null); setHeld(false); }, []);
  const moving = useCallback(() => { generation.current++; settled.current = false; setProjection(null); }, []);
  const onIdle = useCallback(() => { settled.current = true; setIdle(value => value + 1); }, []);
  const current = projection?.key === signature ? projection : null;
  const clear = enabled && !!current?.clear;
  // A settled "not clear" answer releases; only a pending answer keeps the previous clear one.
  return { mapRef, moving, idle: onIdle, clear, present: clear || (enabled && !current && held) };
}
