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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
      {/* Full-screen gradient background */}
      <LinearGradient
        colors={['#FFD000', '#FFE234', '#FFF8DC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* HEADER */}
        <BlurView intensity={60} tint="light" style={styles.header}>
          <View style={styles.headerOverlay} pointerEvents="none" />
          <View style={styles.orb1} pointerEvents="none" />
          <View style={styles.orb2} pointerEvents="none" />
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
              selectionColor={colors.textPrimary}
              autoFocus
            />
            <Text style={styles.currency}>₫</Text>
          </View>
          {amount > 0 && (
            <Text style={styles.amountPreview}>{formatVND(amount)}</Text>
          )}
          <Text style={styles.amountHint}>Nhập số tiền (VD: 50k, 1.5tr)</Text>
        </BlurView>

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
            {categories.map(cat => {
              const selected = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.pill, selected && styles.pillActive]}
                  onPress={() => setCategory(cat.id)}
                >
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.pillIcon}>{cat.emoji}</Text>
                  <Text style={[styles.pillLabel, selected && styles.pillLabelActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteText}>Xóa giao dịch</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  orb1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.18)', top: -60, right: -40 },
  orb2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)', top: 30, right: 80 },

  header: {
    paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,220,0,0.35)',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backBtn: {},
  backText: { fontSize: 13, color: colors.textPrimary, fontFamily: Fonts.bold },
  headerTitle: { fontSize: 26, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 20 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  amountInput: { fontSize: 44, fontFamily: Fonts.extraBold, color: colors.textPrimary, flex: 1, letterSpacing: -1, padding: 0 },
  currency: { fontSize: 24, fontFamily: Fonts.extraBold, color: colors.textMuted, marginLeft: 6 },
  amountPreview: { fontSize: 14, color: colors.textPrimary, fontFamily: Fonts.bold, marginBottom: 4 },
  amountHint: { fontSize: 10, color: colors.textMuted, fontFamily: Fonts.medium },

  saveBtn: {
    backgroundColor: colors.card, borderRadius: 99,
    paddingHorizontal: 16, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(92,61,0,0.2)',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.textPrimary, fontSize: 13, fontFamily: Fonts.extraBold },

  body: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 20,
  },
  dateBtnIcon: { fontSize: 18 },
  dateBtnText: { flex: 1, fontSize: 14, fontFamily: Fonts.semiBold, color: colors.textPrimary },
  dateBtnArrow: { fontSize: 18, color: colors.textMuted, fontFamily: Fonts.bold },
  sectionLabel: { fontSize: 13, fontFamily: Fonts.extraBold, color: colors.textMuted, marginBottom: 10, marginTop: 4 },
  noteInput: {
    backgroundColor: colors.card, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, color: colors.textPrimary, fontFamily: Fonts.medium,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 20,
  },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.card, borderRadius: 99,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  pillActive: { backgroundColor: colors.card, borderColor: colors.accent, borderWidth: 2 },
  catDot: { width: 7, height: 7, borderRadius: 4 },
  pillIcon: { fontSize: 16 },
  pillLabel: { fontSize: 13, fontFamily: Fonts.bold, color: colors.textMuted },
  pillLabelActive: { color: colors.textPrimary },

  deleteBtn: { backgroundColor: colors.dangerBg, borderRadius: 99, paddingVertical: 14, alignItems: 'center', marginTop: 12, marginBottom: 40, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  deleteText: { fontSize: 15, color: colors.danger, fontFamily: Fonts.extraBold },
});
