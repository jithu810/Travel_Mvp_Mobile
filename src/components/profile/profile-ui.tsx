import { DeleteDraftAction } from '@/components/delete-draft-action';
import { useCallback, useState, type ReactNode } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image, Platform, Pressable, StatusBar, Text, useWindowDimensions, View } from 'react-native';
import { JourneyPhoto } from '@/components/discovery/journey-photo';
import { ThumbnailPhoto } from '@/components/discovery/thumbnail-photo';
import { JourneyArt } from '@/components/art/journey-art';
import { artSeed } from '@/lib/art/journey-art';
import { journeyFacts } from '@/lib/discovery/model';
import { profileUIStyles as s } from './profile-styles';
import type { PublicJourney } from '@/types/journey';
import { draftRemixCredit, type RemixSource } from '@/lib/remix/model';
import { useBuddyProtectedBounds } from '@/hooks/use-buddy-geometry';
export { profileStyles } from './profile-styles';

export function ProfileHeader({ onSettings }: { onSettings: () => void }) {
  const router = useRouter();
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return;
    const entry = StatusBar.pushStackEntry({ barStyle: 'light-content' });
    return () => StatusBar.popStackEntry(entry);
  }, []));
  const protection = useBuddyProtectedBounds();
  return <SafeAreaView edges={['top']} style={s.headerSafe}><View {...protection} style={s.toolbar}>
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

export function ProfileIdentity({ name, username, bio, avatar, count, owner = false, onCreate, connections }: {
  name: string; username?: string | null; bio?: string | null; avatar?: string | null; count: number | null; owner?: boolean; onCreate?: () => void; connections?: ReactNode;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const size = width < 360 ? 56 : 60;
  const [expandedBio, setExpandedBio] = useState<string | null>(null);
  const bioExpanded = expandedBio === bio;
  const protection = useBuddyProtectedBounds();
  return <View {...protection} style={s.identity}>
    <AtlasDecoration />
    <View style={s.identityRow}>
      <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        {avatar ? <JourneyPhoto uri={avatar} ratio={1} thumbnail label={name + ' avatar'} /> : <Text accessibilityLabel={name + ' avatar placeholder'} style={s.initial}>{name.slice(0, 1).toUpperCase()}</Text>}
      </View>
      <View style={s.identityCopy}>
        <Text accessibilityRole="header" accessibilityLabel={name} numberOfLines={2} style={s.name}>{name}</Text>
        {username && <Text style={s.handle}>@{username}</Text>}
        {connections}
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

export type ProfileCollection = 'published' | 'saved' | 'drafts' | 'map';
export const travelMapTabLabel = 'Travel map of published journey stops';
export function ProfileCollections({ publishedCount, draftCount, savedCount = null, selected, onSelect }: {
  publishedCount: number | null; draftCount: number | null; savedCount?: number | null; selected: ProfileCollection; onSelect: (tab: ProfileCollection) => void;
}) {
  const protection = useBuddyProtectedBounds();
  return <View {...protection} accessibilityRole="tablist" style={s.collections}>
    {([{ key: 'published', count: publishedCount, icon: 'grid', label: 'Published journeys' },
      { key: 'saved', count: savedCount, icon: 'bookmark', label: 'Private saved journeys' },
      { key: 'drafts', count: draftCount, icon: 'edit', label: 'Private drafts' },
      { key: 'map', count: null, icon: 'map', label: travelMapTabLabel }] as const).map(item => <Pressable key={item.key}
      accessibilityRole="tab" accessibilityLabel={item.key === 'map' ? item.label : item.label + ', ' + (item.count === null ? 'count unavailable' : item.count)} accessibilityState={{ selected: selected === item.key }}
      onPress={() => onSelect(item.key)} style={({ pressed }) => [s.collection, selected === item.key && s.selectedCollection, pressed && s.pressed]}>
      <Feather name={item.icon} size={22} accessible={false} style={[s.collectionIcon, selected === item.key && s.selectedCollectionText]} />
    </Pressable>)}
  </View>;
}

export type ProfileTab = 'published' | 'drafts' | 'map';
export function ProfileTabs({ selected, onSelect, drafts = false }: { selected: ProfileTab; onSelect: (tab: ProfileTab) => void; drafts?: boolean }) {
  const protection = useBuddyProtectedBounds();
  return <View {...protection} accessibilityRole="tablist" style={s.tabs}>
    {(['published', ...(drafts ? ['drafts'] : []), 'map'] as ProfileTab[]).map(tab => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: selected === tab }}
      accessibilityLabel={tab === 'published' ? 'Published journeys' : tab === 'drafts' ? 'Private drafts' : travelMapTabLabel} onPress={() => onSelect(tab)} style={({ pressed }) => [s.tab, selected === tab && s.activeTab, pressed && s.pressed]}>
      <Text style={[s.tabText, selected === tab && s.activeTabText]}>{tab === 'published' ? 'Journeys' : tab === 'drafts' ? 'Drafts' : 'Map'}</Text>
    </Pressable>)}
  </View>;
}

export function ProfileJourneyCard({ journey, onPress, edgeToEdge = false, separators }: { journey: PublicJourney; onPress?: () => void; edgeToEdge?: boolean; separators?: { left: boolean; top: boolean } }) {
  const router = useRouter();
  const protection = useBuddyProtectedBounds();
  return <Pressable {...protection} accessibilityRole="button" accessibilityLabel={'Open journey: ' + journey.title + ', ' + journey.destination + ', ' + journeyFacts(journey)}
    onPress={onPress ?? (() => router.push({ pathname: '/journey/[id]', params: { id: journey.id } }))} style={({ pressed }) => [s.card, s.journeyCard, edgeToEdge && s.edgeToEdgeCard, pressed && s.pressed]}>
    <View style={[s.thumbnail, edgeToEdge && s.portraitThumbnail]}><ThumbnailPhoto uri={journey.cover} thumbnailUri={journey.coverThumbnail} ratio={1} fill={edgeToEdge} label={journey.title + ' cover photo'}
      fallback={<JourneyArt seed={artSeed(journey.id, journey.stops)} stops={journey.stops} compact />} /></View>
    <View pointerEvents="none" style={s.gridCopy}>
      <Text numberOfLines={2} style={s.gridTitle}>{journey.title}</Text>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.gridMetrics}>
        {!!journey.durationDays && <View style={s.gridMetric}><Feather name="calendar" size={10} accessible={false} color="#FFFFFF" /><Text style={s.gridFacts}>{journey.durationDays}</Text></View>}
        <View style={s.gridMetric}><Feather name="map-pin" size={10} accessible={false} color="#FFFFFF" /><Text style={s.gridFacts}>{journey.stops.length}</Text></View>
      </View>
    </View>
    {edgeToEdge && separators && <View pointerEvents="none" accessible={false} style={[s.tileSeams, { borderLeftWidth: separators.left ? 1 : 0, borderTopWidth: separators.top ? 1 : 0 }]} />}
  </Pressable>;
}

export function ProfileDraftCard({ draft, onDeleted }: { draft: { id: string; title: string; sourceId?: string; source?: RemixSource | null }; onDeleted: () => void }) {
  const router = useRouter();
  const protection = useBuddyProtectedBounds();
  return <View {...protection} style={s.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={'Continue: ' + draft.title + (draft.sourceId ? ', ' + draftRemixCredit(draft.source) : '')} onPress={() => router.push({ pathname: '/create', params: { draft: draft.id } })}
      style={({ pressed }) => [s.draftMain, pressed && s.pressed]}>
      <View accessible={false} style={s.draftPlaceholder}><Text style={s.draftSymbol}>↗</Text></View>
      <View style={s.cardCopy}><Text numberOfLines={2} style={s.cardTitle}>{draft.title}</Text>{draft.sourceId && <Text testID="draft-remix-credit" numberOfLines={1} style={s.remixCredit}>{draftRemixCredit(draft.source)}</Text>}<Text style={s.continueText}>Continue editing →</Text></View>
    </Pressable>
    <View style={s.draftFooter}><Text style={s.privateLabel}>Private draft</Text><DeleteDraftAction draft={draft} onDeleted={onDeleted} /></View>
  </View>;
}
