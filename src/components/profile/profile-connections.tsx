import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { StorySheet } from '@/components/journey/story-sheet';
import { useProfileConnections } from '@/hooks/use-profile-connections';
import type { ConnectionCollection, ConnectionCommand, ConnectionItem } from '@/lib/connections/types';
import { darkPilotStyles } from '@/theme/dark-pilot';
import { theme } from '@/theme/mobile-theme';

type Dialog = 'respond' | 'remove' | 'signin' | null;
const collectionNames: Record<ConnectionCollection, string> = { friends: 'Friends', following: 'Following', incoming: 'Requests', outgoing: 'Sent', inbox: 'Inbox' };

// Account embeds the compact owner counts in the identity; visitor actions retain their layout.
export function ProfileConnections({ targetId, name = 'this traveler', compact = false }: { targetId: string; name?: string; compact?: boolean }) {
  const connections = useProfileConnections(targetId), router = useRouter();
  const { controller, summary, collection } = connections;
  const [dialogState, setDialogState] = useState<{ controller: typeof controller; value: Dialog }>({ controller, value: null });
  const dialog = dialogState.controller === controller ? dialogState.value : null;
  const setDialog = (value: Dialog) => setDialogState({ controller, value });
  const blocked = !summary || connections.loading || !!connections.busy || connections.uncertain;
  const listBlocked = blocked || connections.listLoading || !!connections.listError;
  const friendList = collection === 'friends' || collection === 'incoming' || collection === 'outgoing';
  const feedback = <View style={s.feedback}>
    {(connections.loading || connections.busy) && <View style={s.progress}><ActivityIndicator color={theme.accent} /><Text style={s.note}>{connections.busy ? 'Checking the update…' : 'Checking connections…'}</Text></View>}
    {connections.error && <><Text accessibilityRole="alert" style={s.note}>{connections.error}</Text><Control label="Retry connections" disabled={connections.loading || !!connections.busy} onPress={() => { void controller.load(); }} /></>}
    {connections.message && <Text accessibilityLiveRegion="polite" style={s.note}>{connections.message}</Text>}
  </View>;
  const act = (peerId: string, command: ConnectionCommand) => { void controller.act(peerId, command); };
  function requestAction() {
    if (!summary) return;
    if (summary.friendStatus === 'none') void controller.requestFriend();
    else if (summary.friendStatus === 'incoming') setDialog('respond');
    else if (summary.friendStatus === 'friends') setDialog('remove');
    else if (summary.requestId && summary.requestRevision !== null)
      act(targetId, { action: 'cancel', requestId: summary.requestId, expectedRevision: summary.requestRevision });
  }
  function pendingActions(item: ConnectionItem) {
    if (item.status !== 'pending' || !item.requestId || item.revision === null) return null;
    const requestId = item.requestId, expectedRevision = item.revision;
    if (collection === 'outgoing') return <Control label="Cancel request" disabled={listBlocked} onPress={() => act(item.person.id, { action: 'cancel', requestId, expectedRevision })} />;
    if (collection !== 'incoming' && !(collection === 'inbox' && item.kind === 'friend_request')) return null;
    return <><Control label="Accept" disabled={listBlocked} onPress={() => act(item.person.id, { action: 'accept', requestId, expectedRevision })} />
      <Control label="Decline" disabled={listBlocked} onPress={() => act(item.person.id, { action: 'decline', requestId, expectedRevision })} /></>;
  }
  function renderItem({ item }: { item: ConnectionItem }) {
    const person = item.person;
    return <View style={s.personRow}>
      <View style={s.personHeading}>
        <View accessible={false} style={s.initial}><Text style={s.initialText}>{person.displayName.slice(0, 1).toUpperCase()}</Text></View>
        <View style={s.personCopy}><Text style={s.personName} numberOfLines={2}>{person.displayName}</Text>
          {person.username && <Text style={s.note} numberOfLines={1}>@{person.username}</Text>}
          {collection === 'inbox' && <Text style={s.note}>{item.kind === 'friend_accepted' ? 'Accepted your friend request.' : item.status === 'pending' ? 'Sent you a friend request.' : 'This friend request is no longer pending.'}</Text>}
          {collection === 'inbox' && item.readAt === null && <Text style={s.unread}>Unread</Text>}
        </View>
      </View>
      <View style={s.rowActions}>
        {person.username && <Control label="View profile" onPress={() => { controller.close(); router.push({ pathname: '/profile/[username]', params: { username: person.username! } }); }} />}
        {pendingActions(item)}
        {collection === 'friends' && item.status === 'accepted' && item.requestId && <Control label="Remove friend" disabled={listBlocked} onPress={() => act(person.id, { action: 'remove', requestId: item.requestId! })} />}
        {collection === 'following' && item.revision !== null && <Control label="Unfollow" disabled={listBlocked} onPress={() => act(person.id, { action: 'follow', enabled: false, expectedRevision: item.revision! })} />}
        {collection === 'inbox' && item.readAt === null && <Control label="Mark as read" disabled={listBlocked} onPress={() => act(targetId, { action: 'read', notificationIds: [item.id] })} />}
      </View>
    </View>;
  }
  if (connections.auth.loading) return <View style={s.container}><Text style={s.note}>Checking connection actions…</Text></View>;
  if (!connections.auth.session || connections.auth.error) return <View style={s.container}>
    <View style={s.row}><Control label="Add friend" onPress={() => setDialog('signin')} /><Control label="Follow" onPress={() => setDialog('signin')} /></View>
    <Text style={s.note}>{connections.auth.error ? 'Your session is unavailable. Sign in again to use connections.' : 'Sign in to add friends or follow public journeys.'}</Text>
    <StorySheet visible={dialog === 'signin'} title="Sign in to connect" onClose={() => setDialog(null)}>
      <Text style={s.note}>Sign in first, then return to this profile and choose Add friend or Follow. No request will be sent automatically.</Text>
      <Control label="Sign in" onPress={() => { setDialog(null); router.push('/auth'); }} />
    </StorySheet>
  </View>;
  const friendLabel = summary?.friendStatus === 'incoming' ? 'Respond' : summary?.friendStatus === 'outgoing' ? 'Request sent' : summary?.friendStatus === 'friends' ? 'Friends' : 'Add friend';
  return <View style={compact ? s.compactContainer : s.container}>
    {connections.owner && compact ? <View style={s.statsRow}>
      {([{ key: 'friends', label: 'Friends', count: summary?.friendsCount },
        { key: 'following', label: 'Following', count: summary?.followingCount },
        { key: 'inbox', label: 'Inbox', count: summary?.unreadCount }] as const).map(item => <Pressable key={item.key}
        accessibilityRole="button" accessibilityLabel={item.label + ', ' + (item.count === undefined ? 'count unavailable' : item.count + (item.key === 'inbox' ? ' unread' : ''))}
        accessibilityState={{ disabled: blocked }} disabled={blocked} onPress={() => controller.select(item.key)}
        style={({ pressed }) => [s.stat, blocked && s.disabled, pressed && s.pressed]}>
        <Text style={s.statCount}>{item.count ?? '—'}</Text><Text style={s.statLabel}>{item.label}</Text>
      </Pressable>)}
    </View> : connections.owner ? <View style={s.row}>
      <Control label={'Friends · ' + (summary?.friendsCount ?? '—')} accessibilityLabel={'Friends, ' + (summary ? summary.friendsCount : 'count unavailable')} disabled={blocked} onPress={() => controller.select('friends')} />
      <Control label={'Following · ' + (summary?.followingCount ?? '—')} accessibilityLabel={'Following, ' + (summary ? summary.followingCount : 'count unavailable')} disabled={blocked} onPress={() => controller.select('following')} />
      <Control label={'Inbox · ' + (summary?.unreadCount ?? '—')} accessibilityLabel={'Inbox, ' + (summary ? summary.unreadCount + ' unread' : 'unread count unavailable')} disabled={blocked} onPress={() => controller.select('inbox')} />
    </View> : <View style={s.row}>
      <Control label={friendLabel} accessibilityLabel={summary?.friendStatus === 'outgoing' ? 'Cancel friend request to ' + name : friendLabel + ' ' + name} disabled={blocked} onPress={requestAction} />
      <Control label={summary?.following ? 'Following' : 'Follow'} accessibilityLabel={(summary?.following ? 'Unfollow ' : 'Follow ') + name} selected={summary?.following ?? false} disabled={blocked}
        onPress={() => { if (summary) act(targetId, { action: 'follow', enabled: !summary.following, expectedRevision: summary.followRevision }); }} />
    </View>}
    {!collection && !dialog && feedback}
    <StorySheet visible={collection !== null} title={collection ? friendList ? 'Friends' : collectionNames[collection] : 'Connections'} onClose={() => controller.close()} scrollable={false}>
      {friendList && <View accessibilityRole="tablist" style={s.row}>
        {(['friends', 'incoming', 'outgoing'] as const).map(value => <Control key={value} label={collectionNames[value]} selected={collection === value} disabled={!!connections.busy} tab onPress={() => controller.select(value)} />)}
      </View>}
      {feedback}
      <FlatList data={connections.items} keyExtractor={item => item.id} renderItem={renderItem} initialNumToRender={6} maxToRenderPerBatch={6} windowSize={3}
        contentContainerStyle={s.list} refreshing={connections.listLoading} onRefresh={() => controller.retryList()}
        ListEmptyComponent={connections.listLoading || connections.loading ? <ActivityIndicator color={theme.accent} accessibilityLabel="Loading connections" />
          : connections.listError ? <Text accessibilityRole="alert" style={s.note}>{connections.listError}</Text>
            : connections.error ? null : <Text style={s.note}>Nothing here yet.</Text>}
        ListFooterComponent={<View style={s.feedback}>
          {connections.listError && <Control label="Retry collection" disabled={connections.listLoading || blocked} onPress={() => controller.retryList()} />}
          {connections.nextCursor && !connections.listError && <Control label="Load more" disabled={connections.listLoading || blocked} onPress={() => controller.more()} />}
        </View>} />
    </StorySheet>
    <StorySheet visible={dialog === 'respond' || dialog === 'remove'} title={dialog === 'respond' ? 'Friend request' : 'Friendship'} onClose={() => setDialog(null)}>
      <Text style={s.note}>{dialog === 'respond' ? name + ' wants to be your friend.' : 'You and ' + name + ' are friends. Following is managed separately.'}</Text>
      {feedback}
      <View style={s.row}>
        {dialog === 'respond' && summary?.friendStatus === 'incoming' && summary.requestId && summary.requestRevision !== null && <>
          <Control label="Accept friend request" disabled={blocked} onPress={() => act(targetId, { action: 'accept', requestId: summary.requestId!, expectedRevision: summary.requestRevision! })} />
          <Control label="Decline friend request" disabled={blocked} onPress={() => act(targetId, { action: 'decline', requestId: summary.requestId!, expectedRevision: summary.requestRevision! })} />
        </>}
        {dialog === 'remove' && summary?.friendStatus === 'friends' && summary.requestId && <Control label="Remove friend" disabled={blocked} onPress={() => act(targetId, { action: 'remove', requestId: summary.requestId! })} />}
      </View>
    </StorySheet>
  </View>;
}

function Control({ label, accessibilityLabel, disabled = false, selected = false, onPress, tab = false }: {
  label: string; accessibilityLabel?: string; disabled?: boolean; selected?: boolean; onPress: () => void; tab?: boolean;
}) {
  return <Pressable accessibilityRole={tab ? 'tab' : 'button'} accessibilityLabel={accessibilityLabel || label} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.control, selected && s.selected, disabled && s.disabled, pressed && s.pressed]}><Text style={s.controlText}>{label}</Text></Pressable>;
}
const s = darkPilotStyles(StyleSheet.create({
  container: { marginTop: 10, gap: 5 },
  compactContainer: { marginTop: 3, gap: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  stat: { flexGrow: 1, flexBasis: 48, minWidth: 48, minHeight: 48, paddingVertical: 3, alignItems: 'center', justifyContent: 'center', gap: 1 },
  statCount: { color: theme.text, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  statLabel: { color: theme.muted, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  control: { minHeight: 48, minWidth: 48, flexGrow: 1, paddingHorizontal: 10, paddingVertical: 9, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  controlText: { color: theme.text, fontSize: 12, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  selected: { backgroundColor: theme.lavender, borderColor: theme.accent }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.7 },
  feedback: { gap: 5 }, progress: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  note: { color: theme.muted, fontSize: 12, lineHeight: 18 }, unread: { color: theme.accent, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  list: { paddingTop: 10, paddingBottom: 20 }, personRow: { gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderColor: theme.border },
  personHeading: { flexDirection: 'row', gap: 10, alignItems: 'center' }, personCopy: { flex: 1, minWidth: 0, gap: 2 },
  personName: { color: theme.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  initial: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.lavender },
  initialText: { color: theme.text, fontSize: 18, fontWeight: '600' }, rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
}));
