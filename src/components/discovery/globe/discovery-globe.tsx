import type { DiscoveryPoints } from '@/lib/discovery/map';
import { GlobeFallback } from './fallback';
// Web deliberately never imports the native SDK.
export function DiscoveryGlobe({ bottomInset }: { points: DiscoveryPoints; onOpen: (id: string) => void; bottomInset: number; viewport: { width: number; height: number }; selectionId: string | null; locateVersion: number }) {
  return <GlobeFallback bottomInset={bottomInset} message="Explore the interactive globe in the Android or iOS app. Browse journeys and search below." />;
}
