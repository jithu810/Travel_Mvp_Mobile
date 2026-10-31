import { theme } from '@/theme/mobile-theme';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { JourneyPhoto } from '@/components/discovery/journey-photo';
import { colors } from '@/components/discovery/ui';
import { StopArt } from '@/components/art/journey-art';
import { CircleMap, circleMapFootprint, circleMapUri } from '@/components/art/circle-map';
import { artSeed } from '@/lib/art/journey-art';
import type { PublicJourney } from '@/types/journey';

const circleTop = 12, circleBottomGap = 8;

export function StopStoryViewer({ journey, selectedId, onSelect, onClose, onMap }: {
  journey: PublicJourney; selectedId: string | null; onSelect: (id: string) => void; onClose: () => void; onMap: () => void;
}) {
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    let receivedChange = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      receivedChange = true;
      if (active) setReduceMotion(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active && !receivedChange) setReduceMotion(value);
    }).catch(() => { /* Keep the motion-safe default if the platform query fails. */ });
    return () => { active = false; subscription.remove(); };
  }, []);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [notesId, setNotesId] = useState<string | null>(null);
  // Stop art and the circle map are laid out between the header and the caption sheet.
  const [headerHeight, setHeaderHeight] = useState(88);
  const [captionHeight, setCaptionHeight] = useState(180);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  // Every circle URL that failed, so returning to that stop neither flashes nor retries.
  const [failedCircles, setFailedCircles] = useState<readonly string[]>([]);
  // Measured space between the header and the caption sheet (null until laid out).
  const [openHeight, setOpenHeight] = useState<number | null>(null);
  const index = journey.stops.findIndex(stop => stop.id === selectedId);
  const stop = journey.stops[index];
  const expanded = Boolean(stop && notesId === stop.id);
  // Photo-less (or failed-photo) stops show stop art plus a small fixed-size circle map of
  // the place. The circle carries its own one-line Mapbox credit, so it only shows where
  // nothing can cover that credit: never with the notes sheet open, and only when the
  // measured space between header and caption fits the circle and credit. Space is
  // reserved only when the map can actually render, and released if it fails.
  const artShown = Boolean(stop && (!stop.photo || stop.photo === failedPhoto));
  const circleUri = artShown && stop ? circleMapUri(stop) : null;
  const circleFits = openHeight !== null && openHeight >= circleTop + circleMapFootprint + circleBottomGap;
  const circle = Boolean(circleUri && !failedCircles.includes(circleUri) && !expanded && circleFits);
  const previous = index > 0;
  const next = index >= 0 && index < journey.stops.length - 1;
  function move(direction: -1 | 1) {
    const target = journey.stops[index + direction];
    if (index < 0 || !target || expanded) return;
    setNotesId(null);
    onSelect(target.id);
  }
  const current = useRef({ expanded, stops: journey.stops, index, onSelect });
  useEffect(() => { current.current = { expanded, stops: journey.stops, index, onSelect }; }, [expanded, journey.stops, index, onSelect]);
  // Keep one responder throughout a swipe, even when selection changes on release.
  // Only the image tap area owns this gesture; notes scroll independently.
  const shouldSwipe = useCallback((_: unknown, gesture: { dx: number; dy: number }) => !current.current.expanded && Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5, []);
  const finishSwipe = useCallback((_: unknown, gesture: { dx: number; dy: number }) => {
    const { expanded, stops, index, onSelect } = current.current;
    if (expanded || Math.abs(gesture.dx) < 50 || Math.abs(gesture.dx) <= Math.abs(gesture.dy) * 1.5) return;
    const target = stops[index + (gesture.dx < 0 ? 1 : -1)];
    if (index >= 0 && target) { setNotesId(null); onSelect(target.id); }
  }, [setNotesId]);
  // PanResponder.create registers these callbacks; it does not invoke them or read refs.
  // eslint-disable-next-line react-hooks/refs
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: shouldSwipe,
    onPanResponderRelease: finishSwipe,
    onPanResponderTerminationRequest: () => true,
  }), [shouldSwipe, finishSwipe]);
  return <Modal visible animationType={reduceMotion ? 'none' : 'fade'} presentationStyle="fullScreen" onRequestClose={() => expanded ? setNotesId(null) : onClose()}>
    <View style={styles.screen} testID="stop-story-viewer">
      <StatusBar style="dark" />
      {stop && <View style={styles.photo}><JourneyPhoto uri={stop.photo} label={stop.name + ' photo'} fill onError={() => setFailedPhoto(stop.photo)}
        fallback={<StopArt seed={artSeed(journey.id, journey.stops)} stops={journey.stops} index={index} name={stop.name} inset={{ top: insets.top + headerHeight, bottom: insets.bottom + captionHeight, right: circle ? 112 : 0 }}
          accessibilityLabel={'Stop art. ' + (stop.photo ? 'Photo unavailable. ' : 'No photo yet. ') + stop.name} />} /></View>}
      {circle && stop && <CircleMap key={'circle-' + stop.id} point={stop} onError={uri => setFailedCircles(previous => previous.includes(uri) ? previous : [...previous, uri])} style={[styles.circle, { top: insets.top + headerHeight + circleTop }]} />}
      <View pointerEvents="none" style={[styles.statusBarBacking, { height: insets.top }]} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header} onLayout={event => { const height = Math.round(event.nativeEvent.layout.height); if (height > 0) setHeaderHeight(previous => previous === height ? previous : height); }}>
          <View accessible accessibilityRole="progressbar" accessibilityLabel="Journey stop progress" accessibilityValue={{ min: 1, max: Math.max(1, journey.stops.length), now: Math.max(1, index + 1), text: stop ? 'Stop ' + (index + 1) + ' of ' + journey.stops.length : 'No stops available' }} style={styles.progress}>
            {journey.stops.map((item, i) => <View key={item.id} testID={'story-segment-' + (i + 1)} style={[styles.segment, i < index && styles.completed, i === index && styles.current]} />)}
          </View>
          <View style={styles.topRow}>
            <View style={styles.context}><Text numberOfLines={1} style={styles.journeyName}>{journey.title}</Text><Text style={styles.position}>{stop ? 'Stop ' + (index + 1) + ' of ' + journey.stops.length + (stop.dayNumber !== null ? ' · Day ' + stop.dayNumber : '') : 'Stop unavailable'}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close stop stories" onPress={onClose} style={styles.close}><Text style={styles.closeLabel}>✕</Text></Pressable>
          </View>
        </View>
        <View testID="story-image-area" style={styles.imageArea} {...swipe.panHandlers} onLayout={event => { const value = Math.round(event.nativeEvent.layout.height); setOpenHeight(previous => previous === value ? previous : value); }}>
          {!expanded && <View style={styles.tapAreas}>
            <Pressable testID="story-tap-previous" accessible={false} importantForAccessibility="no" disabled={!previous} onPress={() => move(-1)} style={styles.tapZone} />
            <Pressable testID="story-tap-next" accessible={false} importantForAccessibility="no" disabled={!next} onPress={() => move(1)} style={styles.tapZone} />
          </View>}
        </View>
        <View style={styles.caption} onLayout={event => { const height = Math.round(event.nativeEvent.layout.height); if (height > 0) setCaptionHeight(previous => previous === height ? previous : height); }} pointerEvents={expanded ? 'none' : 'auto'} accessibilityElementsHidden={expanded} importantForAccessibility={expanded ? 'no-hide-descendants' : 'auto'}>
          {stop ? <>
            <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>{stop.name}</Text>
            {journey.destination !== 'Destination not specified' && <Text accessibilityLabel={'Journey destination: ' + journey.destination} numberOfLines={1} style={styles.destination}>{journey.destination}</Text>}
            {!!stop.description.trim() && <Pressable accessibilityRole="button" accessibilityLabel={'Read full description for ' + stop.name} onPress={() => setNotesId(stop.id)} style={styles.readDescription}><Text numberOfLines={2} style={styles.excerpt}>{stop.description}</Text><Text style={styles.readMore}>Read full story ↑</Text></Pressable>}
            {stop.rating !== null && <Text style={styles.destination}>★ {stop.rating}/5 · Creator’s rating</Text>}
            <View style={styles.navigation}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous stop" accessibilityState={{ disabled: !previous || expanded }} disabled={!previous || expanded} onPress={() => move(-1)} style={[styles.navigationButton, (!previous || expanded) && styles.disabled]}><Text style={styles.navigationLabel}>‹ Previous</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="View selected stop on journey map" onPress={onMap} style={styles.navigationButton}><Text style={styles.navigationLabel}>Map ↗</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Next stop" accessibilityState={{ disabled: !next || expanded }} disabled={!next || expanded} onPress={() => move(1)} style={[styles.navigationButton, (!next || expanded) && styles.disabled]}><Text style={styles.navigationLabel}>Next ›</Text></Pressable>
            </View>
          </> : <Text style={styles.excerpt}>This stop is no longer available. Close to explore the updated journey.</Text>}
        </View>
        {expanded && stop && <View style={[styles.notes, { maxHeight: height * 0.7 }]} accessibilityViewIsModal>
          <View style={styles.notesHeader}><Text accessibilityRole="header" numberOfLines={2} style={styles.notesTitle}>{stop.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close full description" onPress={() => setNotesId(null)} style={styles.notesClose}><Text style={styles.notesCloseLabel}>Done</Text></Pressable></View>
          <ScrollView contentContainerStyle={styles.notesContent}><Text selectable style={styles.fullDescription}>{stop.description}</Text></ScrollView>
        </View>}
      </SafeAreaView>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background }, photo: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  statusBarBacking: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: theme.surface },
  safe: { flex: 1 }, header: { padding: 12, gap: 8, backgroundColor: theme.surface },
  progress: { flexDirection: 'row', gap: 3, height: 3 }, segment: { flex: 1, backgroundColor: theme.border, borderRadius: 2 }, completed: { backgroundColor: theme.accent }, current: { backgroundColor: theme.navigation },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, context: { flex: 1, minWidth: 0, gap: 3 },
  journeyName: { color: theme.text, fontSize: 14, lineHeight: 20, fontWeight: '600' }, position: { color: theme.muted, fontSize: 11, lineHeight: 17 },
  close: { width: 48, minHeight: 48, borderRadius: 22, backgroundColor: theme.lavender, alignItems: 'center', justifyContent: 'center' }, closeLabel: { color: theme.text, fontSize: 18 },
  circle: { position: 'absolute', right: 12 },
  imageArea: { flex: 1, minHeight: 44 }, tapAreas: { flex: 1, flexDirection: 'row' }, tapZone: { flex: 1 },
  caption: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, gap: 6, backgroundColor: theme.surface },
  title: { color: theme.text, fontSize: 26, lineHeight: 32, letterSpacing: -0.6, fontWeight: '700' }, destination: { color: theme.muted, fontSize: 12, lineHeight: 18 },
  readDescription: { minHeight: 48, gap: 4, paddingVertical: 4 }, excerpt: { color: theme.text, fontSize: 14, lineHeight: 21 }, readMore: { color: theme.accent, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  navigation: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 }, navigationButton: { minWidth: 48, minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }, navigationLabel: { color: theme.text, fontSize: 12, lineHeight: 19, fontWeight: '600' }, disabled: { opacity: 0.4 },
  notes: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }, notesTitle: { flex: 1, color: colors.ink, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  notesClose: { minHeight: 48, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: colors.pale, borderRadius: 22 }, notesCloseLabel: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  notesContent: { paddingBottom: 12, gap: 14 }, fullDescription: { color: colors.ink, fontSize: 15, lineHeight: 25 },
});
