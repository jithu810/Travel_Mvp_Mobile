// DEV-ONLY spike: floating chat button + dark bottom-sheet. Renders nothing unless __DEV__.
// Messages live in this component's state (survive closing the sheet); nothing is persisted.
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { buddyReference } from '@/lib/buddy/animations';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme as appTheme, primaryControl } from '@/theme/mobile-theme';
import { BUDDY_CHAT_MAX_INPUT, BuddyChatError, buddyErrorMessage, formatBuddyAgentReply, getBuddyUsage, isBuddyConfigured, sendBuddyAgent, sendBuddyChatStream, type BuddyTurn, type BuddyUsage } from '@/lib/buddyChat';

const BUTTON = 54, RIGHT = 16;
// Offset inside the Account list container, which already ends above the floating tab bar
// (measured on device 2026-11-17: 176 put the button mid-screen).
const ABOVE_INSET = 12;
const ERROR_COLOR = '#FF8A9B';

type Me = { avatar?: string | null; name?: string | null };

export function BuddyChatPanel({ accessToken, userAvatar, userName }: { accessToken?: string | null; userAvatar?: string | null; userName?: string | null }) {
  if (!__DEV__) return null;
  return <Panel accessToken={accessToken} me={{ avatar: userAvatar, name: userName }} />;
}

type Item = BuddyTurn | { role: 'typing'; content: '' } | { role: 'error'; content: string };

const AVATAR = 28;
// Buddy's head cropped from the 128 px mascot sprite (no extra asset).
function BuddyHead() {
  return <View accessibilityLabel="Buddy" style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, overflow: 'hidden', backgroundColor: appTheme.surface, borderWidth: 1, borderColor: appTheme.border }}>
    <Image source={buddyReference} style={{ position: 'absolute', width: 64, height: 64, left: -10, top: -12 }} />
  </View>;
}
function MyFace({ me }: { me: Me }) {
  const initial = (me.name || '').trim().charAt(0).toUpperCase() || '·';
  return <View accessibilityLabel="You" style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, overflow: 'hidden', backgroundColor: appTheme.surface, borderWidth: 1, borderColor: appTheme.border, alignItems: 'center', justifyContent: 'center' }}>
    {me.avatar ? <Image source={{ uri: me.avatar }} style={{ width: AVATAR, height: AVATAR }} /> : <Text style={{ color: appTheme.text, fontSize: 13, fontWeight: '600' }}>{initial}</Text>}
  </View>;
}

function Panel({ accessToken, me }: { accessToken?: string | null; me: Me }) {
  const [open, setOpen] = useState(false), [turns, setTurns] = useState<BuddyTurn[]>([]);
  const [text, setText] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<BuddyUsage | null>(null);
  const [limited, setLimited] = useState(false);
  // Agent mode (DEV prototype): each message runs the Goa mini-agent once instead of normal chat.
  const [agentMode, setAgentMode] = useState(false);
  const configured = isBuddyConfigured();
  const abort = useRef<AbortController | null>(null);
  const streamingStarted = useRef<AbortController | null>(null);
  // Streamed text so far (null = nothing yet). State updates are throttled to ~60 ms.
  const [streaming, setStreaming] = useState<string | null>(null);
  const pending = useRef<string | null>(null), flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopFlush = useCallback(() => {
    if (flushTimer.current) { clearTimeout(flushTimer.current); flushTimer.current = null; }
    pending.current = null;
  }, []);
  useEffect(() => () => { abort.current?.abort(); stopFlush(); }, [stopFlush]);
  // Usage is server-side (GET /v1/usage): refresh when the sheet opens and after each reply;
  // failures hide the meter silently.
  const refreshUsage = useCallback((signal?: AbortSignal) => {
    getBuddyUsage(accessToken, signal).then(next => {
      if (signal?.aborted) return;
      setUsage(next);
      // Unlock when the meter shows room again (or the server doesn't enforce a limit).
      if (next && (!next.enforced || next.limit === null || next.used < next.limit)) setLimited(false);
    }, () => {});
  }, [accessToken]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    refreshUsage(controller.signal);
    return () => controller.abort();
  }, [open, refreshUsage]);

  const clear = useCallback(() => {
    abort.current?.abort(); abort.current = null;
    stopFlush(); setStreaming(null);
    setTurns([]); setError(null); setBusy(false); setLimited(false);
  }, [stopFlush]);

  const send = useCallback(async () => {
    const content = text.trim();
    if (!content || busy) return;
    const next: BuddyTurn[] = [...turns, agentMode ? { role: 'user', content, agent: true } : { role: 'user', content }];
    setTurns(next); setText(''); setError(null); setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      if (agentMode) {
        const result = await sendBuddyAgent(accessToken, content, controller.signal);
        if (controller.signal.aborted) return;
        setTurns(current => [...current, { role: 'assistant', content: formatBuddyAgentReply(result), agent: true }]);
        refreshUsage();
        return;
      }
      const result = await sendBuddyChatStream(accessToken, next, soFar => {
        if (controller.signal.aborted) return;
        pending.current = soFar;
        if (flushTimer.current) return;
        const flush = () => { flushTimer.current = null; if (pending.current !== null) setStreaming(pending.current); pending.current = null; };
        if (streamingStarted.current !== controller) { streamingStarted.current = controller; flush(); }
        else flushTimer.current = setTimeout(flush, 60);
      }, controller.signal);
      if (controller.signal.aborted) return;
      stopFlush(); setStreaming(null);
      setTurns(current => [...current, { role: 'assistant', content: result.reply }]);
      refreshUsage();
    } catch (caught) {
      if (controller.signal.aborted) return;
      stopFlush(); setStreaming(null);
      if (caught instanceof BuddyChatError && caught.kind === 'limit') { setLimited(true); refreshUsage(); }
      setError(buddyErrorMessage(caught));
    } finally {
      if (abort.current === controller) { abort.current = null; setBusy(false); }
    }
  }, [text, busy, turns, accessToken, refreshUsage, stopFlush, agentMode]);
  // Input is blocked when the server refused (429 limit_reached), when it enforces and the meter
  // is full, or when chat isn't configured (reuses the limit state).
  const meterFull = usage !== null && usage.enforced && usage.limit !== null && usage.used >= usage.limit;
  const atLimit = limited || meterFull || !configured;
  const shownError = configured ? error : buddyErrorMessage(new BuddyChatError('not_configured'));
  // Locked by the monthly limit: say so (and when it resets) instead of "Say hi" / "Message Buddy…".
  const lockNote = configured && (limited || meterFull) ? limitNote(usage) : null;

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Buddy chat" onPress={() => setOpen(true)}
      style={[primaryControl, { position: 'absolute', right: RIGHT, bottom: ABOVE_INSET, width: BUTTON, height: BUTTON, borderRadius: BUTTON / 2, alignItems: 'center', justifyContent: 'center', zIndex: 20, elevation: 20 }]}>
      <Feather name="message-circle" size={24} color={appTheme.white} />
    </Pressable>
    <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
      <ChatSheet me={me} turns={turns} streaming={streaming} busy={busy} error={shownError} usage={usage} atLimit={atLimit} lockNote={lockNote} onClear={clear} text={text} setText={setText} onSend={() => { void send(); }} onClose={() => setOpen(false)}
        agentMode={agentMode} onToggleAgent={() => setAgentMode(on => !on)} />
    </Modal>
  </>;
}

function ChatSheet({ me, turns, streaming, busy, error, usage, atLimit, lockNote, onClear, text, setText, onSend, onClose, agentMode, onToggleAgent }: {
  me: Me; turns: BuddyTurn[]; streaming: string | null; busy: boolean; error: string | null; usage: BuddyUsage | null; atLimit: boolean; lockNote: string | null; onClear: () => void; text: string; setText: (value: string) => void; onSend: () => void; onClose: () => void;
  agentMode: boolean; onToggleAgent: () => void;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(0);
  const list = useRef<FlatList<Item>>(null);
  // Android: Modal windows ignore adjustResize inconsistently, so pad by the keyboard height ourselves.
  // iOS: KeyboardAvoidingView handles it.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', event => setKeyboard(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Full screen below the status bar. With the Android keyboard open, the outer padding already reserves
  // keyboard + bottom inset, so the sheet gives that room back.
  const sheetHeight = Math.max(200, height - insets.top - (keyboard > 0 ? keyboard + insets.bottom : 0));
  const data: Item[] = [...turns, ...(busy ? [streaming !== null ? { role: 'assistant', content: streaming } as const : { role: 'typing', content: '' } as const] : []), ...(error ? [{ role: 'error', content: error } as const] : [])];
  const isStreaming = streaming !== null;
  const scrollEnd = useCallback(() => list.current?.scrollToEnd({ animated: !isStreaming }), [isStreaming]);
  useEffect(() => { const t = setTimeout(scrollEnd, 50); return () => clearTimeout(t); }, [data.length, keyboard, scrollEnd]);

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: Platform.OS === 'android' && keyboard > 0 ? keyboard + insets.bottom : 0 }}>
      <Pressable accessibilityLabel="Close Buddy chat" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      <View style={{ height: sheetHeight, backgroundColor: appTheme.background, overflow: 'hidden', paddingBottom: keyboard > 0 ? 0 : insets.bottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ color: appTheme.text, fontSize: 17, fontWeight: '600' }}>Buddy</Text>
            {agentMode ? <Text style={{ color: appTheme.accent, fontSize: 12 }}>Agent mode · Goa trips</Text>
              : usage && <Text style={{ color: appTheme.muted, fontSize: 12 }}>{usageLabel(usage)}</Text>}
          </View>
          <Pressable accessibilityRole="switch" accessibilityLabel="Agent mode" accessibilityState={{ checked: agentMode, disabled: busy }} disabled={busy} onPress={onToggleAgent} hitSlop={8}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: agentMode ? appTheme.surface : 'transparent' }}>
            <Feather name="compass" size={20} color={agentMode ? appTheme.accent : appTheme.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Clear chat" accessibilityState={{ disabled: turns.length === 0 }} disabled={turns.length === 0} onPress={onClear} hitSlop={8} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', opacity: turns.length === 0 ? 0.35 : 1 }}>
            <Feather name="trash-2" size={20} color={appTheme.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Close Buddy chat" onPress={onClose} hitSlop={8} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="x" size={22} color={appTheme.text} />
          </Pressable>
        </View>
        <View style={{ height: 4, backgroundColor: appTheme.border }}>
          {usage && usage.limit !== null && usage.limit > 0 && <View style={{ height: 4, width: `${Math.min(100, (atLimit ? 1 : usage.used / usage.limit) * 100)}%` as `${number}%`, backgroundColor: atLimit || usage.used / usage.limit >= 0.9 ? ERROR_COLOR : appTheme.accent }} />}
        </View>
        <FlatList ref={list} style={{ flex: 1 }} data={data} keyExtractor={(_, index) => String(index)} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 12, gap: 8, flexGrow: 1, justifyContent: data.length ? 'flex-end' : 'center' }}
          onContentSizeChange={scrollEnd}
          ListEmptyComponent={<Text style={{ color: appTheme.muted, textAlign: 'center', fontSize: 14 }}>{lockNote ?? 'Say hi to Buddy.'}</Text>}
          renderItem={({ item }) => {
            const mine = item.role === 'user', bad = item.role === 'error';
            const bubble = <View style={{ flexShrink: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: mine ? appTheme.accent : appTheme.surface, borderWidth: mine ? 0 : 1, borderColor: bad ? ERROR_COLOR : appTheme.border }}>
              <Text style={{ fontSize: 15, color: mine ? appTheme.background : bad ? ERROR_COLOR : appTheme.text, fontStyle: item.role === 'typing' ? 'italic' : 'normal' }}>{item.role === 'typing' ? (agentMode ? 'Buddy is working on it…' : 'Buddy is typing…') : item.content}</Text>
            </View>;
            // Avatar row: Buddy's head on the left of Buddy turns, your photo on the right of yours.
            return <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
              {!mine && !bad && <BuddyHead />}
              {bubble}
              {mine && <MyFace me={me} />}
            </View>;
          }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: appTheme.border }}>
          <TextInput value={text} onChangeText={setText} multiline maxLength={BUDDY_CHAT_MAX_INPUT} editable={!atLimit} placeholder={lockNote ?? 'Message Buddy…'} placeholderTextColor={appTheme.muted} accessibilityLabel="Message to Buddy"
            style={{ flex: 1, maxHeight: 4 * 20 + 20, minHeight: 40, borderWidth: 1, borderColor: appTheme.border, borderRadius: 18, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 15, lineHeight: 20, color: appTheme.text, backgroundColor: appTheme.surface, textAlignVertical: 'top' }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Send message to Buddy" disabled={busy || atLimit || !text.trim()} onPress={onSend}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: appTheme.accent, opacity: busy || atLimit || !text.trim() ? 0.45 : 1 }}>
            <Feather name="send" size={20} color={appTheme.background} />
          </Pressable>
        </View>
      </View>
    </View>
  </KeyboardAvoidingView>;
}

function limitNote(usage: BuddyUsage | null) {
  const resets = usage?.resetsAt ? new Date(usage.resetsAt) : null;
  if (!resets || Number.isNaN(resets.getTime())) return 'Monthly chat limit reached';
  return 'Monthly limit reached · resets ' + resets.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function usageLabel(usage: BuddyUsage) {
  const used = usage.used.toLocaleString();
  return usage.limit === null ? used + ' tokens this month' : used + ' / ' + usage.limit.toLocaleString() + ' tokens this month';
}
