import type { MemoryLocationPort } from './current-location';
export const memoryLocationPort: MemoryLocationPort = {
  async permission() { throw new Error('Current location is available in the Android app. Search for a place here.'); },
  async services() { return false; },
  async position() { throw new Error('Search for a place.'); },
};
