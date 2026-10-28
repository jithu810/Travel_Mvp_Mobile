import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Message, ScreenHeader, colors, ui } from '@/components/discovery/ui';
import { JourneyMap } from '@/components/journey/map/journey-map';
import { StopTimeline } from '@/components/journey/stop-timeline';
import { StorySheet } from '@/components/journey/story-sheet';
import { SwipeAction } from '@/components/journey/swipe-journey-start';
import { PlacePicker } from '@/components/create/place-picker';
import { useTripSnapshot } from '@/hooks/use-trip-session';
import { appendCustomizedStop, customizedTravel } from '@/lib/journey/customized-travel';
import { selectedStopId } from '@/lib/journey/story-layout';
import type { Place } from '@/lib/create/model';

// Local presentation only: synthetic IDs never reach public reads, social actions or Remix.
export default function CustomizedJourneyScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const routeId = typeof params.id === 'string' ? params.id : '';
  const journey = customizedTravel(routeId);
  const id = journey?.id ?? routeId;
  const session = useTripSnapshot(id);
  const editingBlocked = session.status === 'active' || session.status === 'paused';
  const router = useRouter();
  const window = useWindowDimensions();
  const [focused, setFocused] = useState(true);
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<'stop' | 'map' | 'add' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const interaction = useRef({ focused: true, epoch: 0, adding: false });
  useFocusEffect(useCallback(() => {
    interaction.current.focused = true; interaction.current.epoch++; setFocused(true);
    return () => { interaction.current.focused = false; interaction.current.epoch++; interaction.current.adding = false; setFocused(false); setPanel(null); };
  }, [setFocused, setPanel]));
  const selectedId = selectedStopId(journey?.stops ?? [], requestedId);
  const selected = journey?.stops.find(stop => stop.id === selectedId);
  const select = (stopId: string) => { if (journey?.stops.some(stop => stop.id === stopId)) setRequestedId(stopId); };
  const closePanel = () => { interaction.current.epoch++; interaction.current.adding = false; setPanel(null); };
  const epoch = interaction.current.epoch;
  const addPlace = (place: Place) => {
    if (!journey || !interaction.current.focused || !interaction.current.adding || interaction.current.epoch !== epoch) return;
    try {
      const next = appendCustomizedStop(journey, place);
      closePanel(); setError(null); router.replace({ pathname: '/customized/[id]', params: { id: next } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to add this stop.'); }
  };
  const map = journey && <JourneyMap stops={journey.stops} selectedId={selectedId} onSelect={select} presentation="expanded" animateMemoryRoute={false} />;
  return <SafeAreaView style={ui.safe}><View style={ui.page}>
    <ScreenHeader title="Your journey" back />
    {journey ? <>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={ui.sectionTitle}>{journey.title}</Text>
        <Text style={styles.note}>{journey.stops.length} stops for this trip only. Selected stops keep their original order; new stops go at the end. The original journey stays unchanged.</Text>
        {panel !== 'map' && <View style={[styles.map, { height: Math.max(180, Math.min(320, window.height * 0.32)) }]}>{map}</View>}
        <Action secondary label="View full map" onPress={() => setPanel('map')} />
        <StopTimeline horizontal stacked stops={journey.stops} selectedId={selectedId} onSelect={select} onDetails={stopId => { select(stopId); setPanel('stop'); }} active={focused && panel === null} />
        {editingBlocked && <Text style={styles.note}>Finish this trip in Travel Mode before adding a stop. Swipe below to return to your session.</Text>}
        <Action secondary label="Add stop" disabled={editingBlocked || journey.stops.length >= 50} onPress={() => {
          if (editingBlocked || journey.stops.length >= 50) return;
          interaction.current.epoch++; interaction.current.adding = true; setError(null); setPanel('add');
        }} />
        <Text style={styles.note}>Begin Trip uses your current location to guide you to the next stop. This temporary route is not saved or published.</Text>
      </ScrollView>
      <View style={styles.dock}><SwipeAction active={focused && panel === null} resetKey={id} label="Swipe to travel" accessibilityLabel="Travel from my location" onComplete={() => {
        if (interaction.current.focused && panel === null) router.push({ pathname: '/travel/[id]', params: { id, customized: '1' } });
      }} /></View>
      <StorySheet visible={panel === 'stop'} title={selected?.name || 'Selected stop'} onClose={closePanel}><Text style={ui.body}>{selected?.description || 'No description available.'}</Text></StorySheet>
      <StorySheet visible={panel === 'map'} title="Your route" subtitle={journey.title} onClose={closePanel} scrollable={false}>{panel === 'map' && <View style={styles.expandedMap}>{map}</View>}</StorySheet>
      <StorySheet visible={panel === 'add'} title="Add a stop" onClose={closePanel}>
        <Text style={styles.note}>Search for a place to append to this temporary route. Nothing is saved to your account.</Text>
        {error && <Text accessibilityRole="alert" style={ui.body}>{error}</Text>}
        {panel === 'add' && <PlacePicker label="Find a place" inlineSearch autoSuggest disabled={!focused || editingBlocked} onSelect={addPlace} />}
      </StorySheet>
    </> : <View style={styles.content}><Message title="Selection unavailable" body="This local selection is unavailable. Return to Customize stops and select again." /></View>}
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 20, gap: 12 },
  map: { borderRadius: 20, overflow: 'hidden' }, expandedMap: { flex: 1, minHeight: 0 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  dock: { paddingHorizontal: 18, paddingVertical: 8 },
});
