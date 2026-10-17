import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { createMemoryLocationCapture, type LocationCaptureState } from '@/lib/create/current-location';
import { memoryLocationPort } from '@/lib/create/current-location-port';
import type { StopInput } from '@/lib/create/model';
const identity = (memory: StopInput) => JSON.stringify([memory.id, memory.latitude, memory.longitude, memory.mapboxId]);

export function useMemoryLocation(value: StopInput, disabled: boolean, onChange: (patch: Partial<StopInput>) => void, revealName: () => void) {
  const [state, setState] = useState<LocationCaptureState>({ busy: false, error: null });
  const live = useRef(false), focused = useRef(false);
  const latest = useRef({ value, disabled, onChange, revealName });
  useLayoutEffect(() => { latest.current = { value, disabled, onChange, revealName }; }, [value, disabled, onChange, revealName]);
  const requested = useRef('');
  const capture = useRef<ReturnType<typeof createMemoryLocationCapture> | null>(null);
  useEffect(() => {
    live.current = true;
    const controller = createMemoryLocationCapture(memoryLocationPort,
      next => { if (live.current) setState(next); }, patch => {
        const current = latest.current;
        if (!live.current || !focused.current || current.disabled || AppState.currentState === 'background' || identity(current.value) !== requested.current) return;
        current.onChange(patch); current.revealName();
      });
    capture.current = controller;
    return () => { live.current = false; controller.cancel(); capture.current = null; };
  }, []);
  useFocusEffect(useCallback(() => { focused.current = true; return () => { focused.current = false; capture.current?.cancel(); }; }, []));
  useEffect(() => {
    const listener = AppState.addEventListener('change', next => { if (next === 'background') capture.current?.cancel(); });
    return () => listener.remove();
  }, []);
  useLayoutEffect(() => { capture.current?.cancel(); }, [disabled, value.id, value.latitude, value.longitude, value.mapboxId]);
  return { ...state, cancel: () => capture.current?.cancel(), isBusy: () => capture.current?.isBusy() ?? false, start: () => {
    if (!live.current || !focused.current || latest.current.disabled || AppState.currentState === 'background' || capture.current?.isBusy()) return;
    requested.current = identity(latest.current.value); capture.current?.start();
  } };
}
