import { JPEG_QUALITY, MAX_PHOTO_BYTES, MAX_PHOTO_SIDE, validatePhotoFile, preparePhoto, photoHeader, type LocalPhoto, type PhotoDevice } from './photo-model';
import { photoDiagnostic, type PhotoStage, type PhotoFacts } from './photo-diagnostics';
import { readJpegSourceHeader, photoValidationHeader } from './jpeg-source-header';
// Lazy imports let the existing app open before its new development client is installed.
export const photoDevice: PhotoDevice = {
  async pick(source = 'gallery') {
    let picker: typeof import('expo-image-picker');
    try { picker = await import('expo-image-picker'); }
    catch { throw new Error('Install the new development build to select or take photos.'); }
    if (source === 'camera') {
      try {
        let permission = await picker.getCameraPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) permission = await picker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          const message = permission.canAskAgain
          ? 'Camera permission denied. Retry Take Photo or choose from the gallery. Your previous photo is unchanged.'
          : 'Camera permission is blocked. Allow Camera in Settings, then retry, or choose from the gallery. If Camera is missing in Settings, install the camera-enabled development build. Your previous photo is unchanged.';
          const { Alert, Linking } = await import('react-native');
          Alert.alert('Camera access', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => {
            void Linking.openSettings().catch(() => Alert.alert('Settings unavailable', 'Open your device Settings and allow Camera for Journey Creator, or choose from the gallery.'));
          } }]);
          throw new Error(message);
        }
        const result = await picker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1, base64: false, exif: false });
        if (result.canceled) return null;
        const asset = result.assets?.[0];
        if (!asset?.uri) throw new Error('The captured photo is unavailable. Retry or choose from the gallery.');
        photoDiagnostic('camera-result', { width: asset.width, height: asset.height });
        return { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName, width: asset.width, height: asset.height };
      } catch (error) {
        if (error instanceof Error && /Camera permission|captured photo/.test(error.message)) throw error;
        throw new Error('Camera could not open. Use a development build with camera permission enabled, retry, or choose from the gallery. Your previous photo is unchanged.');
      }
    }
    try {
      const result = await picker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, allowsEditing: false, quality: 1, base64: false, exif: false, preferredAssetRepresentationMode: picker.UIImagePickerPreferredAssetRepresentationMode.Current });
      if (result.canceled) return null;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error('The selected photo is unavailable. Choose another photo.');
      return { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName, ...(asset.width !== undefined ? { width: asset.width } : {}), ...(asset.height !== undefined ? { height: asset.height } : {}) };
    } catch (error) {
      if (error instanceof Error && /permission|denied|access/i.test(error.message)) throw new Error('Gallery access was denied. You can continue without a photo or allow access in Settings.');
      throw error;
    }
  },
  async prepare(asset, source = 'gallery') {
    let currentStage: PhotoStage = 'native-import';
    const stage = (next: PhotoStage, facts?: PhotoFacts) => {
      currentStage = next;
      if (source === 'camera') photoDiagnostic(next, facts);
    };
    try {
      stage('native-import');
      const { File } = await import('expo-file-system');
      const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
      return await preparePhoto(asset, {
      stage,
      async inspect(uri) {
        const file = new File(uri), size = file.size;
        if (source === 'camera') {
          photoDiagnostic(currentStage, { exists: file.exists, size });
          if (!file.exists) throw new Error('Captured image file is missing or unreadable.');
        }
        if (!file.exists || !size || size > MAX_PHOTO_BYTES) return { size, header: new Uint8Array() };
        const handle = file.open();
        try {
          let header = handle.readBytes(Math.min(size,65536));
          if (header[0] === 255 && header[1] === 216) {
            try { photoHeader(header); }
            catch {
              const structural = readJpegSourceHeader(handle,size);
              header = structural.header;
              if (source === 'camera') photoDiagnostic(currentStage, { structuralRead: true, headerBytes: header.length, dimensionOffset: structural.dimensionOffset });
            }
          }
          if (source === 'camera') {
            const text = (start: number, end: number) => String.fromCharCode(...header.slice(start, end));
            const format = header[0] === 255 && header[1] === 216 && header[2] === 255 ? 'image/jpeg'
              : header[0] === 137 && text(1,4) === 'PNG' ? 'image/png'
                : text(0,4) === 'RIFF' && text(8,12) === 'WEBP' ? 'image/webp' : 'native-decoder';
            photoDiagnostic(currentStage, { readable: header.byteLength > 0, size, format });
          }
          return { size, header };
        }
        finally { handle.close(); }
      },
      async render(uri, dimensions, mime) {
        stage('manipulate');
        const context = ImageManipulator.manipulate(uri);
        let rendered: Awaited<ReturnType<typeof context.renderAsync>> | undefined;
        try {
          stage('resize', dimensions); context.resize(dimensions);
          stage('render'); rendered = await context.renderAsync();
          stage('encode');
          return await rendered.saveAsync({ format: mime === 'image/jpeg' ? SaveFormat.JPEG : SaveFormat.PNG, compress: JPEG_QUALITY, base64: false });
        } catch (error) {
          if (source === 'camera') photoDiagnostic(currentStage, {}, error);
          throw error;
        } finally {
          try { rendered?.release(); context.release(); }
          catch (error) { stage('cleanup'); if (source === 'camera') photoDiagnostic('cleanup', {}, error); throw error; }
        }
      },
      remove(uri) { try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* Local cache cleanup is best effort. */ } },
    }, source); }
    catch (error) {
      if (source !== 'camera') throw error;
      photoDiagnostic(currentStage, {}, error);
      const limit = error instanceof Error && /15 MiB|too large to prepare safely/.test(error.message) ? error.message + ' ' : '';
      throw new Error(limit + 'Camera photo preparation failed at ' + currentStage + '. Retry Take Photo or choose from the gallery. Your previous photo is unchanged.');
    }
  },
  remove(uri) { void import('expo-file-system').then(({ File }) => { try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* Only app-created prepared files are passed here. */ } }).catch(() => {}); },
};

// Read exactly one already-prepared file; never create a base64 copy.
export async function readPreparedPhoto(photo: LocalPhoto): Promise<ArrayBuffer> {
  const { File } = await import('expo-file-system');
  const file = new File(photo.uri);
  if (!file.exists || !file.size || file.size > MAX_PHOTO_BYTES || file.size !== photo.size) throw new Error('The prepared photo changed or is unavailable. Select it again.');
  const bytes = await file.arrayBuffer();
  const actual = validatePhotoFile({ uri: photo.uri, mimeType: photo.mime },bytes.byteLength,photoValidationHeader(new Uint8Array(bytes)));
  if (actual.width !== photo.width || actual.height !== photo.height || Math.max(actual.width,actual.height) > MAX_PHOTO_SIDE) throw new Error('Prepared photo dimensions changed. Select it again.');
  return bytes;
}
