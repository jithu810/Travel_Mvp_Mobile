import { theme as appTheme } from '@/theme/mobile-theme';
import { TravelPreferencesSettings } from '@/components/buddy/travel-preferences-settings';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, AppState, FlatList, Modal, Pressable, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { useBuddyGreetingsReset, useBuddyPreference, useBuddyScreen } from '@/hooks/use-journey-buddy';
import { useBuddyProtectedBounds, useBuddyScroll } from '@/hooks/use-buddy-geometry';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, colors, Message, ui } from '@/components/discovery/ui';
import { ProfileCollections, ProfileDraftCard, ProfileHeader, ProfileIdentity, ProfileJourneyCard, type ProfileCollection, profileStyles as s } from '@/components/profile/profile-ui';
import { useSessionState } from '@/hooks/session-context';
import { useActionIntent } from '@/hooks/action-intent';
import { useLoad } from '@/hooks/use-load';
import { loadPrivateDrafts, withDraftSources, type PrivateDraftSummary } from '@/lib/remix/queries';
import { useDraftCredits } from '@/hooks/use-draft-credits';
import { loadPublishedProfileJourneys } from '@/lib/profile/queries';
import { loadOwnProfile } from '@/lib/profile/edit-queries';
import { safePhoto } from '@/lib/discovery/model';
import { signOutAccount } from '@/lib/auth/queries';
import { creationRecovery } from '@/lib/create/recovery-store';
import { tripPersistence } from '@/lib/journey/trip-recovery-store';
import { loadSavedJourneys } from '@/lib/social/saved-queries';
import { ProfileConnections } from '@/components/profile/profile-connections';
import { ProfileMemoryMap } from '@/components/profile/profile-memory-map';
import type { PublicJourney } from '@/types/journey';
import { journeyFeedSessions } from '@/lib/discovery/journey-feed-session';

type Row = { kind: 'draft'; draft: PrivateDraftSummary } | { kind: 'published' | 'saved'; journey: PublicJourney };
export default function AccountScreen() {
  const router = useRouter(), auth = useSessionState(), intent = useActionIntent();
  const params = useLocalSearchParams<{ collection?: string | string[] }>();
  const requested = params.collection === 'drafts' || params.collection === 'saved' || params.collection === 'published' ? params.collection : null;
  const [selectedTab, setTab] = useState<ProfileCollection>(() => requested ?? 'published');
  if (requested && selectedTab !== requested) setTab(requested);
  const tab = requested ?? selectedTab;
  // A deep link is a one-time collection request. Consume it so a later View all
  // request can select Drafts again while normal Back keeps the chosen tab.
  useEffect(() => {
    if (params.collection === undefined) return;
    router.setParams({ collection: undefined });
  }, [params.collection, router]);
  const userId = auth.session?.user.id;
  const accessToken = auth.session?.access_token;
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
  // Private Saved is loaded only when selected and the current session is settled.
  // Loader replacement hides old results immediately on account/token changes.
  const savedLoader = useCallback((signal: AbortSignal) => {
    if (tab !== 'saved' || auth.loading || auth.error || !userId || !accessToken) return Promise.resolve([] as PublicJourney[]);
    return loadSavedJourneys(userId, signal);
  }, [tab, auth.loading, auth.error, userId, accessToken]);
  const saved = useLoad(savedLoader);
  const [settings, setSettings] = useState(false), [busy, setBusy] = useState(false);
  const signOutLock = useRef(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  // Map loads only inside its mounted component. Focus is a soft refresh (45 s cache);
  // foreground and pull-to-refresh force a fresh read.
  const [mapRefresh, setMapRefresh] = useState(0), [mapReload, setMapReload] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const buddy = useBuddyPreference();
  const resetBuddyGreetings = useBuddyGreetingsReset();
  const scroll = useBuddyScroll(), footerProtection = useBuddyProtectedBounds();
  // Only a loaded draft is offered; nothing is written and no copy is made from here.
  // A failed or running refresh may hold a deleted draft in the last-known list, so offer only a settled, successful load.
  const resumeDraft = drafts.error || drafts.refreshing ? undefined : drafts.data?.[0];
  // Temporarily hidden during profile design; preference and resume context stay intact.
  useBuddyScreen({ floating: tab !== 'map', suppressed: tab !== 'map' || settings || auth.loading || !auth.session, resume: resumeDraft ? { id: resumeDraft.id, title: resumeDraft.title } : undefined });
  const refreshDrafts = drafts.refresh, refreshPublished = published.refresh, refreshSaved = saved.refresh;
  const activeTab = useRef(tab);
  useEffect(() => { activeTab.current = tab; }, [tab]);
  useFocusEffect(useCallback(() => {
    refreshDrafts(); refreshPublished();
    if (activeTab.current === 'saved') refreshSaved();
    if (activeTab.current === 'map') setMapRefresh(value => value + 1);
    const listener = AppState.addEventListener('change', next => {
      if (next !== 'active') return;
      if (activeTab.current === 'drafts') refreshDrafts();
      else if (activeTab.current === 'saved') refreshSaved();
      else refreshPublished();
      if (activeTab.current === 'map') setMapReload(value => value + 1);
    });
    return () => listener.remove();
  }, [refreshDrafts, refreshPublished, refreshSaved]));
  async function signOut() {
    if (signOutLock.current) return;
    signOutLock.current = true;
    setBusy(true); setError(null); intent.cancel();
    // Unsaved Create work and unfinished-trip copies on this device belong to the signed-out account only.
    try { await signOutAccount(); if (userId) { void creationRecovery.clearUser(userId); void tripPersistence.clearUser(userId); } setSettings(false); } catch { setError('Couldn’t sign out. Please retry.'); } finally { signOutLock.current = false; setBusy(false); }
  }
  const profile = published.data?.profile;
  const name = profile?.displayName || (typeof metadata?.display_name === 'string' && metadata.display_name.trim() ? metadata.display_name.trim() : 'Traveler');
  const metadataAvatar = safePhoto(metadata?.avatar_url);
  const avatar = profile?.avatar || (metadataAvatar?.startsWith('https:') ? metadataAvatar : null);
  const bio = profile?.bio || (typeof metadata?.bio === 'string' ? metadata.bio : null);
  const savedVisible = !auth.loading && !auth.error && userId && accessToken;
  const rows: Row[] = tab === 'drafts' ? withDraftSources(drafts.data || [], credits).map(draft => ({ kind: 'draft', draft }))
    : tab === 'saved' ? (savedVisible ? saved.data || [] : []).map(journey => ({ kind: 'saved', journey }))
      : tab === 'map' ? []
      : (published.data?.journeys || []).map(journey => ({ kind: 'published', journey }));
  const collection = tab === 'drafts' ? drafts : tab === 'saved' ? saved : published;
  // The map owns its own loading/error states; it refreshes alongside the published list.
  const loading = tab === 'map' ? false : collection.loading;
  const collectionError = tab === 'map' ? null : tab === 'saved' && !savedVisible ? auth.error || 'Sign in again to see your saved journeys.' : collection.error;
  const refresh = tab === 'map' ? () => { refreshPublished(); setMapReload(value => value + 1); } : collection.refresh, retry = collection.retry;
  const collectionTitle = tab === 'drafts' ? 'Private drafts' : tab === 'saved' ? 'Saved journeys' : tab === 'map' ? 'Travel map' : 'My journeys';
  const grid = tab === 'published' || tab === 'saved';
  const fullWidthCollection = grid || tab === 'map';
  const [listHeight, setListHeight] = useState(0), [headerHeight, setHeaderHeight] = useState(0), [mapOnScreen, setMapOnScreen] = useState(false);
  const listOffset = useRef(0);
  const mapHeight = Math.max(160, listHeight - headerHeight - 6);
  useEffect(() => { setMapOnScreen(listOffset.current + listHeight > headerHeight + 6 && listOffset.current < headerHeight + 6 + mapHeight); }, [listHeight, headerHeight, mapHeight]);
  const openJourney = (id: string) => {
    const ids = rows.flatMap(row => row.kind === 'draft' ? [] : [row.journey.id]);
    const session = journeyFeedSessions.create(ids, id, userId || 'anonymous', { fullCollection: true });
    if (session) router.push({ pathname: '/journey-feed', params: { session } });
  };
  const emptyCollection = tab === 'map' ? (userId ? <ProfileMemoryMap key={userId} ownerId={userId} refreshKey={mapRefresh} reloadKey={mapReload} owner fullBleed mapHeight={mapHeight} onScreen={mapOnScreen} journeyCovers={published.data?.journeys} /> : null) : loading ? <ActivityIndicator color={appTheme.accent} accessibilityLabel={'Loading ' + collectionTitle.toLowerCase()} /> : collectionError ? <Message title="Couldn’t load this collection" body={collectionError} retry={retry} />
          : tab === 'saved' ? <Message title="No saved journeys yet" body="Save a journey you love and find it here when you are ready to explore." retry={() => router.push('/search')} action="Explore journeys" />
            : <Message title={tab === 'drafts' ? 'No private drafts yet' : 'No public journeys yet'} body={tab === 'drafts' ? 'Start with a place and a title, then save your journey privately. You can return here to add stops and memories before publishing.' : 'Journeys you choose to publish will appear here. You can start a private draft and share it when you are ready.'} retry={() => router.push('/create')} action="Start a journey" />;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.safe}><View style={ui.page}>
    <ProfileHeader onSettings={() => setSettings(true)} />
    <View style={{ flex: 1, minHeight: 0 }} onLayout={event => { const next = event.nativeEvent.layout.height;if (next > 0) setListHeight(previous => previous === next ? previous : next); }}>
    {auth.loading ? <ActivityIndicator color={appTheme.accent} accessibilityLabel="Loading account" /> : !auth.session ? <View style={s.content}><Message title="Your next chapter" body="Sign in to Like, Save, and create private journey copies." retry={() => router.push('/auth')} action="Sign in or register" />{auth.error && <Text accessibilityRole="alert" style={ui.body}>{auth.error}</Text>}</View>
      : <FlatList {...scroll} key={tab === 'drafts' ? 'draft-list' : 'journey-grid-3'} numColumns={tab === 'drafts' ? 1 : 3} columnWrapperStyle={tab === 'drafts' ? undefined : grid ? s.seamlessGridRow : s.gridRow}
        onScroll={event => { scroll.onScroll();listOffset.current = event.nativeEvent.contentOffset.y;setMapOnScreen(listOffset.current + listHeight > headerHeight + 6 && listOffset.current < headerHeight + 6 + mapHeight); }} scrollEventThrottle={32}
        data={rows} keyExtractor={row => row.kind + ':' + (row.kind === 'draft' ? row.draft.id : row.journey.id)} contentContainerStyle={fullWidthCollection ? tab === 'map' ? [s.accountGridContent, { paddingBottom: 0 }] : s.accountGridContent : s.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={collection.refreshing} onRefresh={refresh} tintColor={colors.ink} />}
        renderItem={({ item, index }) => item.kind === 'draft' ? <ProfileDraftCard draft={item.draft} onDeleted={() => { setDeleteMessage('Draft deleted.'); refreshDrafts(); }} /> : <ProfileJourneyCard journey={item.journey} edgeToEdge separators={{ left: index % 3 !== 0, top: index >= 3 }} onPress={() => openJourney(item.journey.id)} />}
        ListHeaderComponent={<View style={fullWidthCollection ? s.accountInset : undefined} onLayout={event => { const next = event.nativeEvent.layout.height;if (next > 0) setHeaderHeight(previous => previous === next ? previous : next); }}>
          {deleteMessage ? <Text accessibilityLiveRegion="polite" style={s.notice}>{deleteMessage}</Text> : null}
          <ProfileIdentity name={name} username={profile?.username || null} bio={bio} avatar={avatar} owner count={null} onCreate={() => router.push('/create')}
            connections={userId ? <ProfileConnections key={userId} targetId={userId} name={name} compact /> : null} />
          <ProfileCollections publishedCount={published.data ? published.data.journeys.length : null} draftCount={drafts.data ? drafts.data.length : null} savedCount={tab === 'saved' && savedVisible && saved.data ? saved.data.length : null} selected={tab} onSelect={setTab} />
          {tab !== 'published' && tab !== 'map' && <View style={s.section}><View style={s.sectionTop}><Text accessibilityRole="header" style={s.heading}>{collectionTitle}</Text><Text style={s.sectionNote}>{tab === 'drafts' ? 'Only you · Continue editing' : 'Only you · For later'}</Text></View></View>}
          {(error || auth.error) && <Text accessibilityRole="alert" style={ui.body}>{error || auth.error}</Text>}
          {collectionError && rows.length > 0 && <Message title="Couldn’t refresh journeys" body={collectionError} retry={retry} />}
        </View>}
        ListEmptyComponent={grid ? <View style={s.accountInset}>{emptyCollection}</View> : emptyCollection}
        ListFooterComponentStyle={fullWidthCollection ? s.accountInset : undefined}
        ListFooterComponent={tab === 'map' ? null : <Pressable {...footerProtection} accessibilityRole="button" accessibilityLabel={'Refresh ' + collectionTitle.toLowerCase()} onPress={refresh} style={s.close}><Text style={ui.body}>↻ Refresh {tab === 'drafts' ? 'drafts' : tab === 'saved' ? 'saved journeys' : 'journeys'}</Text></Pressable>} />}
    </View>
    <Modal visible={settings} transparent animationType="none" onRequestClose={() => { if (!busy) setSettings(false); }}>
      <View style={s.shade}><SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}><ScrollView keyboardShouldPersistTaps="handled">
        <View style={s.settingsRow}><Text accessibilityRole="header" style={s.heading}>Account settings</Text><Pressable accessibilityRole="button" accessibilityLabel="Close account settings" disabled={busy} onPress={() => setSettings(false)} style={s.close}><Text style={s.heading}>×</Text></Pressable></View>
        <View style={[s.settingsRow, { gap: 12, marginBottom: 12 }]}><View style={{ flex: 1 }}><Text style={s.heading}>Journey Buddy</Text><Text style={ui.body}>A tiny explorer for your adventures. Saved on this device.</Text></View>
          <Switch trackColor={{ false: appTheme.border, true: appTheme.navigation }} thumbColor={appTheme.white} ios_backgroundColor={appTheme.border} accessibilityLabel="Journey Buddy" accessibilityHint="Show or hide your little journey helper" style={{ minWidth: 48, minHeight: 48 }} disabled={!buddy.loaded} value={buddy.enabled} onValueChange={buddy.setEnabled} /></View>
        <Action label="Show Buddy greetings again" secondary onPress={resetBuddyGreetings} />
        {buddy.error && <Text accessibilityRole="alert" style={ui.body}>{buddy.error}</Text>}
        <TravelPreferencesSettings />
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
