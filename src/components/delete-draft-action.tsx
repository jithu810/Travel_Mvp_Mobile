import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, ui } from '@/components/discovery/ui';
import { useSessionState } from '@/hooks/session-context';
import { supabase } from '@/lib/supabase/client';
import { deleteOwnedDraft } from '@/lib/remix/delete-draft';
import { creationRecovery } from '@/lib/create/recovery-store';

export function DeleteDraftAction({ draft, onDeleted }: { draft: { id: string; title: string }; onDeleted: () => void }) {
  const auth = useSessionState(), ownerId = auth.session?.user.id;
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const lock = useRef(false);
  async function remove() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      await deleteOwnedDraft(supabase, draft.id, ownerId || '');
      // A deleted draft's unsaved on-device copy can never be restored, so drop it too.
      if (ownerId) void creationRecovery.clear(ownerId, draft.id);
      setConfirm(false); onDeleted();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Deletion could not be confirmed. Refresh drafts before retrying.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={'Delete draft: ' + draft.title} disabled={!ownerId || busy} onPress={() => { setMessage(''); setConfirm(true); }} style={({ pressed }) => [s.trigger, (pressed || busy || !ownerId) && s.dimmed]}>
      <View accessible={false} style={s.bin}><View style={s.binLid} /><View style={s.binBody} /></View><Text style={s.triggerText}>Delete draft</Text>
    </Pressable>
    <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => { if (!lock.current) setConfirm(false); }}>
      <View style={s.shade}>
        <View accessibilityViewIsModal style={s.dialog}>
          <ScrollView contentContainerStyle={s.dialogContent} keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={s.title}>Delete draft?</Text>
            <Text style={ui.body}>Permanently delete “{draft.title}”? This cannot be undone.</Text>
            {message ? <Text accessibilityRole="alert" style={s.error}>{message}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={busy ? 'Deleting…' : 'Delete draft permanently'} accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => { void remove(); }} style={({ pressed }) => [s.confirm, (pressed || busy) && s.dimmed]}>
              <Text style={s.confirmText}>{busy ? 'Deleting…' : 'Delete draft permanently'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => setConfirm(false)} style={({ pressed }) => [s.cancel, (pressed || busy) && s.dimmed]}><Text style={s.cancelText}>Keep draft</Text></Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  trigger: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 13 },
  triggerText: { color: '#9D493D', fontSize: 11, lineHeight: 17, fontWeight: '600' },
  bin: { width: 13, height: 15, alignItems: 'center', justifyContent: 'center' },
  binLid: { width: 12, height: 2, backgroundColor: '#9D493D', borderRadius: 1, marginBottom: 2 },
  binBody: { width: 9, height: 9, borderWidth: 1.3, borderColor: '#9D493D', borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  shade: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0D243B99' },
  dialog: { width: '100%', maxWidth: 420, maxHeight: '90%', borderRadius: 26, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.white, overflow: 'hidden' },
  dialogContent: { padding: 24, gap: 14 }, title: { color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  error: { color: '#9D493D', fontSize: 13, lineHeight: 20 },
  confirm: { minHeight: 48, borderRadius: 16, backgroundColor: '#A54135', alignItems: 'center', justifyContent: 'center', padding: 12 },
  confirmText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  cancel: { minHeight: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#E8ECE3' },
  cancelText: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '600' }, dimmed: { opacity: 0.6 },
});
