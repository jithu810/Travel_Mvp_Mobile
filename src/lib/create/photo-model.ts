import type { PhotoFacts, PhotoStage } from './photo-diagnostics';
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_PHOTO_SIDE = 2048;
export const JPEG_QUALITY = 0.83;
export type PhotoMime = 'image/jpeg' | 'image/png' | 'image/webp';
export type PhotoAsset = { uri: string; mimeType?: string | null; fileName?: string | null; width?: number; height?: number };
export type LocalPhoto = { uri: string; width: number; height: number; size: number; mime: PhotoMime };
export type PhotoHeader = { mime: PhotoMime; width: number; height: number };
const invalid = 'Choose a valid JPEG, PNG or WebP photo. HEIC/HEIF must be converted to JPEG before upload.';
// Only a bounded HEIF container signature admits gallery native decoding.
// Filenames/MIME labels alone never make arbitrary input an image.
export function isHeifHeader(bytes: Uint8Array) {
  if (bytes.length < 16 || String.fromCharCode(...bytes.subarray(4,8)) !== 'ftyp') return false;
  const size = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0);
  if (size < 16 || size > Math.min(bytes.length,4096) || size % 4 !== 0) return false;
  const brands = [String.fromCharCode(...bytes.subarray(8,12))];
  for (let offset = 16; offset < size; offset += 4) brands.push(String.fromCharCode(...bytes.subarray(offset,offset+4)));
  if (brands.some(brand => brand === 'avif' || brand === 'avis')) return false;
  return brands.some(brand => ['heic','heix','hevc','hevx','heim','heis','hevm','hevs','mif1','msf1'].includes(brand));
}
function heifMetadata(asset: PhotoAsset) {
  return /\.hei[cf]$/i.test(asset.fileName || '') || /^image\/hei[cf](?:-sequence)?$/i.test(asset.mimeType || '');
}
export function photoDimensions(width: number, height: number) {
  if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 12000) || width * height > 50_000_000) throw new Error('This photo is too large to prepare safely. Choose a smaller photo.');
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
export function photoHeader(bytes: Uint8Array): PhotoHeader {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (a: number, b: number) => String.fromCharCode(...bytes.slice(a, b));
  let mime: PhotoMime, width = 0, height = 0;
  if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v) && text(12,16) === 'IHDR') {
    mime = 'image/png'; width = view.getUint32(16); height = view.getUint32(20);
  } else if (bytes.length >= 30 && text(0,4) === 'RIFF' && text(8,12) === 'WEBP') {
    mime = 'image/webp';
    if (text(12,16) === 'VP8X') { width = 1 + bytes[24] + (bytes[25]<<8) + (bytes[26]<<16); height = 1 + bytes[27] + (bytes[28]<<8) + (bytes[29]<<16); }
    else if (text(12,16) === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) { width = view.getUint16(26,true) & 0x3fff; height = view.getUint16(28,true) & 0x3fff; }
    else if (text(12,16) === 'VP8L' && bytes[20] === 0x2f) { const bits = view.getUint32(21,true); width = (bits & 0x3fff)+1; height = ((bits>>>14)&0x3fff)+1; }
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    mime = 'image/jpeg'; let point = 2, orientation = 1;
    while (point + 4 <= bytes.length) {
      if (bytes[point] !== 255) break;
      const marker = bytes[point+1]; if (marker === 0xda || marker === 0xd9) break;
      const length = view.getUint16(point+2); if (length < 2 || point+2+length > bytes.length) break;
      if (marker === 0xe1 && text(point+4,point+10) === 'Exif\0\0') {
        const tiff = point+10, end = point+2+length;
        if (tiff+8 <= end) {
          const little = text(tiff,tiff+2) === 'II', big = text(tiff,tiff+2) === 'MM';
          if ((little || big) && view.getUint16(tiff+2,little) === 42) {
            const directory = tiff+view.getUint32(tiff+4,little);
            if (directory >= tiff && directory+2 <= end) {
              const count = Math.min(view.getUint16(directory,little),256);
              for (let i=0;i<count;i++) { const entry = directory+2+i*12; if (entry+12>end) break;
                if (view.getUint16(entry,little) === 0x112 && view.getUint16(entry+2,little) === 3 && view.getUint32(entry+4,little) === 1) orientation = view.getUint16(entry+8,little);
              }
            }
          }
        }
      }
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length >= 7) { height = view.getUint16(point+5); width = view.getUint16(point+7); }
      point += 2+length;
    }
    if (orientation >= 5 && orientation <= 8) [width,height] = [height,width];
  } else throw new Error(invalid);
  if (!width || !height) throw new Error(invalid);
  photoDimensions(width,height);
  return { mime, width, height };
}
export function validatePhotoFile(asset: PhotoAsset, size: number, bytes: Uint8Array) {
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error('This photo could not be read. Choose another photo.');
  if (size > MAX_PHOTO_BYTES) throw new Error('Choose a photo no larger than 15 MiB.');
  if (/\.(hei[cf]|avif|gif)$/i.test(asset.fileName || '') || asset.mimeType && !['image/jpeg','image/jpg','image/png','image/webp'].includes(asset.mimeType.toLowerCase())) throw new Error(invalid);
  const header = photoHeader(bytes), declared = asset.mimeType?.toLowerCase().replace('image/jpg','image/jpeg');
  if (declared && declared !== header.mime) throw new Error('The photo contents do not match its image format. Choose another photo.');
  return header;
}
export type PhotoIO = {
  stage?: (stage: PhotoStage, facts?: PhotoFacts) => void;
  inspect: (uri: string) => Promise<{ size: number; header: Uint8Array }>;
  render: (uri: string, dimensions: { width: number; height: number }, mime: 'image/jpeg' | 'image/png') => Promise<{ uri: string; width: number; height: number }>;
  remove: (uri: string) => void;
};
export async function preparePhoto(asset: PhotoAsset, io: PhotoIO, source: PhotoSource = 'gallery'): Promise<LocalPhoto> {
  const stage = (value: PhotoStage, facts?: PhotoFacts) => { io.stage?.(value, facts); };
  stage('source-read');
  const input = await io.inspect(asset.uri);
  stage('source-validate', { size: input.size });
  if (!Number.isSafeInteger(input.size) || input.size <= 0) throw new Error('This photo could not be read. Choose another photo.');
  if (input.size > MAX_PHOTO_BYTES) throw new Error('Choose a photo no larger than 15 MiB.');
  let header: PhotoHeader;
  let nativeDecode = false;
  if (source === 'camera' || isHeifHeader(input.header)) {
    // SDK57 permits zero picker dimensions. Prefer actual file dimensions;
    // validate picker dimensions only when the format needs native decoding.
    try { header = photoHeader(input.header); }
    catch (error) {
      const bytes = input.header;
      const supportedSignature = bytes[0] === 255 && bytes[1] === 216
        || bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
        || String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
      if (supportedSignature) throw error;
      // Camera output and byte-identified gallery HEIF use the same native
      // encoder; only its validated new JPEG file can become a candidate.
      if (source === 'gallery' && (!asset.width || !asset.height)) throw new Error('This photo’s dimensions are unavailable. Choose another photo.');
      photoDimensions(asset.width ?? 0, asset.height ?? 0);
      nativeDecode = true;
      header = { mime: 'image/jpeg', width: asset.width!, height: asset.height! };
    }
  } else {
    // Some providers return actual JPEG data with the original HEIF name/type.
    // Verify those bytes, then re-encode them; never merely relabel HEIF data.
    const actualJpeg = heifMetadata(asset) && photoHeader(input.header).mime === 'image/jpeg';
    header = validatePhotoFile(actualJpeg ? { ...asset, mimeType: 'image/jpeg', fileName: null } : asset,input.size,input.header);
  }
  const target = photoDimensions(header.width,header.height);
  stage('source-validate', { width: header.width, height: header.height, format: nativeDecode ? 'native-decoder' : header.mime });
  // Preserve transparency conservatively: PNG and WebP are encoded to PNG.
  const mime = source === 'camera' || header.mime === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  let output: Awaited<ReturnType<PhotoIO['render']>>;
  try { output = await io.render(asset.uri,target,mime); }
  catch (error) {
    if (source === 'gallery' && nativeDecode) throw new Error('This device could not convert this photo to JPEG. Choose a JPEG, PNG or WebP photo. Your previous photo is unchanged.');
    throw error;
  }
  try {
    stage('output-read', { width: output.width, height: output.height });
    const file = await io.inspect(output.uri);
    stage('output-validate', { size: file.size });
    const actual = validatePhotoFile({ uri: output.uri, mimeType: mime },file.size,file.header);
    if (output.uri === asset.uri || output.width !== target.width || output.height !== target.height || actual.width !== target.width || actual.height !== target.height) throw new Error('The prepared photo has unexpected dimensions. Choose another photo.');
    stage('ready', { width: actual.width, height: actual.height, size: file.size, format: actual.mime });
    return { uri: output.uri, width: actual.width, height: actual.height, mime, size: file.size };
  } catch (error) { if (output.uri !== asset.uri) io.remove(output.uri); throw error; }
}
export type PhotoSource = 'gallery' | 'camera';
export type PhotoDevice = { pick: (source?: PhotoSource) => Promise<PhotoAsset | null>; prepare: (asset: PhotoAsset, source?: PhotoSource) => Promise<LocalPhoto>; remove: (uri: string) => void };
export type LocalPhotoState = { candidates: Record<string, LocalPhoto>; errors: Record<string, string>; busyKey: string | null };
// This state has no draft payload, Supabase, authentication or remote path access.
export function createLocalPhotoStore(device: PhotoDevice, notify: (state: LocalPhotoState) => void) {
  let state: LocalPhotoState = { candidates: {}, errors: {}, busyKey: null }, active = true;
  const update = (next: LocalPhotoState) => { state = next; notify(state); };
  return {
    getState: () => state,
    async select(key: string, source: PhotoSource = 'gallery') {
      if (!active || state.busyKey) return;
      update({ ...state, busyKey: key, errors: { ...state.errors, [key]: '' } });
      let candidate: LocalPhoto | null = null;
      try {
        const asset = await device.pick(source); if (!active || !asset) return;
        candidate = await device.prepare(asset, source);
        if (!active) { device.remove(candidate.uri); return; }
        const previous = state.candidates[key];
        update({ ...state, candidates: { ...state.candidates, [key]: candidate } });
        if (previous) device.remove(previous.uri);
      } catch (error) {
        if (active) update({ ...state, errors: { ...state.errors, [key]: error instanceof Error ? error.message : 'Photo preparation failed. Your saved photo is unchanged.' } });
      } finally { if (active) update({ ...state, busyKey: null }); }
    },
    remove(key: string) {
      if (!active || state.busyKey) return;
      const candidate = state.candidates[key], candidates = { ...state.candidates }, errors = { ...state.errors };
      delete candidates[key]; delete errors[key]; update({ ...state, candidates, errors }); if (candidate) device.remove(candidate.uri);
    },
    acceptSaved(saved: Record<string, LocalPhoto>) {
      if (!active || state.busyKey) return;
      const candidates = { ...state.candidates }, errors = { ...state.errors };
      for (const [key,photo] of Object.entries(saved)) {
        if (candidates[key]?.uri === photo.uri) { delete candidates[key]; delete errors[key]; device.remove(photo.uri); }
      }
      update({ ...state, candidates, errors });
    },
    dispose() { active = false; Object.values(state.candidates).forEach(photo => device.remove(photo.uri)); state = { candidates: {}, errors: {}, busyKey: null }; },
  };
}
