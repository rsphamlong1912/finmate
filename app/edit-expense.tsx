import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Platform, ScrollView
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

export default function EditExpenseScreen() {
  const router = useRouter();
  const { id, amount: initAmount, category: initCategory, note: initNote } = useLocalSearchParams<{
    id: string; amount: string; category: string; note: string;
  }>();

  const { updateExpense, deleteExpense } = useExpenses();

  const [rawInput, setRawInput] = useState(initAmount ?? '');
  const [category, setCategory] = useState<ExpenseCategory>((initCategory as ExpenseCategory) ?? 'food');
  const [note, setNote] = useState(initNote ?? '');
  const [saving, setSaving] = useState(false);

  const amount = parseVND(rawInput);

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }
    setSaving(true);
    const { error } = await updateExpense(id, { amount, category, note });
    setSaving(false);
    if (error) Alert.alert('Lỗi', 'Không thể lưu. Thử lại nhé!');
    else router.back();
  };

  const handleDelete = () => {
    Alert.alert('Xóa giao dịch', 'Bạn có chắc muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          await deleteExpense(id);
          router.back();
        }
      },
    ]);
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
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerCircle} />
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>🗑 Xóa</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Sửa chi tiêu</Text>

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
        </View>

        {/* BODY */}
        <View style={styles.body}>
          <Text style={styles.sectionLabel}>Ghi chú</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Mô tả chi tiêu (tùy chọn)..."
            placeholderTextColor="#c4b5fd"
          />

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

          <TouchableOpacity
            style={[styles.saveBtn, (!amount || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!amount || saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Đang lưu...' : `Lưu ${formatVND(amount)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3b1f6e' },
  header: {
    backgroundColor: '#3b1f6e',
    paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerCircle: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backBtn: {},
  backText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  deleteBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  deleteText: { fontSize: 12, color: '#fca5a5', fontWeight: '700' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 20 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  amountInput: { fontSize: 44, fontWeight: '900', color: '#fff', flex: 1, letterSpacing: -1, padding: 0 },
  currency: { fontSize: 24, fontWeight: '900', color: 'rgba(255,255,255,0.5)', marginLeft: 6 },
  amountPreview: { fontSize: 14, color: '#c4b5fd', fontWeight: '700', marginBottom: 4 },
  amountHint: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },

  body: { flex: 1, backgroundColor: '#eeeaf8', padding: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#3b1f6e', marginBottom: 10, marginTop: 4 },
  noteInput: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, color: '#3b1f6e', fontWeight: '500',
    borderWidth: 1.5, borderColor: '#e4dff5', marginBottom: 20,
  },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', borderRadius: 99,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: '#e4dff5',
  },
  pillActive: { backgroundColor: '#6b4fa8', borderColor: '#6b4fa8' },
  pillIcon: { fontSize: 16 },
  pillLabel: { fontSize: 13, fontWeight: '700', color: '#6b4fa8' },
  pillLabelActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#3b1f6e', borderRadius: 18,
    paddingVertical: 17, alignItems: 'center',
    shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});