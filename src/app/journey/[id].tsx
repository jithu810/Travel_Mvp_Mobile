import { JourneyOptions } from '@/components/journey/journey-options';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, LoadingCards, Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { SocialActions } from '@/components/journey/social-actions';
import { StoryHeader } from '@/components/journey/story-header';
import { StopTimeline } from '@/components/journey/stop-timeline';
import { StorySnapshot } from '@/components/journey/story-extras';
import { useLoad } from '@/hooks/use-load';
import { loadPublicJourney } from '@/lib/discovery/queries';
import { JourneyMap } from '@/components/journey/map/journey-map';
import { hasStory } from '@/lib/journey/snapshot';

export default function JourneyStoryScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const loader = useCallback((signal: AbortSignal) => loadPublicJourney(id, signal), [id]);
  const state = useLoad(loader);
  const journey = state.data;
  const scroll = useRef<ScrollView>(null);
  const mapY = useRef(0);
  return <SafeAreaView style={ui.safe}>
    <View style={ui.page}>
      <ScreenHeader title="Journey Story" back />
      <ScrollView ref={scroll} contentContainerStyle={ui.list} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={colors.ink} />}>
        {state.loading ? <LoadingCards /> : !journey
          ? <Message title={state.error ? 'A small detour' : 'Journey unavailable'} body={state.error || 'This journey may no longer be public. Explore Discover for more stories.'} retry={state.retry} />
          : <View style={styles.content}>
            {state.error && <Message title="Couldn’t refresh this journey" body={state.error} retry={state.refresh} />}
            <StoryHeader journey={journey} />
            <SocialActions key={'social-' + journey.id} journey={journey} />
            <View onLayout={event => { mapY.current = event.nativeEvent.layout.y; }}><JourneyMap key={journey.id} stops={journey.stops} /></View>
            <StorySnapshot journey={journey} />
            {hasStory(journey) && <View style={styles.story}>
              <Text accessibilityRole="header" style={ui.sectionTitle}>The story</Text>
              <Text style={styles.description}>{journey.description}</Text>
            </View>}
            <StopTimeline stops={journey.stops} />
            <JourneyOptions key={journey.id} id={journey.id} onUse={() => scroll.current?.scrollTo({ y: mapY.current, animated: true })} />
          </View>}
      </ScrollView>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  content: { gap: 28, paddingTop: 5, paddingBottom: 8 },
  story: { gap: 10 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 25 },
});
