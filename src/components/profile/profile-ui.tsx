import { DeleteDraftAction } from '@/components/delete-draft-action';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image, Platform, Pressable, StatusBar, Text, useWindowDimensions, View } from 'react-native';
import { JourneyPhoto } from '@/components/discovery/journey-photo';
import { ThumbnailPhoto } from '@/components/discovery/thumbnail-photo';
import { journeyFacts } from '@/lib/discovery/model';
import { profileUIStyles as s } from './profile-styles';
import type { PublicJourney } from '@/types/journey';
export { profileStyles } from './profile-styles';

export function ProfileHeader({ onSettings }: { onSettings: () => void }) {
  const router = useRouter();
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return;
    const entry = StatusBar.pushStackEntry({ barStyle: 'dark-content' });
    return () => StatusBar.popStackEntry(entry);
  }, []));
  return <SafeAreaView edges={['top']} style={s.headerSafe}><View style={s.toolbar}>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/discover')} style={({ pressed }) => [s.tool, pressed && s.pressed]}><Text style={s.back}>‹</Text></Pressable>
    <Image source={require('../../../assets/journey-creator-logo.png')} accessible={false} style={s.logo} />
    <Text numberOfLines={1} style={s.brand}>Journey Creator</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Account settings" onPress={onSettings} style={({ pressed }) => [s.tool, s.settingsTool, pressed && s.pressed]}><Text style={s.gear}>⚙</Text></Pressable>
  </View></SafeAreaView>;
}

// Native Views only: a static atlas motif, with no map, timer, location or network work.
function AtlasDecoration() {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.atlas}>
    <View style={s.orbit} />
    <View style={s.globe}>
      <View style={s.meridian} /><View style={s.equator} /><View style={s.latitudeNorth} /><View style={s.latitudeSouth} />
    </View>
    <View style={s.routeDot} /><View style={s.routeEnd} />
  </View>;
}

export function ProfileIdentity({ name, username, bio, avatar, count, owner = false, onCreate }: {
  name: string; username?: string | null; bio?: string | null; avatar?: string | null; count: number | null; owner?: boolean; onCreate?: () => void;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const size = width < 360 ? 56 : 60;
  const [expandedBio, setExpandedBio] = useState<string | null>(null);
  const bioExpanded = expandedBio === bio;
  return <View style={s.identity}>
    <AtlasDecoration />
    <View style={s.identityRow}>
      <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        {avatar ? <JourneyPhoto uri={avatar} ratio={1} thumbnail label={name + ' avatar'} /> : <Text accessibilityLabel={name + ' avatar placeholder'} style={s.initial}>{name.slice(0, 1).toUpperCase()}</Text>}
      </View>
      <View style={s.identityCopy}>
        <Text accessibilityRole="header" accessibilityLabel={name} numberOfLines={2} style={s.name}>{name}</Text>
        {username && <Text style={s.handle}>@{username}</Text>}
      </View>
    </View>
    {bio && (bio.length > 90 ? <View style={s.bioRow}>
      <Text numberOfLines={bioExpanded ? undefined : 2} style={[s.bio, s.bioCopy]}>{bio}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={bioExpanded ? 'Show less biography' : 'Read full biography'} accessibilityState={{ expanded: bioExpanded }} onPress={() => setExpandedBio(bioExpanded ? null : bio)} style={({ pressed }) => [s.bioToggle, pressed && s.pressed]}><Text style={s.bioToggleText}>{bioExpanded ? 'Less' : 'More'}</Text></Pressable>
    </View> : <Text style={s.bio}>{bio}</Text>)}
    {count !== null && <Text style={s.count}>{count} public {count === 1 ? 'journey' : 'journeys'}</Text>}
    {owner && <View style={s.heroActions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => router.push('/profile/edit')} style={({ pressed }) => [s.edit, pressed && s.pressed]}>
        <Text accessible={false} style={s.editIcon}>✎</Text><Text style={s.editText}>Edit profile</Text>
      </Pressable>
      {onCreate && <Pressable accessibilityRole="button" accessibilityLabel="Create Journey" onPress={onCreate} style={({ pressed }) => [s.edit, s.create, pressed && s.pressed]}>
        <Text accessible={false} style={s.createIcon}>+</Text><Text style={s.createText}>New journey</Text>
      </Pressable>}
    </View>}
  </View>;
}

type Collection = 'published' | 'drafts';
export function ProfileCollections({ publishedCount, draftCount, selected, onSelect }: {
  publishedCount: number | null; draftCount: number | null; selected: Collection; onSelect: (tab: Collection) => void;
}) {
  return <View accessibilityRole="tablist" style={s.collections}>
    {([{ key: 'published', count: publishedCount, title: 'Published', note: 'Shared with the world', symbol: '◎' },
      { key: 'drafts', count: draftCount, title: 'Drafts', note: 'Only you can see', symbol: '✎' }] as const).map(item => <Pressable key={item.key}
      accessibilityRole="tab" accessibilityLabel={(item.key === 'published' ? 'Published journeys, ' : 'Private drafts, ') + (item.count === null ? 'count unavailable' : item.count)} accessibilityState={{ selected: selected === item.key }}
      onPress={() => onSelect(item.key)} style={({ pressed }) => [s.collection, item.key === 'drafts' && s.draftCollection, selected === item.key && s.selectedCollection, pressed && s.pressed]}>
      <View style={s.collectionTop}><Text accessible={false} style={[s.collectionSymbol, selected === item.key && s.selectedCollectionText]}>{item.symbol}</Text><Text style={[s.collectionCount, selected === item.key && s.selectedCollectionText]}>{item.count ?? '—'}</Text><Text style={[s.collectionTitle, selected === item.key && s.selectedCollectionText]}>{item.title}</Text></View>
      <Text style={[s.collectionNote, selected === item.key && s.selectedCollectionNote]}>{item.note}</Text>
    </Pressable>)}
  </View>;
}

export function ProfileTabs({ selected, onSelect, drafts = false }: { selected: Collection; onSelect: (tab: Collection) => void; drafts?: boolean }) {
  return <View accessibilityRole="tablist" style={s.tabs}>
    {(['published', ...(drafts ? ['drafts'] : [])] as Collection[]).map(tab => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: selected === tab }}
      accessibilityLabel={tab === 'published' ? 'Published journeys' : 'Private drafts'} onPress={() => onSelect(tab)} style={({ pressed }) => [s.tab, selected === tab && s.activeTab, pressed && s.pressed]}>
      <Text style={[s.tabText, selected === tab && s.activeTabText]}>{tab === 'published' ? 'Published' : 'Drafts'}</Text>
    </Pressable>)}
  </View>;
}

export function ProfileJourneyCard({ journey }: { journey: PublicJourney }) {
  const router = useRouter();
  return <Pressable accessibilityRole="button" accessibilityLabel={'Open journey: ' + journey.title + ', ' + journey.destination}
    onPress={() => router.push({ pathname: '/journey/[id]', params: { id: journey.id } })} style={({ pressed }) => [s.card, s.journeyCard, pressed && s.pressed]}>
    <View style={s.thumbnail}><ThumbnailPhoto uri={journey.cover} thumbnailUri={journey.coverThumbnail} ratio={0.9} label={journey.title + ' cover photo'} /></View>
    <View style={s.cardCopy}>
      {journey.destination !== 'Destination not specified' && <Text numberOfLines={1} style={s.destination}>⌖ {journey.destination}</Text>}
      <Text numberOfLines={2} style={s.cardTitle}>{journey.title}</Text>
      <Text style={s.facts}>{journeyFacts(journey)}</Text>
      <Text style={s.open}>View journey →</Text>
    </View>
  </Pressable>;
}

export function ProfileDraftCard({ draft, onDeleted }: { draft: { id: string; title: string }; onDeleted: () => void }) {
  const router = useRouter();
  return <View style={s.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={'Continue: ' + draft.title} onPress={() => router.push({ pathname: '/create', params: { draft: draft.id } })}
      style={({ pressed }) => [s.draftMain, pressed && s.pressed]}>
      <View accessible={false} style={s.draftPlaceholder}><Text style={s.draftSymbol}>↗</Text></View>
      <View style={s.cardCopy}><Text numberOfLines={2} style={s.cardTitle}>{draft.title}</Text><Text style={s.continueText}>Continue editing →</Text></View>
    </Pressable>
    <View style={s.draftFooter}><Text style={s.privateLabel}>Private draft</Text><DeleteDraftAction draft={draft} onDeleted={onDeleted} /></View>
  </View>;
}
