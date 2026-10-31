import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const title = journey.title.trim(), destination = journey.destination.trim();
  return <Pressable {...protection} accessibilityRole="button" accessibilityLabel={'Open journey: ' + journey.title + ', ' + journey.destination + ', by ' + journey.creatorName}
    accessibilityHint="Opens the journey story and save action"
    onPress={() => router.push({ pathname: '/journey/[id]', params: { id: journey.id, source: 'search' } })}
    style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
    {available ? <JourneyPhoto uri={cover} label={journey.title + ' cover photo'} fill thumbnail onError={() => { if (thumbnail) setFailedThumbnail(thumbnail); else setFailedUri(cover); }} />
      : <JourneyArt seed={artSeed(journey.id, journey.stops)} stops={journey.stops} destination={journey.destination} compact />}
    {/* Photo and art tiles share one caption; the tile label already announces it. */}
    {(title || destination) && <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={styles.caption}>
      {title ? <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.title}>{title}</Text> : null}
      {destination ? <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.destination}>{destination}</Text> : null}
    </View>}
  </Pressable>;
}
const styles = StyleSheet.create({
  tile: { width: '33.333333%', aspectRatio: 1, padding: 1, minHeight: 44 },
  pressed: { opacity: 0.75 },
  caption: { position: 'absolute', left: 1, right: 1, bottom: 1, paddingHorizontal: 6, paddingTop: 4, paddingBottom: 5, backgroundColor: 'rgba(17, 17, 17, 0.62)' },
  title: { color: '#fff', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  destination: { color: '#fff', fontSize: 10, lineHeight: 13, fontWeight: '500' },
});
