import type { MemoryLocationPort } from './current-location';

export const memoryLocationPort: MemoryLocationPort = {
  async permission() {
    const location = await import('expo-location');
    let permission = await location.getForegroundPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) permission = await location.requestForegroundPermissionsAsync();
    return { granted: permission.granted, canAskAgain: permission.canAskAgain };
  },
  async services() { return (await import('expo-location')).hasServicesEnabledAsync(); },
  async position() {
    const location = await import('expo-location');
    const fix = await location.getCurrentPositionAsync({ accuracy: location.Accuracy.High });
    return { latitude: fix.coords.latitude, longitude: fix.coords.longitude, accuracy: fix.coords.accuracy, timestamp: fix.timestamp };
  },
};
