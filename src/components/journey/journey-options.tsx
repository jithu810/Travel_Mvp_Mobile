import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, colors, ui } from '../discovery/ui';
import { useSessionState } from '@/hooks/session-context';
import { useActionIntent } from '@/hooks/action-intent';
import { remixStore } from '@/lib/remix/model';
import { StorySheet } from './story-sheet';
import { remixJourney } from '@/lib/remix/queries';
export function JourneyOptions({ id, onUse }: { id: string; onUse: () => void }) {
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
  return <View style={styles.card}>
    <View style={styles.buttons}>
    <Pressable accessibilityRole="button" accessibilityLabel="Use This Journey" accessibilityHint="Opens the original public route and stops" onPress={onUse} style={({ pressed }) => [styles.use, pressed && { opacity: 0.7 }]}><Text style={styles.useLabel}>↗ Use</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={auth.loading || state.busy || (state.blocked && !state.copyId)} accessibilityState={{ disabled: auth.loading || state.busy || (state.blocked && !state.copyId) }}
      onPress={() => { if (state.copyId) router.push({ pathname: '/draft/[id]', params: { id: state.copyId } }); else void copy(); }} accessibilityLabel={state.copyId ? "Open private copy" : "Remix This Journey"} accessibilityHint="Requires sign-in. Creates or opens your private draft." style={({ pressed }) => [styles.remix, (auth.loading || state.busy || (state.blocked && !state.copyId) || pressed) && { opacity: 0.65 }]}>
      {state.busy ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.remixLabel}>{state.copyId ? 'My draft ↗' : '↻ Remix'}</Text>}
    </Pressable>
    {(state.error || state.blocked) && <Pressable accessibilityRole="button" accessibilityLabel={state.error || 'Check your Account drafts before retrying Remix'} onPress={() => setFeedbackOpen(true)} style={styles.feedback}><Text accessibilityLiveRegion="polite" style={styles.remixLabel}>!</Text></Pressable>}
    </View>
    <StorySheet visible={feedbackOpen} title="Remix journey" onClose={() => setFeedbackOpen(false)}>
      {state.error && <Text accessibilityRole="alert" style={ui.body}>{state.error}</Text>}
      {state.blocked && <Action label="Check Account drafts" onPress={() => { setFeedbackOpen(false); router.push('/account'); }} />}
    </StorySheet>

  </View>;
}

const styles = StyleSheet.create({
  feedback: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', maxWidth: 300, padding: 6, borderRadius: 32, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, shadowColor: colors.ink, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  buttons: { flexDirection: 'row', gap: 6 },
  use: { flex: 1, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 24, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  useLabel: { color: colors.white, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
  remix: { flex: 1, minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pale },
  remixLabel: { color: colors.ink, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
});
