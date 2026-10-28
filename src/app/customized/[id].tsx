import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { JourneyStoryContent } from '@/app/journey/[id]';
import { useTripSnapshot } from '@/hooks/use-trip-session';
import { customizedSourceId, customizedTravel, removeCustomizedStop } from '@/lib/journey/customized-travel';

// Only the story presentation is reused: local IDs never reach public/social actions.
export default function CustomizedJourneyScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const routeId = typeof params.id === 'string' ? params.id : '';
  const journey = customizedTravel(routeId);
  const id = journey?.id ?? routeId;
  const session = useTripSnapshot(id);
  const editingBlocked = session.status === 'active' || session.status === 'paused';
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(true);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; };
  }, []));
  const remove = (stopId: string) => {
    if (!journey || !focused.current || editingBlocked) return;
    try {
      const next = removeCustomizedStop(journey, stopId);
      setError(null);
      router.replace({ pathname: '/customized/[id]', params: { id: next } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to remove this stop.'); }
  };
  const returnToCards = () => {
    if (!focused.current) return;
    if (router.canGoBack()) router.back();
    else {
      if (editingBlocked) { setError('Finish this trip in Travel Mode before choosing stops again.'); return; }
      const sourceId = customizedSourceId(routeId);
      if (sourceId) router.replace({ pathname: '/customize/[id]', params: { id: sourceId } });
      else router.replace('/discover');
    }
  };
  return <SafeAreaView style={ui.safe} edges={journey ? ['left', 'right', 'bottom'] : ['top', 'left', 'right', 'bottom']}><View style={ui.page}>
    {journey ? <JourneyStoryContent key={id} journey={journey} refreshing={false} error={null} refresh={() => {}}
      temporary={{ onRemove: remove, onBack: returnToCards, editingBlocked, error }} /> : <>
      <ScreenHeader title="Your journey" back />
      <Message title="Selection unavailable" body="This local selection is unavailable. Return to Customize stops and select again." />
    </>}
  </View></SafeAreaView>;
}
