import { useMemo, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '@/components/discovery/ui';

// Two snap positions; only the handle owns dragging, leaving maps and lists interactive.
export function ItinerarySheet({ title, subtitle, children, footer, compact = false, maxDetailsHeight, maxSheetHeight, onHeightChange }: {
  title: string; subtitle: string; children: ReactNode; footer?: ReactNode; compact?: boolean; maxDetailsHeight?: number; maxSheetHeight?: number; onHeightChange?: (height: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(68);
  const [footerHeight, setFooterHeight] = useState(0);
  const { height, fontScale } = useWindowDimensions();
  const summaryLines = compact && fontScale <= 1.2 ? 1 : 2;
  const drag = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderRelease: (_, gesture) => { if (Math.abs(gesture.dy) > 24) setExpanded(gesture.dy < 0); },
    onPanResponderTerminationRequest: () => true,
  }), []);
  const detailsHeight = Math.max(0, Math.min(260, height * 0.3, maxDetailsHeight ?? Infinity, (maxSheetHeight ?? Infinity) - headerHeight - footerHeight));
  return <View style={[styles.sheet, compact && styles.compactSheet]} onLayout={event => onHeightChange?.(event.nativeEvent.layout.height)}>
    <View {...drag.panHandlers} onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}>
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Collapse itinerary and details' : 'Expand itinerary and details'}
        accessibilityHint="Drag up to expand or down to collapse. You can also double tap."
        accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={[styles.handle, compact && styles.compactHandle]}>
        <View style={styles.grip} />
        <View style={styles.row}><View style={styles.heading}><Text numberOfLines={summaryLines} style={[styles.title, compact && styles.compactTitle]}>{title}</Text><Text accessibilityLiveRegion="polite" numberOfLines={summaryLines} style={[styles.subtitle, compact && styles.compactSubtitle]}>{subtitle}</Text></View><Text style={styles.chevron}>{expanded ? '⌄' : '⌃'}</Text></View>
      </Pressable>
    </View>
    {expanded && <ScrollView style={{ maxHeight: detailsHeight }} contentContainerStyle={styles.content} nestedScrollEnabled>{children}</ScrollView>}
    {footer && <View style={[styles.footer, compact && styles.compactFooter]} onLayout={event => setFooterHeight(event.nativeEvent.layout.height)}>{footer}</View>}
  </View>;
}
const styles = StyleSheet.create({
  sheet: { flexShrink: 0, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', elevation: 8, shadowColor: colors.ink, shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  handle: { minHeight: 68, paddingHorizontal: 16, paddingTop: 7, paddingBottom: 10, gap: 6 },
  grip: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2, backgroundColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, heading: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18 }, chevron: { color: colors.green, fontSize: 22 },
  footer: { paddingHorizontal: 14, paddingBottom: 12 },
  content: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  compactSheet: { borderRadius: 20, elevation: 5, shadowOpacity: 0.1, shadowRadius: 12 },
  compactHandle: { minHeight: 56, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 6, gap: 4 },
  compactTitle: { fontSize: 15, lineHeight: 20 },
  compactSubtitle: { fontSize: 11, lineHeight: 16 },
  compactFooter: { paddingHorizontal: 12, paddingBottom: 10 },
});
