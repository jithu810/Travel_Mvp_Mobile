import type { LocationPort } from './foreground-location';

// Travel's interactive map is native-only; never request browser geolocation.
export const locationPort: LocationPort = {
  async permission() { throw new Error('Foreground location requires a native development build.'); },
  async services() { return false; },
  async watch() { return { remove() {} }; },
};
