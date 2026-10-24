import { theme } from '@/theme/mobile-theme';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, ScrollView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, ui } from '../discovery/ui';
import { searchPlaces } from '@/lib/create/places';
import type { Place } from '@/lib/create/model';
export function PlacePicker({ label, memorySheet = false, premium = false, homeSearch = false, destinationOnly = false, autoSuggest = false, compact = false, embeddedSuggestions = false, dismissVersion = 0, inlineSearch = false, proximity = null, disabled, onSelect }: { label: string; memorySheet?: boolean; premium?: boolean; homeSearch?: boolean; destinationOnly?: boolean; autoSuggest?: boolean; compact?: boolean; embeddedSuggestions?: boolean; dismissVersion?: number; inlineSearch?: boolean; proximity?: Place | null; disabled: boolean; onSelect: (place: Place) => void }) {
  const input = useRef<TextInput>(null);
  const dense = compact || inlineSearch;
  const [query, setQuery] = useState(''), [results, setResults] = useState<Place[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [focusEpoch, setFocusEpoch] = useState(-1), [resultEpoch, setResultEpoch] = useState(dismissVersion);
  const visibleResults = !embeddedSuggestions || resultEpoch === dismissVersion ? results : [];
  const visibleBusy = busy && (!embeddedSuggestions || resultEpoch === dismissVersion);
  const visibleError = !embeddedSuggestions || resultEpoch === dismissVersion ? error : null;
  const request = useRef<AbortController | null>(null), generation = useRef(0);
  useEffect(() => () => { generation.current++; request.current?.abort(); }, []);
  useEffect(() => { if (disabled) request.current?.abort(); }, [disabled]);
  useEffect(() => { if (embeddedSuggestions) { generation.current++; request.current?.abort(); } }, [embeddedSuggestions, dismissVersion]);
  function dismiss() { generation.current++; request.current?.abort(); setResults([]); setBusy(false); setError(null); setFocusEpoch(-1); }
  function change(value: string) { generation.current++; request.current?.abort(); setQuery(value); setFocusEpoch(dismissVersion); setResultEpoch(dismissVersion); setResults([]); setBusy(false); setError(null); }
  useEffect(() => {
    if (!homeSearch) return;
    const listener = Keyboard.addListener('keyboardDidHide', dismiss);
    return () => listener.remove();
  }, [homeSearch]);
  const search = useCallback(async () => {
    if (disabled) return;
    setResultEpoch(dismissVersion); if (embeddedSuggestions) setFocusEpoch(dismissVersion);
    const current = ++generation.current;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    setBusy(true); setResults([]); setError(null);
    try {
      const places = await searchPlaces(query, destinationOnly, proximity, controller.signal);
      if (generation.current === current && !controller.signal.aborted) { setResults(places); if (!places.length) setError('No matching places. Try a town or a more specific address.'); }
    } catch (cause) { if (generation.current === current && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Search unavailable. Please retry.'); }
    finally { if (generation.current === current) setBusy(false); }
  }, [disabled, query, destinationOnly, proximity, embeddedSuggestions, dismissVersion]);
  useEffect(() => {
    if (!autoSuggest || disabled || (embeddedSuggestions && focusEpoch !== dismissVersion) || query.trim().length < 3) return;
    const timer = setTimeout(() => { void search(); }, 350);
    return () => { clearTimeout(timer); request.current?.abort(); };
  }, [autoSuggest, disabled, query, search, embeddedSuggestions, focusEpoch, dismissVersion]);
  if (homeSearch) return <View style={styles.homeWrap}>
    <Pressable accessibilityRole="button" accessibilityLabel="Focus place search" onPress={() => input.current?.focus()} style={styles.homeTarget}><View style={styles.homeSurface}><Text accessible={false} style={styles.homeGlyph}>⌕</Text>
      <TextInput ref={input} accessibilityLabel={label} editable={!disabled} value={query} onChangeText={change}
        onFocus={() => setFocusEpoch(dismissVersion)} maxLength={200} placeholder="Search destinations & places..." placeholderTextColor={theme.muted}
        autoCorrect={false} style={styles.homeInput} returnKeyType="search" submitBehavior="submit" onSubmitEditing={() => { void search(); }} />
    </View></Pressable>
    {focusEpoch === dismissVersion && <View style={styles.homeResults}>
      {visibleBusy && <ActivityIndicator accessibilityLabel="Searching places" />}
      {visibleError && <Text accessibilityRole="alert" style={ui.body}>{visibleError}</Text>}
      {query.trim().length < 3 && <Text style={styles.note}>Enter at least 3 characters to search cities and addresses.</Text>}
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" accessibilityLabel="Place search results" style={styles.embeddedList}>{resultRows()}</ScrollView>
      <View style={styles.resultTools}><Text style={styles.note}>Search results © Mapbox</Text><Pressable accessibilityRole="button" accessibilityLabel="Close place results" onPress={() => { dismiss(); Keyboard.dismiss(); }} style={styles.closeResults}><Text style={styles.note}>Close</Text></Pressable></View>
    </View>}
  </View>;
  return <View onTouchStart={embeddedSuggestions ? event => event.stopPropagation() : undefined} style={{ gap: dense ? 4 : 10 }}>
    {!dense && <Text style={styles.label}>{label}</Text>}
    <View style={dense ? styles.searchRow : styles.searchStack}>
    {embeddedSuggestions ? <View style={[styles.inputWrap, premium && styles.raisedInput]}>
      <View pointerEvents="none" accessible={false} style={styles.searchIcon}><Text style={styles.searchGlyph}>⌕</Text></View>
      <TextInput accessibilityLabel={label} editable={!disabled} value={query} onChangeText={change} onFocus={() => setFocusEpoch(dismissVersion)} maxLength={200} placeholder={compact ? 'Search destinations' : destinationOnly ? 'Search a town, region or country' : 'Search a town, street or address'} style={[styles.input, dense && styles.compactInput, premium && styles.premiumInput, memorySheet && styles.memoryInput, styles.embeddedInput]} returnKeyType="search" onSubmitEditing={() => { void search(); }} />
    </View> : <TextInput accessibilityLabel={label} editable={!disabled} value={query} onChangeText={change} maxLength={200} placeholder={compact ? 'Search destinations' : destinationOnly ? 'Search a town, region or country' : 'Search a town, street or address'} style={[styles.input, dense && styles.compactInput, memorySheet && styles.memoryInput]} returnKeyType="search" onSubmitEditing={() => { void search(); }} />}
    <Pressable accessibilityRole="button" accessibilityLabel={'Search ' + label.toLowerCase()} disabled={disabled || visibleBusy} accessibilityState={{ disabled: disabled || visibleBusy }} onPress={() => { void search(); }} style={[styles.search, dense && styles.compactSearch, premium && styles.premiumSearch, memorySheet && styles.memorySearch, premium && disabled && { opacity: 0.5 }]}>
      {visibleBusy ? <ActivityIndicator color={memorySheet ? '#FFFFFF' : undefined} /> : <Text style={[styles.label, memorySheet && styles.memorySearchLabel]}>{dense ? 'Search' : 'Search places'}</Text>}
    </Pressable>
    </View>
    {visibleError && <Text accessibilityRole="alert" style={ui.body}>{visibleError}</Text>}
    {embeddedSuggestions && visibleResults.length > 0 && <View style={styles.embeddedResults}>
      <ScrollView nestedScrollEnabled accessibilityLabel="Destination search results" keyboardShouldPersistTaps="handled" style={styles.embeddedList}>{resultRows()}</ScrollView>
      <View style={styles.resultTools}><Text style={styles.note}>Search results © Mapbox</Text><Pressable accessibilityRole="button" accessibilityLabel="Close destination results" onPress={dismiss} style={styles.closeResults}><Text style={styles.note}>Close</Text></Pressable></View>
    </View>}
    {compact && !embeddedSuggestions && results.length > 0 ? <Modal transparent animationType="fade" onShow={() => Keyboard.dismiss()} onRequestClose={() => setResults([])}>
      <View style={styles.resultBackdrop}><View accessibilityViewIsModal style={styles.resultPanel}>
        <Text accessibilityRole="header" style={styles.label}>Choose a destination</Text>
        <Text style={styles.note}>Search results © Mapbox</Text>
        <ScrollView accessibilityLabel="Destination search results" keyboardShouldPersistTaps="handled" style={styles.resultList}>
          {resultRows()}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Close destination results" onPress={() => setResults([])} style={styles.search}><Text style={styles.label}>Close results</Text></Pressable>
      </View></View>
    </Modal> : !compact && resultRows()}
    {!compact && <Text style={styles.note}>Select a result to use its location. Search results © Mapbox.</Text>}
  </View>;
  function resultRows() { return visibleResults.map((place, index) => <Pressable key={place.mapboxId ?? String(index)} accessibilityRole="button" accessibilityLabel={'Select ' + place.label} disabled={disabled} onPress={() => { if (!disabled) { onSelect(place); if (embeddedSuggestions) Keyboard.dismiss(); change(''); if (homeSearch) dismiss(); } }} style={styles.result}>
    <Text style={styles.label}>{place.name}</Text><Text style={ui.body}>{place.label}</Text>
  </Pressable>); }
}
export const formStyles = StyleSheet.create({
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 14, color: colors.ink, fontSize: 16 },
});
const styles = StyleSheet.create({ ...formStyles,
  memoryInput: { backgroundColor: '#F5F6FB', borderColor: '#FFFFFF', borderWidth: 2, borderRadius: 20, boxShadow: 'inset 0 2px 4px rgba(35, 48, 78, 0.10), 0 3px 6px rgba(39, 54, 85, 0.10)', color: '#202C43', fontSize: 14 },
  memorySearch: { backgroundColor: '#3566D8', borderColor: '#FFFFFF', experimental_backgroundImage: 'linear-gradient(135deg, #627EEB 0%, #2865DA 100%)', boxShadow: '0 3px 7px rgba(47, 91, 190, 0.22)' },
  memorySearchLabel: { color: '#FFFFFF' },
  raisedInput: { borderRadius: 24, backgroundColor: colors.white, boxShadow: '0 3px 5px rgba(57, 49, 29, 0.15)' },
  premiumInput: { borderColor: '#EDEBE5', borderRadius: 24 },
  premiumSearch: { backgroundColor: theme.lavender, borderRadius: 18, borderColor: '#FFFFFF', boxShadow: '0 3px 5px rgba(57, 49, 29, 0.13), inset 0 1px 2px rgba(255, 255, 255, 0.8)' },
  homeTarget: { minHeight: 44, justifyContent: 'center' },
  homeWrap: { minHeight: 44, justifyContent: 'center' },
  homeSurface: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, borderRadius: 24, backgroundColor: theme.surface, boxShadow: theme.shadow, borderWidth: 1, borderColor: theme.white },
  homeGlyph: { fontSize: 18, lineHeight: 20, includeFontPadding: false, color: theme.text },
  homeInput: { flex: 1, minWidth: 0, paddingVertical: 3, fontSize: 12, lineHeight: 18, color: theme.text },
  homeResults: { position: 'absolute', top: '100%', left: 0, right: 0, padding: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, zIndex: 20, elevation: 12 },
  inputWrap: { flexGrow: 1, flexShrink: 1, flexBasis: 120, minWidth: 0 },
  embeddedInput: { width: '100%', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingLeft: 36 },
  searchIcon: { position: 'absolute', zIndex: 1, left: 12, top: 0, bottom: 0, justifyContent: 'center' },
  searchGlyph: { color: colors.ink, fontSize: 23 },
  embeddedResults: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, overflow: 'hidden' },
  embeddedList: { maxHeight: 132, flexGrow: 0, flexShrink: 1 },
  resultTools: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 10 },
  closeResults: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  resultBackdrop: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: 'rgba(21,62,53,0.3)' },
  resultPanel: { maxHeight: '70%', padding: 14, gap: 10, backgroundColor: colors.paper, borderRadius: 22 },
  resultList: { flexGrow: 0, flexShrink: 1 },
  searchStack: { gap: 10 },
  searchRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 8 },
  compactInput: { flexGrow: 1, flexShrink: 1, flexBasis: 120, minWidth: 0, minHeight: 44, padding: 10, borderRadius: 22 },
  compactSearch: { minHeight: 44, borderRadius: 18, paddingHorizontal: 14, backgroundColor: colors.pale, borderWidth: 1, borderColor: colors.line },
  search: { minHeight: 44, borderRadius: 12, backgroundColor: colors.pale, justifyContent: 'center', alignItems: 'center', padding: 12 },
  result: { minHeight: 52, padding: 14, gap: 6, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  note: { color: colors.muted, fontSize: 11, lineHeight: 17 },
});
