import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

type Props = { enabled: boolean; available: boolean; status: 'loading' | 'ready' | 'saving' | 'load-error' | 'save-error'; onChange: (enabled: boolean) => void };
export function CompanionToggle({ enabled, available, status, onChange }: Props) {
  if (Platform.OS !== 'android') return null;
  const state = !available ? 'Unavailable' : status === 'loading' ? 'Loading…'
    : (enabled ? 'On' : 'Off') + (status === 'saving' ? ' · saving…' : status === 'save-error' ? ' · not saved' : status === 'load-error' ? ' · storage unavailable' : '');
  return <View style={styles.row}>
    <Text style={styles.label}>Travel Companion</Text>
    <Text accessibilityLiveRegion="polite" style={styles.state}>{state}</Text>
    <Switch accessibilityLabel="Travel Companion" accessibilityHint={available ? 'Show or turn off the explorer on Home' : 'Unavailable in this build; requires Android with Expo GL'}
      value={available && enabled} disabled={!available || status === 'loading'} onValueChange={onChange}
      trackColor={{ false: '#48554F', true: '#276392' }} thumbColor="#F5F3EC" style={styles.switch} />
  </View>;
}
const styles = StyleSheet.create({
  row: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  label: { color: '#DDE6EF', fontSize: 12, flexShrink: 1 },
  state: { color: '#C3CED9', fontSize: 11, flexShrink: 1 },
  switch: { minHeight: 44 },
});
