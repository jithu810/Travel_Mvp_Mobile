import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { buddyTravelCopy, type BuddyTravel } from '@/lib/buddy/model';

export const buddyTour = [
  { route: '/discover', label: 'Visit Explore', text: 'Find a journey. Discover somewhere new.' },
  { route: '/create', label: 'Visit Create', text: 'A place, a photo, a little story. Start yours.' },
  { route: '/account', label: 'Visit Account', text: 'Your drafts live here. Pick up where you left off.' },
] as const;

// Historical module name; this is an anchored bubble, not a modal or bottom sheet.
export function BuddyHelpSheet({ canAddMemory, travel, onAddMemory, onCreate, onDrafts, onClose, onTour, onNext,
  tour = null, reaction, placement, width = 252, maxHeight = 320, onMeasure }: {
  canAddMemory: boolean; travel?: BuddyTravel; onAddMemory: () => void; onCreate: () => void; onDrafts: () => void; onClose: () => void;
  onTour?: () => void; onNext?: () => void; tour?: number | null; reaction?: string;
  placement?: { x: number; y: number; above: boolean; tailX: number }; width?: number; maxHeight?: number; onMeasure?: (height: number) => void;
}) {
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => back.remove();
  }, [onClose]);
  const step = tour !== null ? buddyTour[tour] : undefined;
  const text = reaction ?? step?.text ?? (travel
    ? (travel.status === 'ready' ? 'Adventure time! Tiny backpack reporting for duty.' : buddyTravelCopy(travel)) + (canAddMemory ? '' : ' Capture moments in a private draft. Leaving Travel Mode stops GPS.')
    : canAddMemory ? 'A moment worth keeping? Let’s tuck it into your story.' : 'Tiny backpack, big adventures! Shall we explore?');
  return <View testID="buddy-speech-bubble" pointerEvents={placement ? 'auto' : 'none'} accessibilityElementsHidden={!placement} importantForAccessibility={placement ? 'auto' : 'no-hide-descendants'} onTouchStart={event => event.stopPropagation()}
    onLayout={event => onMeasure?.(event.nativeEvent.layout.height)}
    style={[s.bubble, { width, maxHeight, left: placement?.x ?? 0, top: placement?.y ?? 0, opacity: placement ? 1 : 0 }]}>
    <View style={s.messageRow}>
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
        <Text accessibilityLiveRegion="polite" style={s.body}>{step && <Text style={s.step}>{((tour ?? 0) + 1) + '/3  '}</Text>}{text}</Text>
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel={step ? 'Exit Buddy tour' : 'Close Journey Buddy help'} onPress={onClose} style={({ pressed }) => [s.close, pressed && s.pressed]}><View style={s.closeCircle}><Text style={s.closeText}>×</Text></View></Pressable>
    </View>
    {!reaction && <View testID="buddy-bubble-actions" style={s.actions}>
      {step ? <>
        <HelpAction label={step.label} onPress={onTour ?? onCreate} />
        <HelpAction secondary label={tour === 2 ? 'Finish tour' : 'Next'} onPress={onNext ?? onClose} />
      </> : <>
        <HelpAction label={canAddMemory ? 'Capture a moment' : 'Open my drafts'} onPress={canAddMemory ? onAddMemory : onDrafts} />
        <HelpAction secondary label="Show me around" onPress={onTour ?? onCreate} />
      </>}
    </View>}
    {placement && <View pointerEvents="none" style={[s.tail, { left: placement.tailX - 7 }, placement.above ? s.tailBelow : s.tailAbove]} />}
  </View>;
}
function HelpAction({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.action, pressed && s.pressed]}>
    <View style={[s.pill, secondary && s.ghost]}><Text style={[s.actionText, secondary && s.secondaryText]}>{label}</Text></View>
  </Pressable>;
}
const s = StyleSheet.create({
  bubble: { position: 'absolute', borderRadius: 20, backgroundColor: '#FFFCF3', borderWidth: 1, borderColor: '#A9C9BB', padding: 8, gap: 6, zIndex: 40, elevation: 24,
    shadowColor: '#244A3D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.13, shadowRadius: 8 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 44, flexShrink: 1 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  closeCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEEFE5' },
  closeText: { fontSize: 18, lineHeight: 21, color: '#61776C' },
  scroll: { flex: 1, flexShrink: 1 }, body: { color: '#253F35', fontSize: 14, lineHeight: 19 }, step: { color: '#71877C', fontSize: 11 },
  actions: { flexDirection: 'row', gap: 4, flexShrink: 0, alignItems: 'center' },
  action: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'flex-start' },
  pill: { borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#2F6C59', maxWidth: '100%' },
  ghost: { backgroundColor: 'transparent', paddingHorizontal: 4 },
  actionText: { fontSize: 12, lineHeight: 16, color: '#FFFFFF', fontWeight: '600' }, secondaryText: { color: '#386958' },
  pressed: { opacity: 0.62 },
  tail: { position: 'absolute', width: 14, height: 14, backgroundColor: '#FFFCF3', borderColor: '#A9C9BB', transform: [{ rotate: '45deg' }] },
  tailBelow: { bottom: -8, borderRightWidth: 1, borderBottomWidth: 1 }, tailAbove: { top: -8, borderLeftWidth: 1, borderTopWidth: 1 },
});
