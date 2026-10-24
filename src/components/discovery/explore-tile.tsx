import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { JourneyPhoto } from './journey-photo';

export function ExploreTile({ journey }: { journey: PublicJourney }) {
  const router = useRouter();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const thumbnail = journey.coverThumbnail && journey.coverThumbnail !== failedThumbnail ? journey.coverThumbnail : null;
  const cover = thumbnail || journey.cover;
  const available = cover && cover !== failedUri;
  return <Pressable accessibilityRole="button" accessibilityLabel={'Open journey: ' + journey.title + ', ' + journey.destination + ', by ' + journey.creatorName}
    accessibilityHint="Opens the journey story and save action"
    onPress={() => router.push({ pathname: '/journey/[id]', params: { id: journey.id, source: 'search' } })}
    style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
    {available ? <JourneyPhoto uri={cover} label={journey.title + ' cover photo'} fill thumbnail onError={() => { if (thumbnail) setFailedThumbnail(thumbnail); else setFailedUri(cover); }} />
      : <Image source={require('../../../assets/images/journey-photo-fallback.png')} accessibilityLabel={'Default travel photo for ' + journey.title + '. No journey cover photo available'} resizeMode="cover" style={styles.photo} />}
  </Pressable>;
}
const styles = StyleSheet.create({
  tile: { width: '33.333333%', aspectRatio: 1, padding: 1, minHeight: 44 },
  photo: { width: '100%', height: '100%' },
  pressed: { opacity: 0.75 },
});
