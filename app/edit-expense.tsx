import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Platform, ScrollView
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DatePickerModal } from '../components/DatePickerModal';
import { Fonts } from '../constants/fonts';
import { useExpenses } from '../context/ExpensesContext';
import { useCategories } from '../context/CategoriesContext';
import { formatVND, parseVND } from '../lib/vnd';
import { useTheme } from '../context/ThemeContext';

export default function EditExpenseScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id, amount: initAmount, category: initCategory, note: initNote, date: initDate } = useLocalSearchParams<{
    id: string; amount: string; category: string; note: string; date: string;
  }>();

  const { updateExpense, deleteExpense } = useExpenses();
  const { categories } = useCategories();

  const [rawInput, setRawInput] = useState(initAmount ?? '');
  const [category, setCategory] = useState(initCategory ?? 'food');
  const [note, setNote] = useState(initNote ?? '');
  const [date, setDate] = useState(initDate ? new Date(initDate) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const amount = parseVND(rawInput);

  const handleDelete = () => {
    Alert.alert('Xóa giao dịch', 'Bạn có chắc muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { await deleteExpense(id); router.back(); } },
    ]);
  };

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }
    setSaving(true);
    const { error } = await updateExpense(id, { amount, category, note, created_at: date.toISOString() });
    setSaving(false);
    if (error) Alert.alert('Lỗi', 'Không thể lưu. Thử lại nhé!');
    else router.back();
  };

  const styles = makeStyles(colors);

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
            <TouchableOpacity
              style={[styles.saveBtn, (!amount || saving) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!amount || saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Đang lưu...' : 'Lưu'}</Text>
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
              placeholderTextColor={colors.textMuted}
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
          <Text style={styles.sectionLabel}>Tên chi tiêu</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Ví dụ: Cà phê Highland, Grab về nhà..."
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.sectionLabel}>Ngày</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateBtnIcon}>📅</Text>
            <Text style={styles.dateBtnText}>
              {date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}
            </Text>
            <Text style={styles.dateBtnArrow}>›</Text>
          </TouchableOpacity>
          <DatePickerModal
            visible={showDatePicker}
            value={date}
            maximumDate={new Date()}
            onConfirm={(d) => { setDate(d); setShowDatePicker(false); }}
            onClose={() => setShowDatePicker(false)}
          />

          <Text style={styles.sectionLabel}>Danh mục</Text>
          <View style={styles.pillsWrap}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.pill, category === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => setCategory(cat.id)}
              >
                <Text style={styles.pillIcon}>{cat.emoji}</Text>
                <Text style={[styles.pillLabel, category === cat.id && styles.pillLabelActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteText}>Xóa</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.surface,
    paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerCircle: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(129,140,248,0.08)' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backBtn: {},
  backText: { fontSize: 13, color: colors.textSecondary, fontFamily: Fonts.bold },
  deleteBtn: { backgroundColor: colors.dangerBg, borderRadius: 99, paddingVertical: 14, alignItems: 'center', marginTop: 12, marginBottom: 40, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  deleteText: { fontSize: 15, color: colors.danger, fontFamily: Fonts.extraBold },
  headerTitle: { fontSize: 26, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 20 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  amountInput: { fontSize: 44, fontFamily: Fonts.extraBold, color: colors.textPrimary, flex: 1, letterSpacing: -1, padding: 0 },
  currency: { fontSize: 24, fontFamily: Fonts.extraBold, color: colors.textMuted, marginLeft: 6 },
  amountPreview: { fontSize: 14, color: colors.accent, fontFamily: Fonts.bold, marginBottom: 4 },
  amountHint: { fontSize: 10, color: colors.textMuted, fontFamily: Fonts.medium },

  body: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.inputBg, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 1, borderColor: colors.inputBorder, marginBottom: 20,
  },
  dateBtnIcon: { fontSize: 18 },
  dateBtnText: { flex: 1, fontSize: 14, fontFamily: Fonts.semiBold, color: colors.textPrimary },
  dateBtnArrow: { fontSize: 18, color: colors.textMuted, fontFamily: Fonts.bold },
  sectionLabel: { fontSize: 13, fontFamily: Fonts.extraBold, color: colors.textMuted, marginBottom: 10, marginTop: 4 },
  noteInput: {
    backgroundColor: colors.inputBg, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, color: colors.textPrimary, fontFamily: Fonts.medium,
    borderWidth: 1, borderColor: colors.inputBorder, marginBottom: 20,
  },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.card, borderRadius: 99,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillIcon: { fontSize: 16 },
  pillLabel: { fontSize: 13, fontFamily: Fonts.bold, color: colors.accent },
  pillLabelActive: { color: colors.textPrimary },
  saveBtn: {
    backgroundColor: colors.accentBg, borderRadius: 99,
    paddingHorizontal: 16, paddingVertical: 7,
    borderWidth: 1, borderColor: colors.accentBorder,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.textPrimary, fontSize: 13, fontFamily: Fonts.extraBold },
});
