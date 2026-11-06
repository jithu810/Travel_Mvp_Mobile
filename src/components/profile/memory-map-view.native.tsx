import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Component, memo, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import type { MemoryPin } from '@/lib/profile/memory-map';
import { theme } from '@/theme/mobile-theme';
import { MemoryMapNotice, type MemoryMapViewProps, type MemoryMapViewport } from './memory-map-notice';
import { memoryMapTotalBudget } from '@/lib/profile/memory-map';

const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim();
const failure = 'The travel map couldn’t load. Published journeys remain available in the Journeys tab.';
type NativeProps = { pins: readonly MemoryPin[]; onOpen: (pin: MemoryPin) => void; retry: () => void; initialViewport: MemoryMapViewport; deadline: number; cameraKey: string };

class Boundary extends Component<{ children: ReactNode; retry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <MemoryMapNotice message={failure} retry={this.props.retry} /> : this.props.children; }
}

// Same guarded lazy import as Story: Expo Go or missing native code never crashes Profile.
function Loader({ pins, onOpen, retry, initialViewport, cameraKey }: Omit<NativeProps, 'deadline'>) {
  const [Map, setMap] = useState<ComponentType<NativeProps> | null>(null);
  // One budget covers the module import and the map style load, so a failure always
  // reaches the notice within memoryMapTotalBudget of opening the map.
  const [deadline] = useState(() => Date.now() + memoryMapTotalBudget);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true, settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const startTimeout = () => {
      clearTimeout(timeout);
      if (!active || settled || AppState.currentState !== 'active') return;
      timeout = setTimeout(() => { if (active && !settled) { settled = true; setFailed(true); } }, memoryMapTotalBudget);
    };
    startTimeout();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') startTimeout(); else clearTimeout(timeout); });
    import('./native-memory-map').then(async module => {
      if (!active || settled) return;
      await module.configureMemoryMap(token!);
      clearTimeout(timeout);
      if (active && !settled) { settled = true; setMap(() => module.NativeMemoryMap); }
    }).catch(() => { clearTimeout(timeout); if (active && !settled) { settled = true; setFailed(true); } });
    return () => { active = false; clearTimeout(timeout); subscription.remove(); };
  }, []);
  if (failed) return <MemoryMapNotice message={failure} retry={retry} />;
  if (!Map) return <View style={{ flex: 1, justifyContent: 'center' }} accessibilityLabel="Loading travel map"><ActivityIndicator color={theme.accent} /></View>;
  return <Map pins={pins} onOpen={onOpen} retry={retry} initialViewport={initialViewport} deadline={deadline} cameraKey={cameraKey} />;
}

export const MemoryMapView = memo(function MemoryMapView({ pins, onOpen, initialViewport, cameraKey }: MemoryMapViewProps) {
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt(value => value + 1);
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    return <MemoryMapNotice message="The travel map needs a native development build. Published journeys remain in the Journeys tab." />;
  if (!token?.startsWith('pk.')) return <MemoryMapNotice message="The map isn’t configured yet. Published journeys remain in the Journeys tab." />;
  return <Boundary key={attempt} retry={retry}><Loader pins={pins} onOpen={onOpen} retry={retry} initialViewport={initialViewport} cameraKey={cameraKey} /></Boundary>;
});
