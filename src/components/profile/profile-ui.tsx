import { useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image, Platform, Pressable, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '@/components/discovery/ui';
import { JourneyPhoto } from '@/components/discovery/journey-photo';
import { journeyFacts } from '@/lib/discovery/model';
import type { PublicJourney } from '@/types/journey';

export function ProfileHeader({ onSettings }: { onSettings: () => void }) {
  const router = useRouter();
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return;
    const entry = StatusBar.pushStackEntry({ barStyle: 'light-content' });
    return () => StatusBar.popStackEntry(entry);
  }, []));
  return <SafeAreaView edges={['top']} style={{ backgroundColor: '#0D1D2C' }}><View style={s.toolbar}>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/discover')} style={s.tool}><Text style={s.back}>‹</Text></Pressable>
    <Image source={require('../../../assets/journey-creator-logo.png')} accessible={false} style={s.logo} />
    <Text numberOfLines={1} style={s.brand}>Journey Creator</Text>
    <View accessible accessibilityRole="image" accessibilityLabel="Notifications, coming soon" style={s.tool}>
      <View style={s.bell}><View style={s.bellBody} /><View style={s.bellRim} /><View style={s.bellClapper} /></View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Account settings" onPress={onSettings} style={s.tool}><Text style={s.gear}>⚙</Text></Pressable>
  </View></SafeAreaView>;
}

export function ProfileIdentity({ name, username, bio, avatar, count, owner = false }: {
  name: string; username?: string | null; bio?: string | null; avatar?: string | null; count: number | null; owner?: boolean;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const size = width < 360 ? 72 : 88;
  return <View style={s.identity}>
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {avatar ? <JourneyPhoto uri={avatar} ratio={1} thumbnail label={name + ' avatar'} /> : <Text accessibilityLabel={name + ' avatar placeholder'} style={s.initial}>{name.slice(0, 1).toUpperCase()}</Text>}
    </View>
    <View style={s.identityCopy}>
      <Text accessibilityRole="header" style={s.name}>{name}</Text>
      {username && <Text style={s.handle}>@{username}</Text>}
      {bio && <Text style={s.bio}>{bio}</Text>}
      {owner && <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => router.push('/profile/edit')} style={s.edit}>
        <Text style={s.editText}>✎  Edit profile</Text>
      </Pressable>}
      {count !== null && <Text style={s.count}>{count} public {count === 1 ? 'journey' : 'journeys'}</Text>}
    </View>
  </View>;
}

export function ProfileTabs({ selected, onSelect, drafts = false }: { selected: 'published' | 'drafts'; onSelect: (tab: 'published' | 'drafts') => void; drafts?: boolean }) {
  return <View accessibilityRole="tablist" style={s.tabs}>
    {(['published', ...(drafts ? ['drafts'] : [])] as ('published' | 'drafts')[]).map(tab => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: selected === tab }}
      accessibilityLabel={tab === 'published' ? 'Published journeys' : 'Private drafts'} onPress={() => onSelect(tab)} style={[s.tab, selected === tab && s.activeTab]}>
      <Text style={[s.tabText, selected === tab && s.activeTabText]}>{tab === 'published' ? 'Published' : 'Drafts'}</Text>
    </Pressable>)}
  </View>;
}

export function ProfileJourneyCard({ journey }: { journey: PublicJourney }) {
  const router = useRouter();
  return <Pressable accessibilityRole="button" accessibilityLabel={'Open journey: ' + journey.title + ', ' + journey.destination}
    onPress={() => router.push({ pathname: '/journey/[id]', params: { id: journey.id } })} style={({ pressed }) => [s.card, pressed && { opacity: 0.75 }]}>
    <View style={s.thumbnail}><JourneyPhoto uri={journey.cover} ratio={0.9} thumbnail label={journey.title + ' cover photo'} /></View>
    <View style={s.cardCopy}>
      {journey.destination !== 'Destination not specified' && <Text numberOfLines={1} style={s.destination}>⌖ {journey.destination}</Text>}
      <Text numberOfLines={2} style={s.cardTitle}>{journey.title}</Text>
      <Text style={s.facts}>{journeyFacts(journey)}</Text>
      <Text style={s.open}>View journey →</Text>
    </View>
  </Pressable>;
}

export function ProfileDraftCard({ draft }: { draft: { id: string; title: string } }) {
  const router = useRouter();
  return <Pressable accessibilityRole="button" accessibilityLabel={'Continue: ' + draft.title} onPress={() => router.push({ pathname: '/create', params: { draft: draft.id } })}
    style={({ pressed }) => [s.card, pressed && { opacity: 0.75 }]}>
    <View accessible={false} style={s.draftPlaceholder}><Text style={s.draftSymbol}>↗</Text></View>
    <View style={s.cardCopy}><Text numberOfLines={2} style={s.cardTitle}>{draft.title}</Text><Text style={s.facts}>Private draft</Text><Text style={s.open}>Continue editing →</Text></View>
  </Pressable>;
}

export const profileStyles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24, gap: 12 },
  section: { paddingTop: 18, marginTop: 18, paddingBottom: 14, borderTopWidth: 1, borderColor: colors.line, gap: 16 },
  heading: { color: colors.ink, fontSize: 23, lineHeight: 30, fontWeight: '700', letterSpacing: -0.6 },
  shade: { flex: 1, backgroundColor: 'rgba(9,24,30,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 12 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
const s = StyleSheet.create({
  toolbar: { minHeight: 68, backgroundColor: '#0D1D2C', borderBottomLeftRadius: 22, borderBottomRightRadius: 22, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 2 },
  tool: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 28, height: 28, borderRadius: 8, marginRight: 6 },
  brand: { flex: 1, color: '#FFFEFA', fontSize: 17, fontWeight: '700' },
  back: { color: '#A8EABB', fontSize: 32, lineHeight: 36 }, gear: { color: '#FFFEFA', fontSize: 27 },
  bell: { width: 20, height: 25, alignItems: 'center', justifyContent: 'center' },
  bellBody: { width: 14, height: 15, borderWidth: 2, borderColor: '#FFFEFA', borderTopLeftRadius: 9, borderTopRightRadius: 9 },
  bellRim: { width: 18, height: 2, backgroundColor: '#FFFEFA' }, bellClapper: { width: 4, height: 3, marginTop: 2, borderRadius: 2, backgroundColor: '#FFFEFA' },
  identity: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  avatar: { overflow: 'hidden', backgroundColor: colors.pale, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.ink, fontSize: 30, fontWeight: '600' }, identityCopy: { flex: 1, minWidth: 0, gap: 6 },
  name: { color: colors.ink, fontSize: 25, lineHeight: 31, letterSpacing: -0.7, fontWeight: '700' },
  handle: { color: colors.muted, fontSize: 15, lineHeight: 22 }, bio: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  edit: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 24, marginTop: 6 },
  editText: { color: colors.ink, fontSize: 13, fontWeight: '600' }, soon: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  count: { color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '600', marginTop: 6 },
  tabs: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, borderRadius: 26, backgroundColor: '#EAEAE2' },
  tab: { minWidth: 100, minHeight: 44, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  activeTab: { backgroundColor: colors.ink }, tabText: { fontSize: 14, color: colors.muted, fontWeight: '500' }, activeTabText: { color: colors.white },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 14, borderRadius: 24, backgroundColor: '#FFFEFA', borderWidth: 1, borderColor: colors.line, marginBottom: 12, shadowColor: colors.ink, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  thumbnail: { width: '29%', maxWidth: 112, borderRadius: 17, overflow: 'hidden' },
  cardCopy: { flex: 1, minWidth: 0, gap: 5 }, destination: { color: '#708D7C', fontSize: 12, lineHeight: 18 },
  cardTitle: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '700' }, facts: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  open: { color: colors.ink, fontSize: 13, lineHeight: 20, fontWeight: '600', textAlign: 'right', marginTop: 8 },
  draftPlaceholder: { width: '29%', maxWidth: 112, minHeight: 92, borderRadius: 17, backgroundColor: '#E5EFE4', alignItems: 'center', justifyContent: 'center' },
  draftSymbol: { color: colors.green, fontSize: 32 },
});
