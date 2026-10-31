import { theme as appTheme , theme } from '@/theme/mobile-theme';
import { usePilotColor, darkPilotStyles } from '@/theme/dark-pilot';
import type { ReactNode, RefObject } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';


// Presentation only: Home owns Mapbox suggestions; Search owns journey filtering.
export function CompactSearchInput({ inputRef, focusLabel, children, ...props }: TextInputProps & { inputRef: RefObject<TextInput | null>; focusLabel: string; children?: ReactNode }) {
  const styles = lightStyles_styles;
  const color = usePilotColor();
  return <Pressable accessibilityRole="button" accessibilityLabel={focusLabel} onPress={() => inputRef.current?.focus()} style={styles.target}>
    <View style={styles.surface}><Text accessible={false} style={styles.glyph}>⌕</Text>
      <TextInput selectionColor={appTheme.accent} keyboardAppearance="dark" {...props} ref={inputRef} placeholderTextColor={color(theme.muted)} style={styles.input} />{children}
    </View>
  </Pressable>;
}
const lightStyles_styles = darkPilotStyles(StyleSheet.create({
  target: { minHeight: 48, justifyContent: 'center', minWidth: 0 },
  surface: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, borderRadius: 24, backgroundColor: theme.surface, boxShadow: theme.shadow, borderWidth: 1, borderColor: theme.white },
  glyph: { fontSize: 18, lineHeight: 20, includeFontPadding: false, color: theme.text },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 3, fontSize: 12, lineHeight: 18, color: theme.text },
}));
