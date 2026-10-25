import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, usePathname } from 'expo-router';
import { AppState, type View } from 'react-native';
import { useBuddyApi } from './use-journey-buddy';
import type { BuddyRect } from '@/lib/buddy/model';

// Attach to an existing native node: no wrapper, padding or measured page-space reservation.
export function useBuddyProtectedBounds(project?: (rect: BuddyRect) => readonly BuddyRect[]) {
  const api = useBuddyApi(), path = usePathname(), ref = useRef<View>(null), owner = useRef({});
  const focused = useRef(false), generation = useRef(0), request = useRef(0), projection = useRef(project);
  useEffect(() => { projection.current = project; });
  const measure = useCallback(() => {
    if (!api || !focused.current || api.store.get().path !== path) return;
    const token = owner.current, epoch = generation.current, serial = ++request.current, measurement = api.store.get().measurement;
    if (!api.preference.get().enabled || !ref.current) { api.store.protect(token, path, [], measurement); return; }
    ref.current.measureInWindow((x, y, width, height) => {
      if (!focused.current || generation.current !== epoch || serial !== request.current || api.store.get().path !== path || measurement !== api.store.get().measurement) return;
      const rect = { x, y, width, height };
      api.store.protect(token, path, width > 0 && height > 0 ? projection.current?.(rect) ?? [rect] : [], measurement);
    });
  }, [api, path]);
  useFocusEffect(useCallback(() => {
    focused.current = true; generation.current++;
    const token = owner.current;
    api?.store.protect(token, path, api.preference.get().enabled ? null : []);
    const stop = api?.store.onMeasure(measure); measure();
    return () => { focused.current = false; generation.current++; request.current++; stop?.(); api?.store.removeProtection(token); };
  }, [api, path, measure]));
  useEffect(() => { measure(); }, [measure, project]);
  const attach = useCallback((node: View | null) => {
    ref.current = node; request.current++;
    if (!api || !focused.current || api.store.get().path !== path) return;
    if (!node) api.store.protect(owner.current, path, []);
    else if (api.preference.get().enabled) api.store.requestMeasurements();
  }, [api, path]);
  const onLayout = useCallback(() => { if (focused.current && api?.store.get().path === path && api.preference.get().enabled) api.store.requestMeasurements(); }, [api, path]);
  return { ref: attach, collapsable: false as const, onLayout };
}

// Scroll momentum changes window coordinates even after the finger leaves the screen.
export function useBuddyScroll() {
  const api = useBuddyApi(), path = usePathname(), owner = useRef({}), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focused = useRef(false), generation = useRef(0);
  const end = useCallback(() => {
    if (!focused.current || api?.store.get().path !== path) return;
    clearTimeout(timer.current); timer.current = undefined;
    if (api?.preference.get().enabled && AppState.currentState === 'active') api.store.requestMeasurements();
    api?.store.geometryMotion(owner.current, path, false);
  }, [api, path]);
  const begin = useCallback(() => {
    if (!focused.current || api?.store.get().path !== path || !api.preference.get().enabled || AppState.currentState !== 'active') return;
    clearTimeout(timer.current); api.store.geometryMotion(owner.current, path, true);
    const epoch = generation.current;
    timer.current = setTimeout(() => { if (epoch === generation.current) end(); }, 140);
  }, [api, path, end]);
  useFocusEffect(useCallback(() => {
    focused.current = true; generation.current++;
    const token = {};
    owner.current = token;
    return () => { focused.current = false; generation.current++; clearTimeout(timer.current); api?.store.geometryMotion(token, path, false); };
  }, [api, path]));
  useEffect(() => {
    const token = owner.current;
    const cancel = () => { clearTimeout(timer.current); timer.current = undefined; api?.store.geometryMotion(token, path, false); };
    const app = AppState.addEventListener('change', state => { if (state !== 'active') cancel(); });
    const stop = api?.preference.subscribe(() => { if (!api.preference.get().enabled) cancel(); });
    return () => { app.remove(); stop?.(); cancel(); };
  }, [api, path]);
  return { onScroll: begin, scrollEventThrottle: 32, onScrollBeginDrag: begin, onScrollEndDrag: begin, onMomentumScrollBegin: begin, onMomentumScrollEnd: end };
}
