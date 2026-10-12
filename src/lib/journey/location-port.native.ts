import type { LocationPort } from './foreground-location';

// Lazy import keeps missing native modules inside the guarded permission flow.
export const locationPort: LocationPort = {
  async permission(request) {
    const location = await import('expo-location');
    let result = await location.getForegroundPermissionsAsync();
    if (request && !result.granted && result.canAskAgain) result = await location.requestForegroundPermissionsAsync();
    return { granted: result.granted, canAskAgain: result.canAskAgain };
  },
  async services() { return (await import('expo-location')).hasServicesEnabledAsync(); },
  async watch(update, error) {
    const location = await import('expo-location');
    return location.watchPositionAsync({ accuracy: location.Accuracy.High, timeInterval: 3000, distanceInterval: 0 }, fix => {
      update({ latitude: fix.coords.latitude, longitude: fix.coords.longitude, accuracy: fix.coords.accuracy, timestamp: fix.timestamp });
    }, () => error());
  },
};
