import type { View } from 'react-native';
// Lazy imports keep public browsing and link sharing usable in older native clients.
let pendingCapture: Promise<string> | null = null;
const retained: string[] = [];
export async function shareArtworkImage(view: View, isActive: () => boolean) {
  const [capture, sharing] = await Promise.all([import('react-native-view-shot'), import('expo-sharing')]);
  const release = (uri: string) => { try { capture.releaseCapture(uri); } catch { /* Cache cleanup must not break sharing. */ } };
  if (!isActive()) return;
  if (!(await sharing.isAvailableAsync())) throw new Error('Image sharing is unavailable on this device. Share the journey link instead.');
  if (!isActive()) return;
  if (pendingCapture) throw new Error('An image is already being prepared. Try again shortly.');
  let expired = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const work = capture.captureRef(view, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1920 });
  pendingCapture = work;
  void work.then(uri => { if (expired || !isActive()) release(uri); }, () => {}).finally(() => { if (pendingCapture === work) pendingCapture = null; });
  try {
    const uri = await Promise.race([work, new Promise<never>((_, reject) => { timeout = setTimeout(() => { expired = true; reject(new Error('Image preparation timed out. Try again or share the link.')); }, 15000); })]);
    if (!isActive()) return;
    // Keep recent files alive for receiving apps after the chooser returns. Native tmpfiles
    // are cache artifacts; bound this process's retained set rather than deleting immediately.
    retained.push(uri);
    while (retained.length > 3) release(retained.shift()!);
    await sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share Journey Creator image' });
  } finally { if (timeout) clearTimeout(timeout); }
}
