import { requireOptionalNativeModule } from 'expo';
// Older development clients must keep browsing instead of crashing at import.
const crypto = requireOptionalNativeModule<{ randomUUID: () => string }>('ExpoCrypto');
export const idsAvailable = Boolean(crypto?.randomUUID);
export function randomUUID(): string {
  if (!crypto?.randomUUID) throw new Error('Update the development client before creating journeys.');
  return crypto.randomUUID();
}
