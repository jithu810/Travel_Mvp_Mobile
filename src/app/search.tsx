import { CompactSearchInput } from '@/components/discovery/compact-search-input';
import { JourneyActionIcon } from '@/components/journey/journey-action-icon';
import { useSessionState } from '@/hooks/session-context';
import { useDiscoveryViewer } from '@/hooks/use-discovery-viewer';
import { loadSavedJourneys } from '@/lib/social/saved-queries';
import { BrandedLoading } from '@/components/branded-loading';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { AppState, FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExploreTile } from '@/components/discovery/explore-tile';
import { JourneyCard } from '@/components/discovery/journey-card';
import { colors, LoadingCards, Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { useLoad } from '@/hooks/use-load';
import { discoveryJourneys, hideViewerJourneys, searchJourneys } from '@/lib/discovery/model';
import { invalidatePublicJourneys, loadDiscoveryEntries } from '@/lib/discovery/queries';

export default function SearchScreen() {
  const state = useLoad(loadDiscoveryEntries);
  const refreshPublic = () => { invalidatePublicJourneys(); state.refresh(); };
  const { view } = useLocalSearchParams<{ view?: string }>();
  // Story opens the existing public collection without inheriting a Search filter.
  // Keep the Search query intact when returning from the Story entry point.
  const [searchQuery, setQuery] = useState('');
  const [storyQuery, setStoryQuery] = useState('');
  const explore = view !== 'stories';
  const [savedOnly, setSavedOnly] = useState(false);
  const input = useRef<TextInput>(null);
  const router = useRouter();
  const auth = useSessionState();
  const userId = auth.session?.user.id;
  const token = auth.session?.access_token;
  const showSaved = explore && savedOnly;
  const canLoadSaved = showSaved && !auth.loading && !auth.error && Boolean(userId);
  const savedLoader = useCallback((signal: AbortSignal) => canLoadSaved && userId && token
    ? loadSavedJourneys(userId, signal) : Promise.resolve([]), [canLoadSaved, userId, token]);
  const saved = useLoad(savedLoader);
  const refreshSaved = saved.refresh;
  const reloadPublic = state.refresh;
  useFocusEffect(useCallback(() => { if (showSaved) { if (canLoadSaved) refreshSaved(); } else reloadPublic(); }, [showSaved, canLoadSaved, refreshSaved, reloadPublic]));
  useEffect(() => {
    if (showSaved && !canLoadSaved) return;
    const listener = AppState.addEventListener('change', next => { if (next === 'active') { if (showSaved) refreshSaved(); else reloadPublic(); } });
    return () => listener.remove();
  }, [showSaved, canLoadSaved, refreshSaved, reloadPublic]);
  const collection = showSaved ? saved : state;
  const query = view === 'stories' ? storyQuery : searchQuery;
  const changeQuery = view === 'stories' ? setStoryQuery : setQuery;
  // Browsing hides the signed-in viewer's own journeys; a typed query searches all of them.
  // Saved keeps its own account-scoped collection unchanged. While the session
  // restores, only the public results area is held; the search field stays mounted.
  const viewer = useDiscoveryViewer();
  const holding = !showSaved && viewer.pending;
  const results = useMemo(() => holding ? [] : searchJourneys(showSaved ? saved.data || [] : discoveryJourneys(state.data || [], viewer.id, query), query), [holding, showSaved, saved.data, state.data, viewer.id, query]);
  const places = useMemo(() => holding ? [] : [...new Set(hideViewerJourneys(state.data || [], viewer.id).map(j => j.destination))].slice(0, 5), [holding, state.data, viewer.id]);
  // Browsing with every loaded journey hidden as the viewer's own.
  const onlyOwn = !showSaved && !holding && !query.trim() && !results.length && Boolean(state.data?.length);
  if (!showSaved && state.loading && !state.data) return <BrandedLoading message="Finding your next journey…" />;
  return <SafeAreaView style={ui.safe}>
    <KeyboardAvoidingView style={ui.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!explore && <ScreenHeader title="Find your next journey" back />}
      <View style={[styles.controls, explore && styles.exploreControls]}>
        {explore ? <View style={styles.compactRow}>
          <View style={styles.compactField}><CompactSearchInput inputRef={input} focusLabel="Focus journey search" accessibilityLabel="Search journeys, places, stops or creators"
            accessibilityHint={showSaved ? 'Filters your saved public journeys' : 'Searches the latest 100 public journeys'} placeholder="Search journeys & places..."
            value={query} onChangeText={changeQuery} maxLength={120} autoCapitalize="none" autoCorrect={false} returnKeyType="search" submitBehavior="blurAndSubmit">
            {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => changeQuery('')} hitSlop={6} style={styles.compactClear}><Text style={styles.clearText}>x</Text></Pressable>}
          </CompactSearchInput></View>
          <Pressable accessibilityRole="button" accessibilityLabel={savedOnly ? 'Show all public journeys' : 'Show saved journeys'} accessibilityState={{ selected: savedOnly }}
            onPress={() => setSavedOnly(value => !value)} style={[styles.savedToggle, savedOnly && styles.savedSelected]}><JourneyActionIcon name="bookmark" selected={savedOnly} /></Pressable>
        </View> : <View style={styles.inputRow}>
          <TextInput accessibilityLabel="Search journeys, places, stops or creators" placeholder="Try a place, stop or creator"
            placeholderTextColor={colors.muted} value={query} onChangeText={changeQuery} maxLength={120}
            autoCapitalize="none" autoCorrect={false} returnKeyType="search" submitBehavior="blurAndSubmit" style={styles.input}
            clearButtonMode="never" />
          {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => changeQuery('')} style={styles.clear}><Text style={styles.clearText}>×</Text></Pressable>}
        </View>}
        {!explore && <Text style={styles.hint}>Search titles, destinations, stops and creators in the latest 100 public journeys.</Text>}
      </View>
      <FlatList key={explore ? 'explore' : 'stories'} numColumns={explore ? 3 : 1} data={results} keyExtractor={item => item.id} renderItem={({ item }) => explore ? <ExploreTile journey={item} /> : <JourneyCard journey={item} />}
        // FlatList counts rows when numColumns is set: four rows = twelve tiles.
        initialNumToRender={explore ? 4 : undefined} maxToRenderPerBatch={explore ? 2 : undefined} windowSize={explore ? 3 : undefined} updateCellsBatchingPeriod={explore ? 50 : undefined}
        contentContainerStyle={explore ? styles.grid : ui.list} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={collection.refreshing} onRefresh={showSaved ? saved.refresh : refreshPublic} tintColor={colors.ink} />}
        ListHeaderComponent={<View style={[styles.resultsHeader, explore && styles.exploreResults]}>
          {!explore && !query.trim() && places.length > 0 && <View style={styles.places}>{places.map(place => <Pressable key={place} accessibilityRole="button" accessibilityLabel={'Search ' + place} onPress={() => changeQuery(place)} style={styles.chip}><Text style={styles.chipText}>{place}</Text></Pressable>)}</View>}
          {!collection.loading && !holding && (!explore || Boolean(query.trim()) || showSaved) && <Text accessibilityLiveRegion="polite" style={ui.body}>{query.trim() ? results.length + (results.length === 1 ? ' journey found' : ' journeys found') : showSaved ? 'Saved journeys' : 'Explore recent journeys'}</Text>}
          {collection.error && results.length > 0 && <Message title="Couldn’t refresh results" body={collection.error} retry={showSaved ? saved.refresh : refreshPublic} />}
        </View>}
        ListEmptyComponent={showSaved && (auth.loading || auth.error || !userId) ? <Message title={auth.loading ? 'Checking your account...' : auth.error ? 'Account unavailable' : 'Your saved journeys'}
          body={auth.loading ? 'Please wait while your session is restored.' : auth.error ? 'Your session could not be restored. Reopen the app to retry.' : 'Sign in to browse journeys you have saved.'}
          retry={!auth.loading && !auth.error ? () => router.push('/auth') : undefined} action="Sign in" /> : collection.loading || holding ? <LoadingCards /> : collection.error
          ? <Message title="Search took a detour" body={collection.error} retry={showSaved ? saved.retry : refreshPublic} />
          : query.trim() ? <Message title="No journeys found" body={'Try a different place, stop, journey title or creator. ' + (showSaved ? 'Search covers your saved public journeys.' : 'Search covers the latest 100 public journeys.')} retry={() => changeQuery('')} action="Clear search" />
          : onlyOwn ? <Message title="Only your journeys so far" body="Search to find them." />
          : <Message title={showSaved ? 'No saved journeys yet' : 'More stories are on their way'} body={showSaved ? 'Save a public journey using its bookmark to find it here. Unavailable journeys are omitted.' : 'There are no public journeys to explore yet.'} retry={showSaved ? saved.refresh : refreshPublic} action="Refresh journeys" />}
      />
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  compactField: { flex: 1, minWidth: 0 },
  compactClear: { minWidth: 44, minHeight: 32, alignItems: 'center', justifyContent: 'center', marginVertical: -5 },
  savedToggle: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  savedSelected: { backgroundColor: colors.pale, borderWidth: 1, borderColor: colors.green },
  grid: { flexGrow: 1, paddingBottom: 20 },
  exploreControls: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 },
  exploreResults: { paddingHorizontal: 12, paddingBottom: 0 },
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
