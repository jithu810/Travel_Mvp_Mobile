import { useRouter } from 'expo-router';
import { validHandle } from '@/lib/profile/model';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { JourneyPhoto } from '@/components/discovery/journey-photo';
import { colors } from '@/components/discovery/ui';

export function StoryHeader({ journey, height, onAbout }: { journey: PublicJourney; height: number; onAbout: () => void }) {
  const router = useRouter();
  return <View style={[styles.cover, { height }]}>
    <JourneyPhoto uri={journey.cover} label={journey.title + ' cover photo'} fill />
    <View pointerEvents="none" style={styles.shade} />
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/discover')} style={styles.control}><Text style={styles.back}>‹</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Journey actions" onPress={onAbout} style={styles.control}><Text style={styles.controlLabel}>•••</Text></Pressable>
    </View>
    <View pointerEvents="none" style={[styles.titles, height < 140 && { bottom: 6, paddingVertical: 4 }]}>
      <Text accessibilityRole="header" accessibilityLabel={journey.title} numberOfLines={height < 140 ? 1 : 2} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.4} style={[styles.title, height < 140 && { fontSize: 22, lineHeight: 26 }]}>{journey.title}</Text>
      {journey.destination !== 'Destination not specified' && <Text numberOfLines={1} style={styles.destination}>{journey.destination}</Text>}
    </View>
  </View>;
}
export function StoryCreator({ journey }: { journey: PublicJourney }) {
  const router = useRouter();
  const handle = journey.creatorUsername && validHandle(journey.creatorUsername) ? journey.creatorUsername : null;
  return <Pressable accessibilityRole={handle ? 'button' : undefined} accessibilityLabel={handle ? 'View creator profile: ' + journey.creatorName : 'Shared by ' + journey.creatorName} disabled={!handle}
    onPress={() => { if (handle) router.push({ pathname: "/profile/[username]", params: { username: handle } }); }}
    style={({ pressed }) => [styles.creator, pressed && { opacity: 0.7 }]}>
    <View style={styles.avatar} accessibilityElementsHidden><Text style={styles.initial}>{journey.creatorName.slice(0, 1).toUpperCase()}</Text></View>
    <Text numberOfLines={1} style={styles.name}>{journey.creatorName}</Text>
    {handle && <Text style={styles.profileLink}>↗</Text>}
  </Pressable>;
}
const styles = StyleSheet.create({
  cover: { borderRadius: 24, overflow: 'hidden', backgroundColor: colors.pale },
  shade: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(5,28,24,0.38)' },
  controls: { position: 'absolute', top: 8, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' },
  control: { minWidth: 44, minHeight: 44, borderRadius: 22, backgroundColor: 'rgba(10,35,30,0.8)', alignItems: 'center', justifyContent: 'center' },
  back: { color: colors.white, fontSize: 32, lineHeight: 36 },
  controlLabel: { color: colors.white, fontSize: 16, fontWeight: '700' },
  titles: { position: 'absolute', bottom: 12, left: 16, right: 16, gap: 3, backgroundColor: 'rgba(5,28,24,0.65)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  title: { fontSize: 27, lineHeight: 31, letterSpacing: -0.7, color: colors.white, fontWeight: '700' },
  destination: { fontSize: 12, lineHeight: 18, color: '#F4F6EC' },
  creator: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, flex: 1, minWidth: 0 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 13, fontWeight: '600', color: colors.ink },
  name: { color: colors.ink, fontSize: 12, lineHeight: 18, flexShrink: 1, fontWeight: '600' },
  profileLink: { color: colors.green, fontSize: 14 },
});
