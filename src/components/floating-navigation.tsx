import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { useFocusEffect, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionState } from '@/hooks/session-context';
import { useLoad } from '@/hooks/use-load';
import { loadOwnProfile } from '@/lib/profile/edit-queries';
import { safePhoto } from '@/lib/discovery/model';

type Destination = 'explore' | 'search' | 'create' | 'story' | 'account' | null;
function AccountAvatar() {
  const { session } = useSessionState();
  const userId = session?.user.id;
  const loader = useCallback((signal: AbortSignal) => userId ? loadOwnProfile(userId, signal) : Promise.resolve(null), [userId]);
  const profile = useLoad(loader);
  const refresh = profile.refresh;
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const [failed, setFailed] = useState<string | null>(null);
  const metadataAvatar = safePhoto(session?.user.user_metadata?.avatar_url);
  const avatar = profile.data?.avatarPreview || (metadataAvatar?.startsWith('https:') ? metadataAvatar : null);
  return avatar && avatar !== failed ? <Image source={{ uri: avatar }} accessible={false} style={styles.avatar} onError={() => setFailed(avatar)} />
    : <View style={styles.accountIcon}><View style={styles.accountHead} /><View style={styles.accountBody} /></View>;
}
function NavigationIcon({ name }: { name: Exclude<Destination, null> }) {
  if (name === 'account') return <AccountAvatar />;
  if (name === 'create') return <View style={styles.createIcon}><View style={styles.plusHorizontal} /><View style={styles.plusVertical} /></View>;
  if (name === 'search') return <View style={styles.searchIcon}><View style={styles.searchHandle} /></View>;
  if (name === 'story') return <View style={styles.book}><View style={styles.bookPage} /><View style={styles.bookPage} /></View>;
  return <View style={styles.globe}><View style={styles.meridian} /><View style={styles.equator} /></View>;
}
export function FloatingNavigation({ active, onHeight, companionGuide = false }: { active: Destination; onHeight?: (height: number) => void; companionGuide?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = [
    { key: 'explore', label: 'Explore', accessible: 'Explore', icon: '◎', route: '/discover' },
    { key: 'search', label: 'Search', accessible: 'Search journeys and creators', route: '/search?view=search' },
    { key: 'create', label: 'Create', accessible: 'Create Journey', route: '/create' },
    { key: 'story', label: 'Story', accessible: 'Browse public stories', route: '/search?view=stories' },
    { key: 'account', label: 'Account', accessible: 'Open account', route: '/account' },
  ] as const;
  return <View style={[styles.bar, { bottom: Math.max(0, insets.bottom) + 8, left: Math.max(16, insets.left + 8), right: Math.max(16, insets.right + 8) }]}
    onLayout={event => onHeight?.(event.nativeEvent.layout.height)} onStartShouldSetResponder={() => true} onResponderTerminationRequest={() => false}>
    {items.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.accessible}
      accessibilityState={{ selected: active === item.key }} onPress={() => { if (active !== item.key) router.navigate(item.route); }}
      style={({ pressed }) => [styles.item, active === item.key && styles.selected, pressed && styles.pressed]}>
      {item.key === 'create' && companionGuide && <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={styles.companionGuide} />}
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.iconSlot}><NavigationIcon name={item.key} /></View>
      <Text style={[styles.label, active === item.key && styles.active]}>{item.label}</Text>
    </Pressable>)}
  </View>;
}

// Home owns sheet clearance; other main pages reserve a measured bottom slot.
// Native Story modals remain above this shell. Travel/auth/private editing stay unchanged.
export function MainNavigationFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { view } = useGlobalSearchParams<{ view?: string }>();
  const [height, setHeight] = useState(56);
  const visible = path === '/search' || path === '/create' || path === '/account' || path.startsWith('/journey/') || path.startsWith('/profile/');
  const active: Destination = path === '/search' ? view === 'stories' ? 'story' : 'search' : path === '/create' ? 'create' : path === '/account' ? 'account' : path.startsWith('/journey/') ? 'story' : null;
  return <View style={styles.frame}>
    <View style={[styles.frame, visible && { paddingBottom: height + 16 }]}>{children}</View>
    {visible && <FloatingNavigation active={active} onHeight={setHeight} />}
  </View>;
}
const styles = StyleSheet.create({
  frame: { flex: 1 },
  bar: { position: 'absolute', zIndex: 20, elevation: 5, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'stretch', gap: 3, padding: 4, borderRadius: 32,
    backgroundColor: 'rgba(242, 246, 255, 0.97)', borderWidth: 1, borderColor: '#DCE6F5',
    shadowColor: '#14251F', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  item: { flex: 1, minWidth: 0, minHeight: 46, borderRadius: 26, paddingHorizontal: 4, paddingVertical: 4,
    alignItems: 'center', justifyContent: 'center', gap: 0 },
  companionGuide: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 26, borderWidth: 2, borderColor: '#D3A94B', backgroundColor: 'rgba(241, 210, 128, 0.12)' },
  selected: { backgroundColor: '#C9DFFF' }, pressed: { opacity: 0.65 },
  iconSlot: { height: 26, width: 28, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 24, height: 24, borderRadius: 12 },
  globe: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.7, borderColor: '#245DA7', alignItems: 'center', justifyContent: 'center' },
  meridian: { width: 10, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#245DA7' },
  equator: { position: 'absolute', width: 18, height: 1, backgroundColor: '#245DA7' },
  searchIcon: { width: 18, height: 18, borderRadius: 10, borderWidth: 1.7, borderColor: '#283B56', marginRight: 3, marginBottom: 3 },
  searchHandle: { position: 'absolute', width: 8, height: 2, backgroundColor: '#283B56', right: -6, bottom: -3, transform: [{ rotate: '48deg' }] },
  createIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  plusHorizontal: { width: 17, height: 2, backgroundColor: '#283B56' },
  plusVertical: { position: 'absolute', width: 2, height: 17, backgroundColor: '#283B56' },
  book: { flexDirection: 'row', width: 23, height: 20 },
  bookPage: { flex: 1, borderWidth: 1.5, borderColor: '#283B56', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  accountIcon: { width: 23, height: 23, borderWidth: 1.5, borderColor: '#283B56', borderRadius: 12, alignItems: 'center', overflow: 'hidden' },
  accountHead: { width: 7, height: 7, borderRadius: 4, borderWidth: 1.2, borderColor: '#283B56', marginTop: 3 },
  accountBody: { width: 17, height: 12, borderRadius: 9, borderWidth: 1.2, borderColor: '#283B56', marginTop: 1 },
  icon: { fontSize: 21, lineHeight: 23, color: '#48554F' },
  label: { fontSize: 10, lineHeight: 14, color: '#48554F', textAlign: 'center', fontWeight: '500' },
  active: { color: '#276392', fontWeight: '700' },
});
