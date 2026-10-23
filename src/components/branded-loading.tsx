import { theme } from '@/theme/mobile-theme';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, AppState, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// A presentation only loader: callers own readiness, errors and retries.
export function BrandedLoading({ message = 'Preparing your journeyâ€¦', compact = false, overlay = false }: { message?: string; compact?: boolean; overlay?: boolean }) {
  const [pulse] = useState(() => new Animated.Value(1));
  const [reduceMotion, setReduceMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    let changed = false;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted && !changed) setReduceMotion(value); }).catch(() => {});
    const preference = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; setReduceMotion(value); });
    const app = AppState.addEventListener('change', value => setActive(value === 'active'));
    return () => { mounted = false; preference.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    pulse.setValue(1);
    if (reduceMotion || !active) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.045, duration: 1100, useNativeDriver: true, isInteraction: false }),
      Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => { animation.stop(); pulse.setValue(1); };
  }, [pulse, reduceMotion, active]);
  return <SafeAreaView edges={compact ? [] : ['top', 'bottom', 'left', 'right']} style={[s.screen, compact && s.compact, overlay && s.overlay]}>
    <View accessible accessibilityRole="progressbar" accessibilityLabel={message} accessibilityLiveRegion="polite" style={[s.content, compact && s.compactContent]}>
      <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={[s.halo, compact && s.smallHalo, { transform: [{ scale: pulse }] }]}>
        <Image source={require('../../assets/journey-creator-logo.png')} resizeMode="contain" fadeDuration={0} style={compact ? s.smallLogo : s.logo} />
      </Animated.View>
      <Text accessible={false} style={[s.label, compact && s.smallLabel]}>{message}</Text>
      {!reduceMotion && active ? <ActivityIndicator accessible={false} color="#69D8FA" size="small" /> : <View accessible={false} style={s.stillIndicator} />}
    </View>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, elevation: 30 },
  compact: { minHeight: 72, padding: 8 },
  content: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 12, maxWidth: 340 },
  compactContent: { flexDirection: 'row', gap: 8, padding: 4, maxWidth: '100%' },
  halo: { width: 148, height: 148, borderRadius: 74, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.lavender, borderWidth: 1, borderColor: theme.border },
  smallHalo: { width: 56, height: 56, borderRadius: 28 },
  logo: { width: 116, height: 116 }, smallLogo: { width: 44, height: 44 },
  label: { color: theme.text, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  smallLabel: { flexShrink: 1, fontSize: 11, lineHeight: 16 },
  stillIndicator: { width: 24, height: 3, borderRadius: 2, backgroundColor: theme.accent },
});
