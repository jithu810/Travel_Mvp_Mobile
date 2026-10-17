import { BrandedLoading } from '@/components/branded-loading';
import { createPhotoSaveController } from '@/lib/create/photo-save';
import { checkPhotoDraft, uploadJourneyPhoto } from '@/lib/create/photo-queries';
import { useEditorPhotos } from '@/hooks/use-editor-photos';
import { useLocalPhotos } from '@/hooks/use-local-photos';
import { PhotoField } from '@/components/create/photo-field';
import { MemoryEditorSheet } from '@/components/create/memory-editor-sheet';
import { MemoryRow } from '@/components/create/memory-row';
import { emptyMemory, memoryChanged, memorySnapshot, publicationIssue, type MemoryEdit } from '@/lib/create/memory';
import { safePhoto } from '@/lib/discovery/model';
import { usePreventRemove } from 'expo-router/react-navigation';
import { CreateJourneyHeader } from '@/components/create/create-journey-header';
import { QuickJourneySetup } from '@/components/create/quick-journey-setup';
import { selectDestination } from '@/lib/create/editor-model';
import { useLoad } from '@/hooks/use-load';
import { loadPrivateDrafts } from '@/lib/remix/queries';
import { randomUUID, idsAvailable } from '@/lib/create/id';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, colors, Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { JourneyMap } from '@/components/journey/map/journey-map';
import { useSessionState } from '@/hooks/session-context';
import { coordinates, createSaveController, moveStop, newForm, previewStops, type CreateForm, type Place, type StopInput } from '@/lib/create/model';
import { loadEditableDraft, saveNewJourney } from '@/lib/create/queries';
const DraftMap = memo(function DraftMap({ geometry, photos, selectedId, onSelect, active }: { geometry: string; photos: string; selectedId: string | null; onSelect: (id: string) => void; active: boolean }) {
  const stops = useMemo(() => previewStops(JSON.parse(geometry) as StopInput[]), [geometry]);
  const memoryPhotos = useMemo(() => JSON.parse(photos) as Record<string, string | null>, [photos]);
  return <View style={{ height: 180, borderRadius: 18, overflow: 'hidden' }}><JourneyMap stops={stops} presentation="expanded" memoryPhotos={memoryPhotos} animateMemoryRoute={active} selectedId={selectedId} onSelect={onSelect} /></View>;
});
export function NewJourneyEditor({ ownerId, initial, onReload, onDestinationFocus, dismissSearchVersion = 0, keyboardOpen = false }: { ownerId: string; initial?: CreateForm; onReload?: () => void; onDestinationFocus?: (place: Place | null) => void; dismissSearchVersion?: number; keyboardOpen?: boolean }) {
  const router = useRouter(), navigation = useNavigation();
  const allowExit = useRef(false);
  const [form, setForm] = useState<CreateForm>(() => initial ?? newForm(randomUUID()));
  const titleEdited = useRef(Boolean(initial));
  useEffect(() => { if (!initial) onDestinationFocus?.(null); }, [initial, onDestinationFocus]);
  const [dirty, setDirty] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [memoryListWidth, setMemoryListWidth] = useState(0);
  const memoryCardWidth = Math.min(248, Math.max(160, (memoryListWidth || 280) - 28));
  function selectVisibleMemory(offset: number) {
    const stop = form.stops[Math.max(0, Math.min(form.stops.length - 1, Math.round(offset / (memoryCardWidth + 12))))];
    if (stop) setSelectedMemoryId(stop.id);
  }
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    if (lifetime.current.signal.aborted) lifetime.current = new AbortController();
    const current = lifetime.current;
    return () => current.abort();
  }, []);
  const controller = useMemo(() => {
    const metadata = createSaveController((payload, signal) => saveNewJourney(payload,ownerId,signal));
    return createPhotoSaveController({ save: metadata.save, checkDraft: (form,signal) => checkPhotoDraft(form,ownerId,signal),
      upload: (objectName,photo,signal) => uploadJourneyPhoto(objectName,photo,ownerId,signal), uuid: randomUUID });
  }, [ownerId]);
  const [savePhase, setSavePhase] = useState('Saving journey...');
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [message, setMessage] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false), [attemptedStatus, setAttemptedStatus] = useState<'draft' | 'published'>('draft');
  const [memoryEdit, setMemoryEdit] = useState<MemoryEdit | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const lock = useRef(false), focus = useRef({ active: false, generation: 0 });
  useFocusEffect(useCallback(() => { focus.current.active = true; focus.current.generation++; return () => { focus.current.active = false; focus.current.generation++; }; }, []));
  const localPhotos = useLocalPhotos();
  const photoBusy = localPhotos.busyKey !== null;
  const hasLocalPhotos = Object.keys(localPhotos.candidates).length > 0;
  const disabled = busy || uncertain || photoBusy;
  const memoryHasPhoto = !!(memoryEdit && localPhotos.candidates[memoryEdit.value.id]);
  const geometry = JSON.stringify(form.stops.map(stop => ({ id: stop.id, name: stop.name, latitude: stop.latitude, longitude: stop.longitude })));
  function change(patch: Partial<CreateForm>) { if (!disabled && !lock.current && !localPhotos.isBusy()) { setForm(current => ({ ...current, ...patch })); setError(null); setMessage(null); setDirty(true); } }
  const pathsKey = JSON.stringify([form.coverPath, ...form.stops.map(stop => stop.photoPath)].filter((path): path is string => !!path));
  const photos = useEditorPhotos(pathsKey,ownerId);
  const memoryPhotos = JSON.stringify(Object.fromEntries(form.stops.map(stop => [stop.id, localPhotos.candidates[stop.id]?.uri || (stop.photoPath ? stop.photoPath.startsWith('journey-media/') ? photos.data?.[stop.photoPath] || null : safePhoto(stop.photoPath) : null)])));
  const latest = useRef({ form, memoryEdit, candidates: localPhotos.candidates });
  useEffect(() => { latest.current = { form, memoryEdit, candidates: localPhotos.candidates }; }, [form, memoryEdit, localPhotos.candidates]);
  usePreventRemove(dirty || memoryChanged(memoryEdit) || busy || hasLocalPhotos || photoBusy, ({ data }) => {
    if (allowExit.current) { navigation.dispatch(data.action); return; }
    if (localPhotos.isBusy()) { Alert.alert('Preparing photo', 'Wait for photo preparation to finish before leaving.'); return; }
    if (lock.current) { Alert.alert('Saving journey', 'Wait for the save result before leaving.'); return; }
    const current = latest.current, generation = focus.current.generation;
    Alert.alert('Discard unsaved changes?', form.updatedAt ? 'Your last saved journey stays private. Unsaved changes and local photo previews will be lost.' : 'This journey has not been saved. Your setup changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => {
        if (!lock.current && !localPhotos.isBusy() && latest.current === current && focus.current.active && focus.current.generation === generation) navigation.dispatch(data.action);
      } },
    ]);
  });
  function confirmReload() {
    if (lock.current || localPhotos.isBusy() || !onReload) return;
    const current = latest.current, generation = focus.current.generation;
    Alert.alert('Reload saved draft?', 'This discards unsaved journey and memory changes and loads the current saved version.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Reload', onPress: () => {
        if (!lock.current && !localPhotos.isBusy() && latest.current === current && focus.current.active && focus.current.generation === generation) onReload();
      } },
    ]);
  }
  function closeMemory() {
    if (lock.current || localPhotos.isBusy()) return;
    if (!memoryChanged(memoryEdit) && !memoryHasPhoto) { setMemoryEdit(null); return; }
    const current = latest.current, generation = focus.current.generation;
    Alert.alert('Discard memory changes?', 'Unsaved memory edits and its local photo preview will be discarded. Saved photos stay unchanged.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => {
        if (!lock.current && !localPhotos.isBusy() && latest.current === current && focus.current.active && focus.current.generation === generation) { if (memoryEdit) localPhotos.remove(memoryEdit.value.id); setMemoryEdit(null); }
      } },
    ]);
  }
  function removeMemory(stop: StopInput) {
    const current = latest.current, generation = focus.current.generation;
    Alert.alert('Remove this memory?', stop.name + ' will be removed when you save the journey. Existing photo files will not be deleted.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => {
        if (!disabled && !lock.current && latest.current === current && focus.current.active && focus.current.generation === generation) { change({ stops: form.stops.filter(item => item.id !== stop.id) }); localPhotos.remove(stop.id); }
      } },
    ]);
  }
  async function save(status: 'draft' | 'published', snapshot = form, savingMemory = false, savingSettings = false) {
    if (lock.current || uncertain || localPhotos.isBusy()) return;
    lock.current = true; setBusy(true); setError(null); setMessage(null); setAttemptedStatus(status);
    const generation = focus.current.generation;
    const pendingPhotos = { ...localPhotos.candidates };
    const result = await controller.save(snapshot,status,pendingPhotos,lifetime.current.signal,
      phase => { if (!lifetime.current.signal.aborted) setSavePhase(phase); },
      checkpoint => {
        if (lifetime.current.signal.aborted) return;
        setForm(checkpoint); setDirty(false);
        setMemoryEdit(current => {
          const savedStop = checkpoint.stops.find(stop => stop.id === current?.value.id);
          return current && savedStop ? { ...current, isNew: false, baseline: { ...savedStop } } : current;
        });
      });
    lock.current = false;
    if (lifetime.current.signal.aborted) return;
    setBusy(false);
    if (result.kind === 'error') { setError(result.message); setUncertain(Boolean(result.uncertain)); }
    if (result.kind === 'saved') {
      setForm(result.form); setDirty(false); localPhotos.acceptSaved(pendingPhotos);
      if (savingMemory) setMemoryEdit(null);
      if (savingSettings) setSettingsOpen(false);
      if (result.saved.status === 'published') setPublishedId(result.saved.id);
      setMessage(Object.keys(pendingPhotos).length ? (result.saved.status === 'published' ? 'Journey and photos published.' : 'Journey and photos saved privately.') : savingMemory ? 'Memory saved privately.' : result.saved.status === 'draft' ? 'Draft saved. Only you can open it.' : 'Your journey is published.');
      if (focus.current.active && focus.current.generation === generation) {
        if (result.saved.status === 'published') { allowExit.current = true; router.push({ pathname: '/journey/[id]', params: { id: result.saved.id } }); }
        else if (!snapshot.updatedAt) { allowExit.current = true; router.replace({ pathname: '/create', params: { draft: result.saved.id } }); }
      }
    }
  }
  function publish() { void save('published'); }
  function saveMemory() {
    if (!memoryEdit || disabled || lock.current) return;
    try { void save('draft', memorySnapshot(form, memoryEdit), true); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Check this memory before saving.'); }
  }
  if (!form.updatedAt) return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={createStyles.quickPage}>
      <QuickJourneySetup dismissSearchVersion={dismissSearchVersion} form={form} disabled={disabled} saving={busy} onTitle={title => { titleEdited.current = true; change({ title }); }}
        onDestination={destination => { change(selectDestination(form, destination, titleEdited.current)); onDestinationFocus?.(destination); }} onChange={change} onStart={() => { void save('draft'); }} feedback={<>
        {error && <Text accessibilityRole="alert" style={ui.body}>{error}</Text>}
        {uncertain && <><Text style={ui.body}>Save result unconfirmed. Check your drafts before retrying.</Text><Action label="Check Account drafts" onPress={() => router.push('/account')} /></>}
      </>} />
      <DraftShortcuts ownerId={ownerId} keyboardHidden={keyboardOpen} />
    </View>
  </KeyboardAvoidingView>;
  if (publishedId) return <View style={[ui.list, { gap: 18 }]}>
    <Text style={ui.heading}>Journey published.</Text><Text style={ui.body}>Your route is public and ready to share.</Text>
    <Action label="View published journey" onPress={() => router.push({ pathname: '/journey/[id]', params: { id: publishedId } })} />
    <Action label="Back to Discover" onPress={() => router.replace('/discover')} />
  </View>;
  const readiness = publicationIssue(form);
  const coverUri = localPhotos.candidates.cover?.uri || (form.coverPath ? form.coverPath.startsWith('journey-media/') ? photos.data?.[form.coverPath] : safePhoto(form.coverPath) : null);
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[ui.list, { gap: 10, paddingTop: 0, paddingHorizontal: 16 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <View style={createStyles.editorHero}>
      {coverUri && <Image source={{ uri: coverUri }} resizeMode="cover" accessible={false} onError={photos.refreshPreview} style={StyleSheet.absoluteFill} />}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, createStyles.heroShade]} />
      <View style={createStyles.heroToolbar}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/discover')} style={createStyles.heroBack}><Text accessible={false} style={createStyles.heroBackText}>‹</Text></Pressable>
      <Text accessibilityLiveRegion="polite" style={createStyles.editorStatus}>{busy ? savePhase : photoBusy ? 'Preparing local photo...' : uncertain ? 'Save needs attention' : dirty ? 'Unsaved changes · Save before leaving' : hasLocalPhotos ? 'Details saved - Photos not saved' : 'Saved privately'}</Text></View>
      <Text style={createStyles.privateBadge}>Your journey · Private</Text><Text accessibilityRole="header" numberOfLines={2} style={createStyles.editorTitle}>{form.title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Journey settings" accessibilityState={{ expanded: settingsOpen }} onPress={() => setSettingsOpen(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={createStyles.editorMeta}>{form.destination?.name || 'Choose a destination'} · {form.days} {form.days === '1' ? 'day' : 'days'} · Edit settings</Text></Pressable>
    </View>
      <PhotoField compact label="Cover photo" candidate={localPhotos.candidates.cover} savedUri={form.coverPath ? form.coverPath.startsWith('journey-media/') ? photos.data?.[form.coverPath] : safePhoto(form.coverPath) : null}
        busy={localPhotos.busyKey === 'cover'} disabled={disabled} error={localPhotos.errors.cover} onSelect={() => { if (!lock.current && !disabled) localPhotos.select('cover'); }} onTakePhoto={() => { if (!lock.current && !disabled) localPhotos.select('cover', 'camera'); }} onRemove={() => localPhotos.remove('cover')} hasSavedPhoto={!!form.coverPath} onRemoveSaved={() => change({ coverPath: null })} onPreviewError={photos.refreshPreview} />
      {form.stops.some(stop => coordinates(stop.latitude, stop.longitude)) && <DraftMap geometry={geometry} photos={memoryPhotos} selectedId={form.stops.some(stop => stop.id === selectedMemoryId) ? selectedMemoryId : null} onSelect={setSelectedMemoryId} active={!settingsOpen && !memoryEdit && !busy && !photoBusy} />}
      <View style={createStyles.memoriesSection}>
      <View style={createStyles.memoriesBand}><Text accessibilityRole="header" style={createStyles.memoriesHeading}>Memories · {form.stops.length}/50</Text></View>
      {!form.stops.length && <View style={createStyles.emptyMemories}><View accessible={false} style={createStyles.emptySymbol}><Text style={createStyles.emptySymbolText}>⌖</Text></View><Text style={createStyles.emptyTitle}>Your journey starts here</Text><Text style={createStyles.emptyBody}>Add a place or simply name a moment. Notes are optional, and you can come back whenever you have time.</Text></View>}
      {form.stops.length > 0 && <ScrollView horizontal accessibilityLabel="Journey memories" accessibilityHint="Swipe left or right to browse memories; tap a card to edit" showsHorizontalScrollIndicator={false} directionalLockEnabled nestedScrollEnabled keyboardShouldPersistTaps="handled" style={createStyles.memoryScroll} contentContainerStyle={createStyles.memoryCards} onMomentumScrollEnd={event => selectVisibleMemory(event.nativeEvent.contentOffset.x)} onScrollEndDrag={event => { if (!event.nativeEvent.velocity?.x) selectVisibleMemory(event.nativeEvent.contentOffset.x); }} onLayout={event => setMemoryListWidth(event.nativeEvent.layout.width)}>
      {form.stops.map((stop, index) => <MemoryRow key={stop.id} cardWidth={memoryCardWidth} selected={selectedMemoryId === stop.id} stop={stop} index={index} total={form.stops.length} disabled={disabled}
        localPhoto={!!localPhotos.candidates[stop.id]} photo={localPhotos.candidates[stop.id]?.uri || (stop.photoPath ? stop.photoPath.startsWith('journey-media/') ? photos.data?.[stop.photoPath] || null : safePhoto(stop.photoPath) : null)}
        onEdit={() => { if (!disabled && !lock.current && !localPhotos.isBusy()) { setSelectedMemoryId(stop.id); setError(null); setMemoryEdit({ value: { ...stop }, baseline: { ...stop }, isNew: false }); } }}
        onPhotoError={photos.refreshPreview} onMove={offset => change({ stops: moveStop(form.stops, index, offset) })} onRemove={() => removeMemory(stop)} />)}
      </ScrollView>}
      </View>
      {photos.error && <Text style={ui.body}>Some photo previews are unavailable. Original photos remain preserved.</Text>}
      {error && !memoryEdit && <Text accessibilityRole="alert" style={ui.body}>{error}</Text>}
      {message && <Text accessibilityLiveRegion="polite" style={ui.body}>{message}</Text>}
      <Text style={ui.body}>{readiness || 'Ready to publish. Your memories have selected locations.'}</Text>
      {uncertain && <>{onReload && <Action label="Reload saved draft" onPress={confirmReload} />}<Action label="Check Account drafts" onPress={() => router.push('/account')} />
        {attemptedStatus === 'published' && <Action label="Check public journey" onPress={() => router.push({ pathname: '/journey/[id]', params: { id: form.id } })} />}
        <Text style={ui.body}>The form is preserved. Check the save result before trying again.</Text></>}
    </ScrollView>
    <View style={createStyles.editorFooter}>
      <View style={createStyles.editorActionRow}>
        <View style={createStyles.editorActionSlot}><Action compact label={busy ? savePhase : 'Save Draft'} secondary disabled={disabled} onPress={() => { void save('draft'); }} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Publish Journey" accessibilityState={{ disabled: disabled || !!readiness }} disabled={disabled || !!readiness}
          onPress={publish} style={({ pressed }) => [createStyles.publishAction, (disabled || !!readiness) && createStyles.publishDisabled, pressed && !disabled && !readiness && { opacity: 0.75 }]}>
          <Text style={[createStyles.publishLabel, (disabled || !!readiness) && createStyles.publishLabelDisabled]}>Publish Journey</Text>
        </Pressable>
      </View>
      <Action vibrant label="+ Add memory" disabled={disabled || form.stops.length >= 50} onPress={() => {
      if (disabled || lock.current || form.stops.length >= 50) return;
      const value = emptyMemory(randomUUID()); setError(null); setMessage(null); setMemoryEdit({ value, baseline: { ...value }, isNew: true });
    }} /></View>
    {settingsOpen && <Modal visible transparent animationType="slide" onRequestClose={() => { if (!lock.current && !localPhotos.isBusy()) setSettingsOpen(false); }}>
      <SafeAreaView style={createStyles.settingsOverlay}>
        <KeyboardAvoidingView behavior="padding" style={createStyles.settingsAvoid}>
          <View style={createStyles.settingsPanel} accessibilityViewIsModal>
            <View style={createStyles.settingsHeader}><Text accessibilityRole="header" style={createStyles.settingsTitle}>Edit Journey</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close journey settings" disabled={busy || photoBusy} onPress={() => { if (!lock.current && !localPhotos.isBusy()) setSettingsOpen(false); }} style={createStyles.settingsClose}><Text style={createStyles.settingsCloseText}>×</Text></Pressable>
            </View>
            <Text style={createStyles.settingsNote}>Update your journey details. Close keeps unsaved edits.</Text>
            <QuickJourneySetup editing form={form} disabled={disabled} saving={busy} onTitle={title => change({ title })} onDestination={destination => change(selectDestination(form, destination, true))} onChange={change} onStart={() => { void save('draft', form, false, true); }}
              feedback={<>{error && <Text accessibilityRole="alert" style={createStyles.settingsNote}>{error}</Text>}{busy && <Text accessibilityLiveRegion="polite" style={createStyles.settingsNote}>{savePhase}</Text>}{uncertain && onReload && <Action label="Reload saved draft" onPress={confirmReload} />}</>} />
            <Text style={createStyles.settingsNote}>Saves all current journey changes privately.</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>}
    {memoryEdit && <MemoryEditorSheet key={memoryEdit.value.id} value={memoryEdit.value} isNew={memoryEdit.isNew} proximity={form.destination} busy={busy} savingLabel={savePhase} preparingPhoto={photoBusy} blocked={uncertain} error={error}
      onChange={patch => { if (!disabled && !lock.current && !localPhotos.isBusy()) { setMemoryEdit(current => current ? { ...current, value: { ...current.value, ...patch } } : null); setError(null); } }}
      photoControl={<PhotoField memorySheet label="Memory photo" candidate={localPhotos.candidates[memoryEdit.value.id]} savedUri={memoryEdit.value.photoPath ? memoryEdit.value.photoPath.startsWith('journey-media/') ? photos.data?.[memoryEdit.value.photoPath] : safePhoto(memoryEdit.value.photoPath) : null}
        busy={localPhotos.busyKey === memoryEdit.value.id} disabled={disabled} error={localPhotos.errors[memoryEdit.value.id]} onSelect={() => { if (!lock.current && !disabled) localPhotos.select(memoryEdit.value.id); }} onTakePhoto={() => { if (!lock.current && !disabled) localPhotos.select(memoryEdit.value.id, 'camera'); }} onRemove={() => localPhotos.remove(memoryEdit.value.id)} hasSavedPhoto={!!memoryEdit.value.photoPath} onRemoveSaved={() => { if (!disabled && !lock.current && !localPhotos.isBusy()) setMemoryEdit(current => current ? { ...current, value: { ...current.value, photoPath: null } } : null); }} onPreviewError={photos.refreshPreview} />}
      onClose={closeMemory} onSave={saveMemory} onReload={onReload ? confirmReload : undefined} />}
  </KeyboardAvoidingView>;
}

export function DraftShortcuts({ ownerId, keyboardHidden = false }: { ownerId: string; keyboardHidden?: boolean }) {
  const router = useRouter();
  const loader = useCallback((signal: AbortSignal) => loadPrivateDrafts(ownerId, signal), [ownerId]);
  const drafts = useLoad(loader);
  const refresh = drafts.refresh;
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const [historyWidth, setHistoryWidth] = useState(0);
  const cardWidth = Math.max(0, Math.min(320, (historyWidth || 280) - 24));
  return <View style={keyboardHidden ? [createStyles.history, { display: 'none' }] : createStyles.history} accessibilityElementsHidden={keyboardHidden} onLayout={event => setHistoryWidth(event.nativeEvent.layout.width)}>
    <View style={createStyles.historyHeader}>
      <View accessible={false} style={createStyles.historyBalance} />
      <Text accessibilityRole="header" style={createStyles.historyHeading}>Your drafts</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="All private drafts" onPress={() => router.push('/account')} style={createStyles.allDrafts}><Text style={createStyles.allDraftsText}>View all →</Text></Pressable>
    </View>
    {drafts.loading ? <ActivityIndicator accessibilityLabel="Loading private drafts" /> : drafts.error ? <Message title="Drafts unavailable" body={drafts.error} retry={drafts.retry} />
      : drafts.data?.length ? <ScrollView horizontal accessibilityLabel="Private draft history" accessibilityHint="Swipe left or right to browse your drafts"
        style={createStyles.historyScroll} contentContainerStyle={createStyles.historyItems} showsHorizontalScrollIndicator={false} directionalLockEnabled keyboardShouldPersistTaps="handled">
        {drafts.data.map(draft => <Pressable key={draft.id} accessibilityRole="button" accessibilityLabel={'Continue: ' + draft.title}
          onPress={() => router.push({ pathname: '/create', params: { draft: draft.id } })} style={({ pressed }) => [createStyles.draftCard, { width: cardWidth }, pressed && { opacity: 0.75 }]}>
          <View accessible={false} style={createStyles.draftIcon}><Text style={createStyles.draftIconText}>↗</Text></View>
          <View style={createStyles.draftCopy}><Text numberOfLines={2} style={createStyles.draftTitle}>{draft.title}</Text><Text style={createStyles.draftStatus}>Private draft · Continue editing</Text></View>
          <Text accessible={false} style={createStyles.draftArrow}>›</Text>
        </Pressable>)}
      </ScrollView> : <Text style={ui.body}>Your saved drafts will appear here.</Text>}
  </View>;
}
function DraftEditorEntry({ id, ownerId }: { id: string; ownerId: string }) {
  const [revision, setRevision] = useState(0);
  const loader = useCallback((signal: AbortSignal) => { void revision; return loadEditableDraft(id, ownerId, signal); }, [id, ownerId, revision]);
  const draft = useLoad(loader);
  if (!draft.loading && draft.data) return <NewJourneyEditor key={id + ':' + revision} ownerId={ownerId} initial={draft.data} onReload={() => setRevision(value => value + 1)} />;
  return <View style={{ flex: 1 }}><ScreenHeader title="Your journey" back compact /><View style={ui.list}>
    {draft.loading ? <BrandedLoading message="Opening your private journey…" /> : <Message title="Draft unavailable" body={draft.error || 'This draft is not available for editing.'} retry={draft.retry} />}
  </View></View>;
}
export default function CreateScreen() {
  const router = useRouter(), auth = useSessionState(), prompted = useRef(false);
  const [focus, setFocus] = useState<{ ownerId: string | undefined; place: Place | null; version: number } | null>(null);
  const [dismissSearchVersion, setDismissSearchVersion] = useState(0), [keyboardOpen, setKeyboardOpen] = useState(false);
  const userId = auth.session?.user.id;
  const focusDestination = useCallback((place: Place | null) => setFocus(current => ({ ownerId: userId, place, version: (current?.version || 0) + 1 })), [userId]);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true)), hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const params = useLocalSearchParams<{ draft?: string | string[] }>();
  const draftId = typeof params.draft === 'string' ? params.draft : params.draft ? 'invalid' : null;
  useFocusEffect(useCallback(() => {
    if (!auth.loading && !auth.session && !prompted.current) { prompted.current = true; router.push({ pathname: '/auth', params: { context: 'create' } }); }
  }, [auth.loading, auth.session, router]));
  return <SafeAreaView style={ui.safe}><View style={ui.page} onTouchStart={!draftId ? () => setDismissSearchVersion(n => n + 1) : undefined}>{draftId ? (!auth.session || auth.loading) && <ScreenHeader title="Your journey" back compact /> : <CreateJourneyHeader destination={focus?.ownerId === userId ? focus?.place : null} destinationVersion={focus?.version} keyboardOpen={keyboardOpen} />}
    {auth.loading ? <ActivityIndicator /> : !auth.session ? <View style={ui.list}><Message title="Make your next chapter" body="Sign in to create a journey. Nothing is created until you save or publish." retry={() => router.push({ pathname: '/auth', params: { context: 'create' } })} action="Sign in to create" /></View>
      : draftId ? <DraftEditorEntry key={auth.session.user.id + ':' + draftId} id={draftId} ownerId={auth.session.user.id} />
        : !idsAvailable ? <View style={ui.list}><Message title="An app update is needed" body="Update this development client before creating journeys." /></View> : <NewJourneyEditor key={auth.session.user.id} ownerId={auth.session.user.id} onDestinationFocus={focusDestination} dismissSearchVersion={dismissSearchVersion} keyboardOpen={keyboardOpen} />}
  </View></SafeAreaView>;
}

const createStyles = StyleSheet.create({
  settingsOverlay: { flex: 1, backgroundColor: 'rgba(15, 24, 43, 0.38)' },
  settingsAvoid: { flex: 1, justifyContent: 'flex-end' },
  settingsPanel: { maxHeight: '98%', width: '100%', maxWidth: 560, alignSelf: 'center', padding: 14, gap: 8, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: '#EDF1F8', experimental_backgroundImage: 'linear-gradient(135deg, #FFF8F1 0%, #EDF1F8 55%, #E2EAF6 100%)' },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsTitle: { flex: 1, fontSize: 28, lineHeight: 34, fontWeight: '700', color: '#101B2E' },
  settingsClose: { minWidth: 44, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: '#F0F3FA', alignItems: 'center', justifyContent: 'center' },
  settingsCloseText: { color: '#172239', fontSize: 30, lineHeight: 34 },
  settingsNote: { color: '#505D73', fontSize: 12, lineHeight: 18 },
  editorHero: { marginHorizontal: -16, marginBottom: 0, minHeight: 204, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 22, gap: 4, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden', backgroundColor: '#344B4A' },
  heroShade: { experimental_backgroundImage: 'linear-gradient(180deg, rgba(20, 23, 22, 0.25) 0%, rgba(20, 23, 22, 0.12) 30%, rgba(20, 23, 22, 0.88) 100%)' },
  heroToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  heroBack: { width: 44, minHeight: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  heroBackText: { color: colors.white, fontSize: 30, lineHeight: 34 },
  privateBadge: { color: '#E8F4E8', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  editorTitle: { color: colors.white, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  editorStatus: { flex: 1, textAlign: 'right', color: '#E2EDE2', fontSize: 11, lineHeight: 16 },
  editorMeta: { color: colors.white, fontSize: 13, lineHeight: 20, fontWeight: '500' },
  memoriesSection: { padding: 10, gap: 8, borderRadius: 26, backgroundColor: '#FFFDFA', borderWidth: 1, borderColor: '#FFFFFF', boxShadow: '0 3px 8px rgba(57, 49, 29, 0.10)' },
  memoryScroll: { flexGrow: 0 },
  memoryCards: { gap: 12, paddingHorizontal: 2, paddingBottom: 6, alignItems: 'stretch' },
  memoriesBand: { minHeight: 36, paddingHorizontal: 4, justifyContent: 'center' },
  memoriesHeading: { color: colors.ink, fontSize: 17, lineHeight: 23, fontWeight: '700' },
  emptyMemories: { padding: 20, gap: 8, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: '#C8C9D3', backgroundColor: '#F0EDF7', experimental_backgroundImage: 'linear-gradient(120deg, #EEECFA 0%, #FFF0E0 100%)', alignItems: 'center' },
  emptySymbol: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#C568B9', experimental_backgroundImage: 'linear-gradient(135deg, #6F6BEF 0%, #DD51B0 50%, #FFB450 100%)', justifyContent: 'center', alignItems: 'center' },
  emptySymbolText: { color: colors.white, fontSize: 42 },
  emptyTitle: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
  emptyBody: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  editorFooter: { flexShrink: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8, backgroundColor: '#FFFDFA', boxShadow: '0 -2px 8px rgba(57, 49, 29, 0.06)', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: colors.line },
  editorActionRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  editorActionSlot: { flex: 1, minWidth: 0 },
  publishAction: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#173B4A', borderWidth: 1, borderColor: colors.ink, justifyContent: 'center', alignItems: 'center' },
  publishLabel: { color: colors.white, fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  publishDisabled: { backgroundColor: '#F1F2EB', borderColor: colors.line },
  publishLabelDisabled: { color: colors.muted },
  quickPage: { flex: 1, minHeight: 0, paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  history: { flexShrink: 0, marginTop: 12, gap: 4 },
  historyHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyBalance: { width: 88 },
  historyScroll: { flexGrow: 0, flexShrink: 0 },
  historyItems: { gap: 10, paddingHorizontal: 2, paddingTop: 3, paddingBottom: 8, alignItems: 'stretch' },
  historyHeading: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: colors.ink, flex: 1, minWidth: 0, textAlign: 'center' },
  draftCard: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 22, backgroundColor: '#FCFBF8', borderWidth: 1, borderColor: '#FFFFFF', boxShadow: '0 3px 5px rgba(57, 49, 29, 0.13)' },
  draftIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#E4F0E8', experimental_backgroundImage: 'linear-gradient(145deg, #DBEEE4 0%, #D9E8F6 100%)', alignItems: 'center', justifyContent: 'center' },
  draftIconText: { color: colors.ink, fontSize: 22 },
  draftCopy: { flex: 1, minWidth: 0, gap: 4 },
  draftTitle: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  draftStatus: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  draftArrow: { color: colors.ink, fontSize: 26 },
  allDrafts: { width: 88, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 4 },
  allDraftsText: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
