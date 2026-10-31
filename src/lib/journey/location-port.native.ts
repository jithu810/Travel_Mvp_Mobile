import type { LocationPort, LocationSettingsDeclined } from './foreground-location';

// expo-location's LocationSettingsUnsatisfiedException: Google's accuracy dialog was not accepted.
// The code is inferred from the Kotlin class name, so minification could change it; the message cannot.
const SETTINGS_UNSATISFIED = 'ERR_LOCATION_SETTINGS_UNSATISFIED';
const SETTINGS_UNSATISFIED_MESSAGE = 'Location request failed due to unsatisfied device settings';
const settingsUnsatisfied = (cause: unknown) => {
  const { code, message } = (cause ?? {}) as { code?: unknown; message?: unknown };
  return code === SETTINGS_UNSATISFIED || (typeof message === 'string' && message.includes(SETTINGS_UNSATISFIED_MESSAGE));
};

// Lazy import keeps missing native modules inside the guarded permission flow.
export const locationPort: LocationPort = {
  async permission(request, onlyIfUndetermined = false) {
    const location = await import('expo-location');
    let result = await location.getForegroundPermissionsAsync();
    // Opening Travel may prompt only for an undetermined permission. A denied
    // permission can be requested again only through an explicit Retry action.
    if (request && !result.granted && result.canAskAgain && (!onlyIfUndetermined || result.status === 'undetermined')) result = await location.requestForegroundPermissionsAsync();
    return { granted: result.granted, canAskAgain: result.canAskAgain };
  },
  async watchHeading(update, error) {
    const location = await import('expo-location');
    return location.watchHeadingAsync(reading => update({ heading: reading.trueHeading, accuracy: reading.accuracy, timestamp: Date.now() }), () => error());
  },
  async services() { return (await import('expo-location')).hasServicesEnabledAsync(); },
  // The same provider the native watcher checks before showing its dialog; this call shows none.
  async settingsEnabled() { return (await (await import('expo-location')).getProviderStatusAsync()).networkAvailable === true; },
  async watch(update, error) {
    const location = await import('expo-location');
    try {
      return await location.watchPositionAsync({ accuracy: location.Accuracy.High, timeInterval: 3000, distanceInterval: 0 }, fix => {
        update({ latitude: fix.coords.latitude, longitude: fix.coords.longitude, accuracy: fix.coords.accuracy, timestamp: fix.timestamp, heading: fix.coords.heading, speed: fix.coords.speed });
      }, () => error());
    } catch (cause) {
      if (!settingsUnsatisfied(cause)) throw cause;
      throw Object.assign(new Error('Location settings declined'), { settingsDeclined: true as const }) satisfies LocationSettingsDeclined;
    }
  },
};
