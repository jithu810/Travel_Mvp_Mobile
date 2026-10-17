import { photoHeader } from './photo-model';

type HeaderHandle = { offset: number | null; readBytes: (length: number) => Uint8Array };
const invalid = () => new Error('The camera JPEG header could not be read safely. Retry or choose from the gallery.');
// A JPEG's SOF dimension marker can follow multiple large APP/EXIF segments,
// beyond the normal 64KiB peek. Seek over unrelated metadata; retain only actual
// SOI, one EXIF segment and SOF bytes for the existing orientation-aware parser.
// This compact structural header is never a preview, image output or upload.
export function readJpegSourceHeader(handle: HeaderHandle, size: number) {
  const read = (offset: number, length: number) => {
    if (offset < 0 || offset + length > size) throw invalid();
    handle.offset = offset;
    const bytes = handle.readBytes(length);
    if (bytes.length !== length) throw invalid();
    return bytes;
  };
  const soi = read(0,2);
  if (soi[0] !== 255 || soi[1] !== 216) throw invalid();
  let offset = 2, exif: Uint8Array | undefined;
  for (let scanned = 0; scanned < 256; scanned++) {
    const marker = read(offset,2);
    if (marker[0] !== 255 || marker[1] === 0 || marker[1] === 217 || marker[1] === 218) throw invalid();
    if (marker[1] === 255) { offset++; continue; } // legal marker fill bytes
    if (marker[1] === 1 || marker[1] >= 208 && marker[1] <= 216) { offset += 2; continue; }
    const lengthBytes = read(offset+2,2), length = lengthBytes[0]*256 + lengthBytes[1];
    if (length < 2 || offset + 2 + length > size) throw invalid();
    if (marker[1] === 225 && !exif && length >= 8) {
      const prefix = read(offset+4,6);
      if (String.fromCharCode(...prefix) === 'Exif\0\0') exif = read(offset,length+2);
    }
    if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker[1])) {
      if (length < 7) throw invalid();
      const sof = read(offset,length+2);
      const header = new Uint8Array(soi.length + (exif?.length ?? 0) + sof.length);
      header.set(soi); if (exif) header.set(exif,2); header.set(sof,2+(exif?.length ?? 0));
      photoHeader(header); // bounds/orientation checks remain authoritative
      return { header, dimensionOffset: offset };
    }
    offset += 2 + length;
  }
  throw invalid();
}

// Validate the exact bounded upload buffer, retaining the structural reader for
// late SOF/EXIF markers. This view does not duplicate the full image allocation.
export function photoValidationHeader(bytes: Uint8Array) {
  const prefix = bytes.subarray(0,65536);
  if (bytes[0] !== 255 || bytes[1] !== 216) return prefix;
  try { photoHeader(prefix); return prefix; }
  catch {
    const handle: HeaderHandle = { offset: 0, readBytes(length) {
      const offset = this.offset ?? 0;
      const part = bytes.subarray(offset,offset+length);
      this.offset = offset+part.length;
      return part;
    } };
    return readJpegSourceHeader(handle,bytes.byteLength).header;
  }
}
