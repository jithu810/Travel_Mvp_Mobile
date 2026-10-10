import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { colors } from './discovery/ui';
export function AccountLink() {
  const router = useRouter();
  return <Pressable accessibilityRole="button" accessibilityLabel="Open account" onPress={() => router.push('/account')}
    style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, opacity: pressed ? 0.7 : 1 })}>
    <Text style={{ color: colors.green, fontSize: 12, fontWeight: '600' }}>Account</Text>
  </Pressable>;
}
