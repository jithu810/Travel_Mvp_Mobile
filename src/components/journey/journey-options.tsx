import { JourneyActionIcon } from './journey-action-icon';
import { primaryControl } from '@/theme/mobile-theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Action, colors, ui } from '../discovery/ui';
import { useSessionState } from '@/hooks/session-context';
import { useActionIntent } from '@/hooks/action-intent';
import { remixStore } from '@/lib/remix/model';
import { StorySheet } from './story-sheet';
import { remixJourney } from '@/lib/remix/queries';
export function JourneyOptions({ id, onUse, inlineFeedback = false, menu, presentation, onAbout }: { id: string; onUse: () => void; inlineFeedback?: boolean; presentation?: 'rail'; onAbout?: () => void; menu?: { visible: boolean; onClose: () => void; onAbout: () => void } }) {
  const router = useRouter();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const focus = useRef({ active: false, generation: 0, userId: null as string | null });
  const auth = useSessionState();
  const intent = useActionIntent();
  const userId = auth.session?.user.id;
  useFocusEffect(useCallback(() => {
    focus.current.active = true;
    focus.current.generation++;
    focus.current.userId = userId ?? null;
    return () => { focus.current.active = false; focus.current.generation++; };
  }, [userId]));
  const key = id + ':' + (userId ?? 'anonymous');
  const get = useCallback(() => remixStore.get(key), [key]);
  const state = useSyncExternalStore(remixStore.subscribe, get, get);
  const copy = useCallback(async () => {
    if (!userId) { if (intent.begin(id, 'remix')) router.push('/auth'); return; }
    const generation = focus.current.generation;
    const copyId = await remixStore.run(key, () => remixJourney(id, userId));
    if (copyId && focus.current.active && generation === focus.current.generation) router.push({ pathname: '/create', params: { draft: copyId } });
  }, [id, intent, key, router, userId]);
  useFocusEffect(useCallback(() => {
    if (userId && !auth.loading && intent.pending?.journeyId === id && intent.pending.action === 'remix') {
      if (intent.consume(intent.pending.token)) void copy();
    }
  }, [userId, auth.loading, id, intent, copy]));
  const remixDisabled = auth.loading || state.busy || (state.blocked && !state.copyId);
  // One entry point explains the choice: a temporary stop selection versus a saved private draft.
  if (presentation === 'rail') return <View style={styles.rail}>
    <Pressable accessibilityRole="button" accessibilityLabel="Make it yours" accessibilityHint="Choose stops for this trip or save an editable copy." accessibilityState={{ busy: state.busy }} onPress={() => setChoiceOpen(true)} style={styles.railButton}>{state.busy ? <ActivityIndicator color={colors.ink} /> : <JourneyActionIcon name="remix" />}<Text style={styles.railLabel}>Make it yours</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="About this journey" onPress={onAbout} style={styles.railButton}><JourneyActionIcon name="info" /><Text style={styles.railLabel}>About</Text></Pressable>
    {/* A rail item of its own, so it never covers the only route to Customize. */}
    {(state.error || state.blocked) && <Pressable accessibilityRole="button" accessibilityLabel={state.error || 'Check your Account drafts before retrying Remix'} onPress={() => setFeedbackOpen(true)} style={styles.railFeedback}><Text accessibilityLiveRegion="polite" style={styles.remixLabel}>!</Text></Pressable>}
    <StorySheet visible={choiceOpen} title="Make this journey yours" onClose={() => setChoiceOpen(false)}>
      <Pressable accessibilityRole="button" accessibilityLabel="Pick stops for this trip" accessibilityHint="Choose stops for this trip. No draft is created." onPress={() => { setChoiceOpen(false); router.push({ pathname: '/customize/[id]', params: { id } }); }} style={({ pressed }) => [styles.choice, pressed && { opacity: 0.7 }]}>
        <JourneyActionIcon name="route" />
        <View style={styles.choiceText}><Text style={styles.choiceTitle}>Pick stops for this trip</Text><Text style={ui.body}>Choose which stops to visit now. Nothing is saved; your selection lasts for this trip.</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={state.copyId ? 'Open my editable copy' : 'Save an editable copy'} accessibilityHint={(userId ? '' : 'Requires sign-in. ') + 'Creates or opens your private draft.'} disabled={remixDisabled} accessibilityState={{ disabled: remixDisabled, busy: state.busy }}
        onPress={() => { setChoiceOpen(false); if (state.copyId) router.push({ pathname: '/create', params: { draft: state.copyId } }); else void copy(); }} style={({ pressed }) => [styles.choice, (remixDisabled || pressed) && { opacity: 0.6 }]}>
        {state.busy ? <ActivityIndicator color={colors.ink} /> : <JourneyActionIcon name="remix" />}
        <View style={styles.choiceText}><Text style={styles.choiceTitle}>{state.copyId ? 'Open my editable copy' : 'Save an editable copy'}</Text><Text style={ui.body}>{state.copyId ? 'You already have a private draft of this journey. Open it to keep editing.' : 'Creates a private draft in your account that you can edit.' + (userId ? '' : ' Requires sign-in.')}</Text></View>
      </Pressable>
      {state.error && <Text accessibilityRole="alert" style={ui.body}>{state.error}</Text>}
      {state.blocked && <Action label="Check Account drafts" onPress={() => { setChoiceOpen(false); router.push('/account'); }} />}
    </StorySheet>
    <StorySheet visible={feedbackOpen} title="Remix journey" onClose={() => setFeedbackOpen(false)}>
      {state.error && <Text accessibilityRole="alert" style={ui.body}>{state.error}</Text>}
      {state.blocked && <Action label="Check Account drafts" onPress={() => { setFeedbackOpen(false); router.push('/account'); }} />}
    </StorySheet>
  </View>;
  const actions = <View style={styles.card}>
    <View style={styles.buttons}>
    <Pressable accessibilityRole="button" accessibilityLabel="Use This Journey" accessibilityHint="Use all stops. Opens Travel Mode. Begin Trip starts the timer and location tracking." onPress={onUse} style={({ pressed }) => [styles.use, pressed && { opacity: 0.7 }]}><Text style={styles.useLabel}>↗ Use all stops</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={auth.loading || state.busy || (state.blocked && !state.copyId)} accessibilityState={{ disabled: auth.loading || state.busy || (state.blocked && !state.copyId) }}
      onPress={() => { if (state.copyId) router.push({ pathname: '/create', params: { draft: state.copyId } }); else void copy(); }} accessibilityLabel={state.copyId ? "Open private copy" : "Remix This Journey"} accessibilityHint="Requires sign-in. Creates or opens your private draft." style={({ pressed }) => [styles.remix, (auth.loading || state.busy || (state.blocked && !state.copyId) || pressed) && { opacity: 0.65 }]}>
      {state.busy ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.remixLabel}>{state.copyId ? 'My draft ↗' : '↻ Remix'}</Text>}
    </Pressable>
    {!inlineFeedback && (state.error || state.blocked) && <Pressable accessibilityRole="button" accessibilityLabel={state.error || 'Check your Account drafts before retrying Remix'} onPress={() => setFeedbackOpen(true)} style={styles.feedback}><Text accessibilityLiveRegion="polite" style={styles.remixLabel}>!</Text></Pressable>}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Customize stops" accessibilityHint="Choose stops for this trip. No draft is created." onPress={() => { menu?.onClose(); router.push({ pathname: '/customize/[id]', params: { id } }); }} style={styles.menuAction}><Text style={styles.remixLabel}>Customize stops →</Text></Pressable>
    {inlineFeedback && <View style={{ gap: 10 }}>
      {state.error && <Text accessibilityRole="alert" style={ui.body}>{state.error}</Text>}
      {state.blocked && <Action label="Check Account drafts" onPress={() => router.push('/account')} />}
    </View>}
    <StorySheet visible={!inlineFeedback && feedbackOpen} title="Remix journey" onClose={() => setFeedbackOpen(false)}>
      {state.error && <Text accessibilityRole="alert" style={ui.body}>{state.error}</Text>}
      {state.blocked && <Action label="Check Account drafts" onPress={() => { setFeedbackOpen(false); router.push('/account'); }} />}
    </StorySheet>

  </View>;
  // Keep auth/deferred Remix hooks mounted even while native Modal hides children.
  if (!menu) return actions;
  return <Modal visible={menu.visible} transparent animationType="fade" onRequestClose={menu.onClose}>
    <View style={styles.menuOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close journey actions" onPress={menu.onClose} style={styles.menuBackdrop} />
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.menuPanel}><ScrollView contentContainerStyle={styles.menuContent}>
        <Text accessibilityRole="header" style={ui.sectionTitle}>Journey actions</Text>
        <Text style={ui.body}>Use opens Travel Mode. Remix creates a private copy and requires sign-in.</Text>
        {actions}
        <Pressable accessibilityRole="button" accessibilityLabel="About this journey" onPress={menu.onAbout} style={styles.menuAction}><Text style={styles.remixLabel}>About this journey</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Close journey menu" onPress={menu.onClose} style={styles.menuAction}><Text style={styles.remixLabel}>Cancel</Text></Pressable>
      </ScrollView></SafeAreaView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  rail: { gap: 3, flexDirection: 'row' }, railLabel: { color: colors.ink, fontSize: 10, lineHeight: 14, fontWeight: '600', textAlign: 'center' }, railButton: { minWidth: 56, minHeight: 54, paddingHorizontal: 3, borderRadius: 14, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }, railFeedback: { alignSelf: 'center', width: 48, minHeight: 48, borderRadius: 22, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  choice: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, minHeight: 48, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  choiceText: { flex: 1, minWidth: 0, gap: 4 }, choiceTitle: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  menuOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  menuBackdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  menuPanel: { maxHeight: '80%', backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  menuContent: { padding: 22, gap: 12 },
  menuAction: { minHeight: 48, justifyContent: 'center', paddingVertical: 8 },
  feedback: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', maxWidth: 300, padding: 6, borderRadius: 32, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, shadowColor: colors.ink, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  buttons: { flexDirection: 'row', gap: 6 },
  use: { ...primaryControl, flex: 1, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  useLabel: { color: colors.white, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
  remix: { flex: 1, minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pale },
  remixLabel: { color: colors.ink, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
});
