import type { ReactNode, RefObject } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '@/theme/mobile-theme';

// Presentation only: Home owns Mapbox suggestions; Search owns journey filtering.
export function CompactSearchInput({ inputRef, focusLabel, children, ...props }: TextInputProps & { inputRef: RefObject<TextInput | null>; focusLabel: string; children?: ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={focusLabel} onPress={() => inputRef.current?.focus()} style={styles.target}>
    <View style={styles.surface}><Text accessible={false} style={styles.glyph}>⌕</Text>
      <TextInput {...props} ref={inputRef} placeholderTextColor={theme.muted} style={styles.input} />{children}
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  target: { minHeight: 44, justifyContent: 'center', minWidth: 0 },
  surface: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, borderRadius: 24, backgroundColor: theme.surface, boxShadow: theme.shadow, borderWidth: 1, borderColor: theme.white },
  glyph: { fontSize: 18, lineHeight: 20, includeFontPadding: false, color: theme.text },
  input: { flex: 1, minWidth: 0, paddingVertical: 3, fontSize: 12, lineHeight: 18, color: theme.text },
});
