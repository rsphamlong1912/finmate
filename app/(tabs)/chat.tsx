import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Fonts } from '../../constants/fonts';
import { useExpenses } from '../../hooks/useExpenses';
import { sendMessageToClaude, buildFinancialContext, Message } from '../../lib/claude';
import { supabase } from '../../lib/supabase';

type ChatMsg = { id: string; role: 'user' | 'assistant'; text: string; };

const QUICK_PROMPTS = [
  '📊 Phân tích chi tiêu tháng này',
  '💡 Gợi ý tiết kiệm cho tôi',
  '⚠️ Tôi đang tiêu quá tay không?',
  '🎯 Lập kế hoạch ngân sách',
];

export default function ChatScreen() {
  const { user, session } = useAuth();
  const { totalThisMonth, byCategory } = useExpenses(user?.id);
  const [messages, setMessages] = useState<ChatMsg[]>([{
    id: 'welcome', role: 'assistant',
    text: 'Xin chào! Tôi là FinMate của bạn 👋\n\nTôi có thể giúp bạn phân tích chi tiêu, lập ngân sách và đạt mục tiêu tiết kiệm. Hỏi tôi bất cứ điều gì!',
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

    const updated: Message[] = [...history, { role: 'user', content: text }];
    try {
      const ctx = buildFinancialContext({ totalThisMonth, byCategory, goals: [], currency: '₫' });
      const aiText = await sendMessageToClaude(updated, ctx, session?.access_token ?? '');
      const aiMsg: ChatMsg = { id: (Date.now() + 1).toString(), role: 'assistant', text: aiText };
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
        text: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại 🙏',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [loading, history, totalThisMonth, byCategory, session, user]);

  return (
    <View style={styles.root}>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrap}>
            <Text style={{ fontSize: 24 }}>💬</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>FinMate</Text>
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

      {/* KEYBOARD AVOIDING — chỉ bọc messages + input */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={30}
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
                  <Text style={{ fontSize: 14 }}>💬</Text>
                </View>
              )}
              <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
                <Text style={[
                  styles.bubbleText,
                  msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI
                ]}>
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={[styles.bubbleWrap, styles.bubbleWrapAI]}>
              <View style={styles.bubbleAvatar}>
                <Text style={{ fontSize: 14 }}>💬</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleAI, { paddingHorizontal: 20 }]}>
                <ActivityIndicator size="small" color="#6b4fa8" />
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

        {/* INPUT BAR — nằm trong KeyboardAvoidingView nên tự đẩy lên */}
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
    backgroundColor: '#3b1f6e',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
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
  messagesContent: { padding: 16, gap: 12, paddingBottom: 8 },

  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleWrapUser: { justifyContent: 'flex-end' },
  bubbleWrapAI: { justifyContent: 'flex-start' },
  bubbleAvatar: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  bubble: { maxWidth: '75%', borderRadius: 20, padding: 14 },
  bubbleUser: { backgroundColor: '#6b4fa8', borderBottomRightRadius: 6 },
  bubbleAI: {
    backgroundColor: '#fff', borderBottomLeftRadius: 6,
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  bubbleText: { fontSize: 14, lineHeight: 22 },
  bubbleTextUser: { color: '#fff', fontFamily: Fonts.semiBold },
  bubbleTextAI: { color: '#3b1f6e', fontFamily: Fonts.medium },

  quickWrap: { marginTop: 8, gap: 8 },
  quickLabel: { fontSize: 12, fontFamily: Fonts.bold, color: '#b0a3d4', marginBottom: 4 },
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
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 14, color: '#3b1f6e', fontFamily: Fonts.semiBold,
    maxHeight: 100, borderWidth: 2, borderColor: '#e4dff5',
  },
  sendBtn: {
    backgroundColor: '#6b4fa8', borderRadius: 14,
    width: 46, height: 46, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  sendDisabled: { backgroundColor: '#d4c9f0' },
  sendIcon: { color: '#fff', fontSize: 20, fontFamily: Fonts.extraBold },
});