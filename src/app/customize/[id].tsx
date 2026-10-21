import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View } from 'react-native';
import { BrandedLoading } from '@/components/branded-loading';
import { Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { CustomizeStops } from '@/components/journey/customize-stops';
import { useLoad } from '@/hooks/use-load';
import { loadPublicJourney } from '@/lib/discovery/queries';
export default function CustomizeStopsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const loader = useCallback((signal: AbortSignal) => loadPublicJourney(id, signal), [id]);
  const state = useLoad(loader);
  return <SafeAreaView style={ui.safe}><View style={ui.page}>
    {state.data ? <CustomizeStops key={id} journey={state.data} /> : <><ScreenHeader title="Customize stops" back /><ScrollView contentContainerStyle={ui.list}>
      {state.loading ? <BrandedLoading message="Loading the original stops…" /> : <Message title="Journey unavailable" body={state.error || 'This journey is no longer public.'} retry={state.retry} />}
    </ScrollView></>}
  </View></SafeAreaView>;
}
