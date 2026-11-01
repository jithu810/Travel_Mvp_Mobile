import { darkPilotStyles } from '@/theme/dark-pilot';
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
const styles = darkPilotStyles(StyleSheet.create({
  tile: { width: '48.5%', aspectRatio: 0.92, marginBottom: 10, minHeight: 44, borderRadius: 18, overflow: 'hidden' },
  pressed: { opacity: 0.75 },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 11, gap: 3, backgroundColor: 'rgba(17, 17, 17, 0.72)' },
  title: { color: '#fff', fontSize: 13, lineHeight: 17, fontWeight: '700' },
  destination: { color: '#fff', fontSize: 11, lineHeight: 15, fontWeight: '500' },
}));
