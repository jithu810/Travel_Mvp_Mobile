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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F5F3EC' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="discover" />
        <Stack.Screen name="create" /><Stack.Screen name="search" /><Stack.Screen name="auth" /><Stack.Screen name="account" /><Stack.Screen name="draft/[id]" />
        <Stack.Screen name="journey/[id]" />
        <Stack.Screen name="profile/[username]" />
      </Stack>
    </ActionIntentProvider></SessionProvider>
  );
}
