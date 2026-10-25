import { BrandedLoading } from '@/components/branded-loading';
import { useBuddyScreen } from '@/hooks/use-journey-buddy';
import { useBuddyScroll } from '@/hooks/use-buddy-geometry';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, Message, ui } from '@/components/discovery/ui';
import { ProfileHeader, ProfileIdentity, ProfileJourneyCard as JourneyCard, ProfileTabs, profileStyles as s } from '@/components/profile/profile-ui';
import { useSessionState } from '@/hooks/session-context';
import { useLoad } from '@/hooks/use-load';
import { loadPublicProfile } from '@/lib/profile/queries';

export default function CreatorProfileScreen() {
  const params = useLocalSearchParams<{ username: string | string[] }>();
  const handle = typeof params.username === 'string' ? params.username : '';
  const router = useRouter(), auth = useSessionState();
  const loader = useCallback((signal: AbortSignal) => loadPublicProfile(handle, signal), [handle]);
  const state = useLoad(loader), value = state.data;
  const scroll = useBuddyScroll();
  useBuddyScreen({ floating: true, suppressed: state.loading || !value });
  const refresh = state.refresh;
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const owner = Boolean(value && auth.session?.user.id === value.profile.id);
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.safe}><View style={ui.page}>
    <ProfileHeader onSettings={() => router.push('/account')} />
    {state.loading ? <BrandedLoading message="Opening this travel journal…" /> : !value
      ? <View style={s.content}><Message title={state.error ? 'A small detour' : 'Creator unavailable'} body={state.error || 'This public creator profile could not be found.'} retry={state.retry} /></View>
      : <FlatList {...scroll} data={value.journeys} keyExtractor={journey => journey.id} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <JourneyCard journey={item} />}
        refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={colors.ink} />}
        ListHeaderComponent={<View>
          {state.error && <Message title="Couldn’t refresh this profile" body={state.error} retry={state.refresh} />}
          <ProfileIdentity name={value.profile.displayName || value.profile.username} username={value.profile.username} bio={value.profile.bio} avatar={value.profile.avatar} count={value.journeys.length} owner={owner} />
          <View style={s.section}><Text accessibilityRole="header" style={s.heading}>Published journeys</Text>
            <ProfileTabs selected="published" drafts={owner} onSelect={tab => { if (tab === 'drafts' && owner) router.push('/account'); }} />
          </View>
        </View>}
        ListEmptyComponent={<Message title="No public journeys yet" body="This creator hasn’t shared a public journey here yet." />} />}
  </View></SafeAreaView>;
}
