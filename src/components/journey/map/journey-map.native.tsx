import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Component, memo, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { JourneyStop } from '@/types/journey';
import { buildMapData, type JourneyMapData } from '@/lib/journey/map-data';
import { MapFallback, MapFrame } from './map-frame';

const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim();
class MapBoundary extends Component<{ children: ReactNode; retry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <MapFallback message="The map couldn’t load. Your story is still available below." retry={this.props.retry} /> : this.props.children; }
}
function NativeLoader({ data, retry }: { data: JourneyMapData; retry: () => void }) {
  const [Map, setMap] = useState<ComponentType<{ data: JourneyMapData; retry: () => void }> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => { if (active) setFailed(true); }, 20000);
    // Import inside the guarded async path: Expo Go / missing native code must not
    // crash Story at module evaluation time.
    import('./native-map').then(async module => {
      await module.configureMap(token!);
      clearTimeout(timeout);
      if (active) setMap(() => module.NativeJourneyMap);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; clearTimeout(timeout); };
  }, []);
  if (failed) return <MapFallback message="The map couldn’t load. Your story is still available below." retry={retry} />;
  if (!Map) return <View style={{ height: 280, justifyContent: 'center' }} accessibilityLabel="Loading journey map"><ActivityIndicator /></View>;
  return <Map data={data} retry={retry} />;
}
export const JourneyMap = memo(function JourneyMap({ stops }: { stops: JourneyStop[] }) {
  const data = useMemo(() => buildMapData(stops), [stops]);
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt(value => value + 1);
  let content: ReactNode;
  if (!data.markers.length) content = <MapFallback />;
  else if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    content = <MapFallback message="The interactive map needs a native development build. The full story remains available in Expo Go." />;
  else if (!token?.startsWith('pk.')) content = <MapFallback message="The map isn’t configured yet. The full story is available below." />;
  else content = <MapBoundary key={attempt} retry={retry}><NativeLoader data={data} retry={retry} /></MapBoundary>;
  return <MapFrame data={data}>{content}</MapFrame>;
});
