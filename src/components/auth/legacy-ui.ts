import { theme } from '@/theme/mobile-theme';
import { darkPilotStyles } from '@/theme/dark-pilot';
import { StyleSheet } from 'react-native';

// Authentication shares the immutable app palette; scenic sign-in styling layers above it.
export const colors = { paper: theme.background, ink: theme.text, muted: theme.muted, green: theme.accent, line: theme.border, white: theme.white, pale: theme.lavender };

export const ui = darkPilotStyles(StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { width: '100%', maxWidth: 560, flex: 1, alignSelf: 'center' },
  list: { paddingHorizontal: 22, paddingBottom: 30, flexGrow: 1 },
  header: { minHeight: 76, paddingHorizontal: 22, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: colors.green },
  heading: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -1, color: colors.ink },
  action: { minHeight: 48, borderRadius: 14, backgroundColor: theme.navigation, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  actionLabel: { fontSize: 14, color: colors.white, fontWeight: '600' },
}));
