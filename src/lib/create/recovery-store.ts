import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCreationRecovery } from './recovery';
// One device-wide store so the editor and sign-out share the same ordered storage queue.
export const creationRecovery = createCreationRecovery(AsyncStorage);
