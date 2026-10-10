import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, LoadingCards, Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { JourneyCard } from '@/components/discovery/journey-card';
import { JourneyPhoto } from '@/components/discovery/journey-photo';
import { useLoad } from '@/hooks/use-load';
import { loadPublicProfile } from '@/lib/profile/queries';

export default function CreatorProfileScreen() {
  const params = useLocalSearchParams<{ username: string | string[] }>();
  const handle = typeof params.username === 'string' ? params.username : '';
  const loader = useCallback((signal: AbortSignal) => loadPublicProfile(handle, signal), [handle]);
  const state = useLoad(loader);
  const value = state.data;
  return <SafeAreaView style={ui.safe}><View style={ui.page}>
    <ScreenHeader title="Creator profile" back />
    {state.loading ? <View style={ui.list}><LoadingCards /></View> : !value
      ? <View style={ui.list}><Message title={state.error ? 'A small detour' : 'Creator unavailable'}
        body={state.error || 'This public creator profile could not be found.'} retry={state.retry} /></View>
      : <FlatList data={value.journeys} keyExtractor={journey => journey.id} contentContainerStyle={ui.list}
        showsVerticalScrollIndicator={false} renderItem={({ item }) => <JourneyCard journey={item} />}
        refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={colors.ink} />}
        ListHeaderComponent={<View style={styles.header}>
          {state.error && <Message title="Couldn’t refresh this profile" body={state.error} retry={state.refresh} />}
          {value.profile.avatar && <View style={styles.avatar}><JourneyPhoto uri={value.profile.avatar} ratio={1} label={(value.profile.displayName || value.profile.username) + ' avatar'} /></View>}
          <Text style={ui.eyebrow}>A FELLOW TRAVELER</Text>
          <Text accessibilityRole="header" style={ui.heading}>{value.profile.displayName || '@' + value.profile.username}</Text>
          {value.profile.displayName && <Text style={styles.handle}>@{value.profile.username}</Text>}
          {value.profile.bio && <Text style={ui.body}>{value.profile.bio}</Text>}
          <Text style={styles.count}>{value.journeys.length} public {value.journeys.length === 1 ? 'journey' : 'journeys'}</Text>
          <Text accessibilityRole="header" style={ui.sectionTitle}>Shared journeys</Text>
        </View>}
        ListEmptyComponent={<Message title="No public journeys yet" body="This creator hasn’t shared a public journey here yet." />} />}
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  header: { gap: 12, paddingTop: 6, paddingBottom: 24 },
  avatar: { width: 76, height: 76, borderRadius: 38, overflow: 'hidden' },
  handle: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  count: { color: colors.green, fontSize: 13, lineHeight: 22, paddingBottom: 12 },
});
