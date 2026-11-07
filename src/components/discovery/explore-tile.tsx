import { darkPilotStyles } from '@/theme/dark-pilot';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { JourneyPhoto } from './journey-photo';
import { JourneyArt } from '@/components/art/journey-art';
import { artSeed } from '@/lib/art/journey-art';
import { useBuddyProtectedBounds } from '@/hooks/use-buddy-geometry';
import { theme } from '@/theme/mobile-theme';

export function ExploreTile({ journey, onOpen, separators, columns = 2, onLocate, selected }: {
  journey: PublicJourney; onOpen?: () => void; separators?: { left: boolean; top: boolean }; columns?: 2 | 3; onLocate?: () => void; selected?: boolean;
}) {
  const router = useRouter();
  const protection = useBuddyProtectedBounds();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const thumbnail = journey.coverThumbnail && journey.coverThumbnail !== failedThumbnail ? journey.coverThumbnail : null;
  const cover = thumbnail || journey.cover;
  const available = cover && cover !== failedUri;
  const title = journey.title.trim(), destination = journey.destination.trim();
  const facts = [journey.durationDays ? journey.durationDays + (journey.durationDays === 1 ? ' day' : ' days') : null,
    journey.stops.length + (journey.stops.length === 1 ? ' stop' : ' stops')].filter(Boolean).join(', ');
  return <Pressable {...protection} accessibilityRole="button" accessibilityLabel={'Open journey: ' + journey.title + ', ' + journey.destination + ', by ' + journey.creatorName + ', ' + facts}
    accessibilityHint={onLocate ? 'Tap to open the journey story. Hold to locate its stops on the globe.' : 'Opens the journey story and save action'}
    accessibilityState={onLocate ? { selected: !!selected } : undefined}
    accessibilityActions={onLocate ? [{ name: 'locate', label: 'Locate journey on globe' }] : undefined}
    onAccessibilityAction={onLocate ? event => { if (event.nativeEvent.actionName === 'locate') onLocate(); } : undefined}
    onLongPress={onLocate}
    onPress={onOpen || (() => router.push({ pathname: '/journey/[id]', params: { id: journey.id, source: 'search' } }))}
    style={({ pressed }) => [styles.tile, columns === 3 && styles.threeColumns, pressed && styles.pressed]}>
    {available ? <JourneyPhoto uri={cover} label={journey.title + ' cover photo'} fill thumbnail onError={() => { if (thumbnail) setFailedThumbnail(thumbnail); else setFailedUri(cover); }} />
      : <JourneyArt seed={artSeed(journey.id, journey.stops)} stops={journey.stops} destination={journey.destination} compact />}
    {/* Photo and art tiles share one caption; the tile label already announces it. */}
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.caption, columns === 3 && styles.compactCaption]}>
      {title ? <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.title, columns === 3 && styles.compactTitle]}>{title}</Text> : null}
      {destination ? <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.destination, columns === 3 && styles.compactDestination]}>{destination}</Text> : null}
      <View style={styles.facts}>
        {journey.durationDays ? <View style={styles.fact}><Feather name="calendar" size={11} color="#fff" accessible={false} /><Text maxFontSizeMultiplier={1.3} style={styles.factCount}>{journey.durationDays}</Text></View> : null}
        <View style={styles.fact}><Feather name="map-pin" size={11} color="#fff" accessible={false} /><Text maxFontSizeMultiplier={1.3} style={styles.factCount}>{journey.stops.length}</Text></View>
      </View>
    </View>
    {separators && <View pointerEvents="none" accessible={false} style={[styles.seams, { borderLeftWidth: separators.left ? 1 : 0, borderTopWidth: separators.top ? 1 : 0 }]} />}
    {onLocate && selected && <View pointerEvents="none" accessible={false} style={styles.selectedFrame} />}
  </Pressable>;
}
const styles = darkPilotStyles(StyleSheet.create({
  tile: { width: '50%', aspectRatio: 0.92, marginBottom: 0, minHeight: 44, borderRadius: 0, overflow: 'hidden' },
  threeColumns: { width: '33.333333%', aspectRatio: 4 / 5 },
  selectedFrame: { position: 'absolute', top: 1, bottom: 1, left: 1, right: 1, borderWidth: 2, borderColor: theme.accent },
  seams: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderColor: theme.background },
  pressed: { opacity: 0.75 },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 11, gap: 3, backgroundColor: 'rgba(17, 17, 17, 0.72)' },
  compactCaption: { paddingHorizontal: 6, paddingTop: 6, paddingBottom: 7, gap: 2 },
  compactTitle: { fontSize: 11, lineHeight: 14 },
  compactDestination: { fontSize: 9, lineHeight: 12 },
  title: { color: '#fff', fontSize: 13, lineHeight: 17, fontWeight: '700' },
  destination: { color: '#fff', fontSize: 11, lineHeight: 15, fontWeight: '500' },
  facts: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  factCount: { color: '#fff', fontSize: 10, lineHeight: 14 },
}));
