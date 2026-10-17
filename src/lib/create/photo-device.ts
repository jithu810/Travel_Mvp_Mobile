import type { PhotoDevice, LocalPhoto } from './photo-model';
export const photoDevice: PhotoDevice = {
  async pick() { throw new Error('Gallery selection and camera capture are available in the Android or iOS development build.'); },
  async prepare() { throw new Error('Native photo preparation is unavailable here.'); },
  remove() {},
};

export async function readPreparedPhoto(_photo: LocalPhoto): Promise<ArrayBuffer> {
  throw new Error('Photo uploads require the Android or iOS development client.');
}
