import { theme, primaryControl, raisedSurface } from '@/theme/mobile-theme';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/components/discovery/ui';

export function TripConfirmation({ title, body, confirmLabel, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
    <SafeAreaView style={styles.overlay}><View style={styles.panel} accessibilityViewIsModal>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={confirmLabel} onPress={onConfirm} style={styles.confirm}><Text style={styles.confirmText}>{confirmLabel}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
    </View></SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: '#081E19AA', paddingHorizontal: 20 },
  panel: { ...raisedSurface, backgroundColor: theme.surface, padding: 20, gap: 12, borderRadius: 24, width: '100%', maxWidth: 480, alignSelf: 'center' },
  title: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  confirm: { ...primaryControl, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24, padding: 10 },
  confirmText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  cancel: { minHeight: 44, justifyContent: 'center', alignItems: 'center' }, cancelText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
});
