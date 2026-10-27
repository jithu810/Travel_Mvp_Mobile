import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { createBuddyMapImage } from '@/lib/buddy/map-image';

export function useBuddyMapImage(enabled: boolean, styleKey: string) {
  const [gate] = useState(createBuddyMapImage);
  const state = useSyncExternalStore(gate.subscribe, gate.get, gate.get);
  useEffect(() => { if (enabled) gate.begin(); return () => gate.cancel(); }, [gate, enabled, styleKey]);
  const version = state.version;
  return {
    version, ready: enabled && state.status === 'ready', failed: enabled && state.status === 'failed', retry: gate.retry,
    onLoad: useCallback(() => gate.loaded(version), [gate, version]),
    onError: useCallback(() => gate.fail(version), [gate, version]),
    onLayout: useCallback((event: LayoutChangeEvent) => gate.layout(version, event.nativeEvent.layout.width, event.nativeEvent.layout.height), [gate, version]),
  };
}
