import { photoHeader, type LocalPhoto } from './photo-model';

export const THUMBNAIL_SIDE = 512;
export const THUMBNAIL_QUALITY = 0.7;
export const THUMBNAIL_MAX_BYTES = 1024 * 1024;
export type ThumbnailIO = {
  render: (uri: string, dimensions: { width: number; height: number }) => Promise<string>;
  inspect: (uri: string) => Promise<{ size: number; bytes: Uint8Array }>;
  remove: (uri: string) => void;
};
function cancelled(signal: AbortSignal) {
  if (signal.aborted) throw new Error('Thumbnail preparation cancelled.');
}
export async function prepareThumbnailWithIO(photo: LocalPhoto, signal: AbortSignal, io: ThumbnailIO): Promise<LocalPhoto> {
  cancelled(signal);
  if (!photo.uri || ![photo.width, photo.height].every(value => Number.isInteger(value) && value > 0 && value <= 12000)
    || photo.width * photo.height > 50_000_000) throw new Error('Prepared photo dimensions are unavailable.');
  const scale = Math.min(1, THUMBNAIL_SIDE / Math.max(photo.width, photo.height));
  const dimensions = { width: Math.max(1, Math.round(photo.width * scale)), height: Math.max(1, Math.round(photo.height * scale)) };
  let generated: string | null = null;
  try {
    generated = await io.render(photo.uri, dimensions);
    if (!generated || generated === photo.uri) throw new Error('Thumbnail must be a separate generated file.');
    cancelled(signal);
    const output = await io.inspect(generated);
    cancelled(signal);
    if (!Number.isSafeInteger(output.size) || output.size <= 0 || output.size > THUMBNAIL_MAX_BYTES || output.bytes.byteLength !== output.size)
      throw new Error('Generated thumbnail size is invalid.');
    const header = photoHeader(output.bytes);
    if (header.mime !== 'image/jpeg' || header.width !== dimensions.width || header.height !== dimensions.height)
      throw new Error('Generated thumbnail format or dimensions are invalid.');
    return { uri: generated, ...dimensions, size: output.size, mime: 'image/jpeg' };
  } catch (error) {
    if (generated && generated !== photo.uri) { try { io.remove(generated); } catch { /* Preserve the original failure. */ } }
    throw error;
  }
}
