import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { buddyTravelCopy, type BuddyTravel } from '@/lib/buddy/model';

export function BuddyHelpSheet({ canAddMemory, travel, onAddMemory, onCreate, onDrafts, onClose }: {
  canAddMemory: boolean; travel?: BuddyTravel; onAddMemory: () => void; onCreate: () => void; onDrafts: () => void; onClose: () => void;
}) {
  const [tip, setTip] = useState<string | null>(null);
  return <Modal visible transparent animationType="none" onRequestClose={onClose}>
    <View style={s.shade}><SafeAreaView edges={['left', 'right', 'bottom']} style={s.sheet} accessibilityViewIsModal>
      <View style={s.header}><Text accessibilityRole="header" style={s.title}>Your little Journey Buddy</Text><Pressable accessibilityRole="button" accessibilityLabel="Close Journey Buddy help" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.body}>{travel ? buddyTravelCopy(travel) : 'Tiny backpack, big adventures! What shall we do together?'}</Text>
        {canAddMemory ? <HelpAction label="Add a stop or memory" onPress={onAddMemory} /> : <HelpAction label="Add a stop or memory" onPress={() => setTip('Open one of your private drafts, then choose Add memory. A stop and a memory use the same little editor.')} />}
        <HelpAction label="Create a journey" onPress={onCreate} />
        <HelpAction label="Open my drafts" onPress={onDrafts} />
        <HelpAction label="How do I save a memory?" onPress={() => setTip('In your draft, choose Add memory. Pick a place or name your moment, add a photo or note, then tap Save memory. This also saves your current journey changes privately. Nothing is saved just by opening Buddy.')} />
        <HelpAction label="Show me around" onPress={() => setTip('Explore discovers journeys. Search finds places and stories; its bookmark shows your saved journeys. Create starts your own story. Account keeps your private drafts. Journey Buddy can be switched off in Account settings.')} />
        {travel && <HelpAction label="Help with Travel Mode" onPress={() => setTip('Begin Trip starts foreground GPS. Follow the map’s maneuver panel and check arrival prompts yourself. Pause or leave Travel Mode to stop GPS; stop completion always needs your confirmation. I never track you separately.')} />}
        {tip && <Text accessibilityLiveRegion="polite" style={s.tip}>{tip}</Text>}
        <Text style={s.note}>Drag me to park in my little space. I’ll stay there until you change screens.</Text>
      </ScrollView>
    </SafeAreaView></View>
  </Modal>;
}
function HelpAction({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={s.action}><Text style={s.actionText}>{label}</Text></Pressable>;
}
const s = StyleSheet.create({
  shade: { flex: 1, backgroundColor: 'rgba(12,24,42,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#F5F8FF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', padding: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#203750' },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, closeText: { fontSize: 28, color: '#203750' },
  content: { gap: 10, paddingBottom: 12 }, body: { color: '#40516A', fontSize: 15, lineHeight: 22 },
  action: { minHeight: 48, justifyContent: 'center', padding: 12, borderRadius: 16, backgroundColor: '#E4EEFF' },
  actionText: { fontSize: 15, color: '#244979', fontWeight: '600' }, tip: { color: '#284E4B', backgroundColor: '#E1F3EA', padding: 14, borderRadius: 16, fontSize: 15, lineHeight: 23 },
  note: { color: '#657289', fontSize: 12, lineHeight: 18 },
});
