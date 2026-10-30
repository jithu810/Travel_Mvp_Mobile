import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { creationRecovery } from '@/lib/create/recovery-store';
import { createRecoveryDebounce, recoveryPrompt, type Recovery } from '@/lib/create/recovery';
import { memoryChanged, type MemoryEdit } from '@/lib/create/memory';
import { randomUUID } from '@/lib/create/id';
import type { CreateForm } from '@/lib/create/model';
// onRestore returns false when the editor is busy and ignored the restore.
type Options = { userId: string; form: CreateForm; memoryEdit: MemoryEdit | null; dirty: boolean; hasLocalPhotos: boolean; onRestore: (recovery: Recovery) => boolean };
// Keeps a private on-device copy of unsaved editor work and offers it back once when the
// editor opens. Restore and Discard are always the user's choice; nothing is saved here.
export function useCreationRecovery({ userId, form, memoryEdit, dirty, hasLocalPhotos, onRestore }: Options) {
  const [debounce] = useState(() => createRecoveryDebounce());
  const [found, setFound] = useState<Recovery | null>(null), [focused, setFocused] = useState(false);
  const ready = useRef(false), shown = useRef(false), mounted = useRef(true), restore = useRef(onRestore);
  const latest = useRef({ form, memoryEdit, dirty, hasLocalPhotos });
  const formId = form.id;
  const write = useCallback(() => {
    const current = latest.current;
    if (!ready.current) return;
    if (!current.dirty && !memoryChanged(current.memoryEdit)) { debounce.cancel(); return; }
    debounce.schedule(() => creationRecovery.save(userId, current.form, current.memoryEdit, current.hasLocalPhotos));
  }, [debounce, userId]);
  useEffect(() => { restore.current = onRestore; }, [onRestore]);
  useEffect(() => { latest.current = { form, memoryEdit, dirty, hasLocalPhotos }; write(); }, [form, memoryEdit, dirty, hasLocalPhotos, write]);
  // The prompt waits until this editor is the visible screen (not under Sign in).
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => creationRecovery.claim(userId, formId), [userId, formId]);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void creationRecovery.find(userId, latest.current.form, randomUUID).then(result => {
      if (!active) return;
      // A found copy stays untouched (no writes) until the user chooses Restore or Discard.
      if (result) setFound(result); else { ready.current = true; write(); }
    });
    // Leaving the app writes pending edits now in case the system closes it.
    const appState = AppState.addEventListener('change', state => { if (state !== 'active') debounce.flush(); });
    return () => { active = false; mounted.current = false; appState.remove(); debounce.cancel(); };
  }, [debounce, userId, write]);
  useEffect(() => {
    if (!found || !focused || shown.current) return;
    shown.current = true;
    const prompt = recoveryPrompt(found);
    // Restore replaces any edits typed meanwhile; Discard keeps them and they replace the copy.
    Alert.alert(prompt.title, prompt.body, [
      { text: 'Discard', style: 'destructive', onPress: () => { if (!mounted.current) return; void creationRecovery.clear(userId, found.snapshotId); ready.current = true; write(); } },
      { text: 'Restore', onPress: () => {
        if (!mounted.current) return;
        ready.current = true;
        if (restore.current(found) && found.snapshotId !== found.form.id) void creationRecovery.clear(userId, found.snapshotId);
        write();
      } },
    ], { cancelable: false });
  }, [found, focused, userId, write]);
  // After a save or an explicit discard the private copy is removed.
  return useCallback((id = latest.current.form.id) => { debounce.cancel(); void creationRecovery.clear(userId, id); }, [debounce, userId]);
}
