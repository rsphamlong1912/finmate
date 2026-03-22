import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Platform, ScrollView
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { Fonts } from '../constants/fonts';
import { useExpenses } from '../context/ExpensesContext';
import { ExpenseCategory } from '../types';
import { formatVND, parseVND } from '../lib/vnd';

const CATEGORIES: { id: ExpenseCategory; icon: string; label: string }[] = [
  { id: 'food', icon: '🍜', label: 'Ăn uống' },
  { id: 'transport', icon: '🚗', label: 'Di chuyển' },
  { id: 'shopping', icon: '🛍', label: 'Mua sắm' },
  { id: 'bills', icon: '💡', label: 'Hóa đơn' },
  { id: 'health', icon: '💊', label: 'Sức khỏe' },
  { id: 'entertainment', icon: '🎮', label: 'Giải trí' },
  { id: 'other', icon: '📦', label: 'Khác' },
];

const QUICK_AMOUNTS = [
  { label: '20k', value: 20_000 },
  { label: '50k', value: 50_000 },
  { label: '100k', value: 100_000 },
  { label: '200k', value: 200_000 },
  { label: '500k', value: 500_000 },
  { label: '1tr', value: 1_000_000 },
];

export default function AddExpenseScreen() {
  const [rawInput, setRawInput] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { addExpense } = useExpenses(user?.id);
  const router = useRouter();

  const amount = parseVND(rawInput);

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ\nVí dụ: 50000, 50k, 1tr');
      return;
    }
    setSaving(true);
    const { error } = await addExpense({ amount, category, note });
    setSaving(false);
    if (error) Alert.alert('Lỗi', 'Không thể lưu. Thử lại nhé!');
    else router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerCircle} />

          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thêm chi tiêu</Text>

          {/* Amount input */}
          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInput}
              value={rawInput}
              onChangeText={setRawInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus
            />
            <Text style={styles.currency}>₫</Text>
          </View>

          {amount > 0 && (
            <Text style={styles.amountPreview}>{formatVND(amount)}</Text>
          )}

          <Text style={styles.amountHint}>Nhập số tiền (VD: 50k, 1.5tr)</Text>

          {/* Quick amounts */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map(a => (
                <TouchableOpacity
                  key={a.label}
                  style={[styles.quickBtn, amount === a.value && styles.quickBtnActive]}
                  onPress={() => setRawInput(a.value.toString())}
                >
                  <Text style={[styles.quickBtnText, amount === a.value && styles.quickBtnTextActive]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* ── BODY ── */}
        <View style={styles.body}>

          {/* Note */}
          <Text style={styles.sectionLabel}>Ghi chú</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Mô tả chi tiêu (tùy chọn)..."
            placeholderTextColor="#c4b5fd"
          />

          {/* Category pills */}
          <Text style={styles.sectionLabel}>Danh mục</Text>
          <View style={styles.pillsWrap}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.pill, category === cat.id && styles.pillActive]}
                onPress={() => setCategory(cat.id)}
              >
                <Text style={styles.pillIcon}>{cat.icon}</Text>
                <Text style={[styles.pillLabel, category === cat.id && styles.pillLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, (!amount || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!amount || saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Đang lưu...' : amount > 0 ? `Lưu ${formatVND(amount)}` : 'Nhập số tiền'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3b1f6e' },

  /* HEADER */
  header: {
    backgroundColor: '#3b1f6e',
    paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute', top: -50, right: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { marginBottom: 10 },
  backText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.bold },
  headerTitle: { fontSize: 26, fontFamily: Fonts.extraBold, color: '#fff', marginBottom: 20 },

  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  amountInput: {
    fontSize: 44, fontFamily: Fonts.extraBold, color: '#fff',
    flex: 1, letterSpacing: -1, padding: 0,
  },
  currency: { fontSize: 24, fontFamily: Fonts.extraBold, color: 'rgba(255,255,255,0.5)', marginLeft: 6 },
  amountPreview: { fontSize: 14, color: '#c4b5fd', fontFamily: Fonts.bold, marginBottom: 4 },
  amountHint: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: Fonts.medium, marginBottom: 14 },

  quickRow: { flexDirection: 'row', gap: 7, paddingBottom: 4 },
  quickBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7,
  },
  quickBtnActive: { backgroundColor: '#fff' },
  quickBtnText: { fontSize: 12, color: '#fff', fontFamily: Fonts.extraBold },
  quickBtnTextActive: { color: '#3b1f6e' },

  /* BODY */
  body: { flex: 1, backgroundColor: '#eeeaf8', padding: 20 },

  sectionLabel: {
    fontSize: 13, fontFamily: Fonts.extraBold, color: '#3b1f6e',
    marginBottom: 10, marginTop: 4,
  },

  noteInput: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, color: '#3b1f6e', fontFamily: Fonts.medium,
    borderWidth: 1.5, borderColor: '#e4dff5',
    marginBottom: 20,
  },

  /* PILLS */
  pillsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', borderRadius: 99,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: '#e4dff5',
    shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  pillActive: {
    backgroundColor: '#6b4fa8', borderColor: '#6b4fa8',
  },
  pillIcon: { fontSize: 16 },
  pillLabel: { fontSize: 13, fontFamily: Fonts.bold, color: '#6b4fa8' },
  pillLabelActive: { color: '#fff' },

  /* SAVE */
  saveBtn: {
    backgroundColor: '#3b1f6e', borderRadius: 18,
    paddingVertical: 17, alignItems: 'center',
    shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: Fonts.extraBold },
});