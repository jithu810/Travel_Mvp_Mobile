import { DraftRouteIllustration } from '@/components/create/draft-route-illustration';
import { StatusBar } from 'expo-status-bar';
import { SwipeAction } from '@/components/journey/swipe-journey-start';
import { MemoryDeck } from '@/components/create/memory-deck';
import { EditorActionIcon } from '@/components/create/editor-action-icon';
import { thumbnailStoragePath } from '@/lib/media/image-variants';
import { theme, primaryControl } from '@/theme/mobile-theme';
import { BrandedLoading } from '@/components/branded-loading';
import { createPhotoSaveController } from '@/lib/create/photo-save';
import { checkPhotoDraft, uploadJourneyPhoto } from '@/lib/create/photo-queries';
import { prepareThumbnail, removeThumbnail } from '@/lib/create/thumbnail-device';
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
import { Stack, useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Action, colors, Message, ScreenHeader, ui } from '@/components/discovery/ui';
import { JourneyMap } from '@/components/journey/map/journey-map';
import { useSessionState } from '@/hooks/session-context';
import { coordinates, createSaveController, moveStop, newForm, previewStops, type CreateForm, type Place, type StopInput } from '@/lib/create/model';
import { loadEditableDraft, saveNewJourney } from '@/lib/create/queries';
const DraftMap = memo(function DraftMap({ geometry, photos, thumbnails, selectedId, onSelect, active, height, topInset }: { height: number; topInset: number; geometry: string; photos: string; thumbnails: string; selectedId: string | null; onSelect: (id: string) => void; active: boolean }) {
  const stops = useMemo(() => { const thumbs = JSON.parse(thumbnails) as Record<string, string | null>; return previewStops(JSON.parse(geometry) as StopInput[]).map(stop => ({ ...stop, photoThumbnail: thumbs[stop.id] || null })); }, [geometry, thumbnails]);
  const memoryPhotos = useMemo(() => JSON.parse(photos) as Record<string, string | null>, [photos]);
  if (!stops.length) return <View style={[createStyles.emptyMap, { height: Math.max(200, height), paddingTop: topInset + 12 }]}><DraftRouteIllustration /><Text style={createStyles.adventureTitle}>Your next adventure starts here</Text><Text style={createStyles.adventureNote}>Every journey begins with one place.</Text></View>;
  if (!stops.some(stop => coordinates(stop.latitude, stop.longitude))) return <View style={[createStyles.emptyMap, { height: Math.max(145, height - 30), paddingTop: topInset + 12 }]}><Text style={createStyles.emptyMapTitle}>Your route takes shape here</Text><Text style={createStyles.emptyMapNote}>Add a location to a memory to see your route. Named moments can still be saved privately.</Text></View>;
  return <View style={{ height, marginHorizontal: -16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', backgroundColor: '#080F1E' }}><JourneyMap stops={stops} presentation="expanded" memoryPhotos={memoryPhotos} animateMemoryRoute={active} controlTopInset={topInset} selectedId={selectedId} onSelect={onSelect} /></View>;
});
export function NewJourneyEditor({ ownerId, initial, onReload, onDestinationFocus, dismissSearchVersion = 0, keyboardOpen = false }: { ownerId: string; initial?: CreateForm; onReload?: () => void; onDestinationFocus?: (place: Place | null) => void; dismissSearchVersion?: number; keyboardOpen?: boolean }) {
  const router = useRouter(), navigation = useNavigation();
  const insets = useSafeAreaInsets(), window = useWindowDimensions();
  const [editorFocused, setEditorFocused] = useState(true);
  const allowExit = useRef(false);
  const [form, setForm] = useState<CreateForm>(() => initial ?? newForm(randomUUID()));
  const titleEdited = useRef(Boolean(initial));
  useEffect(() => { if (!initial) onDestinationFocus?.(null); }, [initial, onDestinationFocus]);
  const [dirty, setDirty] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    if (lifetime.current.signal.aborted) lifetime.current = new AbortController();
    const current = lifetime.current;
    return () => current.abort();
  }, []);
  const controller = useMemo(() => {
    const metadata = createSaveController((payload, signal) => saveNewJourney(payload,ownerId,signal));
    return createPhotoSaveController({ save: metadata.save, checkDraft: (form,signal) => checkPhotoDraft(form,ownerId,signal),
      upload: (objectName,photo,signal) => uploadJourneyPhoto(objectName,photo,ownerId,signal), uuid: randomUUID, prepareThumbnail, removeThumbnail });
  }, [ownerId]);
  const [savePhase, setSavePhase] = useState('Saving journey...');
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [message, setMessage] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false), [attemptedStatus, setAttemptedStatus] = useState<'draft' | 'published'>('draft');
  const [memoryEdit, setMemoryEdit] = useState<MemoryEdit | null>(null);
  const memoryOpening = useRef(false);
  useEffect(() => { memoryOpening.current = Boolean(memoryEdit); }, [memoryEdit]);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const lock = useRef(false), focus = useRef({ active: false, generation: 0 });
  useFocusEffect(useCallback(() => { focus.current.active = true; setEditorFocused(true); focus.current.generation++; return () => { focus.current.active = false; setEditorFocused(false); focus.current.generation++; }; }, []));
  const localPhotos = useLocalPhotos();
  const photoBusy = localPhotos.busyKey !== null;
  const hasLocalPhotos = Object.keys(localPhotos.candidates).length > 0;
  const disabled = busy || uncertain || photoBusy;
  const memoryHasPhoto = !!(memoryEdit && localPhotos.candidates[memoryEdit.value.id]);
  const selectedId = form.stops.some(stop => stop.id === selectedMemoryId) ? selectedMemoryId : form.stops[0]?.id || null;
  const geometry = JSON.stringify(form.stops.map(stop => ({ id: stop.id, name: stop.name, latitude: stop.latitude, longitude: stop.longitude })));
  function change(patch: Partial<CreateForm>) { if (!disabled && !lock.current && !localPhotos.isBusy()) { setForm(current => ({ ...current, ...patch })); setError(null); setMessage(null); setDirty(true); } }
  const pathsKey = JSON.stringify([form.coverPath, ...form.stops.map(stop => stop.photoPath)].filter((path): path is string => !!path));
  const photos = useEditorPhotos(pathsKey,ownerId);
  const memoryPhotos = JSON.stringify(Object.fromEntries(form.stops.map(stop => [stop.id, localPhotos.candidates[stop.id]?.uri || (stop.photoPath ? stop.photoPath.startsWith('journey-media/') ? photos.data?.[stop.photoPath] || null : safePhoto(stop.photoPath) : null)])));
  const memoryThumbnails = JSON.stringify(Object.fromEntries(form.stops.map(stop => [stop.id, !localPhotos.candidates[stop.id] && stop.photoPath ? photos.data?.[thumbnailStoragePath(stop.photoPath) || ''] || null : null])));
  const latest = useRef({ form, memoryEdit, candidates: localPhotos.candidates, disabled, settingsOpen, coverOpen });
  useEffect(() => { latest.current = { form, memoryEdit, candidates: localPhotos.candidates, disabled, settingsOpen, coverOpen }; }, [form, memoryEdit, localPhotos.candidates, disabled, settingsOpen, coverOpen]);
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
  const publishSave = useRef(save);
  useEffect(() => { publishSave.current = save; });
  const publish = useCallback(() => { void publishSave.current('published'); }, []);
  function saveMemory() {
    if (!memoryEdit || disabled || lock.current) return;
    try { void save('draft', memorySnapshot(form, memoryEdit), true); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Check this memory before saving.'); }
  }
  if (!form.updatedAt) return <KeyboardAvoidingView style={{ flexShrink: 1, minHeight: 0 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
  function addMemory() {
    const current = latest.current;
    if (!focus.current.active || memoryOpening.current || current.form !== form || current.disabled || current.settingsOpen || current.coverOpen || current.memoryEdit || lock.current || localPhotos.isBusy() || form.stops.length >= 50) return;
    memoryOpening.current = true;
    const value = emptyMemory(randomUUID()); setError(null); setMessage(null); setMemoryEdit({ value, baseline: { ...value }, isNew: true });
  }
  const readiness = publicationIssue(form);
  const editorActions = <View style={createStyles.actionRail}>
    <Pressable accessibilityRole="button" accessibilityLabel="Edit cover photo" disabled={disabled} accessibilityState={{ disabled, expanded: coverOpen }} onPress={() => { if (!disabled && !lock.current && !localPhotos.isBusy()) setCoverOpen(true); }} style={[createStyles.railButton, disabled && { opacity: 0.5 }]}><EditorActionIcon name="cover" light={form.stops.length > 0} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Add memory" disabled={disabled || form.stops.length >= 50} accessibilityState={{ disabled: disabled || form.stops.length >= 50 }} onPress={addMemory} style={[createStyles.railButton, (disabled || form.stops.length >= 50) && { opacity: 0.5 }]}><EditorActionIcon name="add" light={form.stops.length > 0} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Save Draft" disabled={disabled} accessibilityState={{ disabled, busy }} onPress={() => { void save('draft'); }} style={[createStyles.railButton, disabled && { opacity: 0.5 }]}>{busy ? <ActivityIndicator color={colors.ink} /> : <EditorActionIcon name="save" light={form.stops.length > 0} />}</Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Journey settings" disabled={disabled} accessibilityState={{ expanded: settingsOpen, disabled }} onPress={() => { if (!lock.current && !localPhotos.isBusy()) setSettingsOpen(true); }} style={[createStyles.railButton, disabled && { opacity: 0.5 }]}><EditorActionIcon name="settings" light={form.stops.length > 0} /></Pressable>
  </View>;
  const firstStop = <View style={createStyles.firstStopCard}>
    <Text accessibilityRole="header" style={createStyles.firstStopTitle}>Where does your journey begin?</Text>
    <Text style={createStyles.firstStopNote}>Add a place or name a moment. You can add its location later and keep it private.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Add your first stop" accessibilityHint="Opens the memory editor. Nothing saves until you confirm Save memory." disabled={disabled || !editorFocused || settingsOpen || coverOpen || Boolean(memoryEdit)} accessibilityState={{ disabled: disabled || !editorFocused || settingsOpen || coverOpen || Boolean(memoryEdit) }} onPress={addMemory} style={[createStyles.firstStopButton, disabled && { opacity: 0.5 }]}><Text style={createStyles.firstStopLabel}>+ Add your first stop</Text></Pressable>
    <View style={createStyles.firstStopSecondary}>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit cover photo" disabled={disabled} accessibilityState={{ disabled, expanded: coverOpen }} onPress={() => { if (!disabled && !lock.current && !localPhotos.isBusy()) setCoverOpen(true); }} style={createStyles.secondaryAction}><EditorActionIcon name="cover" /><Text style={createStyles.secondaryLabel}>Cover photo</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Journey settings" disabled={disabled} accessibilityState={{ disabled, expanded: settingsOpen }} onPress={() => { if (!disabled && !lock.current && !localPhotos.isBusy()) setSettingsOpen(true); }} style={createStyles.secondaryAction}><EditorActionIcon name="settings" /><Text style={createStyles.secondaryLabel}>Settings</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Save Draft" disabled={disabled} accessibilityState={{ disabled, busy }} onPress={() => { void save('draft'); }} style={createStyles.secondaryAction}>{busy ? <ActivityIndicator color={colors.ink} /> : <EditorActionIcon name="save" />}<Text style={createStyles.secondaryLabel}>Save draft</Text></Pressable>
    </View>
  </View>;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[ui.list, { gap: 10, paddingTop: 0, paddingHorizontal: 16 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    {editorFocused && <StatusBar style={settingsOpen || coverOpen || memoryEdit ? 'dark' : 'light'} />}
    <DraftMap geometry={geometry} photos={memoryPhotos} thumbnails={memoryThumbnails} selectedId={selectedId} onSelect={setSelectedMemoryId} active={editorFocused && !settingsOpen && !coverOpen && !memoryEdit && !busy && !photoBusy} height={Math.max(180, Math.min(270, window.height * 0.29))} topInset={insets.top} />
    <View pointerEvents="none" style={[createStyles.statusShade, { height: insets.top + 20 }]} />
      <MemoryDeck emptyContent={firstStop} title={form.title} status={busy ? savePhase : photoBusy ? 'Preparing photo…' : uncertain ? 'Needs attention' : dirty ? 'Unsaved changes' : hasLocalPhotos ? 'Photos not saved' : 'Saved privately'} leading={<Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/discover')} style={createStyles.heroBack}><Text accessible={false} style={createStyles.heroBackText}>‹</Text></Pressable>} stops={form.stops} selectedId={selectedId} onSelect={setSelectedMemoryId} active={editorFocused && !settingsOpen && !coverOpen && !memoryEdit && !busy && !photoBusy} actions={editorActions} renderMemory={(stop, index, cardWidth, swipe) => <MemoryRow deck swipeHandlers={swipe?.handlers} canInteract={swipe?.canInteract} key={stop.id} cardWidth={cardWidth} selected={selectedId === stop.id} stop={stop} index={index} total={form.stops.length} disabled={disabled}
        localPhoto={!!localPhotos.candidates[stop.id]} photoThumbnail={!localPhotos.candidates[stop.id] && stop.photoPath ? photos.data?.[thumbnailStoragePath(stop.photoPath) || ''] || null : null} photo={localPhotos.candidates[stop.id]?.uri || (stop.photoPath ? stop.photoPath.startsWith('journey-media/') ? photos.data?.[stop.photoPath] || null : safePhoto(stop.photoPath) : null)}
        onEdit={() => { if (!disabled && !lock.current && !localPhotos.isBusy()) { setSelectedMemoryId(stop.id); setError(null); setMemoryEdit({ value: { ...stop }, baseline: { ...stop }, isNew: false }); } }}
        onPhotoError={photos.refreshPreview} onMove={offset => change({ stops: moveStop(form.stops, index, offset) })} onRemove={() => removeMemory(stop)} />} />

      {photos.error && <Text style={ui.body}>Some photo previews are unavailable. Original photos remain preserved.</Text>}
      {error && !memoryEdit && <Text accessibilityRole="alert" style={ui.body}>{error}</Text>}
      {message && <Text accessibilityLiveRegion="polite" style={ui.body}>{message}</Text>}
      {uncertain && <>{onReload && <Action label="Reload saved draft" onPress={confirmReload} />}<Action label="Check Account drafts" onPress={() => router.push('/account')} />
        {attemptedStatus === 'published' && <Action label="Check public journey" onPress={() => router.push({ pathname: '/journey/[id]', params: { id: form.id } })} />}
        <Text style={ui.body}>The form is preserved. Check the save result before trying again.</Text></>}
    </ScrollView>
    <View style={createStyles.editorFooter}>
      {form.stops.length === 0 ? <Text style={createStyles.emptyGuidance}>Add a stop to start building your journey.</Text> : <>
      <Text accessibilityLiveRegion="polite" style={createStyles.publishReason}>{readiness || (uncertain ? 'Check the save result before retrying.' : busy ? savePhase : 'Ready to publish your journey')}</Text>
      <SwipeAction active={editorFocused && !settingsOpen && !coverOpen && !memoryEdit && !disabled && !readiness} onComplete={publish} label="Swipe to publish journey" accessibilityLabel="Publish Journey" hint="Make this journey public" accessibilityHint="Swipe right or double tap to publish this journey and its photos publicly." openingLabel="Preparing to publish…" resetKey={JSON.stringify([ownerId, form, localPhotos.candidates, uncertain])} /></>}
    </View>
    {coverOpen && <Modal visible transparent animationType="slide" onRequestClose={() => { if (!lock.current && !localPhotos.isBusy()) setCoverOpen(false); }}>
      <SafeAreaView style={createStyles.settingsOverlay}><KeyboardAvoidingView behavior="padding" style={createStyles.settingsAvoid}><View style={createStyles.settingsPanel} accessibilityViewIsModal>
        <View style={createStyles.settingsHeader}><Text accessibilityRole="header" style={createStyles.settingsTitle}>Journey cover</Text><Pressable accessibilityRole="button" accessibilityLabel="Close cover photo options" disabled={busy || photoBusy} onPress={() => { if (!lock.current && !localPhotos.isBusy()) setCoverOpen(false); }} style={createStyles.settingsClose}><Text style={createStyles.settingsCloseText}>×</Text></Pressable></View>
        <Text style={createStyles.settingsNote}>Choose a cover. Changes upload only when you explicitly save or publish.</Text>
        <PhotoField label="Cover photo" candidate={localPhotos.candidates.cover} savedUri={form.coverPath ? form.coverPath.startsWith('journey-media/') ? photos.data?.[form.coverPath] : safePhoto(form.coverPath) : null}
        busy={localPhotos.busyKey === 'cover'} disabled={disabled} error={localPhotos.errors.cover} onSelect={() => { if (!lock.current && !disabled) localPhotos.select('cover'); }} onTakePhoto={() => { if (!lock.current && !disabled) localPhotos.select('cover', 'camera'); }} onRemove={() => localPhotos.remove('cover')} hasSavedPhoto={!!form.coverPath} onRemoveSaved={() => change({ coverPath: null })} onPreviewError={photos.refreshPreview} />
      </View></KeyboardAvoidingView></SafeAreaView>
    </Modal>}
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
  return <SafeAreaView edges={['top']} style={{ flex: 1 }}><ScreenHeader title="Your journey" back compact /><View style={ui.list}>
    {draft.loading ? <BrandedLoading message="Opening your private journey…" /> : <Message title="Draft unavailable" body={draft.error || 'This draft is not available for editing.'} retry={draft.retry} />}
  </View></SafeAreaView>;
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
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.safe}><Stack.Screen options={{ statusBarStyle: draftId ? 'dark' : 'light' }} /><View style={ui.page} onTouchStart={!draftId ? () => setDismissSearchVersion(n => n + 1) : undefined}>{draftId ? (!auth.session || auth.loading) && <SafeAreaView edges={['top']}><ScreenHeader title="Your journey" back compact /></SafeAreaView> : <CreateJourneyHeader destination={focus?.ownerId === userId ? focus?.place : null} destinationVersion={focus?.version} keyboardOpen={keyboardOpen} />}
    {auth.loading ? <ActivityIndicator /> : !auth.session ? <View style={ui.list}><Message title="Make your next chapter" body="Sign in to create a journey. Nothing is created until you save or publish." retry={() => router.push({ pathname: '/auth', params: { context: 'create' } })} action="Sign in to create" /></View>
      : draftId ? <DraftEditorEntry key={auth.session.user.id + ':' + draftId} id={draftId} ownerId={auth.session.user.id} />
        : !idsAvailable ? <View style={ui.list}><Message title="An app update is needed" body="Update this development client before creating journeys." /></View> : <NewJourneyEditor key={auth.session.user.id} ownerId={auth.session.user.id} onDestinationFocus={focusDestination} dismissSearchVersion={dismissSearchVersion} keyboardOpen={keyboardOpen} />}
  </View></SafeAreaView>;
}

const createStyles = StyleSheet.create({
  adventureTitle: { color: '#FFFFFF', fontSize: 19, lineHeight: 26, fontWeight: '600', textAlign: 'left', alignSelf: 'flex-start', maxWidth: '85%' }, adventureNote: { color: '#C7D5EC', fontSize: 12, lineHeight: 18, textAlign: 'left', maxWidth: '85%' },
  firstStopCard: { padding: 20, gap: 12, borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: theme.surface }, firstStopTitle: { color: theme.text, fontSize: 22, lineHeight: 29, fontWeight: '700' }, firstStopNote: { color: theme.muted, fontSize: 13, lineHeight: 20 },
  firstStopButton: { ...primaryControl, minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }, firstStopLabel: { color: '#FFFFFF', fontSize: 15, lineHeight: 22, fontWeight: '700' },
  firstStopSecondary: { flexDirection: 'row', gap: 4, justifyContent: 'space-between' }, secondaryAction: { flex: 1, minWidth: 0, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 4 }, secondaryLabel: { color: theme.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' }, emptyGuidance: { color: theme.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingVertical: 12 },
  emptyMap: { marginHorizontal: -16, paddingHorizontal: 24, paddingBottom: 16, justifyContent: 'center', gap: 6, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, backgroundColor: '#101B2E' }, emptyMapTitle: { color: '#FFFFFF', fontSize: 17, lineHeight: 23, fontWeight: '600' }, emptyMapNote: { color: '#D3DCEC', fontSize: 12, lineHeight: 18 },
  coverBand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusShade: { position: 'absolute', top: 0, left: 0, right: 0, experimental_backgroundImage: 'linear-gradient(180deg, rgba(5,15,30,0.78) 0%, rgba(5,15,30,0) 100%)' },
  actionRail: { gap: 2 }, railButton: { width: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  publishReason: { color: theme.muted, fontSize: 11, lineHeight: 16 },
  settingsOverlay: { flex: 1, backgroundColor: 'rgba(15, 24, 43, 0.38)' },
  settingsAvoid: { flex: 1, justifyContent: 'flex-end' },
  settingsPanel: { maxHeight: '98%', width: '100%', maxWidth: 560, alignSelf: 'center', padding: 14, gap: 8, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: '#EDF1F8', experimental_backgroundImage: 'linear-gradient(135deg, #FFF8F1 0%, #EDF1F8 55%, #E2EAF6 100%)' },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsTitle: { flex: 1, fontSize: 28, lineHeight: 34, fontWeight: '700', color: '#101B2E' },
  settingsClose: { minWidth: 44, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: '#F0F3FA', alignItems: 'center', justifyContent: 'center' },
  settingsCloseText: { color: '#172239', fontSize: 30, lineHeight: 34 },
  settingsNote: { color: '#505D73', fontSize: 12, lineHeight: 18 },
  editorHero: { gap: 4 },
  heroShade: { experimental_backgroundImage: 'linear-gradient(180deg, rgba(247, 248, 252, 0.90) 0%, rgba(237, 241, 248, 0.82) 30%, rgba(235, 238, 255, 0.96) 100%)' },
  heroToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  heroBack: { width: 44, minHeight: 44, borderRadius: 22, backgroundColor: theme.lavender, borderWidth: 1, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  heroBackText: { color: theme.text, fontSize: 30, lineHeight: 34 },
  privateBadge: { color: theme.accent, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  editorTitle: { color: theme.text, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  editorStatus: { textAlign: 'left', color: theme.muted, fontSize: 11, lineHeight: 16 },
  editorMeta: { color: theme.muted, fontSize: 13, lineHeight: 20, fontWeight: '500' },
  memoriesSection: { padding: 10, gap: 8, borderRadius: 26, backgroundColor: theme.surface, borderWidth: 1, borderColor: '#FFFFFF', boxShadow: '0 3px 8px rgba(57, 49, 29, 0.10)' },
  memoryScroll: { flexGrow: 0 },
  memoryCards: { gap: 12, paddingHorizontal: 2, paddingBottom: 6, alignItems: 'stretch' },
  memoriesBand: { minHeight: 36, paddingHorizontal: 4, justifyContent: 'center' },
  memoriesHeading: { color: colors.ink, fontSize: 17, lineHeight: 23, fontWeight: '700' },
  emptyMemories: { padding: 20, gap: 8, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: '#C8C9D3', backgroundColor: '#F0EDF7', experimental_backgroundImage: 'linear-gradient(120deg, #EBEEFF 0%, #E2EAF6 100%)', alignItems: 'center' },
  emptySymbol: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#C568B9', experimental_backgroundImage: 'linear-gradient(110deg, #9344C8 0%, #6546CD 38%, #2460CE 100%)', justifyContent: 'center', alignItems: 'center' },
  emptySymbolText: { color: colors.white, fontSize: 42 },
  emptyTitle: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
  emptyBody: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  editorFooter: { flexShrink: 0, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 4 },
  editorActionRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  editorActionSlot: { flex: 1, minWidth: 0 },
  publishAction: { ...primaryControl, flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.ink, justifyContent: 'center', alignItems: 'center' },
  publishLabel: { color: colors.white, fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  publishDisabled: { backgroundColor: theme.inset, experimental_backgroundImage: 'none', boxShadow: 'none', borderColor: colors.line },
  publishLabelDisabled: { color: colors.muted },
  quickPage: { flexShrink: 1, minHeight: 0, paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  history: { flexShrink: 0, marginTop: 12, gap: 4 },
  historyHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyBalance: { width: 88 },
  historyScroll: { flexGrow: 0, flexShrink: 0 },
  historyItems: { gap: 10, paddingHorizontal: 2, paddingTop: 3, paddingBottom: 8, alignItems: 'stretch' },
  historyHeading: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: colors.ink, flex: 1, minWidth: 0, textAlign: 'center' },
  draftCard: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 22, backgroundColor: theme.surface, borderWidth: 1, borderColor: '#FFFFFF', boxShadow: '0 3px 5px rgba(57, 49, 29, 0.13)' },
  draftIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: theme.lavender, experimental_backgroundImage: 'linear-gradient(145deg, #DBEEE4 0%, #D9E8F6 100%)', alignItems: 'center', justifyContent: 'center' },
  draftIconText: { color: colors.ink, fontSize: 22 },
  draftCopy: { flex: 1, minWidth: 0, gap: 4 },
  draftTitle: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  draftStatus: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  draftArrow: { color: colors.ink, fontSize: 26 },
  allDrafts: { width: 88, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 4 },
  allDraftsText: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
