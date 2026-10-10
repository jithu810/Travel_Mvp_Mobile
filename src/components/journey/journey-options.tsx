import { useCallback, useRef, useSyncExternalStore } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Action, ui } from '../discovery/ui';
import { useSessionState } from '@/hooks/session-context';
import { useActionIntent } from '@/hooks/action-intent';
import { remixStore } from '@/lib/remix/model';
import { remixJourney } from '@/lib/remix/queries';
export function JourneyOptions({ id, onUse }: { id: string; onUse: () => void }) {
  const router = useRouter();
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
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={ui.sectionTitle}>Make it your next chapter</Text>
    <Text style={ui.body}>Follow the original route, or make a private copy to revisit later.</Text>
    <Action label="Use This Journey" onPress={onUse} />
    <Text style={ui.body}>Use opens this journey’s map and stops. The original stays unchanged.</Text>
    <Pressable accessibilityRole="button" disabled={auth.loading || state.busy || (state.blocked && !state.copyId)} accessibilityState={{ disabled: auth.loading || state.busy || (state.blocked && !state.copyId) }}
      onPress={() => { if (state.copyId) router.push({ pathname: '/draft/[id]', params: { id: state.copyId } }); else void copy(); }} style={[ui.action, (state.busy || state.blocked) && { opacity: 0.65 }]}>
      {state.busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={ui.actionLabel}>{state.copyId ? 'Open private copy' : 'Remix This Journey'}</Text>}
    </Pressable>
    <Text style={ui.body}>Remix requires sign-in and creates a private draft. Editing comes later.</Text>
    {state.error && <Text accessibilityRole="alert" style={ui.body}>{state.error}</Text>}
    {state.blocked && <Action label="Check Account drafts" onPress={() => router.push('/account')} />}
    <Text style={ui.body}>Start Journey will be available in a future update.</Text>
  </View>;
}
