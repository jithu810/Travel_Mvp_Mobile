import { theme } from '@/theme/mobile-theme';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Text, View, useWindowDimensions } from 'react-native';
import { StorySheet } from './story-sheet';
import { Action } from '../discovery/ui';
import type { ShareArtwork } from '@/lib/social/share-artwork';
import { shareArtworkImage } from '@/lib/social/share-image';

export function JourneyShareSheet({ artwork, onClose, onShareLink, message }: { artwork: ShareArtwork; message?: string | null; onClose: () => void; onShareLink: () => Promise<void> }) {
  const canvas = useRef<View>(null), active = useRef(true), lock = useRef(false);
  const [photoReady, setPhotoReady] = useState(false), [logoReady, setLogoReady] = useState(false);
  const [failed, setFailed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const size = Math.min(360, Math.max(180, width - 40)), scale = size / 360;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!artwork.photo || (photoReady && logoReady) || failed) return;
    const timeout = setTimeout(() => { setFailed(true); setError('The photo could not finish loading. Close and retry, or share the link.'); }, 20000);
    return () => clearTimeout(timeout);
  }, [artwork.photo, photoReady, logoReady, failed]);
  async function shareImage() {
    if (lock.current || !canvas.current || !photoReady || !logoReady || failed) return;
    lock.current = true; setBusy(true); setError(null);
    try { await shareArtworkImage(canvas.current, () => active.current); }
    catch (cause) { if (active.current) setError(cause instanceof Error && /unavailable|timed out|already/.test(cause.message) ? cause.message : 'Image sharing needs an updated development build, or could not open. You can still share the link.'); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  async function shareLink() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await onShareLink(); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  return <StorySheet visible title="Share this memory" onClose={() => { if (!lock.current) onClose(); }}>
    <View ref={canvas} collapsable={false} style={{ width: size, height: size * 16 / 9, padding: 24 * scale, alignSelf: 'center', backgroundColor: theme.background, borderRadius: 24, borderWidth: 1, borderColor: theme.white }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 * scale, marginBottom: 16 * scale }}>
        <Image source={require('../../../assets/journey-creator-logo.png')} onLoad={() => setLogoReady(true)} onError={() => { setFailed(true); setError('Brand artwork unavailable. Share the link instead.'); }} style={{ width: 44 * scale, height: 44 * scale }} />
        <View><Text allowFontScaling={false} style={{ fontSize: 16 * scale, color: theme.text, fontWeight: '700' }}>Journey Creator</Text><Text allowFontScaling={false} style={{ fontSize: 10 * scale, color: theme.muted, marginTop: 3 * scale }}>Discover. Plan. Journey.</Text></View>
      </View>
      <View style={{ height: 280 * scale, backgroundColor: theme.lavender, borderRadius: 16 * scale, overflow: 'hidden', justifyContent: 'center' }}>
        {artwork.photo && !failed ? <Image source={{ uri: artwork.photo }} resizeMode="contain" fadeDuration={0} onLoad={() => setPhotoReady(true)} onError={() => { setFailed(true); setError('This photo could not load. Share the link instead.'); }} style={{ width: '100%', height: '100%' }} /> : <Text allowFontScaling={false} style={{ color: theme.text, textAlign: 'center', fontSize: 18 * scale }}>A journey worth discovering</Text>}
      </View>
      <Text allowFontScaling={false} numberOfLines={2} style={{ color: theme.text, fontSize: 22 * scale, lineHeight: 27 * scale, fontWeight: '700', marginTop: 14 * scale }}>{artwork.title}</Text>
      <Text allowFontScaling={false} numberOfLines={1} style={{ color: theme.muted, fontSize: 12 * scale, lineHeight: 18 * scale, marginTop: 6 * scale }}>{artwork.location}</Text>
      <View style={{ flex: 1 }} />
      <Text allowFontScaling={false} numberOfLines={3} style={{ color: theme.accent, fontSize: 10 * scale, lineHeight: 13 * scale, marginTop: 10 * scale }}>{artwork.url}</Text>
    </View>
    {!!artwork.photo && Platform.OS !== 'web' && <Action memorySheet label={busy ? 'Preparing share…' : 'Share image'} disabled={busy || !photoReady || !logoReady || failed} onPress={() => { void shareImage(); }} />}
    {!artwork.photo && <Text>This memory has no photo. You can share the journey link.</Text>}
    <Action secondary label="Share journey link" disabled={busy} onPress={() => { void shareLink(); }} />
    <Text selectable>{artwork.url}</Text>
    <Text>The image includes a readable URL. Share the link separately for a clickable link, or add a link sticker in your story app.</Text>
    {message && <Text accessibilityLiveRegion="polite">{message}</Text>}
    {error && <Text accessibilityRole="alert">{error}</Text>}
  </StorySheet>;
}
