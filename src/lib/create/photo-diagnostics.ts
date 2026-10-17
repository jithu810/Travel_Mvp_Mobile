declare const __DEV__: boolean | undefined;
export type PhotoStage = 'capture' | 'camera-result' | 'native-import' | 'source-read' | 'source-validate' | 'manipulate' | 'resize' | 'render' | 'encode' | 'output-read' | 'output-validate' | 'ready' | 'cleanup';
export type PhotoFacts = { width?: number; height?: number; size?: number; headerBytes?: number; dimensionOffset?: number; exists?: boolean; readable?: boolean; structuralRead?: boolean; format?: string };
const safeMessages = [
  'This photo is too large to prepare safely. Choose a smaller photo.',
  'Choose a photo no larger than 15 MiB.',
  'Choose a valid JPEG, PNG or WebP photo. HEIC/HEIF must be converted to JPEG before upload.',
  'The photo contents do not match its image format. Choose another photo.',
  'The prepared photo has unexpected dimensions. Choose another photo.',
  'Captured image file is missing or unreadable.',
  'The captured photo could not be read. Retry Take Photo or choose from the gallery.',
  'Choose a photo no larger than 15 MiB. Retry Take Photo or choose from the gallery.',
  'This photo could not be read. Choose another photo.',
  'The camera JPEG header could not be read safely. Retry or choose from the gallery.',
];
export function photoException(error: unknown) {
  const name = error instanceof Error && ['Error', 'TypeError', 'RangeError', 'SyntaxError'].includes(error.name) ? error.name : 'NativeError';
  const raw = error instanceof Error ? error.message : '';
  // Native messages can contain local paths, URIs, filenames or other private
  // values. Preserve known app messages; classify all other messages safely.
  const message = safeMessages.includes(raw) ? raw
    : /decode|bitmap|load.*image|image.*load/i.test(raw) ? 'Native image decoding/loading failed (private details redacted).'
      : /permission|access|denied/i.test(raw) ? 'Native image access failed (private details redacted).'
        : /module|not.*function|not.*defined/i.test(raw) ? 'Native module/API unavailable (private details redacted).'
          : /file|read|exist/i.test(raw) ? 'Native file read failed (private details redacted).'
            : /encode|compress|save/i.test(raw) ? 'Native image encoding failed (private details redacted).'
              : 'Native operation failed (private details redacted).';
  return { name, message };
}
export function photoDiagnostic(stage: PhotoStage, facts: PhotoFacts = {}, error?: unknown) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  const details: PhotoFacts = {};
  for (const key of ['width', 'height', 'size', 'headerBytes', 'dimensionOffset'] as const) if (typeof facts[key] === 'number' && Number.isFinite(facts[key])) details[key] = facts[key];
  for (const key of ['exists', 'readable', 'structuralRead'] as const) if (typeof facts[key] === 'boolean') details[key] = facts[key];
  if (facts.format && ['image/jpeg', 'image/png', 'image/webp', 'native-decoder'].includes(facts.format)) details.format = facts.format;
  const record = { stage, ...details, ...(error === undefined ? {} : { exception: photoException(error) }) };
  if (error === undefined) console.info('[JourneyPhoto:camera]', record);
  else console.warn('[JourneyPhoto:camera]', record);
}
