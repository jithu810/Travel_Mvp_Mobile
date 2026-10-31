import { StatusBar } from 'expo-status-bar';
import { theme } from '@/theme/mobile-theme';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/components/discovery/ui';
import { useBuddySuppression } from '@/hooks/use-journey-buddy';

export function StorySheet({ visible, title, subtitle, onClose, children, scrollable = true, suppressBuddy = true }: { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; scrollable?: boolean; suppressBuddy?: boolean }) {
  useBuddySuppression(visible && suppressBuddy);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    let receivedChange = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      receivedChange = true;
      if (active) setReduceMotion(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active && !receivedChange) setReduceMotion(value);
    }).catch(() => { /* Keep the motion-safe default if the platform query fails. */ });
    return () => { active = false; subscription.remove(); };
  }, []);
  return <Modal visible={visible} animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="fullScreen" onRequestClose={onClose}>
    <SafeAreaView style={styles.safe}>
      {visible && <StatusBar style="dark" />}
      <View style={styles.header}><View style={styles.heading}><Text accessibilityRole="header" numberOfLines={subtitle ? 2 : undefined} style={styles.title}>{title}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View><Pressable accessibilityRole="button" accessibilityLabel={subtitle ? 'Close journey map' : 'Close ' + title} onPress={onClose} style={styles.close}><Text style={styles.closeLabel}>Close</Text></Pressable></View>
      {scrollable ? <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView> : <View style={styles.fill}>{children}</View>}
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, experimental_backgroundImage: theme.backgroundGradient },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 8, gap: 12 },
  heading: { flex: 1, minWidth: 0, gap: 2 },
  title: { color: colors.ink, fontSize: 20, lineHeight: 27, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  close: { minHeight: 48, minWidth: 48, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 22, backgroundColor: colors.pale },
  closeLabel: { color: colors.ink, fontWeight: '600', fontSize: 13 },
  content: { padding: 20, gap: 18, paddingBottom: 32 }, fill: { flex: 1, minHeight: 0, paddingHorizontal: 16, paddingBottom: 12 },
});
