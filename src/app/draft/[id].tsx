import { BrandedLoading } from '@/components/branded-loading';
import { useBuddyScreen } from '@/hooks/use-journey-buddy';
import { useBuddyScroll } from '@/hooks/use-buddy-geometry';
import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { JourneyPhoto } from '@/components/discovery/journey-photo';
import { SourceAttribution } from '@/components/remix/source-attribution';
import { StopTimeline } from '@/components/journey/stop-timeline';
import { JourneyMap } from '@/components/journey/map/journey-map';
import { useSessionState } from '@/hooks/session-context';
import { useLoad } from '@/hooks/use-load';
import { loadPrivateDraft } from '@/lib/remix/queries';
export default function PrivateDraftScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const auth = useSessionState();
  const userId = auth.session?.user.id;
  const loader = useCallback((signal: AbortSignal) => userId ? loadPrivateDraft(id, userId, signal) : Promise.resolve(null), [id, userId]);
  const state = useLoad(loader);
  const scroll = useBuddyScroll();
  useBuddyScreen({ floating: true, suppressed: auth.loading || !auth.session || state.loading || !state.data });
  return <SafeAreaView style={ui.safe}><View style={ui.page}><ScreenHeader title="Private draft" back />
    <ScrollView {...scroll} contentContainerStyle={[ui.list, { gap: 24 }]}>
      {auth.loading ? <ActivityIndicator /> : !auth.session ? <Message title="Sign in to open your draft" body="Private copies are available only to their owner." action="Sign in" retry={() => router.push('/auth')} />
        : state.loading ? <BrandedLoading message="Opening your private journey…" /> : !state.data ? <Message title="Draft unavailable" body={state.error || 'This draft may belong to another account or no longer be available.'} retry={state.retry} />
          : <><Text style={ui.eyebrow}>PRIVATE · UNPUBLISHED</Text><Text style={ui.heading}>{state.data.title}</Text>
            <JourneyPhoto uri={state.data.cover} label={state.data.title} map={{ points: state.data.stops }} mapLabel={'Map of ' + state.data.title + '. No cover photo yet.'} />
            <Action label="Continue editing" onPress={() => router.push({ pathname: '/create', params: { draft: id } })} />
            {state.data.description ? <Text style={ui.body}>{state.data.description}</Text> : null}
            {state.data.sourceId && <SourceAttribution id={state.data.sourceId} />}
            <JourneyMap stops={state.data.stops} /><StopTimeline stops={state.data.stops} />
            <Action label="Account and private drafts" onPress={() => router.push('/account')} /></>}
    </ScrollView></View></SafeAreaView>;
}
