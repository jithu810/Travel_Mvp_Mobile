import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { journeyFacts } from '@/lib/discovery/model';
import { colors } from './ui';

export const HomeJourneyCard = memo(function HomeJourneyCard({ journey, expanded, width, selected, onOpen, onLocate }: {
  journey: PublicJourney; expanded: boolean; width: number; selected: boolean;
  onOpen: (id: string) => void; onLocate: (id: string) => void;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return <View style={[s.card, { width }, selected && s.selected]}>
    <Pressable accessibilityRole="button" accessibilityLabel={'Open journey: ' + journey.title + ', ' + journey.destination}
      accessibilityHint="Opens Journey Story" onPress={() => onOpen(journey.id)} style={[s.story, expanded && s.expandedStory]}>
      <View style={[s.cover, expanded && s.expandedCover, expanded && { height: Math.round(width / 2.6) }]}>
        {journey.cover && failedUri !== journey.cover
          ? <Image source={{ uri: journey.cover }} accessibilityLabel={journey.title + ' cover photo'} style={s.image} resizeMode="cover" onError={() => setFailedUri(journey.cover)} />
          : <View style={s.placeholder} accessible accessibilityLabel="No journey cover photo available"><Text style={s.placeholderIcon}>↗</Text></View>}
      </View>
      <View style={[s.content, expanded && s.expandedContent]}>
        <Text numberOfLines={1} style={s.destination}>{journey.destination}</Text>
        <Text numberOfLines={expanded ? 2 : 1} style={s.title}>{journey.title}</Text>
        <Text numberOfLines={1} style={s.creator}>By {journey.creatorName}</Text>
        <Text numberOfLines={1} style={s.facts}>{journeyFacts(journey)}</Text>
      </View>
    </Pressable>
    <View style={s.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Locate journey: ' + journey.title} accessibilityState={{ selected }}
        onPress={() => onLocate(journey.id)} style={s.locate}><Text style={s.locateText}>{selected ? 'Selected on map ↗' : 'Locate ↗'}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={'Read story: ' + journey.title}
        onPress={() => onOpen(journey.id)} style={s.locate}><Text style={s.openText}>Read story →</Text></Pressable>
    </View>
  </View>;
});
const s = StyleSheet.create({
  card: { borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  selected: { borderColor: colors.green, backgroundColor: '#EFF3E7' },
  story: { flexDirection: 'row', padding: 10, paddingBottom: 4, gap: 10 },
  expandedStory: { flexDirection: 'column', padding: 0, gap: 0 },
  cover: { width: 64, height: 76, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.pale },
  expandedCover: { width: '100%', height: undefined, aspectRatio: 2.6, borderRadius: 0 },
  image: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pale },
  placeholderIcon: { fontSize: 24, color: colors.green },
  content: { flex: 1, minWidth: 0, gap: 3, paddingHorizontal: 4, paddingVertical: 4 },
  expandedContent: { paddingHorizontal: 14, paddingTop: 10 },
  destination: { color: colors.green, fontSize: 10, fontWeight: '600' },
  title: { color: colors.ink, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  creator: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  facts: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  locate: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  locateText: { fontSize: 11, fontWeight: '600', color: colors.green },
  openText: { fontSize: 11, fontWeight: '600', color: colors.ink },
});
