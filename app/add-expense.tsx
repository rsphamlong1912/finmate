import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView, Modal, Dimensions
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const EMOJI_BTN_SIZE = Math.floor((SCREEN_W - 48 - 4 * 8) / 5); // 5 cols, padding 24 each side
const COLOR_SWATCH_SIZE = Math.floor((SCREEN_W - 48 - 7 * 8) / 8); // 8 cols, 7 gaps of 8px
import { KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Fonts } from '../constants/fonts';
import { useExpenses } from '../context/ExpensesContext';
import { useCategories } from '../context/CategoriesContext';
import { formatVND } from '../lib/vnd';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ConfirmModal } from '../components/ConfirmModal';

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
  '#000000','#ba2716','#E91E63',
  '#9C27B0','#7F77DD','#3F51B5','#0288D1','#1D9E75','#8BC34A','#BA7517',
  '#FF9800','#FFC107','#888780','#607D8B',
  '#2C3E50','#795548','#F06292','#26C6DA',
  '#FF9CEE','#D5AAFF','#AFCBFF','#AFF8DB','#FFABAB','#FFF5BA',
];

export default function AddExpenseScreen() {
  const { colors } = useTheme();
  const [rawInput, setRawInput] = useState('');
  const [category, setCategory] = useState('food');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { addExpense, reassignCategory } = useExpenses();
  const { categories, addCategory, updateCategory, updateCategoryColor, deleteCategory } = useCategories();
  const router = useRouter();

  // New category modal
  const [showNewCat, setShowNewCat] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📌');
  const [newColor, setNewColor] = useState('#888780');
  const [savingCat, setSavingCat] = useState(false);

  // Edit category modal
  const [editingCat, setEditingCat] = useState<{ id: string; name: string; emoji: string; color: string; is_default: boolean } | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('📌');
  const [editColor, setEditColor] = useState('#888780');
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const usedColors = new Set(categories.map(c => c.color));
  const usedColorsForEdit = (excludeId: string) =>
    new Set(categories.filter(c => c.id !== excludeId).map(c => c.color));

  const amount = rawInput ? parseInt(rawInput, 10) : 0;
  const displayInput = rawInput ? rawInput.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\./g, '').replace(/[^0-9]/g, '');
    setRawInput(digits);
  };

  const handleSave = async () => {
    if (!amount || amount <= 0) return;
    setSaving(true);
    const { error } = await addExpense({ amount, category, note });
    setSaving(false);
    if (!error) router.back();
  };


  const handleLongPressCategory = (cat: { id: string; name: string; emoji: string; color: string; is_default: boolean }) => {
    setEditingCat(cat);
    setEditName(cat.name);
    setEditEmoji(cat.emoji);
    setEditColor(cat.color);
  };

  const handleSaveEdit = async () => {
    if (!editingCat) return;
    setSavingEdit(true);
    if (editingCat.is_default) {
      const { error } = await updateCategoryColor(editingCat.id, editColor);
      setSavingEdit(false);
      if (error) return;
    } else {
      if (!editName.trim()) { setSavingEdit(false); return; }
      const { error } = await updateCategory(editingCat.id, { name: editName.trim(), emoji: editEmoji, color: editColor });
      setSavingEdit(false);
      if (error) return;
    }
    setEditingCat(null);
  };

  const handleAddCategory = async () => {
    if (!newName.trim()) return;
    setSavingCat(true);
    const { error } = await addCategory({ name: newName.trim(), emoji: newEmoji, color: newColor });
    setSavingCat(false);
    if (error) return;
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
        {/* ── HEADER ── */}
        <BlurView intensity={60} tint="light" style={styles.header}>
          <View style={styles.headerOverlay} pointerEvents="none" />
          <View style={styles.orb1} pointerEvents="none" />
          <View style={styles.orb2} pointerEvents="none" />
          <View style={styles.orb3} pointerEvents="none" />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thêm chi tiêu</Text>

          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInput}
              value={displayInput}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.textPrimary}
              autoFocus
            />
            <Text style={styles.currency}>₫</Text>
          </View>

          <Text style={styles.amountHint}>Nhập số tiền (VD: 100.000, 500.000)</Text>

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
        </BlurView>

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
            {categories.map(cat => {
              const selected = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.pill, selected && styles.pillActive]}
                  onPress={() => setCategory(cat.id)}
                  onLongPress={() => handleLongPressCategory(cat)}
                >
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.pillIcon}>{cat.emoji}</Text>
                  <Text style={[styles.pillLabel, selected && styles.pillLabelActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
      {/* ── MODAL TẠO DANH MỤC ── */}
      <Modal visible={showNewCat} transparent animationType="slide">
        <View style={styles.modalWrapper}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setShowNewCat(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* Live preview card */}
            <View style={[styles.catPreviewCard, { backgroundColor: newColor + '18', borderColor: newColor + '60' }]}>
              <View style={[styles.catPreviewIconWrap, { backgroundColor: newColor + '30' }]}>
                <Text style={styles.catPreviewEmoji}>{newEmoji}</Text>
              </View>
              <Text style={[styles.catPreviewName, { color: newColor }]} numberOfLines={1}>
                {newName || 'Tên danh mục'}
              </Text>
            </View>

            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Đặt tên danh mục..."
              placeholderTextColor={colors.textMuted}
              maxLength={20}
              autoFocus
            />

            <Text style={styles.modalSub}>Icon</Text>
            <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              <View style={styles.emojiGrid}>
                {EMOJI_OPTIONS.map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiGridBtn, newEmoji === e && { backgroundColor: newColor + '25', borderColor: newColor }]}
                    onPress={() => setNewEmoji(e)}
                  >
                    <Text style={{ fontSize: 22 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.modalSub, { marginTop: 14 }]}>Màu</Text>
            <View style={styles.colorSwatches}>
              {COLOR_OPTIONS.filter(c => !usedColors.has(c) || c === newColor).map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, newColor === c && styles.colorSwatchActive]}
                  onPress={() => setNewColor(c)}
                >
                  {newColor === c && <Text style={styles.colorSwatchCheck}>✓</Text>}
                </TouchableOpacity>
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
        </View>
      </Modal>

      {/* ── MODAL CHỈNH SỬA DANH MỤC ── */}
      <Modal visible={!!editingCat} transparent animationType="slide">
        <View style={styles.modalWrapper}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setEditingCat(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* Live preview card */}
            <View style={[styles.catPreviewCard, { backgroundColor: editColor + '18', borderColor: editColor + '60' }]}>
              <View style={[styles.catPreviewIconWrap, { backgroundColor: editColor + '30' }]}>
                <Text style={styles.catPreviewEmoji}>{editEmoji}</Text>
              </View>
              <Text style={[styles.catPreviewName, { color: editColor }]} numberOfLines={1}>
                {editName || 'Tên danh mục'}
              </Text>
            </View>

            {!editingCat?.is_default && (
              <>
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Đặt tên danh mục..."
                  placeholderTextColor={colors.textMuted}
                  maxLength={20}
                />
                <Text style={styles.modalSub}>Icon</Text>
                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                  <View style={styles.emojiGrid}>
                    {EMOJI_OPTIONS.map(e => (
                      <TouchableOpacity
                        key={e}
                        style={[styles.emojiGridBtn, editEmoji === e && { backgroundColor: editColor + '25', borderColor: editColor }]}
                        onPress={() => setEditEmoji(e)}
                      >
                        <Text style={{ fontSize: 22 }}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <Text style={[styles.modalSub, { marginTop: 14 }]}>Màu</Text>
              </>
            )}
            {editingCat?.is_default && (
              <Text style={[styles.modalSub, { marginTop: 4 }]}>Màu</Text>
            )}
            <View style={styles.colorSwatches}>
              {COLOR_OPTIONS.filter(c => !usedColorsForEdit(editingCat?.id ?? '').has(c) || c === editColor).map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, editColor === c && styles.colorSwatchActive]}
                  onPress={() => setEditColor(c)}
                >
                  {editColor === c && <Text style={styles.colorSwatchCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalSaveBtn, ((!editingCat?.is_default && !editName.trim()) || savingEdit) && styles.saveBtnDisabled]}
              onPress={handleSaveEdit}
              disabled={(!editingCat?.is_default && !editName.trim()) || savingEdit}
            >
              <Text style={styles.saveBtnText}>{savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
            </TouchableOpacity>

            {!editingCat?.is_default && <TouchableOpacity
              style={styles.deleteCatBtn}
              onPress={() => {
                if (!editingCat) return;
                const catToDelete = editingCat;
                setEditingCat(null);
                setConfirm({
                  title: 'Xóa danh mục',
                  message: `Chi tiêu thuộc "${catToDelete.name}" sẽ được chuyển về "Khác".`,
                  onConfirm: async () => {
                    setConfirm(null);
                    if (category === catToDelete.id) setCategory('other');
                    await reassignCategory(catToDelete.id, 'other');
                    await deleteCategory(catToDelete.id);
                  },
                });
              }}
            >
              <Text style={styles.deleteCatText}>Xóa danh mục</Text>
            </TouchableOpacity>}
          </View>
        </View>
      </Modal>
      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        destructive
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  orb1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.18)', top: -60, right: -40 },
  orb2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)', top: 30, right: 80 },
  orb3: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(180,120,0,0.12)', bottom: 20, left: -20 },

  header: {
    paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,220,0,0.35)',
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
  quickBtnTextActive: { color: colors.accentText },

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
  pillActive: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderWidth: 2,
  },
  catDot: { width: 7, height: 7, borderRadius: 4 },
  pillIcon: { fontSize: 16 },
  pillLabel: { fontSize: 13, fontFamily: Fonts.bold, color: colors.textMuted },
  pillLabelActive: { color: colors.textPrimary },
  pillNew: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'transparent', borderRadius: 99,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.accentBorder, borderStyle: 'dashed',
  },
  pillNewText: { fontSize: 13, fontFamily: Fonts.bold, color: colors.accent },

  saveBtn: {
    backgroundColor: colors.surface, borderRadius: 18,
    paddingVertical: 17, alignItems: 'center',
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: colors.textPrimary, fontSize: 16, fontFamily: Fonts.extraBold },

  // Modal
  modalWrapper: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalSheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.accentBorder,
    alignSelf: 'center', marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.inputBg, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: colors.textPrimary, fontFamily: Fonts.medium,
    marginBottom: 14, borderWidth: 1, borderColor: colors.inputBorder,
  },
  modalSub: { fontSize: 11, fontFamily: Fonts.extraBold, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },

  // Live preview card
  catPreviewCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 20, borderWidth: 1.5,
    paddingHorizontal: 18, paddingVertical: 14,
    marginBottom: 16,
  },
  catPreviewIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  catPreviewEmoji: { fontSize: 28 },
  catPreviewName: { fontSize: 20, fontFamily: Fonts.extraBold, flex: 1 },

  // Emoji grid
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  emojiGridBtn: {
    width: EMOJI_BTN_SIZE, height: EMOJI_BTN_SIZE,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: colors.inputBg,
  },

  // Color swatches
  colorSwatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  colorSwatch: {
    width: COLOR_SWATCH_SIZE, height: COLOR_SWATCH_SIZE, borderRadius: COLOR_SWATCH_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchActive: {
    transform: [{ scale: 1.18 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 5, elevation: 5,
  },
  colorSwatchCheck: { color: '#fff', fontSize: 18, fontFamily: Fonts.extraBold },

  modalSaveBtn: {
    backgroundColor: colors.surface, borderRadius: 18,
    paddingVertical: 15, alignItems: 'center',
  },
  deleteCatBtn: {
    marginTop: 10, borderWidth: 1, borderColor: colors.dangerBorder,
    borderRadius: 18, paddingVertical: 15, alignItems: 'center',
  },
  deleteCatText: { fontSize: 14, color: colors.danger, fontFamily: Fonts.extraBold },
});
