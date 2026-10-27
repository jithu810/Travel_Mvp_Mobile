import { useCallback, useEffect, useRef, useState } from 'react';
import { liveBuddyClear } from '@/lib/buddy/map-presentation';
import type { BuddyRect } from '@/lib/buddy/model';

type Projection = { getPointInView(coordinate: number[]): Promise<number[]> };
export function useLiveBuddySafety(coordinates: number[][], viewport: { width: number; height: number }, controls: readonly BuddyRect[], enabled: boolean) {
  const map = useRef<Projection | null>(null), generation = useRef(0), settled = useRef(false);
  const [projection, setProjection] = useState<{ key: string; clear: boolean } | null>(null), [idle, setIdle] = useState(0);
  const key = JSON.stringify(coordinates), controlKey = JSON.stringify(controls);
  const { width, height } = viewport;
  const signature = JSON.stringify([key, controlKey, width, height]);
  useEffect(() => {
    const epoch = ++generation.current;
    const points = JSON.parse(key) as number[][];
    if (!enabled || !settled.current || !map.current || !points.length) return;
    let alive = true;
    const timeout = setTimeout(() => { if (alive && epoch === generation.current) { generation.current++; setProjection(null); } }, 1500);
    Promise.all(points.slice(0, 101).map(coordinate => map.current!.getPointInView(coordinate))).then(projected => {
      if (!alive || epoch !== generation.current) return;
      clearTimeout(timeout); setProjection({ key: signature, clear: liveBuddyClear(projected[0], projected.slice(1), { width, height }, JSON.parse(controlKey)) });
    }, () => { if (alive && epoch === generation.current) { clearTimeout(timeout); setProjection(null); } });
    return () => { alive = false; clearTimeout(timeout); };
  }, [key, controlKey, width, height, signature, enabled, idle]);
  const mapRef = useCallback((node: Projection | null) => { if (map.current === node) return; map.current = node; generation.current++; settled.current = false; setProjection(null); }, []);
  const moving = useCallback(() => { generation.current++; settled.current = false; setProjection(null); }, []);
  const onIdle = useCallback(() => { settled.current = true; setIdle(value => value + 1); }, []);
  return { mapRef, moving, idle: onIdle, clear: enabled && projection?.key === signature && projection.clear };
}
