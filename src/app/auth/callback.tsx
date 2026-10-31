import { useLinkingURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { completeGoogleSignIn } from '@/lib/auth/google';

export default function GoogleCallbackScreen() {
  const url = useLinkingURL();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    if (!url) return;
    void completeGoogleSignIn(url).then(destination => {
      if (!mounted) return;
      if (destination.journeyId) router.dismissTo({ pathname: '/journey/[id]', params: { id: destination.journeyId } });
      else if (destination.returnTo === 'create') router.dismissTo('/create');
      else router.dismissTo('/account');
    }).catch(() => { if (mounted) setFailed(true); });
    return () => { mounted = false; };
  }, [url, router]);
  return <SafeAreaView style={styles.page}><View style={styles.content}>
    {failed || !url ? <>
      <Text accessibilityRole="alert" style={styles.text}>We could not complete Google sign-in. Please start again.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.dismissTo('/auth')} style={styles.button}><Text style={styles.text}>Back to sign in</Text></Pressable>
    </> : <><ActivityIndicator /><Text accessibilityLiveRegion="polite" style={styles.text}>Completing Google sign-in…</Text></>}
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#F5F3EC' }, content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 20 }, text: { color: '#153E35', fontSize: 16, textAlign: 'center' }, button: { minHeight: 48, justifyContent: 'center', padding: 16, borderWidth: 1, borderColor: '#153E35', borderRadius: 12 } });
