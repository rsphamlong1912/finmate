import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../hooks/useAuth';
import { parseVND, formatVND } from '../lib/vnd';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markOnboardingDone } from './_layout';

const QUICK_BUDGETS = [
  { label: '5tr', value: 5_000_000 },
  { label: '10tr', value: 10_000_000 },
  { label: '15tr', value: 15_000_000 },
  { label: '20tr', value: 20_000_000 },
  { label: '30tr', value: 30_000_000 },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [budgetInput, setBudgetInput] = useState('10000000');
  const [finishing, setFinishing] = useState(false);
  const { updateDisplayName, updateBudget, checkAndUpdateStreak } = useProfile();
  const { user } = useAuth();
  const router = useRouter();

  const budget = parseVND(budgetInput) || 10_000_000;

  const handleFinish = async () => {
    if (finishing) return; // chống bấm 2 lần
    setFinishing(true);
    try {
      if (name.trim()) await updateDisplayName(name.trim());
      await updateBudget(budget);
      await checkAndUpdateStreak();
      await AsyncStorage.setItem(`onboarding_done_${user?.id}`, 'true');
      markOnboardingDone();
      router.replace('/(tabs)');
    } catch (e) {
      setFinishing(false);
    }
  };

  return (
    <View style={styles.root}>

      {/* ── STEP 1 — Welcome ── */}
      {step === 0 && (
        <View style={styles.fullScreen}>
          <View style={styles.topDark}>
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <Text style={styles.bigIcon}>💰</Text>
            <Text style={styles.mainTitle}>Chào mừng đến{'\n'}FinMate</Text>
            <Text style={styles.mainSub}>Trợ lý tài chính thông minh{'\n'}dành riêng cho bạn</Text>
          </View>
          <View style={styles.body}>
            <Dots total={4} current={0} />
            <View style={styles.featList}>
              {[
                { icon: '📊', text: 'Theo dõi chi tiêu tự động' },
                { icon: '🎯', text: 'Đặt mục tiêu tiết kiệm' },
                { icon: '🔥', text: 'Streak hàng ngày động lực' },
              ].map(f => (
                <View key={f.text} style={styles.featRow}>
                  <Text style={styles.featIcon}>{f.icon}</Text>
                  <Text style={styles.featText}>{f.text}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(1)}>
              <Text style={styles.nextBtnText}>Bắt đầu →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── STEP 2 — Tên ── */}
      {step === 1 && (
        <View style={styles.fullScreen}>
          <View style={styles.topPurple}>
            <View style={styles.circle1} />
            <Text style={styles.bigIcon}>👋</Text>
            <Text style={styles.mainTitle}>Bạn tên gì?</Text>
            <Text style={styles.mainSub}>Để app gọi tên bạn{'\n'}thân thiện hơn</Text>
          </View>
          <View style={styles.body}>
            <Dots total={4} current={1} />
            <Text style={styles.inputLabel}>Tên của bạn</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="VD: Long, Minh, Hương..."
              placeholderTextColor="#c4b5fd"
              autoCapitalize="words"
              autoFocus
            />
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
              <Text style={styles.nextBtnText}>Tiếp theo →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={() => setStep(2)}>
              <Text style={styles.skipText}>Bỏ qua</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── STEP 3 — Ngân sách ── */}
      {step === 2 && (
        <View style={styles.fullScreen}>
          <View style={styles.topPurple}>
            <View style={styles.circle1} />
            <Text style={styles.bigIcon}>💵</Text>
            <Text style={styles.mainTitle}>Ngân sách tháng?</Text>
            <Text style={styles.mainSub}>Nhập số tiền bạn muốn{'\n'}chi tiêu mỗi tháng</Text>
            <View style={styles.amountRow}>
              <TextInput
                style={styles.amountInput}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.3)"
                selectTextOnFocus
              />
              <Text style={styles.amountCurrency}>₫</Text>
            </View>
            {budget > 0 && (
              <Text style={styles.amountPreview}>{formatVND(budget)}/tháng</Text>
            )}
          </View>
          <View style={styles.body}>
            <Dots total={4} current={2} />
            <Text style={styles.quickLabel}>Gợi ý nhanh</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickScroll}
              contentContainerStyle={styles.quickRow}
            >
              {QUICK_BUDGETS.map(q => (
                <TouchableOpacity
                  key={q.label}
                  style={[styles.quickBtn, budget === q.value && styles.quickBtnActive]}
                  onPress={() => setBudgetInput(q.value.toString())}
                >
                  <Text style={[styles.quickBtnText, budget === q.value && styles.quickBtnTextActive]}>
                    {q.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(3)}>
              <Text style={styles.nextBtnText}>Tiếp theo →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={() => setStep(3)}>
              <Text style={styles.skipText}>Bỏ qua, dùng mặc định 10tr</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── STEP 4 — Sẵn sàng ── */}
      {step === 3 && (
        <View style={styles.fullScreen}>
          <View style={styles.topDark}>
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <Text style={styles.bigIcon}>🚀</Text>
            <Text style={styles.mainTitle}>
              {name.trim() ? `Xin chào, ${name.trim()}!` : 'Sẵn sàng rồi!'}
            </Text>
            <Text style={styles.mainSub}>Bắt đầu hành trình tài chính{'\n'}thông minh của bạn</Text>
          </View>
          <View style={styles.body}>
            <Dots total={4} current={3} />
            <View style={styles.summaryCard}>
              {name.trim() && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>✅</Text>
                  <Text style={styles.summaryText}>Tên: {name.trim()}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryIcon}>✅</Text>
                <Text style={styles.summaryText}>Ngân sách: {formatVND(budget)}/tháng</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryIcon}>🔥</Text>
                <Text style={styles.summaryText}>Streak ngày 1 — bắt đầu thôi!</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.nextBtn, finishing && { opacity: 0.6 }]}
              onPress={handleFinish}
              disabled={finishing}
            >
              <Text style={styles.nextBtnText}>
                {finishing ? 'Đang vào app...' : 'Vào app ngay! 🎉'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </View>
  );
}

function Dots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eeeaf8' },
  fullScreen: { flex: 1 },

  topDark: {
    backgroundColor: '#1a0a3c',
    paddingTop: 72, paddingBottom: 40, paddingHorizontal: 32,
    alignItems: 'center', overflow: 'hidden',
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  topPurple: {
    backgroundColor: '#3b1f6e',
    paddingTop: 72, paddingBottom: 32, paddingHorizontal: 32,
    alignItems: 'center', overflow: 'hidden',
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  circle1: { position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)' },
  circle2: { position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },

  bigIcon: { fontSize: 60, marginBottom: 14 },
  mainTitle: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 34, marginBottom: 10, letterSpacing: -0.5 },
  mainSub: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, fontWeight: '500' },

  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    width: '100%', marginTop: 16,
  },
  amountInput: { fontSize: 26, fontWeight: '900', color: '#fff', flex: 1 },
  amountCurrency: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  amountPreview: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 8 },

  body: { flex: 1, backgroundColor: '#eeeaf8', padding: 24, paddingTop: 20 },

  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 24 },
  dot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#d4c9f0' },
  dotActive: { width: 22, backgroundColor: '#6b4fa8' },

  featList: { gap: 12, marginBottom: 28 },
  featRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  featIcon: { fontSize: 26 },
  featText: { fontSize: 15, fontWeight: '700', color: '#3b1f6e' },

  inputLabel: { fontSize: 13, fontWeight: '700', color: '#6b4fa8', marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    fontSize: 20, color: '#3b1f6e', fontWeight: '700',
    borderWidth: 2, borderColor: '#e4dff5', marginBottom: 20,
  },

  quickLabel: { fontSize: 12, fontWeight: '700', color: '#9b8cc4', marginBottom: 10 },
  quickScroll: { marginBottom: 20 },
  quickRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  quickBtn: {
    backgroundColor: '#fff', borderRadius: 99,
    paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 2, borderColor: '#e4dff5',
    height: 42, justifyContent: 'center',
  },
  quickBtnActive: { backgroundColor: '#6b4fa8', borderColor: '#6b4fa8' },
  quickBtnText: { fontSize: 14, fontWeight: '700', color: '#6b4fa8' },
  quickBtnTextActive: { color: '#fff' },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    gap: 14, marginBottom: 28,
    shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: { fontSize: 22 },
  summaryText: { fontSize: 15, fontWeight: '600', color: '#3b1f6e' },

  nextBtn: {
    backgroundColor: '#6b4fa8', borderRadius: 18, paddingVertical: 17,
    alignItems: 'center', shadowColor: '#6b4fa8',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3,
    shadowRadius: 14, elevation: 8, marginBottom: 12,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontSize: 13, color: '#b0a3d4', fontWeight: '600' },
});