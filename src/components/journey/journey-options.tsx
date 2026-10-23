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
export function JourneyOptions({ id, onUse, inlineFeedback = false, menu }: { id: string; onUse: () => void; inlineFeedback?: boolean; menu?: { visible: boolean; onClose: () => void; onAbout: () => void } }) {
  const router = useRouter();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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
    if (copyId && focus.current.active && generation === focus.current.generation) router.push({ pathname: '/draft/[id]', params: { id: copyId } });
  }, [id, intent, key, router, userId]);
  useFocusEffect(useCallback(() => {
    if (userId && !auth.loading && intent.pending?.journeyId === id && intent.pending.action === 'remix') {
      if (intent.consume(intent.pending.token)) void copy();
    }
  }, [userId, auth.loading, id, intent, copy]));
  const actions = <View style={styles.card}>
    <View style={styles.buttons}>
    <Pressable accessibilityRole="button" accessibilityLabel="Use This Journey" accessibilityHint="Use all stops. Opens Travel Mode. Begin Trip starts the timer and location tracking." onPress={onUse} style={({ pressed }) => [styles.use, pressed && { opacity: 0.7 }]}><Text style={styles.useLabel}>↗ Use all stops</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={auth.loading || state.busy || (state.blocked && !state.copyId)} accessibilityState={{ disabled: auth.loading || state.busy || (state.blocked && !state.copyId) }}
      onPress={() => { if (state.copyId) router.push({ pathname: '/draft/[id]', params: { id: state.copyId } }); else void copy(); }} accessibilityLabel={state.copyId ? "Open private copy" : "Remix This Journey"} accessibilityHint="Requires sign-in. Creates or opens your private draft." style={({ pressed }) => [styles.remix, (auth.loading || state.busy || (state.blocked && !state.copyId) || pressed) && { opacity: 0.65 }]}>
      {state.busy ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.remixLabel}>{state.copyId ? 'My draft ↗' : '↻ Remix'}</Text>}
    </Pressable>
    {!inlineFeedback && (state.error || state.blocked) && <Pressable accessibilityRole="button" accessibilityLabel={state.error || 'Check your Account drafts before retrying Remix'} onPress={() => setFeedbackOpen(true)} style={styles.feedback}><Text accessibilityLiveRegion="polite" style={styles.remixLabel}>!</Text></Pressable>}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Customize stops" accessibilityHint="Choose stops before creating your own editable draft." onPress={() => { menu?.onClose(); router.push({ pathname: '/customize/[id]', params: { id } }); }} style={styles.menuAction}><Text style={styles.remixLabel}>Customize stops →</Text></Pressable>
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
  menuOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  menuBackdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  menuPanel: { maxHeight: '80%', backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  menuContent: { padding: 22, gap: 12 },
  menuAction: { minHeight: 44, justifyContent: 'center', paddingVertical: 8 },
  feedback: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', maxWidth: 300, padding: 6, borderRadius: 32, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, shadowColor: colors.ink, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  buttons: { flexDirection: 'row', gap: 6 },
  use: { ...primaryControl, flex: 1, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  useLabel: { color: colors.white, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
  remix: { flex: 1, minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pale },
  remixLabel: { color: colors.ink, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
});
