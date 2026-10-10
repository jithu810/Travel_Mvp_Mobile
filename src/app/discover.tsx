import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiscoveryGlobe } from '@/components/discovery/globe/discovery-globe';
import { DiscoveryPanel } from '@/components/discovery/discovery-panel';
import { colors } from '@/components/discovery/ui';
import { useLoad } from '@/hooks/use-load';
import { discoveryPoints } from '@/lib/discovery/map';
import { spaceColor } from '@/lib/discovery/presentation';
import { loadPublicJourney, loadPublicJourneys } from '@/lib/discovery/queries';

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const state = useLoad(loadPublicJourneys);
  const [railHeight, setRailHeight] = useState(260);
  const [layout, setLayout] = useState({ height: 0, width: 360 });
  const [locateVersion, setLocateVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const locate = useCallback((id: string) => { setSelectedId(id); setLocateVersion(version => version + 1); }, []);
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return;
    const entry = StatusBar.pushStackEntry({ barStyle: 'light-content' });
    return () => StatusBar.popStackEntry(entry);
  }, []));
  // Coordinates are only in public detail. Resolve one explicit selection, never N+1 card requests.
  const loadSelected = useCallback((signal: AbortSignal) => selectedId ? loadPublicJourney(selectedId, signal) : Promise.resolve(null), [selectedId]);
  const selection = useLoad(loadSelected);
  const points = useMemo(() => discoveryPoints(selection.data), [selection.data]);
  const open = useCallback((id: string) => router.push({ pathname: '/journey/[id]', params: { id } }), [router]);
  const journeys = state.data || [];
  const notice = state.error || (selectedId ? selection.error || (selection.loading ? 'Finding this journey on the map…'
    : !selection.data ? 'This journey is no longer public.'
    : !points.features.length ? 'No mapped stops for this journey. Open its story to explore.'
    : Platform.OS === 'web' ? 'Mapped stops are available in the mobile app. Open the story to explore.' : 'Tap a stop to open ' + selection.data.title) : 'Choose Locate on a journey to explore its stops.');
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
    <View style={s.page}>
      <View style={s.header}>
        <View style={s.logo}><Text style={s.logoText}>JC</Text></View>
        <Text style={s.brand}>Journey Creator</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Open account" onPress={() => router.push('/account')} style={s.account}><Text style={s.accountText}>Account</Text></Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Search journeys" onPress={() => router.push('/search')} style={s.search}>
        <Text style={s.searchIcon}>⌕</Text><Text style={s.searchText}>Places, journeys & people</Text><Text style={s.arrow}>↗</Text>
      </Pressable>
      <View style={s.exploration} onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setLayout(previous => previous.width === width && previous.height === height ? previous : { width, height });
      }}>
        <View style={s.map}><DiscoveryGlobe points={points} onOpen={open} bottomInset={railHeight} viewport={layout} selectionId={selectedId} locateVersion={locateVersion} /></View>
        <DiscoveryPanel journeys={journeys} selectedId={selectedId} onLocate={locate} onOpen={open}
          notice={notice} onClear={() => setSelectedId(null)} onRetrySelection={selection.error ? selection.retry : undefined}
          loading={state.loading} refreshing={state.refreshing} error={state.error} onRefresh={state.refresh}
          onHeight={setRailHeight} availableHeight={layout.height} availableWidth={layout.width} />
      </View>
      <View style={[s.nav, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        <View accessibilityRole="text" accessibilityLabel="Explore, current screen" style={s.navItem}><Text style={s.active}>◎ Explore</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Search journeys and creators" onPress={() => router.push('/search')} style={s.navItem}><Text style={s.navText}>⌕ Search</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Create Journey" onPress={() => router.push('/create')} style={s.create}><Text style={s.createText}>＋ Create Journey</Text></Pressable>
      </View>
    </View>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: spaceColor },
  page: { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },
  header: { minHeight: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 30, height: 30, backgroundColor: '#29483F', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: colors.paper, fontSize: 11, fontWeight: '700' },
  brand: { flex: 1, color: colors.paper, fontSize: 16, fontWeight: '600' },
  account: { minHeight: 44, paddingHorizontal: 6, justifyContent: 'center' }, accountText: { color: '#CAD9CB', fontSize: 12 },
  search: { marginHorizontal: 18, marginBottom: 4, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16,
    borderRadius: 24, backgroundColor: '#182436', borderWidth: 1, borderColor: '#344254' },
  searchIcon: { fontSize: 24, color: '#DDE6EF' }, searchText: { flex: 1, fontSize: 13, color: '#C3CED9' }, arrow: { fontSize: 18, color: '#C3CED9' },
  exploration: { flex: 1 },
  map: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: spaceColor },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 12, paddingTop: 5, backgroundColor: colors.paper },
  navItem: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, active: { fontSize: 12, color: colors.ink, fontWeight: '700' },
  navText: { fontSize: 12, color: colors.muted }, create: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 24, backgroundColor: colors.ink },
  createText: { color: colors.white, fontSize: 12, fontWeight: '600' },
});
