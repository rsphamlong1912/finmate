import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Fonts } from '../constants/fonts';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../hooks/useAuth';
import { parseVND, formatVND } from '../lib/vnd';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markOnboardingDone } from './_layout';
import { useTheme } from '../context/ThemeContext';

const QUICK_BUDGETS = [
  { label: '5tr', value: 5_000_000 },
  { label: '10tr', value: 10_000_000 },
  { label: '15tr', value: 15_000_000 },
  { label: '20tr', value: 20_000_000 },
  { label: '30tr', value: 30_000_000 },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
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

  const styles = makeStyles(colors);

  return (
    <View style={styles.root}>

      {/* ── STEP 1 — Tên ── */}
      {step === 1 && (
        <View style={styles.fullScreen}>
          <View style={styles.topPurple}>
            <View style={styles.circle1} />
            <Text style={styles.bigIcon}>👋</Text>
            <Text style={styles.mainTitle}>Bạn tên gì?</Text>
            <Text style={styles.mainSub}>Để app gọi tên bạn{'\n'}thân thiện hơn</Text>
          </View>
          <View style={styles.body}>
            <Dots total={3} current={1} colors={colors} />
            <Text style={styles.inputLabel}>Tên của bạn</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="VD: Long, Minh, Hương..."
              placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
                selectTextOnFocus
              />
              <Text style={styles.amountCurrency}>₫</Text>
            </View>
            {budget > 0 && (
              <Text style={styles.amountPreview}>{formatVND(budget)}/tháng</Text>
            )}
          </View>
          <View style={styles.body}>
            <Dots total={3} current={2} colors={colors} />
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
            <Dots total={3} current={2} colors={colors} />
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

function Dots({ total, current, colors }: { total: number; current: number; colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors'] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[
          { width: 7, height: 7, borderRadius: 99, backgroundColor: colors.divider },
          i === current && { width: 22, backgroundColor: colors.accent }
        ]} />
      ))}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fullScreen: { flex: 1 },

  topDark: {
    backgroundColor: colors.surface,
    paddingTop: 72, paddingBottom: 40, paddingHorizontal: 32,
    alignItems: 'center', overflow: 'hidden',
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  topPurple: {
    backgroundColor: colors.surface,
    paddingTop: 72, paddingBottom: 32, paddingHorizontal: 32,
    alignItems: 'center', overflow: 'hidden',
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  circle1: { position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(129,140,248,0.08)' },
  circle2: { position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: colors.orb2 },

  bigIcon: { fontSize: 60, marginBottom: 14 },
  mainTitle: { fontSize: 28, fontFamily: Fonts.extraBold, color: colors.textPrimary, textAlign: 'center', lineHeight: 34, marginBottom: 10, letterSpacing: -0.5 },
  mainSub: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, fontFamily: Fonts.medium },

  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.inputBorder,
    width: '100%', marginTop: 16,
  },
  amountInput: { fontSize: 26, fontFamily: Fonts.extraBold, color: colors.textPrimary, flex: 1 },
  amountCurrency: { fontSize: 18, fontFamily: Fonts.bold, color: colors.textMuted },
  amountPreview: { fontSize: 12, color: colors.textSecondary, fontFamily: Fonts.semiBold, marginTop: 8 },

  body: { flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 20 },

  inputLabel: { fontSize: 13, fontFamily: Fonts.bold, color: colors.accent, marginBottom: 8 },
  input: {
    backgroundColor: colors.inputBg, borderRadius: 16, padding: 16,
    fontSize: 20, color: colors.textPrimary, fontFamily: Fonts.bold,
    borderWidth: 1, borderColor: colors.inputBorder, marginBottom: 20,
  },

  quickLabel: { fontSize: 12, fontFamily: Fonts.bold, color: colors.textMuted, marginBottom: 10 },
  quickScroll: { marginBottom: 20 },
  quickRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  quickBtn: {
    backgroundColor: colors.card, borderRadius: 99,
    paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.inputBorder,
    height: 42, justifyContent: 'center',
  },
  quickBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  quickBtnText: { fontSize: 14, fontFamily: Fonts.bold, color: colors.accent },
  quickBtnTextActive: { color: colors.textPrimary },

  summaryCard: {
    backgroundColor: colors.card, borderRadius: 20, padding: 20,
    gap: 14, marginBottom: 28,
    borderWidth: 1, borderColor: colors.cardBorder,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: { fontSize: 22 },
  summaryText: { fontSize: 15, fontFamily: Fonts.semiBold, color: colors.textPrimary },

  nextBtn: {
    backgroundColor: colors.accent, borderRadius: 18, paddingVertical: 17,
    alignItems: 'center', shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3,
    shadowRadius: 14, elevation: 8, marginBottom: 12,
  },
  nextBtnText: { color: colors.textPrimary, fontSize: 16, fontFamily: Fonts.extraBold },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontSize: 13, color: colors.textMuted, fontFamily: Fonts.semiBold },
});
