import type { LocalPhoto } from './photo-model';

export async function prepareThumbnail(_photo: LocalPhoto, _signal: AbortSignal): Promise<LocalPhoto> {
  throw new Error('Thumbnail preparation requires the Android or iOS development client.');
}
export function removeThumbnail(_photo: LocalPhoto): void {}
