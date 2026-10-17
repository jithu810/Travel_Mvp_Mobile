import { requireOptionalNativeModule } from 'expo';
import { Component, useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCompanionMotion } from '@/hooks/use-companion-motion';
import { useCompanionLifecycle } from '@/hooks/use-companion-lifecycle';
import { COMPANION, companionFits, companionVisible, type CompanionViewport } from '@/lib/companion/model';
import type { CompanionSceneProps } from './companion-scene.native';

class CompanionBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
type CompanionProps = CompanionViewport & { enabled?: boolean; registerDisable?: (stop: (() => void) | null) => void; onGuideChange?: (active: boolean) => void };

export function TravelCompanion(props: CompanionProps) {
  // Saved Home preference owns enablement; platform/native guards remain.
  if (!props.enabled || Platform.OS !== 'android') return null;
  return <EnabledCompanion {...props} />;
}
function EnabledCompanion(props: CompanionProps) {
  const lifecycle = useCompanionLifecycle();
  const { registerDisable } = props;
  useEffect(() => { registerDisable?.(lifecycle.stopAll); return () => registerDisable?.(null); }, [registerDisable, lifecycle.stopAll]);
  const [failed, setFailed] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const [waving, setWaving] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [pointing, setPointing] = useState(false);
  const [occupiedHeight, setOccupiedHeight] = useState<number>(COMPANION.height);
  const motion = useCompanionMotion(props, {
    occupiedHeight: minimized ? COMPANION.height : occupiedHeight, reduceMotion: lifecycle.reduceMotion,
    paused: waving || greeting || pressed || minimized || props.interacting || !lifecycle.focused || !lifecycle.active,
    registerStop: lifecycle.registerStop,
  });
  const visible = companionVisible(true, Platform.OS === 'android', lifecycle.focused, lifecycle.active, failed) && companionFits(props) && motion.fits;
  const guide = visible && pointing && greeting && !minimized && !lifecycle.reduceMotion;
  const { onGuideChange } = props;
  useEffect(() => {
    onGuideChange?.(guide);
    return () => onGuideChange?.(false);
  }, [guide, onGuideChange]);
  const fail = useCallback(() => setFailed(true), []);
  const releasePress = useCallback(() => setPressed(false), []);
  if (!visible) return null;
  return <CompanionBoundary onFailure={fail}>
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="box-none" style={styles.anchor}>
        {minimized ? <Pressable accessibilityRole="button" accessibilityLabel="Restore travel companion"
          onPress={() => { setGreeting(false); setMinimized(false); }} style={[styles.control, styles.restore]}><Text style={styles.icon}>☺</Text></Pressable>
          : <Animated.View pointerEvents="box-none" style={motion.style}
            onLayout={event => { const height = Math.max(COMPANION.height, event.nativeEvent.layout.height); setOccupiedHeight(previous => previous === height ? previous : height); }}>
            <ExpandedCompanion onPointChange={setPointing} onWaveChange={setWaving} reduceMotion={lifecycle.reduceMotion} registerStop={motion.registerStop} onFailure={fail} onMotionFrame={motion.onMotionFrame}
              onPressIn={() => setPressed(true)} onPressOut={releasePress}
            onGreet={() => setGreeting(value => !value)} onMinimize={() => { lifecycle.stopAll(); releasePress(); setGreeting(false); setMinimized(true); }} />
          </Animated.View>}
      </View>
      {greeting && !minimized && <Animated.View style={[styles.bubble, motion.style, { maxHeight: motion.greetingHeight }]}>
        <ScrollView style={styles.message}><Text accessibilityLiveRegion="polite" style={styles.text}>{pointing ? 'Ready for your next adventure? Tap Create Journey below.' : 'Hi! Ready to explore?'}</Text></ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Close companion greeting" onPress={() => setGreeting(false)} style={styles.close}>
          <Text style={styles.text}>Close</Text>
        </Pressable>
      </Animated.View>}
    </View>
  </CompanionBoundary>;
}
function ExpandedCompanion({ onGreet, onMinimize, onFailure, onPressIn, onPressOut, ...sceneProps }: Omit<CompanionSceneProps, 'onReady' | 'registerWave'> & { onGreet: () => void; onMinimize: () => void; onPressIn: () => void; onPressOut: () => void }) {
  const [Scene, setScene] = useState<ComponentType<CompanionSceneProps> | null>(null);
  const [ready, setReady] = useState(false);
  const wave = useRef<(() => void) | null>(null);
  const registerWave = useCallback((play: (() => void) | null) => { wave.current = play; }, []);
  const greet = () => { wave.current?.(); onGreet(); };
  const markReady = useCallback(() => setReady(true), []);
  // Blur/sheet removal can terminate a held touch without a final Pressable event.
  useEffect(() => () => onPressOut(), [onPressOut]);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(onFailure, 15000);
    return () => clearTimeout(timer);
  }, [onFailure, ready]);
  useEffect(() => {
    let mounted = true;
    // Guard BEFORE importing Fiber: older installed clients must not import a missing GL module.
    if (!requireOptionalNativeModule('ExpoGL')) { onFailure(); return; }
    import('./companion-scene.native').then(module => { if (mounted) setScene(() => module.CompanionScene); })
      .catch(() => { if (mounted) onFailure(); });
    return () => { mounted = false; };
  }, [onFailure]);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Greet travel companion" onPress={greet} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.mascot}>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.canvas}>
        {Scene && <Scene {...sceneProps} registerWave={registerWave} onFailure={onFailure} onReady={markReady} />}
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Minimize travel companion" onPress={onMinimize} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.control}>
      <Text style={styles.text}>Hide</Text>
    </Pressable>
  </>;
}
const styles = StyleSheet.create({
  anchor: { position: 'absolute', top: COMPANION.top, right: COMPANION.right, width: COMPANION.width },
  mascot: { width: COMPANION.width, height: 140 },
  canvas: { flex: 1, backgroundColor: 'transparent' },
  control: { minHeight: 44, width: COMPANION.width, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#F5F3EC' },
  restore: { width: 44, alignSelf: 'flex-end' },
  icon: { fontSize: 24, color: '#153E35' },
  text: { fontSize: 13, lineHeight: 19, color: '#153E35' },
  bubble: { position: 'absolute', top: COMPANION.top, right: COMPANION.right + COMPANION.width + 8, width: 144,
    maxHeight: 180, borderRadius: 16, padding: 8, backgroundColor: '#F5F3EC' },
  message: { flexShrink: 1 },
  close: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
