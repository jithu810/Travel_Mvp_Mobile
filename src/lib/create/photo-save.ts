import { SaveFailure, validateForm, type CreateForm, type Saved, type createSaveController } from './model';
import { isJourneyId } from '../discovery/model';
import type { LocalPhoto } from './photo-model';
import { storedThumbnailsEnabled, thumbnailObjectName } from '../media/image-variants';
type SavePort = ReturnType<typeof createSaveController>['save'];
export type PhotoSavePorts = {
  save: SavePort;
  checkDraft: (form: CreateForm, signal: AbortSignal) => Promise<{ ownerId: string; stopIds: string[] }>;
  upload: (objectName: string, photo: LocalPhoto, signal: AbortSignal) => Promise<void>;
  uuid: () => string;
  prepareThumbnail?: (photo: LocalPhoto, signal: AbortSignal) => Promise<LocalPhoto>;
  removeThumbnail?: (photo: LocalPhoto) => void;
};
type Upload = { objectName: string; path: string; state: 'allocated' | 'uploaded' | 'unknown'; thumbnail?: Upload };
export type PhotoSaveResult = { kind: 'saved'; saved: Saved; form: CreateForm } | { kind: 'error'; message: string; uncertain?: boolean } | { kind: 'blocked' };
export function photoObjectName(owner: string, journey: string, key: string, uuid: string, mime: string) {
  if (![owner,journey,uuid].every(isJourneyId) || key !== 'cover' && !isJourneyId(key)) throw new SaveFailure('Invalid photo ownership or memory ID.');
  const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string,string>)[mime];
  if (!ext) throw new SaveFailure('Unsupported photo format.');
  return owner + '/' + journey + '/' + (key === 'cover' ? 'cover' : 'stops/' + key) + '/' + uuid + '.' + ext;
}
export function createPhotoSaveController(ports: PhotoSavePorts) {
  const paired = storedThumbnailsEnabled();
  let busy = false, blocked = false;
  // Editor-lifetime ledger. No remote deletion, overwrites or automatic write retries.
  const uploads = new Map<string, Upload>();
  return {
    getUploads: () => [...uploads.values()].map(entry => ({ ...entry, ...(entry.thumbnail ? { thumbnail: { ...entry.thumbnail } } : {}) })),
    async save(form: CreateForm, status: 'draft' | 'published', candidates: Record<string, LocalPhoto>, signal: AbortSignal,
      progress: (message: string) => void = () => {}, checkpoint: (form: CreateForm) => void = () => {}): Promise<PhotoSaveResult> {
      if (busy || blocked) return { kind: 'blocked' };
      const validation = validateForm(form,status);
      if (validation) return { kind: 'error', message: validation };
      if ([form.coverPath,...form.stops.map(stop => stop.photoPath)].some(path => path && /^(file|content|data|blob):/i.test(path))) return { kind: 'error', message: 'Local photo addresses cannot be saved as Storage paths.' };
      const entries = Object.entries(candidates);
      if (entries.some(([key]) => key !== 'cover' && !form.stops.some(stop => stop.id === key))) return { kind: 'error', message: 'Finish editing the selected memory before saving its photo.' };
      busy = true;
      let current = form;
      const cancelled = () => { if (signal.aborted) throw new SaveFailure('Save cancelled. Check your saved draft before continuing.'); };
      const persist = async (snapshot: CreateForm, desired: 'draft' | 'published') => {
        cancelled(); progress('Saving journey...');
        const result = await ports.save(snapshot,desired,signal);
        if (result.kind !== 'saved') {
          if (result.kind === 'error') throw new SaveFailure(result.message,Boolean(result.uncertain));
          throw new SaveFailure('Save is blocked. Reload the saved draft before continuing.',true);
        }
        return { saved: result.saved, form: { ...snapshot, updatedAt: result.saved.updated_at } };
      };
      try {
        cancelled();
        if (!entries.length) { const result = await persist(current,status); return { kind: 'saved', ...result }; }
        // An initial metadata save makes a private journey available to INSERT RLS.
        if (!current.updatedAt) { const result = await persist(current,'draft'); current = result.form; cancelled(); checkpoint(current); }
        progress('Checking private draft...');
        let draft = await ports.checkDraft(current,signal); cancelled();
        if (entries.some(([key]) => key !== 'cover' && !draft.stopIds.includes(key))) {
          const result = await persist(current,'draft'); current = result.form; cancelled(); checkpoint(current);
          draft = await ports.checkDraft(current,signal); cancelled();
          if (entries.some(([key]) => key !== 'cover' && !draft.stopIds.includes(key))) throw new SaveFailure('The selected memory could not be verified in your saved draft. Reload before continuing.',true);
        }
        const paths: Record<string,string> = {};
        for (const [index,[key,photo]] of entries.entries()) {
          cancelled();
          const ledgerKey = JSON.stringify([draft.ownerId,current.id,key,photo.uri]);
          let entry = uploads.get(ledgerKey);
          if (!entry) {
            const legacy = photoObjectName(draft.ownerId,current.id,key,ports.uuid(),photo.mime);
            const objectName = paired ? legacy.replace(/\.(jpg|png|webp)$/, '.full-v1.$1') : legacy;
            const thumb = paired ? thumbnailObjectName(objectName) : null;
            entry = { objectName, path: 'journey-media/' + objectName, state: 'allocated', ...(thumb ? { thumbnail: { objectName: thumb, path: 'journey-media/' + thumb, state: 'allocated' as const } } : {}) }; uploads.set(ledgerKey,entry);
          }
          if (entry.state === 'unknown') throw new SaveFailure('An upload result is unconfirmed. Reload/check your draft before another save; no upload will be retried automatically.',true);
          if (entry.thumbnail?.state === 'unknown') throw new SaveFailure('A thumbnail upload is unconfirmed. Check your draft before another save.',true);
          let thumbnail: LocalPhoto | undefined;
          try {
          if (entry.thumbnail && entry.thumbnail.state !== 'uploaded') {
            if (!ports.prepareThumbnail || !ports.removeThumbnail) throw new SaveFailure('Thumbnail preparation is unavailable. Your saved photos are unchanged.');
            try { thumbnail = await ports.prepareThumbnail(photo,signal); }
            catch { throw new SaveFailure('Thumbnail preparation failed. Your saved photos are unchanged.'); }
            cancelled();
            if (thumbnail.uri === photo.uri || thumbnail.mime !== 'image/jpeg' || ![thumbnail.width,thumbnail.height].every(n => Number.isInteger(n) && n > 0 && n <= 512) || !Number.isSafeInteger(thumbnail.size) || thumbnail.size <= 0 || thumbnail.size > 1024*1024) throw new SaveFailure('Invalid prepared thumbnail.');
          }
          if (entry.state !== 'uploaded') {
            progress('Uploading photo ' + (index+1) + ' of ' + entries.length + '...');
            try { await ports.upload(entry.objectName,photo,signal); entry.state = 'uploaded'; }
            catch (error) { if (!(error instanceof SaveFailure) || error.uncertain) entry.state = 'unknown'; throw error; }
          }
          cancelled();
          if (entry.thumbnail && entry.thumbnail.state !== 'uploaded' && thumbnail) {
            try { await ports.upload(entry.thumbnail.objectName,thumbnail,signal); entry.thumbnail.state = 'uploaded'; }
            catch (error) { if (!(error instanceof SaveFailure) || error.uncertain) entry.thumbnail.state = 'unknown'; throw error; }
          }
          } finally { if (thumbnail && thumbnail.uri !== photo.uri) { try { ports.removeThumbnail?.(thumbnail); } catch { /* Generated local cleanup is best effort. */ } } }
          paths[key] = entry.path;
        }
        cancelled();
        const snapshot = { ...current, coverPath: paths.cover ?? current.coverPath,
          stops: current.stops.map(stop => paths[stop.id] ? { ...stop, photoPath: paths[stop.id] } : stop) };
        const result = await persist(snapshot,status);
        return { kind: 'saved', ...result };
      } catch (error) {
        blocked = !(error instanceof SaveFailure) || error.uncertain;
        return { kind: 'error', message: error instanceof Error ? error.message : 'Save result unconfirmed. Check your draft before continuing.', uncertain: blocked };
      } finally { busy = false; }
    },
  };
}
