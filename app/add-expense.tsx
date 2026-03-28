import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Platform, ScrollView, Modal
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Fonts } from '../constants/fonts';
import { useExpenses } from '../context/ExpensesContext';
import { useCategories } from '../context/CategoriesContext';
import { formatVND, parseVND } from '../lib/vnd';
import { useTheme } from '../context/ThemeContext';

const QUICK_AMOUNTS = [
  { label: '20k', value: 20_000 },
  { label: '50k', value: 50_000 },
  { label: '100k', value: 100_000 },
  { label: '200k', value: 200_000 },
  { label: '500k', value: 500_000 },
  { label: '1tr', value: 1_000_000 },
];

const EMOJI_OPTIONS = [
  // Ăn uống
  '🍜','🍕','🍔','🍣','🍱','🥗','🍦','🧋','☕','🍺','🍷','🥤','🧃','🍰','🥩',
  // Di chuyển
  '🚗','✈️','🚇','🚌','🛵','🚲','🚢','🚁','⛽',
  // Mua sắm
  '🛍','👗','👟','💍','🛒','👜','🧢','💄',
  // Nhà & Hóa đơn
  '🏠','💡','🔌','💧','📺','🛋️','🔧','🧹',
  // Sức khỏe
  '💊','🏋️','🧘','🏃','🩺','🦷','🧪','😷',
  // Giải trí
  '🎮','🎵','🎬','🎭','🎯','🎲','🎸','⚽','🏀','🎾','🏊',
  // Học tập & Công việc
  '🎓','📚','✏️','🖥️','📝','💼',
  // Chăm sóc cá nhân
  '🧴','💇','💅','🛁',
  // Thú cưng
  '🐾','🐕','🐈',
  // Khác
  '📦','🌿','💪','🎁','📱','💰','🏖️','🍀','🎀','🪴','🕯️',
];
const COLOR_OPTIONS = [
  '#E8593C','#C0392B','#E91E63','#D4537E',
  '#9C27B0','#8E44AD','#7F77DD','#3F51B5',
  '#378ADD','#0288D1','#16A085','#1D9E75',
  '#4CAF50','#8BC34A','#BA7517','#E67E22',
  '#FF9800','#FFC107','#888780','#607D8B',
  '#2C3E50','#795548','#F06292','#26C6DA',
];

export default function AddExpenseScreen() {
  const { colors } = useTheme();
  const [rawInput, setRawInput] = useState('');
  const [category, setCategory] = useState('food');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { addExpense } = useExpenses();
  const { categories, addCategory, deleteCategory } = useCategories();
  const router = useRouter();

  // New category modal
  const [showNewCat, setShowNewCat] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📌');
  const [newColor, setNewColor] = useState('#888780');
  const [savingCat, setSavingCat] = useState(false);

  const usedColors = new Set(categories.map(c => c.color));

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

  const handleDeleteCategory = (cat: { id: string; name: string; is_default: boolean }) => {
    if (cat.is_default) return;
    Alert.alert('Xóa danh mục', `Xóa "${cat.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        if (category === cat.id) setCategory('other');
        await deleteCategory(cat.id);
      }},
    ]);
  };

  const handleAddCategory = async () => {
    if (!newName.trim()) return;
    setSavingCat(true);
    const { error } = await addCategory({ name: newName.trim(), emoji: newEmoji, color: newColor });
    setSavingCat(false);
    if (error) { Alert.alert('Lỗi', 'Không thể tạo danh mục'); return; }
    setShowNewCat(false);
    setNewName('');
    setNewEmoji('📌');
    setNewColor(COLOR_OPTIONS.find(c => !usedColors.has(c)) ?? COLOR_OPTIONS[0]);
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
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thêm chi tiêu</Text>

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
          <Text style={styles.sectionLabel}>Tên chi tiêu</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="VD: Cà phê, Grab về nhà..."
            placeholderTextColor={colors.textMuted}
            numberOfLines={1}
          />

          <Text style={styles.sectionLabel}>Danh mục</Text>
          <View style={styles.pillsWrap}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.pill, category === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => setCategory(cat.id)}
                onLongPress={() => handleDeleteCategory(cat)}
              >
                <Text style={styles.pillIcon}>{cat.emoji}</Text>
                <Text style={[styles.pillLabel, category === cat.id && styles.pillLabelActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.pillNew} onPress={() => {
              setNewColor(COLOR_OPTIONS.find(c => !usedColors.has(c)) ?? COLOR_OPTIONS[0]);
              setShowNewCat(true);
            }}>
              <Text style={styles.pillNewText}>+ Tạo mới</Text>
            </TouchableOpacity>
          </View>

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

      {/* ── MODAL TẠO DANH MỤC ── */}
      <Modal visible={showNewCat} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNewCat(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Tạo danh mục mới</Text>

          <View style={styles.modalPreview}>
            <Text style={{ fontSize: 28 }}>{newEmoji}</Text>
            <Text style={[styles.modalPreviewName, { color: newColor }]}>{newName || 'Tên danh mục'}</Text>
          </View>

          <TextInput
            style={styles.modalInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Tên danh mục..."
            placeholderTextColor={colors.textMuted}
            maxLength={20}
          />

          <Text style={styles.modalSub}>Chọn icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, newEmoji === e && styles.emojiBtnActive]}
                  onPress={() => setNewEmoji(e)}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.modalSub}>Chọn màu</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.filter(c => !usedColors.has(c)).map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, newColor === c && styles.colorDotActive]}
                onPress={() => setNewColor(c)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.modalSaveBtn, (!newName.trim() || savingCat) && styles.saveBtnDisabled]}
            onPress={handleAddCategory}
            disabled={!newName.trim() || savingCat}
          >
            <Text style={styles.saveBtnText}>{savingCat ? 'Đang lưu...' : 'Tạo danh mục'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  headerCircle: {
    position: 'absolute', top: -50, right: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(129,140,248,0.08)',
  },
  backBtn: { marginBottom: 10 },
  backText: { fontSize: 13, color: colors.textSecondary, fontFamily: Fonts.bold },
  headerTitle: { fontSize: 26, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 20 },

  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  amountInput: {
    fontSize: 44, fontFamily: Fonts.extraBold, color: colors.textPrimary,
    flex: 1, letterSpacing: -1, paddingVertical: 6, paddingHorizontal: 0,
    includeFontPadding: false,
  },
  currency: { fontSize: 24, fontFamily: Fonts.extraBold, color: colors.textMuted, marginLeft: 6 },
  amountPreview: { fontSize: 14, color: colors.accent, fontFamily: Fonts.bold, marginBottom: 4 },
  amountHint: { fontSize: 10, color: colors.textMuted, fontFamily: Fonts.medium, marginBottom: 14 },

  quickRow: { flexDirection: 'row', gap: 7, paddingBottom: 4 },
  quickBtn: {
    backgroundColor: colors.inputBg,
    borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: colors.inputBorder,
  },
  quickBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  quickBtnText: { fontSize: 12, color: colors.textPrimary, fontFamily: Fonts.extraBold },
  quickBtnTextActive: { color: colors.textPrimary },

  body: { flex: 1, backgroundColor: colors.bg, padding: 20 },

  sectionLabel: {
    fontSize: 13, fontFamily: Fonts.extraBold, color: colors.textMuted,
    marginBottom: 10, marginTop: 4,
  },

  noteInput: {
    backgroundColor: colors.inputBg, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, color: colors.textPrimary, fontFamily: Fonts.medium,
    borderWidth: 1, borderColor: colors.inputBorder,
    marginBottom: 20,
  },

  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.card, borderRadius: 99,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.cardBorder,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  pillIcon: { fontSize: 16 },
  pillLabel: { fontSize: 13, fontFamily: Fonts.bold, color: colors.accent },
  pillLabelActive: { color: colors.textPrimary },
  pillNew: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'transparent', borderRadius: 99,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.accentBorder, borderStyle: 'dashed',
  },
  pillNewText: { fontSize: 13, fontFamily: Fonts.bold, color: colors.accent },

  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 18,
    paddingVertical: 17, alignItems: 'center',
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: colors.textPrimary, fontSize: 16, fontFamily: Fonts.extraBold },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.accentBorder,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 16 },
  modalPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  modalPreviewName: { fontSize: 18, fontFamily: Fonts.bold },
  modalInput: {
    backgroundColor: colors.inputBg, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: colors.textPrimary, fontFamily: Fonts.medium,
    marginBottom: 16, borderWidth: 1, borderColor: colors.inputBorder,
  },
  modalSub: { fontSize: 12, fontFamily: Fonts.extraBold, color: colors.accent, marginBottom: 8 },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card,
  },
  emojiBtnActive: { backgroundColor: colors.accentBg, borderWidth: 2, borderColor: colors.accent },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: colors.accent },
  modalSaveBtn: {
    backgroundColor: colors.accent, borderRadius: 18,
    paddingVertical: 15, alignItems: 'center',
  },
});
