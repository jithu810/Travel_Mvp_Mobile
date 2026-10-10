import { useFocusEffect, useRouter } from 'expo-router';
import { useActionIntent } from '@/hooks/action-intent';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, findNodeHandle, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { colors } from '@/components/discovery/ui';
import { useJourneySocial } from '@/hooks/use-journey-social';
import { sharePublicJourney } from '@/lib/social/sharing';

export function SocialActions({ journey }: { journey: PublicJourney }) {
  const social = useJourneySocial(journey.id, journey.likes);
  const router = useRouter();
  const intent = useActionIntent();
  function act(action: 'like' | 'save') {
    if (!social.auth.session) { if (intent.begin(journey.id, action)) router.push('/auth'); }
    else void social.act(action);
  }
  useFocusEffect(useCallback(() => {
    if (social.auth.session && !social.auth.loading && social.state && !social.busy && intent.pending?.journeyId === journey.id && intent.pending.action !== 'remix') {
      const pending = intent.consume(intent.pending.token);
      if (pending && pending.action !== 'remix') void social.act(pending.action, true);
    }
  }, [social, intent, journey.id]));
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareLock = useRef(false);
  const shareButton = useRef<View>(null);
  const disabled = social.auth.loading || Boolean(social.auth.error) || Boolean(social.busy) || (!social.state && Boolean(social.auth.session));
  async function share() {
    if (shareLock.current) return;
    shareLock.current = true; setSharing(true); setShareMessage(null);
    const result = await sharePublicJourney(journey.id, journey.title, process.env.EXPO_PUBLIC_SITE_URL, Platform.OS,
      content => Share.share(content, { dialogTitle: 'Share journey', anchor: Platform.OS === 'ios' && shareButton.current ? findNodeHandle(shareButton.current) ?? undefined : undefined }));
    if (result.kind === 'unavailable') setShareMessage(result.url ? 'Sharing isn’t supported here. Copy this public link:\n' + result.url : 'Sharing is not configured yet. The public website address is unavailable.');
    // No success claim: Android cannot distinguish a dismissed sheet from delivery.
    setSharing(false); shareLock.current = false;
  }
  const likes = social.state?.likes;
  return <View style={styles.section}>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={social.state?.liked ? 'Unlike journey' : 'Like journey'}
        accessibilityState={{ disabled, selected: social.state?.liked ?? false }} disabled={disabled}
        onPress={() => { act('like'); }} style={({ pressed }) => [styles.button, social.state?.liked && styles.active, disabled && styles.disabled, pressed && styles.pressed]}>
        {social.busy === 'like' ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.label}>{social.state?.liked ? '♥ Unlike' : '♡ Like'}{likes !== null && likes !== undefined ? ' · ' + likes : ''}</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={social.state?.saved ? 'Remove journey from Saved' : 'Save journey'}
        accessibilityState={{ disabled, selected: social.state?.saved ?? false }} disabled={disabled}
        onPress={() => { act('save'); }} style={({ pressed }) => [styles.button, social.state?.saved && styles.active, disabled && styles.disabled, pressed && styles.pressed]}>
        {social.busy === 'save' ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.label}>{social.state?.saved ? 'Saved ✓' : 'Save'}</Text>}
      </Pressable>
      <Pressable ref={shareButton} accessibilityRole="button" accessibilityLabel="Share public journey"
        accessibilityState={{ disabled: sharing }} disabled={sharing} onPress={() => { void share(); }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        {sharing ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.label}>Share ↗</Text>}
      </Pressable>
    </View>
    {(social.busy === 'load' || social.auth.loading) && <Text style={styles.note}>Checking your account actions…</Text>}
    {social.auth.error && <Text accessibilityRole="alert" style={styles.note}>Your session couldn’t be restored. Reopen the app to retry. Public browsing and sharing remain available.</Text>}
    {social.error && <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.note}>{social.error}</Text>
      <Pressable accessibilityRole="button" onPress={() => { void social.load(); }} style={styles.retry}><Text style={styles.label}>Retry action state</Text></Pressable></View>}
    {social.message && <Text accessibilityLiveRegion="polite" style={styles.note}>{social.message}</Text>}
    {shareMessage && <Text selectable accessibilityLiveRegion="polite" style={styles.note}>{shareMessage}</Text>}
    {!social.auth.session && !social.auth.loading && !social.message && <Text style={styles.note}>Like and Save require sign-in. Public journeys can be shared without an account.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 10, marginTop: -10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 44, minWidth: 78, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  active: { backgroundColor: colors.pale, borderColor: colors.green },
  disabled: { opacity: 0.6 }, pressed: { opacity: 0.7 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 19, flexShrink: 1 },
  feedback: { gap: 8 },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.pale },
});
