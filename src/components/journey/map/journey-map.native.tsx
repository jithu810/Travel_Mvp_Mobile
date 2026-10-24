import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Component, memo, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import type { JourneyStop } from '@/types/journey';
import { buildMapData, type JourneyMapData } from '@/lib/journey/map-data';
import { MapFallback, MapFrame, type MapDisplayProps } from './map-frame';

type SelectionProps = { selectedId?: string | null; onSelect?: (id: string) => void } & MapDisplayProps;
const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim();
class MapBoundary extends Component<{ children: ReactNode; retry: () => void; compact: boolean; onExpand?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <MapFallback message="The map couldn’t load. You can still browse the journey’s stops." retry={this.props.retry} compact={this.props.compact} onExpand={this.props.onExpand} /> : this.props.children; }
}
function NativeLoader({ data, stops, retry, selectedId, onSelect, presentation = 'story', onExpand, currentPosition, navigationRoute, navigationMode, navigationPadding, destinationId, travelCamera, memoryPhotos, animateMemoryRoute, playRouteWithSelection, controlTopInset }: { data: JourneyMapData; stops: JourneyStop[]; retry: () => void } & SelectionProps) {
  const [Map, setMap] = useState<ComponentType<{ data: JourneyMapData; stops: JourneyStop[]; retry: () => void } & SelectionProps> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const startTimeout = () => {
      clearTimeout(timeout);
      if (!active || settled || AppState.currentState !== 'active') return;
      timeout = setTimeout(() => { if (active && !settled) { settled = true; setFailed(true); } }, 20000);
    };
    startTimeout();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') startTimeout(); else clearTimeout(timeout);
    });
    // Import inside the guarded async path: Expo Go / missing native code must not
    // crash Story at module evaluation time.
    import('./native-map').then(async module => {
      if (!active || settled) return;
      await module.configureMap(token!);
      clearTimeout(timeout);
      if (active && !settled) { settled = true; setMap(() => module.NativeJourneyMap); }
    }).catch(() => { clearTimeout(timeout); if (active && !settled) { settled = true; setFailed(true); } });
    return () => { active = false; clearTimeout(timeout); subscription.remove(); };
  }, []);
  if (failed) return <MapFallback message="The map couldn’t load. Your story is still available below." retry={retry} compact={presentation === 'preview'} onExpand={onExpand} />;
  if (!Map) return <View style={{ flex: presentation === 'story' ? undefined : 1, height: presentation === 'story' ? 310 : undefined, justifyContent: 'center' }} accessibilityLabel="Loading journey map"><ActivityIndicator /></View>;
  return <Map data={data} stops={stops} retry={retry} selectedId={selectedId} onSelect={onSelect} presentation={presentation} onExpand={onExpand} currentPosition={currentPosition} navigationRoute={navigationRoute} navigationMode={navigationMode} navigationPadding={navigationPadding} destinationId={destinationId} travelCamera={travelCamera} memoryPhotos={memoryPhotos} animateMemoryRoute={animateMemoryRoute} playRouteWithSelection={playRouteWithSelection} controlTopInset={controlTopInset} />;
}
export const JourneyMap = memo(function JourneyMap({ stops, selectedId, onSelect, presentation = 'story', onExpand, currentPosition, navigationRoute, navigationMode, navigationPadding, destinationId, travelCamera, memoryPhotos, animateMemoryRoute, playRouteWithSelection, controlTopInset }: { stops: JourneyStop[] } & SelectionProps) {
  const data = useMemo(() => buildMapData(stops), [stops]);
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt(value => value + 1);
  let content: ReactNode;
  if (!data.markers.length) content = <MapFallback compact={presentation === 'preview'} onExpand={onExpand} />;
  else if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    content = <MapFallback message="The interactive map needs a native development build. The story remains available in Expo Go." compact={presentation === 'preview'} onExpand={onExpand} />;
  else if (!token?.startsWith('pk.')) content = <MapFallback message="The map isn’t configured yet. You can still browse the journey’s stops." compact={presentation === 'preview'} onExpand={onExpand} />;
  else content = <MapBoundary key={attempt} retry={retry} compact={presentation === 'preview'} onExpand={onExpand}><NativeLoader data={data} stops={stops} retry={retry} selectedId={selectedId} onSelect={onSelect} presentation={presentation} onExpand={onExpand} currentPosition={currentPosition} navigationRoute={navigationRoute} navigationMode={navigationMode} navigationPadding={navigationPadding} destinationId={destinationId} travelCamera={travelCamera} memoryPhotos={memoryPhotos} animateMemoryRoute={animateMemoryRoute} playRouteWithSelection={playRouteWithSelection} controlTopInset={controlTopInset} /></MapBoundary>;
  return <MapFrame data={data} presentation={presentation}>{content}</MapFrame>;
});
