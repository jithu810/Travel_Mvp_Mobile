import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, ui } from '../discovery/ui';
import { searchPlaces } from '@/lib/create/places';
import type { Place } from '@/lib/create/model';
export function PlacePicker({ label, destinationOnly = false, proximity = null, disabled, onSelect }: { label: string; destinationOnly?: boolean; proximity?: Place | null; disabled: boolean; onSelect: (place: Place) => void }) {
  const [query, setQuery] = useState(''), [results, setResults] = useState<Place[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null), generation = useRef(0);
  useEffect(() => () => { generation.current++; request.current?.abort(); }, []);
  useEffect(() => { if (disabled) request.current?.abort(); }, [disabled]);
  function change(value: string) { generation.current++; request.current?.abort(); setQuery(value); setResults([]); setBusy(false); setError(null); }
  async function search() {
    if (busy || disabled) return;
    const current = ++generation.current;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    setBusy(true); setResults([]); setError(null);
    try {
      const places = await searchPlaces(query, destinationOnly, proximity, controller.signal);
      if (generation.current === current && !controller.signal.aborted) { setResults(places); if (!places.length) setError('No matching places. Try a town or a more specific address.'); }
    } catch (cause) { if (generation.current === current && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Search unavailable. Please retry.'); }
    finally { if (generation.current === current) setBusy(false); }
  }
  return <View style={{ gap: 10 }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} editable={!disabled} value={query} onChangeText={change} maxLength={200} placeholder={destinationOnly ? 'Search a town, region or country' : 'Search a town, street or address'} style={styles.input} returnKeyType="search" onSubmitEditing={() => { void search(); }} />
    <Pressable accessibilityRole="button" accessibilityLabel={'Search ' + label.toLowerCase()} disabled={disabled || busy} accessibilityState={{ disabled: disabled || busy }} onPress={() => { void search(); }} style={styles.search}>
      {busy ? <ActivityIndicator /> : <Text style={styles.label}>Search places</Text>}
    </Pressable>
    {error && <Text accessibilityRole="alert" style={ui.body}>{error}</Text>}
    {results.map((place, index) => <Pressable key={place.mapboxId ?? String(index)} accessibilityRole="button" accessibilityLabel={'Select ' + place.label} disabled={disabled} onPress={() => { if (!disabled) { onSelect(place); change(''); } }} style={styles.result}>
      <Text style={styles.label}>{place.name}</Text><Text style={ui.body}>{place.label}</Text>
    </Pressable>)}
    <Text style={styles.note}>Select a result to use its location. Search results © Mapbox.</Text>
  </View>;
}
export const formStyles = StyleSheet.create({
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 14, color: colors.ink, fontSize: 16 },
});
const styles = StyleSheet.create({ ...formStyles,
  search: { minHeight: 44, borderRadius: 12, backgroundColor: colors.pale, justifyContent: 'center', alignItems: 'center', padding: 12 },
  result: { minHeight: 52, padding: 14, gap: 6, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  note: { color: colors.muted, fontSize: 11, lineHeight: 17 },
});
