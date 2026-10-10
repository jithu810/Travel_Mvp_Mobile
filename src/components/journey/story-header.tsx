import { useRouter } from 'expo-router';
import { validHandle } from '@/lib/profile/model';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { travelerLabel } from '@/lib/discovery/model';
import { JourneyPhoto } from '@/components/discovery/journey-photo';
import { colors } from '@/components/discovery/ui';

export function StoryHeader({ journey }: { journey: PublicJourney }) {
  const router = useRouter();
  const handle = journey.creatorUsername && validHandle(journey.creatorUsername) ? journey.creatorUsername : null;
  return <View style={styles.header}>
    {journey.cover && <View style={styles.cover}><JourneyPhoto uri={journey.cover} label={journey.title + ' cover photo'} ratio={1.45} /></View>}
    <Text style={styles.eyebrow}>A JOURNEY SHARED</Text>
    <Text accessibilityRole="header" style={styles.title}>{journey.title}</Text>
    {journey.destination !== 'Destination not specified' && <Text style={styles.destination}>{journey.destination}</Text>}
    <Pressable accessibilityRole={handle ? "button" : undefined} accessibilityLabel={handle ? "View creator profile: " + journey.creatorName : undefined} disabled={!handle}
      onPress={() => { if (handle) router.push({ pathname: "/profile/[username]", params: { username: handle } }); }}
      style={({ pressed }) => [styles.creator, pressed && { opacity: 0.7 }]}>
      <View style={styles.avatar} accessibilityElementsHidden><Text style={styles.initial}>{journey.creatorName.slice(0, 1).toUpperCase()}</Text></View>
      <View style={styles.creatorText}>
        <Text style={styles.by}>A story by <Text style={styles.name}>{journey.creatorName}</Text></Text>
        {journey.creatorUsername && <Text style={styles.username}>@{journey.creatorUsername}</Text>}
      </View>
    </Pressable>
    <View style={styles.facts}>
      <Text style={styles.tag}>{travelerLabel(journey.travelerType)}</Text>
      {journey.durationDays !== null && <Text style={styles.fact}>{journey.durationDays} {journey.durationDays === 1 ? 'day' : 'days'}</Text>}
      <Text style={styles.fact}>{journey.stops.length} {journey.stops.length === 1 ? 'stop' : 'stops'}</Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  header: { gap: 12 },
  cover: { borderRadius: 24, overflow: 'hidden', marginBottom: 6 },
  eyebrow: { fontSize: 9, letterSpacing: 1.9, color: colors.green, fontWeight: '700', marginTop: 4 },
  title: { fontSize: 32, lineHeight: 38, letterSpacing: -1, color: colors.ink, fontWeight: '700' },
  destination: { fontSize: 15, lineHeight: 22, color: colors.green, fontWeight: '500' },
  creator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, minHeight: 44 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 14, fontWeight: '600', color: colors.ink },
  creatorText: { flex: 1, minWidth: 0, gap: 2 },
  by: { fontSize: 12, lineHeight: 19, color: colors.muted },
  name: { color: colors.ink, fontWeight: '600' },
  username: { fontSize: 11, lineHeight: 17, color: colors.muted },
  likes: { fontSize: 13, color: colors.green },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center', paddingTop: 6 },
  tag: { backgroundColor: colors.pale, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, fontSize: 11, fontWeight: '600', color: colors.ink },
  fact: { fontSize: 12, lineHeight: 20, color: colors.muted },
});
