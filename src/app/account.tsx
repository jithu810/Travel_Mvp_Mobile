import { BrandedLoading } from '@/components/branded-loading';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useBuddyGreetingsReset, useBuddyPreference, useBuddyScreen } from '@/hooks/use-journey-buddy';
import { useBuddyProtectedBounds, useBuddyScroll } from '@/hooks/use-buddy-geometry';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, colors, Message, ui } from '@/components/discovery/ui';
import { ProfileCollections, ProfileDraftCard, ProfileHeader, ProfileIdentity, ProfileJourneyCard, profileStyles as s } from '@/components/profile/profile-ui';
import { useSessionState } from '@/hooks/session-context';
import { useActionIntent } from '@/hooks/action-intent';
import { useLoad } from '@/hooks/use-load';
import { loadPrivateDrafts, withDraftSources, type PrivateDraftSummary } from '@/lib/remix/queries';
import { useDraftCredits } from '@/hooks/use-draft-credits';
import { loadPublishedProfileJourneys } from '@/lib/profile/queries';
import { loadOwnProfile } from '@/lib/profile/edit-queries';
import { safePhoto } from '@/lib/discovery/model';
import { signOutAccount } from '@/lib/auth/queries';
import type { PublicJourney } from '@/types/journey';

type Row = { kind: 'draft'; draft: PrivateDraftSummary } | { kind: 'published'; journey: PublicJourney };
export default function AccountScreen() {
  const router = useRouter(), auth = useSessionState(), intent = useActionIntent();
  const userId = auth.session?.user.id;
  const metadata = auth.session?.user.user_metadata;

  const loader = useCallback((signal: AbortSignal) => userId ? loadPrivateDrafts(userId, signal, { lineage: true }) : Promise.resolve([]), [userId]);
  const drafts = useLoad(loader);
  // The list shows at once; parent titles/authors fill in as they resolve.
  const credits = useDraftCredits(drafts.data);
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
  const [deleteMessage, setDeleteMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const buddy = useBuddyPreference();
  const resetBuddyGreetings = useBuddyGreetingsReset();
  const window = useWindowDimensions();
  const buddyGridProtection = useBuddyProtectedBounds(useCallback(rect => [
    { x: 0, y: 0, width: window.width, height: Math.max(0, rect.y - 8) },
    { x: 0, y: rect.y + rect.height + 8, width: window.width, height: window.height },
  ], [window.width, window.height]));
  const scroll = useBuddyScroll(), footerProtection = useBuddyProtectedBounds();
  // Only a loaded draft is offered; nothing is written and no copy is made from here.
  // A failed refresh may leave a deleted draft in the last-known list, so offer only a successful load.
  const resumeDraft = drafts.error ? undefined : drafts.data?.[0];
  useBuddyScreen({ floating: true, suppressed: settings || busy || auth.loading, resume: resumeDraft ? { id: resumeDraft.id, title: resumeDraft.title } : undefined });
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
  const rows: Row[] = tab === 'drafts' ? withDraftSources(drafts.data || [], credits).map(draft => ({ kind: 'draft', draft })) : (published.data?.journeys || []).map(journey => ({ kind: 'published', journey }));
  const loading = tab === 'drafts' ? drafts.loading : published.loading;
  const collectionError = tab === 'drafts' ? drafts.error : published.error;
  const refresh = tab === 'drafts' ? drafts.refresh : published.refresh;
  const retry = tab === 'drafts' ? drafts.retry : published.retry;
  if (auth.session && loading && !drafts.data && !published.data) return <BrandedLoading message="Opening your journeys…" />;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.safe}><View style={ui.page}>
    <ProfileHeader onSettings={() => setSettings(true)} />
    <View style={{ flex: 1, minHeight: 0 }}>
    {auth.loading ? <ActivityIndicator accessibilityLabel="Loading account" /> : !auth.session ? <View style={s.content}><Message title="Your next chapter" body="Sign in to Like, Save, and create private journey copies." retry={() => router.push('/auth')} action="Sign in or register" />{auth.error && <Text accessibilityRole="alert" style={ui.body}>{auth.error}</Text>}</View>
      : <FlatList {...scroll} data={rows} keyExtractor={row => row.kind + ':' + (row.kind === 'draft' ? row.draft.id : row.journey.id)} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={tab === 'drafts' ? drafts.refreshing : published.refreshing} onRefresh={refresh} tintColor={colors.ink} />}
        renderItem={({ item }) => item.kind === 'draft' ? <ProfileDraftCard draft={item.draft} onDeleted={() => { setDeleteMessage('Draft deleted.'); refreshDrafts(); }} /> : <ProfileJourneyCard journey={item.journey} />}
        ListHeaderComponent={<View>
          {deleteMessage ? <Text accessibilityLiveRegion="polite" style={s.notice}>{deleteMessage}</Text> : null}
          <ProfileIdentity name={name} username={profile?.username || null} bio={bio} avatar={avatar} owner count={null} onCreate={() => router.push('/create')} />
          <ProfileCollections publishedCount={published.data ? published.data.journeys.length : null} draftCount={drafts.data ? drafts.data.length : null} selected={tab} onSelect={setTab} />
          {buddy.loaded && buddy.enabled && <View {...buddyGridProtection} testID="profile-buddy-grid" pointerEvents="none" accessible={false} style={{ height: 88 }} />}
          <View style={s.section}><View style={s.sectionTop}><Text accessibilityRole="header" style={s.heading}>My journeys</Text><Text style={s.sectionNote}>{tab === 'drafts' ? 'Pick up where you left off' : 'Your shared stories'}</Text></View></View>
          {(error || auth.error) && <Text accessibilityRole="alert" style={ui.body}>{error || auth.error}</Text>}
          {collectionError && rows.length > 0 && <Message title="Couldn’t refresh journeys" body={collectionError} retry={retry} />}
        </View>}
        ListEmptyComponent={loading ? <ActivityIndicator accessibilityLabel={tab === 'drafts' ? 'Loading private drafts' : 'Loading published journeys'} /> : collectionError ? <Message title={tab === 'drafts' ? 'Couldn’t load drafts' : 'Couldn’t load journeys'} body={collectionError} retry={retry} />
          : <Message title={tab === 'drafts' ? 'No private drafts yet' : 'No public journeys yet'} body={tab === 'drafts' ? 'Remix a public journey or start your own story.' : 'Your published journeys will appear here.'} retry={() => router.push('/create')} action="Create Journey" />}
        ListFooterComponent={<Pressable {...footerProtection} accessibilityRole="button" accessibilityLabel={tab === 'drafts' ? 'Refresh drafts' : 'Refresh published journeys'} onPress={refresh} style={s.close}><Text style={ui.body}>↻ Refresh {tab === 'drafts' ? 'drafts' : 'journeys'}</Text></Pressable>} />}
    </View>
    <Modal visible={settings} transparent animationType="none" onRequestClose={() => { if (!busy) setSettings(false); }}>
      <View style={s.shade}><SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}><ScrollView keyboardShouldPersistTaps="handled">
        <View style={s.settingsRow}><Text accessibilityRole="header" style={s.heading}>Account settings</Text><Pressable accessibilityRole="button" accessibilityLabel="Close account settings" disabled={busy} onPress={() => setSettings(false)} style={s.close}><Text style={s.heading}>×</Text></Pressable></View>
        <View style={[s.settingsRow, { gap: 12, marginBottom: 12 }]}><View style={{ flex: 1 }}><Text style={s.heading}>Journey Buddy</Text><Text style={ui.body}>A tiny explorer for your adventures. Saved on this device.</Text></View>
          <Switch accessibilityLabel="Journey Buddy" accessibilityHint="Show or hide your little journey helper" disabled={!buddy.loaded} value={buddy.enabled} onValueChange={buddy.setEnabled} /></View>
        <Action label="Show Buddy greetings again" secondary onPress={resetBuddyGreetings} />
        {buddy.error && <Text accessibilityRole="alert" style={ui.body}>{buddy.error}</Text>}
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
