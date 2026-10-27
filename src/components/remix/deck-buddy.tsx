import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import { BuddySprite } from '@/components/buddy/buddy-sprite';
import { theme } from '@/theme/mobile-theme';

export type DeckMood = 'idle' | 'discard' | 'select' | 'undo' | 'done';
export const deckBuddyLines: Record<DeckMood, string> = { idle: 'Build your hand!', discard: 'Discarded!', select: 'Selected!', undo: 'Back in the deck!', done: 'That’s your hand! Let’s review.' };

// Decorative companion beside the deck: never interactive, so it cannot cover touches.
// Each decision is announced once by the progress live region; the buddy only announces
// what that line cannot say (Undo and the finished hand), on both platforms.
export const announcedMoods: readonly DeckMood[] = ['undo', 'done'];
export function DeckBuddy({ mood, beat, reduced }: { mood: DeckMood; beat: number; reduced: boolean }) {
  const [motion] = useState(() => new Animated.Value(0));
  const line = deckBuddyLines[mood];
  useEffect(() => { if (announcedMoods.includes(mood)) AccessibilityInfo.announceForAccessibility(line); }, [line, mood, beat]);
  useEffect(() => {
    motion.stopAnimation(); motion.setValue(0);
    if (reduced || mood === 'idle' || mood === 'undo') return;
    const step = (toValue: number, duration: number) => Animated.timing(motion, { toValue, duration, useNativeDriver: true, isInteraction: false });
    const animation = mood === 'discard' ? Animated.sequence([step(1, 110), step(-1, 170), step(0, 120)]) : Animated.sequence([step(1, 150), step(0, 230)]);
    animation.start();
    return () => { animation.stop(); motion.setValue(0); };
  }, [mood, beat, reduced, motion]);
  const transform = mood === 'discard' ? [{ rotate: motion.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-9deg', '0deg', '9deg'] }) }]
    : [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }];
  return <View pointerEvents="none" style={s.row} testID="deck-buddy">
    {/* Up to 3 lines at 1.3x text fit the tray; the line is redundant with announcements, so scaling is capped there and shrinks rather than truncates. */}
    <View style={s.bubble}><Text numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.3} style={s.line}>{line}</Text></View>
    <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={{ transform }}>
      <BuddySprite key={mood + beat} animation={!reduced && (mood === 'select' || mood === 'done') ? 'jump' : 'idle'} animate={!reduced} />
    </Animated.View>
  </View>;
}
const s = StyleSheet.create({
  row: { flex: 1, minWidth: 0, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2, paddingBottom: 4 },
  bubble: { flexShrink: 1, minWidth: 0, marginBottom: 6, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14, borderBottomRightRadius: 4, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.border, boxShadow: theme.shadow },
  line: { color: theme.text, fontSize: 12, lineHeight: 16, fontWeight: '600' },
});
