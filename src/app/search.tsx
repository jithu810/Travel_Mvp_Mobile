import { BrandedLoading } from '@/components/branded-loading';
import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JourneyCard } from '@/components/discovery/journey-card';
import { colors, LoadingCards, Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { useLoad } from '@/hooks/use-load';
import { searchJourneys } from '@/lib/discovery/model';
import { loadPublicJourneys } from '@/lib/discovery/queries';

export default function SearchScreen() {
  const state = useLoad(loadPublicJourneys);
  const { view } = useLocalSearchParams<{ view?: string }>();
  // Story opens the existing public collection without inheriting a Search filter.
  // Keep the Search query intact when returning from the Story entry point.
  const [searchQuery, setQuery] = useState('');
  const [storyQuery, setStoryQuery] = useState('');
  const query = view === 'stories' ? storyQuery : searchQuery;
  const changeQuery = view === 'stories' ? setStoryQuery : setQuery;
  const results = useMemo(() => searchJourneys(state.data || [], query), [state.data, query]);
  const places = useMemo(() => [...new Set((state.data || []).map(j => j.destination))].slice(0, 5), [state.data]);
  if (state.loading && !state.data) return <BrandedLoading message="Finding your next journey…" />;
  return <SafeAreaView style={ui.safe}>
    <KeyboardAvoidingView style={ui.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Find your next journey" back />
      <View style={styles.controls}>
        <View style={styles.inputRow}>
          <TextInput accessibilityLabel="Search journeys, places, stops or creators" placeholder="Try a place, stop or creator"
            placeholderTextColor={colors.muted} value={query} onChangeText={changeQuery} maxLength={120}
            autoCapitalize="none" autoCorrect={false} returnKeyType="search" submitBehavior="blurAndSubmit" style={styles.input}
            clearButtonMode="never" />
          {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => changeQuery('')} style={styles.clear}><Text style={styles.clearText}>×</Text></Pressable>}
        </View>
        <Text style={styles.hint}>Search titles, destinations, stops and creators in the latest 100 public journeys.</Text>
      </View>
      <FlatList data={results} keyExtractor={item => item.id} renderItem={({ item }) => <JourneyCard journey={item} />}
        contentContainerStyle={ui.list} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={colors.ink} />}
        ListHeaderComponent={<View style={styles.resultsHeader}>
          {!query.trim() && places.length > 0 && <View style={styles.places}>{places.map(place => <Pressable key={place} accessibilityRole="button" accessibilityLabel={'Search ' + place} onPress={() => changeQuery(place)} style={styles.chip}><Text style={styles.chipText}>{place}</Text></Pressable>)}</View>}
          {!state.loading && <Text accessibilityLiveRegion="polite" style={ui.body}>{query.trim() ? results.length + (results.length === 1 ? ' journey found' : ' journeys found') : 'Explore recent journeys'}</Text>}
          {state.error && results.length > 0 && <Message title="Couldn’t refresh results" body={state.error} retry={state.refresh} />}
        </View>}
        ListEmptyComponent={state.loading ? <LoadingCards /> : state.error
          ? <Message title="Search took a detour" body={state.error} retry={state.retry} />
          : query.trim() ? <Message title="No journeys found" body="Try a different place, stop, journey title or creator. Search covers the latest 100 public journeys." retry={() => changeQuery('')} action="Clear search" />
          : <Message title="More stories are on their way" body="There are no public journeys to explore yet." retry={state.refresh} action="Refresh journeys" />}
      />
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  controls: { paddingHorizontal: 22, paddingBottom: 14, gap: 10 },
  inputRow: { flexDirection: 'row', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, alignItems: 'center', minHeight: 56 },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 16, paddingVertical: 16, fontSize: 15, color: colors.ink },
  clear: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 25, color: colors.muted },
  hint: { fontSize: 11, lineHeight: 17, color: colors.muted },
  resultsHeader: { gap: 14, paddingBottom: 18 },
  places: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.pale },
  chipText: { color: colors.ink, fontSize: 12, fontWeight: '500' },
});
