import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Animated,
  KeyboardAvoidingView, Platform, ScrollView, Share
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Fonts } from '../../constants/fonts';
import { useExpenses } from '../../hooks/useExpenses';
import { useGoals } from '../../context/GoalsContext';
import { useProfile } from '../../context/ProfileContext';
import { sendMessageToClaude, buildFinancialContext, Message } from '../../lib/claude';
import { supabase } from '../../lib/supabase';
import { DEFAULT_CATEGORIES } from '../../types';

type ChatMsg = { id: string; role: 'user' | 'assistant'; text: string; timestamp?: Date; };

const QUICK_PROMPTS = [
  '📊 Phân tích chi tiêu tháng này',
  '💡 Gợi ý tiết kiệm cho tôi',
  '⚠️ Tôi đang tiêu quá tay không?',
  '🎯 Lập kế hoạch ngân sách',
];

/* ── Typing indicator — 3 chấm nhảy ── */
function TypingIndicator() {
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
    <View style={styles.typingWrap}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[styles.typingDot, { transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
}

export default function ChatScreen() {
  const { user, session } = useAuth();
  useExpenses(user?.id);
  const { goals } = useGoals();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<ChatMsg[]>([{
    id: 'welcome', role: 'assistant',
    text: 'Tớ đây! 🫡 Người bạn hiếm hoi không phán xét cậu tiêu nhiều. Cần giúp gì không?',
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const scrollRef = useRef<ScrollView>(null);

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
        return;
      }
      if (data && data.length > 0) {
        const welcome: ChatMsg = { id: 'welcome', role: 'assistant', text: 'Tớ đây! 🫡 Người bạn hiếm hoi không phán xét cậu tiêu nhiều. Cần giúp gì không?', timestamp: new Date() };
        setMessages([welcome, ...data.map(r => ({ id: r.id, role: r.role as 'user' | 'assistant', text: r.content, timestamp: new Date(r.created_at) }))]);
        setHistory(data.slice(-10).map(r => ({ role: r.role as 'user' | 'assistant', content: r.content })));
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
      }
    };
    load();
  }, [user?.id]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

    const updated: Message[] = [...history, { role: 'user', content: text }];
    try {
      const [{ data: freshExpenses }, { data: customCats }] = await Promise.all([
        supabase.from('expenses').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(50),
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
        budget: profile?.monthly_budget ?? 0,
        goals: goals.map(g => ({ title: g.title, saved: g.saved_amount, target: g.target_amount })),
        currency: '₫',
        recentExpenses: fresh.slice(0, 20).map(e => ({
          note: e.note,
          category: getCatName(e.category),
          amount: e.amount,
          date: e.created_at,
        })),
      });
      const aiText = await sendMessageToClaude(updated, ctx, session?.access_token ?? '');
      const aiMsg: ChatMsg = { id: (Date.now() + 1).toString(), role: 'assistant', text: aiText, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      setHistory([...updated, { role: 'assistant', content: aiText }]);
      if (user?.id) {
        await supabase.from('chat_messages').insert([
          { user_id: user.id, role: 'user', content: text },
          { user_id: user.id, role: 'assistant', content: aiText },
        ]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        text: 'Xin lỗi, tớ đang gặp sự cố 😅 Cậu thử lại sau nhé!',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [loading, history, session, user, goals, profile]);

  const fmtTime = (d?: Date) => {
    if (!d) return '';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const copyMsg = (text: string) => {
    Share.share({ message: text });
  };

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
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
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
                <TouchableOpacity
                  activeOpacity={0.85}
                  onLongPress={() => copyMsg(msg.text)}
                  style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}
                >
                  <Text style={[
                    styles.bubbleText,
                    msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI
                  ]}>
                    {msg.text}
                  </Text>
                </TouchableOpacity>
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
                <TouchableOpacity key={q} style={styles.quickBtn} onPress={() => send(q)}>
                  <Text style={styles.quickText}>{q}</Text>
                  <Text style={styles.quickArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* INPUT BAR */}
        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Hỏi về tài chính của bạn..."
              placeholderTextColor="#c4b5fd"
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eeeaf8' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2d1660',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerOrb1: { position: 'absolute', top: -30, right: 60, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(107,79,168,0.5)' },
  headerOrb2: { position: 'absolute', top: 20, right: -20, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(196,181,253,0.15)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatarInner: {
    width: 46, height: 46, borderRadius: 15,
    backgroundColor: '#6b4fa8',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarMonogram: { fontSize: 14, fontFamily: Fonts.extraBold, color: '#fff', letterSpacing: 0.5 },
  avatarOnline: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4ade80', borderWidth: 2, borderColor: '#2d1660' },
  headerTitle: { fontSize: 16, fontFamily: Fonts.extraBold, color: '#fff', marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  statusText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: Fonts.semiBold },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerBadgeIcon: { fontSize: 10, color: '#c4b5fd' },
  headerBadgeText: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontFamily: Fonts.semiBold, letterSpacing: 0.3 },

  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 4, paddingBottom: 8 },

  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  bubbleWrapUser: { justifyContent: 'flex-end' },
  bubbleWrapAI: { justifyContent: 'flex-start' },
  bubbleAvatar: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#6b4fa8', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  bubbleAvatarText: { fontSize: 9, fontFamily: Fonts.extraBold, color: '#fff', letterSpacing: 0.3 },
  bubble: { borderRadius: 20, padding: 14 },
  bubbleUser: { backgroundColor: '#6b4fa8', borderBottomRightRadius: 6 },
  bubbleAI: {
    backgroundColor: '#fff', borderBottomLeftRadius: 6,
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  bubbleText: { fontSize: 14, lineHeight: 22 },
  bubbleTextUser: { color: '#fff', fontFamily: Fonts.semiBold },
  bubbleTextAI: { color: '#3b1f6e', fontFamily: Fonts.medium },
  bubbleTime: { fontSize: 10, color: '#b0a4d4', fontFamily: Fonts.medium, marginTop: 4, marginLeft: 4 },
  bubbleTimeUser: { textAlign: 'right', marginRight: 4 },

  typingWrap: { flexDirection: 'row', gap: 5, paddingVertical: 4, paddingHorizontal: 2 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6b4fa8' },

  quickWrap: { marginTop: 8 },
  quickLabel: { fontSize: 12, fontFamily: Fonts.bold, color: '#c4b5fd', marginBottom: 10 },
  quickBtn: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderColor: '#e4dff5',
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  quickText: { fontSize: 13, color: '#3b1f6e', fontFamily: Fonts.bold, flex: 1 },
  quickArrow: { fontSize: 16, color: '#6b4fa8', fontFamily: Fonts.bold },

  inputArea: {
    backgroundColor: '#fff',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 10,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: {
    flex: 1, backgroundColor: '#f5f3ff', borderRadius: 16,
    paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13,
    fontSize: 14, lineHeight: 20, color: '#3b1f6e', fontFamily: Fonts.semiBold,
    maxHeight: 100, borderWidth: 2, borderColor: '#e4dff5',
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: '#6b4fa8', borderRadius: 14,
    width: 46, height: 46, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    flexShrink: 0,
  },
  sendDisabled: { backgroundColor: '#d4c9f0' },
  sendIcon: { color: '#fff', fontSize: 20, fontFamily: Fonts.extraBold },
});
