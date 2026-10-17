import { BrandedLoading } from '@/components/branded-loading';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, colors, Message, ui } from '@/components/discovery/ui';
import { ProfileDraftCard, ProfileHeader, ProfileIdentity, ProfileJourneyCard, ProfileTabs, profileStyles as s } from '@/components/profile/profile-ui';
import { useSessionState } from '@/hooks/session-context';
import { useActionIntent } from '@/hooks/action-intent';
import { useLoad } from '@/hooks/use-load';
import { loadPrivateDrafts } from '@/lib/remix/queries';
import { loadPublishedProfileJourneys } from '@/lib/profile/queries';
import { loadOwnProfile } from '@/lib/profile/edit-queries';
import { safePhoto } from '@/lib/discovery/model';
import { signOutAccount } from '@/lib/auth/queries';
import type { PublicJourney } from '@/types/journey';

type Row = { kind: 'draft'; draft: { id: string; title: string } } | { kind: 'published'; journey: PublicJourney };
export default function AccountScreen() {
  const router = useRouter(), auth = useSessionState(), intent = useActionIntent();
  const userId = auth.session?.user.id;
  const metadata = auth.session?.user.user_metadata;

  const loader = useCallback((signal: AbortSignal) => userId ? loadPrivateDrafts(userId, signal) : Promise.resolve([]), [userId]);
  const drafts = useLoad(loader);
  const publicLoader = useCallback(async (signal: AbortSignal) => {
    if (!userId) return { profile: null, journeys: [] as PublicJourney[] };
    const [own, journeys] = await Promise.all([loadOwnProfile(userId, signal), loadPublishedProfileJourneys(userId, signal)]);
    return { profile: { id: own.id, username: own.username, displayName: own.displayName, bio: own.bio, avatar: own.avatarPreview }, journeys };
  }, [userId]);
  const published = useLoad(publicLoader);
  // Account remains a direct destination for Create's "View all" private drafts.
  const [tab, setTab] = useState<'published' | 'drafts'>('drafts');
  const [settings, setSettings] = useState(false), [busy, setBusy] = useState(false);
  const signOutLock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const refreshDrafts = drafts.refresh, refreshPublished = published.refresh;
  useFocusEffect(useCallback(() => { refreshDrafts(); refreshPublished(); }, [refreshDrafts, refreshPublished]));
  async function signOut() {
    if (signOutLock.current) return;
    signOutLock.current = true;
    setBusy(true); setError(null); intent.cancel();
    try { await signOutAccount(); setSettings(false); } catch { setError('Couldn’t sign out. Please retry.'); } finally { signOutLock.current = false; setBusy(false); }
  }
  const profile = published.data?.profile;
  const name = profile?.displayName || (typeof metadata?.display_name === 'string' && metadata.display_name.trim() ? metadata.display_name.trim() : 'Traveler');
  const metadataAvatar = safePhoto(metadata?.avatar_url);
  const avatar = profile?.avatar || (metadataAvatar?.startsWith('https:') ? metadataAvatar : null);
  const bio = profile?.bio || (typeof metadata?.bio === 'string' ? metadata.bio : null);
  const rows: Row[] = tab === 'drafts' ? (drafts.data || []).map(draft => ({ kind: 'draft', draft })) : (published.data?.journeys || []).map(journey => ({ kind: 'published', journey }));
  const loading = tab === 'drafts' ? drafts.loading : published.loading;
  const collectionError = tab === 'drafts' ? drafts.error : published.error;
  const refresh = tab === 'drafts' ? drafts.refresh : published.refresh;
  const retry = tab === 'drafts' ? drafts.retry : published.retry;
  if (auth.session && loading && !drafts.data && !published.data) return <BrandedLoading message="Opening your journeys…" />;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.safe}><View style={ui.page}>
    <ProfileHeader onSettings={() => setSettings(true)} />
    {auth.loading ? <ActivityIndicator accessibilityLabel="Loading account" /> : !auth.session ? <View style={s.content}><Message title="Your next chapter" body="Sign in to Like, Save, and create private journey copies." retry={() => router.push('/auth')} action="Sign in or register" />{auth.error && <Text accessibilityRole="alert" style={ui.body}>{auth.error}</Text>}</View>
      : <FlatList data={rows} keyExtractor={row => row.kind + ':' + (row.kind === 'draft' ? row.draft.id : row.journey.id)} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={tab === 'drafts' ? drafts.refreshing : published.refreshing} onRefresh={refresh} tintColor={colors.ink} />}
        renderItem={({ item }) => item.kind === 'draft' ? <ProfileDraftCard draft={item.draft} /> : <ProfileJourneyCard journey={item.journey} />}
        ListHeaderComponent={<View>
          <ProfileIdentity name={name} username={profile?.username || null} bio={bio} avatar={avatar} owner count={published.data ? published.data.journeys.length : null} />
          <View style={s.section}><Text accessibilityRole="header" style={s.heading}>{name}’s Journeys</Text><ProfileTabs selected={tab} onSelect={setTab} drafts /></View>
          {(error || auth.error) && <Text accessibilityRole="alert" style={ui.body}>{error || auth.error}</Text>}
          {collectionError && rows.length > 0 && <Message title="Couldn’t refresh journeys" body={collectionError} retry={retry} />}
        </View>}
        ListEmptyComponent={loading ? <ActivityIndicator accessibilityLabel={tab === 'drafts' ? 'Loading private drafts' : 'Loading published journeys'} /> : collectionError ? <Message title={tab === 'drafts' ? 'Couldn’t load drafts' : 'Couldn’t load journeys'} body={collectionError} retry={retry} />
          : <Message title={tab === 'drafts' ? 'No private drafts yet' : 'No public journeys yet'} body={tab === 'drafts' ? 'Remix a public journey or start your own story.' : 'Your published journeys will appear here.'} retry={() => router.push('/create')} action="Create Journey" />}
        ListFooterComponent={<Pressable accessibilityRole="button" accessibilityLabel={tab === 'drafts' ? 'Refresh drafts' : 'Refresh published journeys'} onPress={refresh} style={s.close}><Text style={ui.body}>↻ Refresh {tab === 'drafts' ? 'drafts' : 'journeys'}</Text></Pressable>} />}
    <Modal visible={settings} transparent animationType="none" onRequestClose={() => { if (!busy) setSettings(false); }}>
      <View style={s.shade}><SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}><ScrollView keyboardShouldPersistTaps="handled">
        <View style={s.settingsRow}><Text accessibilityRole="header" style={s.heading}>Account settings</Text><Pressable accessibilityRole="button" accessibilityLabel="Close account settings" disabled={busy} onPress={() => setSettings(false)} style={s.close}><Text style={s.heading}>×</Text></Pressable></View>
        {auth.session ? <View style={{ gap: 12 }}><Text selectable style={ui.body}>{auth.session.user.email}</Text>
          <Action label="Create Journey" onPress={() => { setSettings(false); router.push('/create'); }} />
          <Action label="Refresh drafts" secondary onPress={() => { refreshDrafts(); setTab('drafts'); setSettings(false); }} />
          <Action disabled={busy} label={busy ? 'Signing out…' : 'Sign out'} onPress={() => { void signOut(); }} />
          {error && <Text accessibilityRole="alert" style={ui.body}>{error}</Text>}
        </View> : <Action label="Sign in or register" onPress={() => { setSettings(false); router.push('/auth'); }} />}
      </ScrollView></SafeAreaView></View>
    </Modal>
  </View></SafeAreaView>;
}
