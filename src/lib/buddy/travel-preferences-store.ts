import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTravelPreferences } from './travel-preferences';
export const travelPreferences = createTravelPreferences(AsyncStorage);
