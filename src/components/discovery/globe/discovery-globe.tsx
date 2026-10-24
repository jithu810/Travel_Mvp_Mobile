import type { DestinationFocus } from '@/lib/discovery/destination-camera';
import type { DiscoveryPoints } from '@/lib/discovery/map';
import { GlobeFallback } from './fallback';
// Web deliberately never imports the native SDK.
export function DiscoveryGlobe({ bottomInset, preview }: { points: DiscoveryPoints; route: [number, number][][]; onOpen: (id: string) => void; bottomInset: number; headerInset?: number; viewport: { width: number; height: number }; selectionId: string | null; locateVersion: number; sheetInteracting: boolean; preview?: boolean; homeSearch?: boolean; onCenterChange?: (center: [number, number]) => void; destinationMode?: boolean; destination?: DestinationFocus | null; destinationVersion?: number }) {
  return <GlobeFallback compact={preview} bottomInset={bottomInset} message="Explore the interactive globe in the Android or iOS app. Browse journeys and search below." />;
}
