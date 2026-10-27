import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { journeyFacts, travelerLabel } from '@/lib/discovery/model';
import { ThumbnailPhoto } from './thumbnail-photo';
import { JourneyArt } from '@/components/art/journey-art';
import { artSeed } from '@/lib/art/journey-art';
import { colors } from './ui';
import { useBuddyProtectedBounds } from '@/hooks/use-buddy-geometry';

export function JourneyCard({ journey }: { journey: PublicJourney }) {
  const router = useRouter();
  const protection = useBuddyProtectedBounds();
  return <Pressable {...protection} accessibilityRole="button" accessibilityLabel={'Open journey: ' + journey.title + ', ' + journey.destination}
    onPress={() => router.push({ pathname: '/journey/[id]', params: { id: journey.id } })}
    style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
    <View style={styles.cover}>
      <ThumbnailPhoto uri={journey.cover} thumbnailUri={journey.coverThumbnail} label={journey.title + ' cover photo'}
        fallback={<JourneyArt seed={artSeed(journey.id, journey.stops)} stops={journey.stops} accessibilityLabel={'Journey art. No journey cover photo available. ' + journey.title} />} />
      <View style={styles.badge}><Text style={styles.badgeText}>{travelerLabel(journey.travelerType)}</Text></View>
    </View>
    <View style={styles.content}>
      <Text style={styles.destination} numberOfLines={1}>{journey.destination}</Text>
      <Text style={styles.title} numberOfLines={2}>{journey.title}</Text>
      <Text style={styles.facts}>{journeyFacts(journey)}</Text>
      <View style={styles.creatorRow}>
        <Text style={styles.creator} numberOfLines={1}>By {journey.creatorName}</Text>
        {journey.likes !== null && <Text style={styles.likes} accessibilityLabel={journey.likes + ' likes'}>♡ {journey.likes}</Text>}
      </View>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { borderRadius: 22, backgroundColor: colors.white, marginBottom: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  cover: { position: 'relative' },
  badge: { position: 'absolute', left: 14, top: 14, borderRadius: 12, backgroundColor: colors.paper, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.ink },
  content: { padding: 18, gap: 7 },
  destination: { color: colors.green, fontSize: 12, fontWeight: '600' },
  title: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: '700' },
  facts: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  creatorRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderColor: colors.line, paddingTop: 12, marginTop: 5, alignItems: 'center' },
  creator: { flex: 1, color: colors.muted, fontSize: 12 },
  likes: { color: colors.ink, fontSize: 13 },
});
