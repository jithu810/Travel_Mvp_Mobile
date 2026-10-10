import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { useSessionState } from '@/hooks/session-context';
import { useActionIntent } from '@/hooks/action-intent';
import { useLoad } from '@/hooks/use-load';
import { loadPrivateDrafts } from '@/lib/remix/queries';
import { signOutAccount } from '@/lib/auth/queries';
export default function AccountScreen() {
  const router = useRouter();
  const auth = useSessionState();
  const intent = useActionIntent();
  const userId = auth.session?.user.id;
  const loader = useCallback((signal: AbortSignal) => userId ? loadPrivateDrafts(userId, signal) : Promise.resolve([]), [userId]);
  const drafts = useLoad(loader);
  const [busy, setBusy] = useState(false);
  const signOutLock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const refreshDrafts = drafts.refresh;
  useFocusEffect(useCallback(() => { refreshDrafts(); }, [refreshDrafts]));
  async function signOut() {
    if (signOutLock.current) return;
    signOutLock.current = true;
    setBusy(true); setError(null); intent.cancel();
    try { await signOutAccount(); } catch { setError('Couldn’t sign out. Please retry.'); } finally { signOutLock.current = false; setBusy(false); }
  }
  return <SafeAreaView style={ui.safe}><View style={ui.page}><ScreenHeader title="Account" back />
    <ScrollView contentContainerStyle={[ui.list, { gap: 18 }]}>
      {auth.loading ? <ActivityIndicator /> : !auth.session ? <Message title="Your next chapter" body="Sign in to Like, Save, and create private journey copies." retry={() => router.push('/auth')} action="Sign in or register" />
        : <><Text style={ui.sectionTitle}>Your account</Text><Text selectable style={ui.body}>{auth.session.user.email}</Text>
          <Action disabled={busy} label={busy ? 'Signing out…' : 'Sign out'} onPress={() => { void signOut(); }} />
          <Action label="Create Journey" onPress={() => router.push('/create')} /><Text style={ui.sectionTitle}>Private drafts</Text><Text style={ui.body}>Only you can open these copies. Draft editing will arrive later.</Text>
          {drafts.loading ? <ActivityIndicator /> : drafts.error ? <Message title="Couldn’t load drafts" body={drafts.error} retry={drafts.retry} />
            : drafts.data?.length ? drafts.data.map(draft => <Action key={draft.id} label={draft.title} onPress={() => router.push({ pathname: '/draft/[id]', params: { id: draft.id } })} />)
              : <Text style={ui.body}>No private drafts yet. Remix a public journey to make one.</Text>}
          <Action label="Refresh drafts" onPress={drafts.refresh} /></>}
      {(error || auth.error) && <Text accessibilityRole="alert" style={ui.body}>{error || auth.error}</Text>}
    </ScrollView></View></SafeAreaView>;
}
