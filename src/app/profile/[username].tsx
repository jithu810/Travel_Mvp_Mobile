import { BrandedLoading } from '@/components/branded-loading';
import { useBuddyScreen } from '@/hooks/use-journey-buddy';
import { useBuddyScroll } from '@/hooks/use-buddy-geometry';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, Message, ui } from '@/components/discovery/ui';
import { ProfileHeader, ProfileIdentity, ProfileJourneyCard as JourneyCard, ProfileTabs, profileStyles as s } from '@/components/profile/profile-ui';
import { useSessionState } from '@/hooks/session-context';
import { useLoad } from '@/hooks/use-load';
import { loadPublicProfile } from '@/lib/profile/queries';
import { ProfileConnections } from '@/components/profile/profile-connections';
import { ProfileMemoryMap } from '@/components/profile/profile-memory-map';

export default function CreatorProfileScreen() {
  const params = useLocalSearchParams<{ username: string | string[] }>();
  const handle = typeof params.username === 'string' ? params.username : '';
  const router = useRouter(), auth = useSessionState();
  const loader = useCallback((signal: AbortSignal) => loadPublicProfile(handle, signal), [handle]);
  const state = useLoad(loader), value = state.data;
  const scroll = useBuddyScroll();
  // Temporary profile-only hiding while the memory collections are designed.
  useBuddyScreen({ floating: true, suppressed: true });
  const refresh = state.refresh;
  // Map is a view of the same published profile; it loads lazily inside its component
  // and refreshes with this profile: focus is soft (45 s cache), pull-to-refresh forces.
  const [tab, setTab] = useState<'published' | 'map'>('published');
  const [mapRefresh, setMapRefresh] = useState(0), [mapReload, setMapReload] = useState(0);
  const activeTab = useRef(tab);
  useEffect(() => { activeTab.current = tab; }, [tab]);
  useFocusEffect(useCallback(() => { refresh(); if (activeTab.current === 'map') setMapRefresh(value => value + 1); }, [refresh]));
  const refreshAll = () => { state.refresh(); if (tab === 'map') setMapReload(value => value + 1); };
  const owner = Boolean(value && auth.session?.user.id === value.profile.id);
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.safe}><View style={ui.page}>
    <ProfileHeader onSettings={() => router.push('/account')} />
    {state.loading ? <BrandedLoading message="Opening this travel journal…" /> : !value
      ? <View style={s.content}><Message title={state.error ? 'A small detour' : 'Creator unavailable'} body={state.error || 'This public creator profile could not be found.'} retry={state.retry} /></View>
      : <FlatList {...scroll} key="journey-grid-3" numColumns={3} columnWrapperStyle={s.gridRow} data={tab === 'map' ? [] : value.journeys} keyExtractor={journey => journey.id} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <JourneyCard journey={item} />}
        refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={refreshAll} tintColor={colors.ink} />}
        ListHeaderComponent={<View>
          {state.error && <Message title="Couldn’t refresh this profile" body={state.error} retry={state.refresh} />}
          <ProfileIdentity name={value.profile.displayName || value.profile.username} username={value.profile.username} bio={value.profile.bio} avatar={value.profile.avatar} count={value.journeys.length} owner={owner} />
          <ProfileConnections key={value.profile.id} targetId={value.profile.id} name={value.profile.displayName || value.profile.username} />
          <View style={s.section}><Text accessibilityRole="header" style={s.heading}>Journeys</Text>
            <ProfileTabs selected={tab} drafts={owner} onSelect={next => { if (next === 'drafts') { if (owner) router.push({ pathname: '/account', params: { collection: 'drafts' } }); } else setTab(next); }} />
          </View>
        </View>}
        ListEmptyComponent={tab === 'map' ? <ProfileMemoryMap key={value.profile.id} ownerId={value.profile.id} refreshKey={mapRefresh} reloadKey={mapReload} owner={owner} /> : <Message title="No public journeys yet" body="This creator hasn’t shared a public journey here yet." />} />}
  </View></SafeAreaView>;
}
