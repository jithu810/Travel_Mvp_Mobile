import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { primaryControl } from '@/theme/mobile-theme';
import { colors } from '@/components/discovery/ui';
import { useBuddyIntro } from '@/hooks/use-journey-buddy';
import { useSessionState } from '@/hooks/session-context';
import { BuddySprite } from './buddy-sprite';
import type { FirstOutcome } from '@/lib/first-outcome';

// One short, skippable introduction on a fresh install. Either choice is stored, so it never repeats;
// Back counts as Explore myself. Account keeps the on/off switch for later changes.
// ready: Home is focused and loaded. It also waits for session restore, which keeps the startup loader up.
export function BuddyIntro({ ready, choosing = false, onGuide, onChoose, onClose }: { ready: boolean; choosing?: boolean; onGuide?: () => void; onChoose?: (goal: FirstOutcome) => void; onClose?: () => void }) {
  const intro = useBuddyIntro(), auth = useSessionState();
  if (!ready || auth.loading || (!intro.visible && !choosing)) return null;
  const close = () => { if (intro.visible) intro.skip(); onClose?.(); };
  const choose = (goal: FirstOutcome) => { if (intro.visible) intro.guide(false); onChoose?.(goal); };
  return <Modal transparent statusBarTranslucent visible animationType="fade" onRequestClose={close}>
    <SafeAreaView style={s.scrim}>
      <ScrollView accessibilityViewIsModal style={s.card} contentContainerStyle={s.content} bounces={false}>
        <View style={s.heading}>
          <BuddySprite animate={false} />
          <Text accessibilityRole="header" style={s.title}>{choosing ? 'What would you like to do?' : 'Meet Journey Buddy'}</Text>
        </View>
        <Text style={s.body}>{choosing ? 'Choose a starting point. You can explore at your own pace and dismiss the guidance anytime.' : 'A small travel guide who can show you where to find journeys, keep memories and pick up your drafts.'}</Text>
        {choosing ? <View style={s.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Find a journey" onPress={() => choose('find')} style={s.primary}><Text style={s.primaryText}>Find a journey</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Keep a memory" onPress={() => choose('memory')} style={s.secondary}><Text style={s.secondaryText}>Keep a memory</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Maybe later" onPress={close} style={s.secondary}><Text style={s.secondaryText}>Maybe later</Text></Pressable>
        </View> : <View style={s.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Guide me" accessibilityHint="Choose finding a journey or keeping a memory with Journey Buddy." onPress={() => onGuide ? onGuide() : intro.guide()} style={({ pressed }) => [s.primary, pressed && s.pressed]}>
            <Text style={s.primaryText}>Guide me</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Explore myself" accessibilityHint="Keeps Journey Buddy hidden." onPress={close} style={({ pressed }) => [s.secondary, pressed && s.pressed]}>
            <Text style={s.secondaryText}>Explore myself</Text>
          </Pressable>
        </View>}
        <Text style={s.note}>You can show or hide Buddy anytime in Account.</Text>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
const s = StyleSheet.create({
  scrim: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#10231F66' },
  card: { width: '100%', maxWidth: 360, maxHeight: '100%', flexGrow: 0, borderRadius: 24, backgroundColor: '#FFFCF3', borderWidth: 1, borderColor: '#A9C9BB' },
  content: { padding: 20, gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { color: '#253F35', fontSize: 15, lineHeight: 21 },
  actions: { gap: 8 },
  primary: { ...primaryControl, minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontSize: 15, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  secondary: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.7 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
