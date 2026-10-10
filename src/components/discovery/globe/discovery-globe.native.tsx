import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Component, memo, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import type { DiscoveryPoints } from '@/lib/discovery/map';
import { GlobeFallback, GlobeLoading } from './fallback';

type Props = { points: DiscoveryPoints; onOpen: (id: string) => void; bottomInset: number; viewport: { width: number; height: number }; selectionId: string | null; locateVersion: number };
const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim();
const failure = 'The map couldn’t load. You can still search and explore the journeys below.';
class Boundary extends Component<{ children: ReactNode; retry: () => void; bottomInset: number }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <GlobeFallback message={failure} retry={this.props.retry} bottomInset={this.props.bottomInset} /> : this.props.children; }
}
function Loader(props: Props & { retry: () => void }) {
  const [Map, setMap] = useState<ComponentType<Props & { retry: () => void }> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => { if (active) setFailed(true); }, 20000);
    import('./native-globe').then(async module => {
      await module.configureGlobe(token!);
      if (active) { clearTimeout(timeout); setMap(() => module.NativeGlobe); }
    }).catch(() => { if (active) { clearTimeout(timeout); setFailed(true); } });
    return () => { active = false; clearTimeout(timeout); };
  }, []);
  if (failed) return <GlobeFallback message={failure} retry={props.retry} bottomInset={props.bottomInset} />;
  return Map ? <Map {...props} /> : <GlobeLoading bottomInset={props.bottomInset} />;
}
export const DiscoveryGlobe = memo(function DiscoveryGlobe(props: Props) {
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt(value => value + 1);
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    return <GlobeFallback bottomInset={props.bottomInset} message="The interactive globe needs a development build. Search and journeys remain available in Expo Go." />;
  if (!token?.startsWith('pk.')) return <GlobeFallback bottomInset={props.bottomInset} message="The map isn’t configured yet. Search and journeys remain available below." />;
  return <Boundary key={attempt} retry={retry} bottomInset={props.bottomInset}><Loader {...props} retry={retry} /></Boundary>;
});

