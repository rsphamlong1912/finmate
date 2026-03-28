import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Animated,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../hooks/useAuth';
import { Fonts } from '../../constants/fonts';
import { useGoals } from '../../context/GoalsContext';
import { useProfile } from '../../context/ProfileContext';
import { sendMessageToClaude, buildFinancialContext, Message } from '../../lib/claude';
import { supabase } from '../../lib/supabase';
import { DEFAULT_CATEGORIES } from '../../types';
import { useTheme } from '../../context/ThemeContext';

type ChatMsg = { id: string; role: 'user' | 'assistant'; text: string; timestamp?: Date; isError?: boolean; retryText?: string; };

const QUICK_PROMPTS = [
  { emoji: '📊', label: 'Phân tích chi tiêu tháng này', prompt: 'Phân tích chi tiêu tháng này của tôi' },
  { emoji: '💡', label: 'Gợi ý tiết kiệm cho tôi',      prompt: 'Gợi ý tiết kiệm cho tôi' },
  { emoji: '⚠️', label: 'Tôi đang tiêu quá tay không?', prompt: 'Tôi đang tiêu quá tay không?' },
  { emoji: '🎯', label: 'Lập kế hoạch ngân sách',       prompt: 'Giúp tôi lập kế hoạch ngân sách' },
];

/* ── Skeleton chat bubbles ── */
const SKELETON_BUBBLES = [
  { side: 'left',  width: '72%' },
  { side: 'right', width: '45%' },
  { side: 'left',  width: '85%' },
  { side: 'left',  width: '55%' },
  { side: 'right', width: '60%' },
  { side: 'left',  width: '78%' },
] as const;

function ChatSkeleton() {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={[skeletonStyles.overlay, { backgroundColor: colors.bg }]}>
      <View style={skeletonStyles.list}>
        {SKELETON_BUBBLES.map((b, i) => (
          <Animated.View
            key={i}
            style={[
              skeletonStyles.bubble,
              { backgroundColor: colors.accentBg },
              b.side === 'right' ? skeletonStyles.bubbleRight : skeletonStyles.bubbleLeft,
              { width: b.width, opacity: pulse },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingTop: 16,
  },
  list: { paddingHorizontal: 16, gap: 10 },
  bubble: {
    height: 44, borderRadius: 18,
  },
  bubbleLeft: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleRight: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
});

/* ── Typing indicator — 3 chấm nhảy ── */
function TypingIndicator() {
  const { colors } = useTheme();
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -5, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(500),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 4, paddingHorizontal: 2 }}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent }, { transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const { user, session } = useAuth();
  const { goals } = useGoals();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<ChatMsg[]>([{
    id: 'welcome', role: 'assistant',
    text: 'Tớ đây! 🫡 Người bạn hiếm hoi không phán xét cậu tiêu nhiều. Cần giúp gì không?',
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const isSending = useRef(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const isNearBottom = useRef(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('[chat] load history error:', error.message, error.code);
        setHistoryError(true);
        return;
      }
      if (data && data.length > 0) {
        const welcome: ChatMsg = { id: 'welcome', role: 'assistant', text: 'Tớ đây! 🫡 Người bạn hiếm hoi không phán xét cậu tiêu nhiều. Cần giúp gì không?', timestamp: new Date() };
        setMessages([welcome, ...data.map(r => ({ id: r.id, role: r.role as 'user' | 'assistant', text: r.content, timestamp: new Date(r.created_at) }))]);
        setHistory(data.slice(-8).map(r => ({ role: r.role as 'user' | 'assistant', content: r.content })));
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
      }
    };
    load().finally(() => setHistoryLoading(false));
  }, [user?.id]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isSending.current) return;
    isSending.current = true;
    setInput('');
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    isNearBottom.current = true;
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

    const updated: Message[] = [...history, { role: 'user', content: text }];
    try {
      const [{ data: freshExpenses }, { data: customCats }] = await Promise.all([
        supabase.from('expenses').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('user_categories').select('*').eq('user_id', user?.id),
      ]);

      const allCategories = [
        ...DEFAULT_CATEGORIES,
        ...(customCats ?? []).map((c: any) => ({ id: c.id, name: c.name, emoji: c.emoji, color: c.color, is_default: false })),
      ];
      const getCatName = (id: string) => allCategories.find(c => c.id === id)?.name ?? id;

      const now = new Date();
      const fresh = freshExpenses ?? [];
      const thisMonth = fresh.filter(e => {
        const d = new Date(e.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const freshTotal = thisMonth.reduce((s, e) => s + e.amount, 0);
      const freshByCategory = thisMonth.reduce<Record<string, number>>((acc, e) => {
        const name = getCatName(e.category);
        acc[name] = (acc[name] ?? 0) + e.amount;
        return acc;
      }, {});

      const ctx = buildFinancialContext({
        totalThisMonth: freshTotal,
        byCategory: freshByCategory,
        budget: profile?.monthly_budget,
        goals: goals.map(g => ({ title: g.title, saved: g.saved_amount, target: g.target_amount })),
        currency: '₫',
        displayName: profile?.display_name,
        recentExpenses: fresh.slice(0, 30).map(e => ({
          note: e.note,
          category: getCatName(e.category),
          amount: e.amount,
          date: e.created_at,
        })),
      });
      const aiText = await sendMessageToClaude(updated, ctx, session?.access_token ?? '');
      const aiMsg: ChatMsg = { id: (Date.now() + 1).toString(), role: 'assistant', text: aiText, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      setHistory(([...updated, { role: 'assistant' as const, content: aiText }]).slice(-8));
      // Lưu cả 2 message sau khi AI trả lời thành công — tránh orphaned user message nếu AI lỗi
      if (user?.id) {
        await supabase.from('chat_messages').insert({ user_id: user.id, role: 'user', content: text });
        await supabase.from('chat_messages').insert({ user_id: user.id, role: 'assistant', content: aiText });
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        text: 'Xin lỗi, tớ đang gặp sự cố 😅',
        timestamp: new Date(),
        isError: true,
        retryText: text,
      }]);
    } finally {
      isSending.current = false;
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [history, session, user, goals, profile]);

  const fmtTime = (d?: Date) => {
    if (!d) return '';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const copyMsg = async (id: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
      borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      overflow: 'hidden',
    },
    headerOrb1: { position: 'absolute', top: -30, right: 60, width: 100, height: 100, borderRadius: 50, backgroundColor: colors.orb1 },
    headerOrb2: { position: 'absolute', top: 20, right: -20, width: 70, height: 70, borderRadius: 35, backgroundColor: colors.accentBg },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarWrap: { position: 'relative' },
    avatarInner: {
      width: 46, height: 46, borderRadius: 999,
      backgroundColor: colors.accent,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: colors.accentBorder,
    },
    avatarMonogram: { fontSize: 14, fontFamily: Fonts.extraBold, color: colors.textPrimary, letterSpacing: 0.5 },
    avatarOnline: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface },
    headerTitle: { fontSize: 16, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 2 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
    statusText: { fontSize: 11, color: colors.textSecondary, fontFamily: Fonts.semiBold },
    headerBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderWidth: 1, borderColor: colors.accentBorder,
      borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6,
      backgroundColor: colors.accentBg,
    },
    headerBadgeIcon: { fontSize: 10, color: colors.accent },
    headerBadgeText: { fontSize: 11, color: colors.textPrimary, fontFamily: Fonts.semiBold, letterSpacing: 0.3 },

    messages: { flex: 1 },
    messagesContent: { padding: 16, gap: 4, paddingBottom: 8 },

    bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
    bubbleWrapUser: { justifyContent: 'flex-end' },
    bubbleWrapAI: { justifyContent: 'flex-start' },
    bubbleAvatar: {
      width: 30, height: 30, borderRadius: 999,
      backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colors.shadowOpacity, shadowRadius: 6, elevation: 3,
    },
    bubbleAvatarText: { fontSize: 9, fontFamily: Fonts.extraBold, color: colors.textPrimary, letterSpacing: 0.3 },
    bubble: { borderRadius: 20, padding: 14 },
    bubbleUser: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
    bubbleAI: {
      backgroundColor: colors.inputBg, borderBottomLeftRadius: 6,
      borderWidth: 1, borderColor: colors.cardBorder,
      shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colors.shadowOpacity, shadowRadius: 8, elevation: 3,
    },
    bubbleText: { fontSize: 14, lineHeight: 22 },
    bubbleTextUser: { color: colors.textPrimary, fontFamily: Fonts.semiBold },
    bubbleTextAI: { color: colors.textPrimary, fontFamily: Fonts.medium },
    bubbleTime: { fontSize: 10, color: colors.textMuted, fontFamily: Fonts.medium, marginTop: 4, marginLeft: 4 },
    bubbleTimeUser: { textAlign: 'right', marginRight: 4 },


    quickWrap: { marginTop: 8 },
    quickLabel: { fontSize: 12, fontFamily: Fonts.bold, color: colors.textMuted, marginBottom: 10 },
    quickBtn: {
      backgroundColor: colors.card, borderRadius: 16, padding: 14,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderWidth: 1, borderColor: colors.inputBorder,
      shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colors.shadowOpacity, shadowRadius: 8, elevation: 2,
    },
    quickText: { fontSize: 13, color: colors.textPrimary, fontFamily: Fonts.bold, flex: 1 },
    quickArrow: { fontSize: 16, color: colors.accent, fontFamily: Fonts.bold },

    inputArea: {
      backgroundColor: colors.surface,
      padding: 12,
      paddingBottom: Platform.OS === 'ios' ? 28 : 12,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      borderWidth: 1, borderColor: colors.cardBorder,
      shadowColor: colors.shadow, shadowOffset: { width: 0, height: -4 },
      shadowOpacity: colors.shadowOpacity, shadowRadius: 16, elevation: 10,
    },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    input: {
      flex: 1, backgroundColor: colors.inputBg, borderRadius: 16,
      paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13,
      fontSize: 14, lineHeight: 20, color: colors.textPrimary, fontFamily: Fonts.semiBold,
      maxHeight: 100, borderWidth: 1, borderColor: colors.inputBorder,
      textAlignVertical: 'top',
    },
    sendBtn: {
      backgroundColor: colors.accent, borderRadius: 14,
      width: 46, height: 46, alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
      flexShrink: 0,
    },
    sendDisabled: { backgroundColor: colors.accentBg },
    sendIcon: { color: colors.textPrimary, fontSize: 20, fontFamily: Fonts.extraBold },

    retryBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.dangerBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.dangerBorder },
    retryText: { fontSize: 12, fontFamily: Fonts.extraBold, color: colors.danger },

    copiedBadge: { position: 'absolute', top: -22, alignSelf: 'center', backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    copiedText: { fontSize: 11, fontFamily: Fonts.bold, color: '#fff' },

    historyErrBanner: { margin: 12, padding: 12, borderRadius: 14, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder, flexDirection: 'row', alignItems: 'center', gap: 8 },
    historyErrText: { flex: 1, fontSize: 12, fontFamily: Fonts.semiBold, color: colors.danger },
  });

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerOrb1} />
        <View style={styles.headerOrb2} />
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarMonogram}>FM</Text>
            </View>
            <View style={styles.avatarOnline} />
          </View>
          <View>
            <Text style={styles.headerTitle}>FinMate AI</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Đang hoạt động</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeIcon}>✦</Text>
          <Text style={styles.headerBadgeText}>Trợ lý tài chính</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={10}
      >
        {/* MESSAGES */}
        {historyLoading ? <ChatSkeleton /> : <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={e => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            isNearBottom.current = contentSize.height - layoutMeasurement.height - contentOffset.y < 60;
          }}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (isNearBottom.current) scrollRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {historyError && (
            <View style={styles.historyErrBanner}>
              <Text style={{ fontSize: 16 }}>⚠️</Text>
              <Text style={styles.historyErrText}>Không tải được lịch sử chat. Kiểm tra kết nối và thử lại.</Text>
            </View>
          )}

          {messages.map(msg => (
            <View key={msg.id} style={[
              styles.bubbleWrap,
              msg.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAI
            ]}>
              {msg.role === 'assistant' && (
                <View style={styles.bubbleAvatar}>
                  <Text style={styles.bubbleAvatarText}>FM</Text>
                </View>
              )}
              <View style={{ maxWidth: '75%' }}>
                <View style={{ position: 'relative' }}>
                  {copiedId === msg.id && (
                    <View style={styles.copiedBadge}>
                      <Text style={styles.copiedText}>Đã sao chép</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onLongPress={() => copyMsg(msg.id, msg.text)}
                    style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}
                  >
                    <Text style={[
                      styles.bubbleText,
                      msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI
                    ]}>
                      {msg.text}
                    </Text>
                  </TouchableOpacity>
                </View>
                {msg.isError && msg.retryText && (
                  <TouchableOpacity style={styles.retryBtn} onPress={() => send(msg.retryText!)}>
                    <Text style={styles.retryText}>↺ Thử lại</Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.bubbleTime, msg.role === 'user' && styles.bubbleTimeUser]}>
                  {fmtTime(msg.timestamp)}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={[styles.bubbleWrap, styles.bubbleWrapAI]}>
              <View style={styles.bubbleAvatar}>
                <Text style={styles.bubbleAvatarText}>FM</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleAI]}>
                <TypingIndicator />
              </View>
            </View>
          )}

          {messages.length === 1 && !loading && (
            <View style={styles.quickWrap}>
              <Text style={styles.quickLabel}>Hỏi nhanh</Text>
              {QUICK_PROMPTS.map(q => (
                <TouchableOpacity key={q.prompt} style={styles.quickBtn} onPress={() => send(q.prompt)}>
                  <Text style={styles.quickText}>{q.emoji} {q.label}</Text>
                  <Text style={styles.quickArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>}

        {/* INPUT BAR */}
        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Hỏi về tài chính của bạn..."
              placeholderTextColor={colors.textMuted}
              multiline
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={() => send(input)}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendDisabled]}
              onPress={() => send(input)}
              disabled={!input.trim() || loading}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

