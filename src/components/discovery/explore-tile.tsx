import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { JourneyPhoto } from './journey-photo';
import { JourneyArt } from '@/components/art/journey-art';
import { artSeed } from '@/lib/art/journey-art';
import { useBuddyProtectedBounds } from '@/hooks/use-buddy-geometry';

export function ExploreTile({ journey }: { journey: PublicJourney }) {
  const router = useRouter();
  const protection = useBuddyProtectedBounds();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const thumbnail = journey.coverThumbnail && journey.coverThumbnail !== failedThumbnail ? journey.coverThumbnail : null;
  const cover = thumbnail || journey.cover;
  const available = cover && cover !== failedUri;
  return <Pressable {...protection} accessibilityRole="button" accessibilityLabel={'Open journey: ' + journey.title + ', ' + journey.destination + ', by ' + journey.creatorName}
    accessibilityHint="Opens the journey story and save action"
    onPress={() => router.push({ pathname: '/journey/[id]', params: { id: journey.id, source: 'search' } })}
    style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
    {available ? <JourneyPhoto uri={cover} label={journey.title + ' cover photo'} fill thumbnail onError={() => { if (thumbnail) setFailedThumbnail(thumbnail); else setFailedUri(cover); }} />
      : <JourneyArt seed={artSeed(journey.id, journey.stops)} stops={journey.stops} destination={journey.destination} showDestination compact />}
  </Pressable>;
}
const styles = StyleSheet.create({
  tile: { width: '33.333333%', aspectRatio: 1, padding: 1, minHeight: 44 },
  pressed: { opacity: 0.75 },
});
