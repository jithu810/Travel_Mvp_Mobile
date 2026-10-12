import { useFocusEffect, useRouter } from 'expo-router';
import { useActionIntent } from '@/hooks/action-intent';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, findNodeHandle, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import type { PublicJourney } from '@/types/journey';
import { StorySheet } from './story-sheet';
import { colors } from '@/components/discovery/ui';
import { useJourneySocial } from '@/hooks/use-journey-social';
import { sharePublicJourney } from '@/lib/social/sharing';

export function SocialActions({ journey, compact = false }: { journey: PublicJourney; compact?: boolean }) {
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const likes = social.state?.likes;
  const feedback = <View style={styles.feedback}>
    {(social.busy === 'load' || social.auth.loading) && <Text style={styles.note}>Checking your account actions…</Text>}
    {social.auth.error && <Text accessibilityRole="alert" style={styles.note}>Your session couldn’t be restored. Reopen the app to retry. Public browsing and sharing remain available.</Text>}
    {social.error && <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.note}>{social.error}</Text>
      <Pressable accessibilityRole="button" onPress={() => { void social.load(); }} style={styles.retry}><Text style={styles.label}>Retry action state</Text></Pressable></View>}
    {social.message && <Text accessibilityLiveRegion="polite" style={styles.note}>{social.message}</Text>}
    {shareMessage && <Text selectable accessibilityLiveRegion="polite" style={styles.note}>{shareMessage}</Text>}
    {!social.auth.session && !social.auth.loading && !social.message && <Text style={styles.note}>Like and Save require sign-in. Public journeys can be shared without an account.</Text>}
  </View>;
  return <View style={[styles.section, compact && styles.compactSection]}>
    <View style={[styles.row, compact && styles.compactRow]}>
      <Pressable accessibilityRole="button" accessibilityLabel={social.state?.liked ? 'Unlike journey' : 'Like journey'}
        accessibilityState={{ disabled, selected: social.state?.liked ?? false }} disabled={disabled}
        onPress={() => { act('like'); }} style={({ pressed }) => [styles.button, compact && styles.compactButton, social.state?.liked && styles.active, disabled && styles.disabled, pressed && styles.pressed]}>
        {social.busy === 'like' ? <ActivityIndicator color={colors.ink} /> : <Text style={[styles.label, compact && styles.compactLabel]}>{compact ? (social.state?.liked ? '♥ Like' : '♡ Like') : social.state?.liked ? '♥ Unlike' : '♡ Like'}{!compact && likes !== null && likes !== undefined ? ' · ' + likes : ''}</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={social.state?.saved ? 'Remove journey from Saved' : 'Save journey'}
        accessibilityState={{ disabled, selected: social.state?.saved ?? false }} disabled={disabled}
        onPress={() => { act('save'); }} style={({ pressed }) => [styles.button, compact && styles.compactButton, social.state?.saved && styles.active, disabled && styles.disabled, pressed && styles.pressed]}>
        {social.busy === 'save' ? <ActivityIndicator color={colors.ink} /> : <Text style={[styles.label, compact && styles.compactLabel]}>{social.state?.saved ? (compact ? 'Saved' : 'Saved ✓') : 'Save'}</Text>}
      </Pressable>
      <Pressable ref={shareButton} accessibilityRole="button" accessibilityLabel="Share public journey"
        accessibilityState={{ disabled: sharing }} disabled={sharing} onPress={() => { void share(); }}
        style={({ pressed }) => [styles.button, compact && styles.compactButton, pressed && styles.pressed]}>
        {sharing ? <ActivityIndicator color={colors.ink} /> : <Text style={[styles.label, compact && styles.compactLabel]}>{compact ? 'Share' : 'Share ↗'}</Text>}
      </Pressable>
      {compact && (social.error || social.auth.error || social.message || shareMessage) && <Pressable accessibilityRole="button" accessibilityLiveRegion="polite" accessibilityLabel={'View journey action feedback: ' + (social.error || social.auth.error || social.message || shareMessage || '')} onPress={() => setFeedbackOpen(true)} style={styles.status}><Text style={styles.label}>!</Text></Pressable>}
    </View>
    {compact ? <StorySheet visible={feedbackOpen} title="Journey actions" onClose={() => setFeedbackOpen(false)}>{feedback}</StorySheet> : feedback}
  </View>;
}
const styles = StyleSheet.create({
  compactSection: { flex: 1, minWidth: 0, marginTop: 0 },
  compactRow: { flexWrap: 'wrap', gap: 3 },
  compactButton: { minWidth: 44, flexBasis: 44, paddingHorizontal: 3, paddingVertical: 4, backgroundColor: 'transparent', borderWidth: 0 },
  compactLabel: { fontSize: 12 },
  status: { width: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.pale, borderRadius: 22 },
  section: { gap: 10, marginTop: -8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 44, flexGrow: 1, flexBasis: 90, minWidth: 90, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  active: { backgroundColor: colors.pale, borderColor: colors.green },
  disabled: { opacity: 0.6 }, pressed: { opacity: 0.7 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 19, flexShrink: 1 },
  feedback: { gap: 8 },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.pale },
});
