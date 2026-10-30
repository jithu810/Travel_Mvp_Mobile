import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createTripPersistence, createTripRecovery } from './trip-recovery';
import { tripStore } from './trip-session';
import { clearCustomizedTravels, customizedSourceId, isAddedCustomizedStop } from './customized-travel';
// One device-wide copy store shared by Travel Mode, Home and sign-out.
export const tripRecovery = createTripRecovery(AsyncStorage);
export const tripPersistence = createTripPersistence({ store: tripStore, recovery: tripRecovery, app: AppState,
  meta: journeyId => ({ sourceId: customizedSourceId(journeyId), isAddedStop: isAddedCustomizedStop }),
  forget: () => { tripStore.clearAll(); clearCustomizedTravels(); } });
