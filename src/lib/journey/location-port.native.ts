import type { LocationPort } from './foreground-location';

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
  async watch(update, error) {
    const location = await import('expo-location');
    return location.watchPositionAsync({ accuracy: location.Accuracy.High, timeInterval: 3000, distanceInterval: 0 }, fix => {
      update({ latitude: fix.coords.latitude, longitude: fix.coords.longitude, accuracy: fix.coords.accuracy, timestamp: fix.timestamp, heading: fix.coords.heading, speed: fix.coords.speed });
    }, () => error());
  },
};
