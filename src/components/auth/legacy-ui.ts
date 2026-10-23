import { StyleSheet } from 'react-native';

// Frozen baseline presentation: login and sign-up are excluded from the Mobile theme.
export const colors = { paper: '#F5F3EC', ink: '#153E35', muted: '#65736A', green: '#708454', line: '#DEE2D7', white: '#FFFFFF', pale: '#E5EBD9' };

export const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { width: '100%', maxWidth: 560, flex: 1, alignSelf: 'center' },
  list: { paddingHorizontal: 22, paddingBottom: 30, flexGrow: 1 },
  header: { minHeight: 76, paddingHorizontal: 22, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: colors.green },
  heading: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -1, color: colors.ink },
  action: { minHeight: 48, borderRadius: 14, backgroundColor: colors.ink, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  actionLabel: { fontSize: 14, color: colors.white, fontWeight: '600' },
});
