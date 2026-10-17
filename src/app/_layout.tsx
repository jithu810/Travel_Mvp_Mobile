import { MainNavigationFrame } from '@/components/floating-navigation';
import { StartupLoading } from '@/components/startup-loading';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActionIntentProvider } from '@/hooks/action-intent';
import { SessionProvider } from '@/hooks/session-context';

// The launch route renders public Discovery directly; keep the root back-stack anchor.
export const unstable_settings = { initialRouteName: 'index' };
export default function RootLayout() {
  return (
    <SessionProvider><ActionIntentProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}><MainNavigationFrame><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F5F3EC' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="discover" />
        <Stack.Screen name="create" /><Stack.Screen name="search" /><Stack.Screen name="auth" /><Stack.Screen name="account" /><Stack.Screen name="draft/[id]" />
        <Stack.Screen name="journey/[id]" />
        <Stack.Screen name="travel/[id]" />
        <Stack.Screen name="profile/edit" /><Stack.Screen name="profile/[username]" />
      </Stack></MainNavigationFrame><StartupLoading /></View>
    </ActionIntentProvider></SessionProvider>
  );
}
