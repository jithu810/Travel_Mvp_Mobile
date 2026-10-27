import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { journeyFacts } from '@/lib/discovery/model';
import { colors } from './ui';
import { HomeControlIcon } from './home-control-icon';
import { TravelPhotoPlaceholder } from './travel-photo-placeholder';

export const HomeJourneyCard = memo(function HomeJourneyCard({ journey, expanded, width, selected, onOpen, onLocate, onHeight }: {
  journey: PublicJourney; expanded: boolean; width: number; selected: boolean;
  onOpen: (id: string) => void; onLocate: (id: string) => void; onHeight?: (height: number) => void;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const thumbnail = journey.coverThumbnail && journey.coverThumbnail !== failedThumbnail ? journey.coverThumbnail : null;
  const cover = thumbnail || journey.cover;
  const likes = typeof journey.likes === 'number' && Number.isSafeInteger(journey.likes) && journey.likes >= 0 ? journey.likes : null;
  const likesLabel = likes === null ? null : likes + (likes === 1 ? ' like' : ' likes');
  return <View style={[s.card, { width }, selected && s.selected]} onLayout={event => onHeight?.(event.nativeEvent.layout.height)}>
    <Pressable accessibilityRole="button" accessibilityLabel={'Open journey: ' + journey.title + ', ' + journey.destination + (likesLabel ? ', ' + likesLabel : '')}
      accessibilityHint="Opens Journey Story" onPress={() => onOpen(journey.id)} style={[s.story, expanded && s.expandedStory]}>
      <View style={[s.cover, expanded && s.expandedCover, expanded && { height: Math.round(width * 9 / 16) }]}>
        {cover && failedUri !== cover
          ? <Image key={cover} source={{ uri: cover }} accessibilityLabel={journey.title + ' cover photo'} style={s.image} resizeMode="cover" onError={() => { if (thumbnail) setFailedThumbnail(thumbnail); else setFailedUri(cover); }} />
          : <TravelPhotoPlaceholder compact={!expanded} label={'Default travel photo. No journey cover photo available. ' + journey.destination + '. Explore journey'} />}
      </View>
      <View style={[s.content, expanded && s.expandedContent]}>
        <Text numberOfLines={1} style={s.destination}>{journey.destination}</Text>
        <Text numberOfLines={expanded ? 2 : 1} style={s.title}>{journey.title}</Text>
        <Text numberOfLines={1} style={s.creator}>By {journey.creatorName}</Text>
        <View style={s.factsRow}>
          <Text numberOfLines={1} style={s.facts}>{journeyFacts(journey)}</Text>
          {likesLabel !== null && <Text numberOfLines={1} style={s.likes} accessibilityLabel={likesLabel}>♡ {likes}</Text>}
        </View>
      </View>
    </Pressable>
    <View style={s.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Locate journey: ' + journey.title} accessibilityState={{ selected }}
        onPress={() => onLocate(journey.id)} style={[s.locate, selected && s.selectedAction]}><HomeControlIcon name="locate" selected={selected} size={28} /><Text style={[s.actionLabel, selected && s.selectedLabel]}>Locate</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={'Explore journey: ' + journey.title} accessibilityHint="Opens Journey Story"
        onPress={() => onOpen(journey.id)} style={s.locate}><HomeControlIcon name="explore" size={28} /><Text style={s.actionLabel}>Explore journey</Text></Pressable>
    </View>
  </View>;
});
const s = StyleSheet.create({
  card: { borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: '#E1E8F4', overflow: 'hidden' },
  selected: { borderColor: '#3873CE', backgroundColor: '#F0F6FF' },
  story: { flexDirection: 'row', padding: 10, paddingBottom: 4, gap: 10 },
  expandedStory: { flexDirection: 'column', padding: 0, gap: 0 },
  cover: { width: 96, height: 84, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.pale },
  expandedCover: { width: '100%', height: undefined, aspectRatio: 16 / 9, borderRadius: 0 },
  image: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  content: { flex: 1, minWidth: 0, gap: 3, paddingHorizontal: 4, paddingVertical: 4 },
  expandedContent: { paddingHorizontal: 14, paddingTop: 10 },
  destination: { color: '#2C63AF', fontSize: 10, fontWeight: '600' },
  title: { color: '#14243F', fontSize: 15, lineHeight: 19, fontWeight: '700' },
  creator: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  factsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  facts: { color: colors.muted, fontSize: 10, lineHeight: 14, flexShrink: 1 },
  likes: { color: colors.muted, fontSize: 10, lineHeight: 14, flexShrink: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingBottom: 4, gap: 8 },
  locate: { minWidth: 76, minHeight: 56, flexShrink: 1, paddingHorizontal: 10, paddingVertical: 6, gap: 4, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  actionLabel: { color: '#2C63AF', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  selectedLabel: { color: '#6555CF' },
  selectedAction: { backgroundColor: '#E6E0FF' },
});
