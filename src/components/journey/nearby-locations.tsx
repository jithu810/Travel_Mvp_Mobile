import { theme as appTheme } from '@/theme/mobile-theme';
import { Pressable, Text } from 'react-native';
import { StorySheet } from './story-sheet';
import type { NearbyPoint } from '@/lib/journey/nearby';
export function NearbyLocations({ points, onSelect, onClose }: { points: NearbyPoint[]; onSelect: (id: string) => void; onClose: () => void }) {
  if (points.length < 2) return null;
  return <StorySheet visible title="Nearby locations" onClose={onClose}>
    <Text style={{ color: appTheme.text }}>These locations overlap even when zoomed in. Choose a memory or journey to continue.</Text>
    {points.map((point, index) => <Pressable key={point.id} accessibilityRole="button" accessibilityLabel={'Select nearby location ' + (index + 1) + ': ' + point.name} onPress={() => onSelect(point.id)} style={{ minHeight: 48, padding: 14, backgroundColor: "#0B1220", borderRadius: 18 }}><Text style={{ color: appTheme.text }}>{index + 1} · {point.name}</Text></Pressable>)}
  </StorySheet>;
}
