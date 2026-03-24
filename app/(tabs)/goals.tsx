import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Fonts } from '../../constants/fonts';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useGoals } from '../../context/GoalsContext';
import { formatVND, parseVND } from '../../lib/vnd';
import { DatePickerModal } from '../../components/DatePickerModal';

// ── Progress Ring ─────────────────────────────────────────────────────────────
const RING_SIZE = 72;
const RING_R = 30;
const RING_STROKE = 7;
const CIRC = 2 * Math.PI * RING_R;

function ProgressRing({ pct, done }: { pct: number; done: boolean }) {
  const offset = CIRC * (1 - Math.min(pct, 100) / 100);
  const color = done ? '#4ade80' : '#6b4fa8';
  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
          stroke={done ? '#dcfce7' : '#ede9f8'} strokeWidth={RING_STROKE} fill="none" />
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
          stroke={color} strokeWidth={RING_STROKE} fill="none"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <Text style={{ fontSize: done ? 18 : 12, fontFamily: Fonts.extraBold, color }}>
        {done ? '✓' : `${Math.round(pct)}%`}
      </Text>
    </View>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────
const QUICK_AMOUNTS = [
  { label: '100k', value: 100_000 },
  { label: '500k', value: 500_000 },
  { label: '1tr',  value: 1_000_000 },
  { label: '2tr',  value: 2_000_000 },
];
const SUGGESTIONS = ['✈️ Du lịch', '📱 Mua điện thoại', '🚗 Mua xe', '🏠 Mua nhà', '📚 Học phí', '🎁 Quà tặng'];

// ── Screen ────────────────────────────────────────────────────────────────────
export default function GoalsScreen() {
  const { goals, addGoal, updateGoal, addSavings, deleteGoal } = useGoals();

  const [activeTab, setActiveTab]     = useState<'active' | 'done'>('active');
  const [showAdd, setShowAdd]         = useState(false);
  const [showEdit, setShowEdit]       = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);

  // add goal form
  const [title, setTitle]           = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [deadline, setDeadline]     = useState<Date | null>(null);
  const [showAddDate, setShowAddDate] = useState(false);

  // edit goal form
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editTitle, setEditTitle]       = useState('');
  const [editTarget, setEditTarget]     = useState('');
  const [editDeadline, setEditDeadline] = useState<Date | null>(null);
  const [showEditDate, setShowEditDate] = useState(false);

  // deposit form
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositInput, setDepositInput]   = useState('');

  const [saving, setSaving] = useState(false);

  const activeGoals  = goals.filter(g => g.saved_amount < g.target_amount);
  const doneGoals    = goals.filter(g => g.saved_amount >= g.target_amount);
  const visibleGoals = activeTab === 'active' ? activeGoals : doneGoals;
  const depositGoal  = goals.find(g => g.id === depositGoalId);
  const editingGoal  = goals.find(g => g.id === editingId);

  const totalSaved  = goals.reduce((s, g) => s + g.saved_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalPct    = totalTarget > 0 ? Math.min(Math.round((totalSaved / totalTarget) * 100), 100) : 0;

  // ── handlers ────────────────────────────────────────────────────────────────
  const handleAddGoal = async () => {
    const amt = parseVND(targetInput);
    if (!title.trim() || !amt) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên và số tiền mục tiêu');
      return;
    }
    setSaving(true);
    const { error } = await addGoal({
      title: title.trim(),
      target_amount: amt,
      deadline: deadline ? deadline.toISOString().split('T')[0] : undefined,
    });
    setSaving(false);
    if (!error) { setTitle(''); setTargetInput(''); setDeadline(null); setShowAdd(false); }
  };

  const handleOpenEdit = (goal: any) => {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditTarget(goal.target_amount.toString());
    setEditDeadline(goal.deadline ? new Date(goal.deadline) : null);
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    const amt = parseVND(editTarget);
    if (!editTitle.trim() || !amt) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên và số tiền mục tiêu');
      return;
    }
    setSaving(true);
    await updateGoal(editingId!, {
      title: editTitle.trim(),
      target_amount: amt,
      deadline: editDeadline ? editDeadline.toISOString().split('T')[0] : undefined,
    });
    setSaving(false);
    setShowEdit(false);
  };

  const handleDeposit = async () => {
    const amt = parseVND(depositInput);
    if (!amt || !depositGoalId) return;
    await addSavings(depositGoalId, amt);
    const g = depositGoal;
    setDepositInput(''); setShowDeposit(false); setDepositGoalId(null);
    if (g && g.saved_amount + amt >= g.target_amount) {
      Alert.alert('🎉 Chúc mừng!', `Bạn đã đạt mục tiêu "${g.title}"!`);
    }
  };

  const handleDelete = (id: string, t: string) =>
    Alert.alert('Xóa mục tiêu', `Xóa "${t}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => deleteGoal(id) },
    ]);

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <View style={s.headerBubble} />
        <Text style={s.headerTitle}>Mục tiêu</Text>

        {goals.length > 0 ? (
          <View style={s.summaryStrip}>
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>{formatVND(totalSaved)}</Text>
              <Text style={s.summaryLbl}>đã tiết kiệm</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>{totalPct}%</Text>
              <Text style={s.summaryLbl}>tổng tiến độ</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>{goals.length}</Text>
              <Text style={s.summaryLbl}>mục tiêu</Text>
            </View>
          </View>
        ) : (
          <Text style={s.headerSub}>Đặt mục tiêu và theo dõi tiết kiệm</Text>
        )}
      </View>

      {/* ── TAB BAR ── */}
      {goals.length > 0 && (
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tabPill, activeTab === 'active' && s.tabPillActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[s.tabPillText, activeTab === 'active' && s.tabPillTextActive]}>
              Đang tiết kiệm{activeGoals.length > 0 ? ` · ${activeGoals.length}` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabPill, activeTab === 'done' && s.tabPillActive]}
            onPress={() => setActiveTab('done')}
          >
            <Text style={[s.tabPillText, activeTab === 'done' && s.tabPillTextActive]}>
              Hoàn thành{doneGoals.length > 0 ? ` · ${doneGoals.length}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── LIST ── */}
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {goals.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>🎯</Text>
            <Text style={s.emptyTitle}>Chưa có mục tiêu nào</Text>
            <Text style={s.emptySub}>Bắt đầu bằng mục tiêu đầu tiên của bạn</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAdd(true)}>
              <Text style={s.emptyBtnText}>Tạo mục tiêu</Text>
            </TouchableOpacity>
          </View>
        ) : visibleGoals.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>{activeTab === 'done' ? '🏆' : '🎯'}</Text>
            <Text style={s.emptyTitle}>
              {activeTab === 'done' ? 'Chưa hoàn thành mục tiêu nào' : 'Không có mục tiêu đang thực hiện'}
            </Text>
          </View>
        ) : (
          visibleGoals.map(goal => {
            const pct  = goal.target_amount > 0 ? (goal.saved_amount / goal.target_amount) * 100 : 0;
            const done = pct >= 100;
            const remaining = Math.max(goal.target_amount - goal.saved_amount, 0);
            return (
              <TouchableOpacity
                key={goal.id}
                style={s.card}
                onPress={() => handleOpenEdit(goal)}
                onLongPress={() => handleDelete(goal.id, goal.title)}
                activeOpacity={0.82}
              >
                <ProgressRing pct={pct} done={done} />

                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={1}>{goal.title}</Text>

                  {/* progress bar */}
                  <View style={s.bar}>
                    <View style={[s.barFill, { width: `${Math.min(pct, 100)}%` as any }, done && s.barFillDone]} />
                  </View>

                  <View style={s.cardAmounts}>
                    <Text style={s.cardSaved}>{formatVND(goal.saved_amount)}</Text>
                    <Text style={s.cardTarget}>/ {formatVND(goal.target_amount)}</Text>
                  </View>

                  {!done && goal.deadline && (
                    <Text style={s.cardDeadline}>
                      Hạn chót: {new Date(goal.deadline).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                    </Text>
                  )}
                  {done && (
                    <Text style={s.cardDoneLabel}>Đã đạt mục tiêu 🎉</Text>
                  )}
                  {!done && (
                    <Text style={s.cardRemaining}>Còn {formatVND(remaining)}</Text>
                  )}
                </View>

                {!done && (
                  <TouchableOpacity
                    style={s.depositBtn}
                    onPress={() => { setDepositGoalId(goal.id); setShowDeposit(true); }}
                  >
                    <Text style={s.depositBtnText}>+</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ── */}
      {goals.length > 0 && (
        <View style={s.fab}>
          <TouchableOpacity style={s.fabBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
            <Text style={s.fabText}>+ Mục tiêu mới</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══ ADD GOAL MODAL ══ */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={s.sheetCancel}>Hủy</Text>
            </TouchableOpacity>
            <Text style={s.sheetTitle}>Mục tiêu mới</Text>
            <TouchableOpacity onPress={handleAddGoal} disabled={saving}>
              <Text style={[s.sheetSave, saving && { opacity: 0.45 }]}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </Text>
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.sheetBody}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
          >
            <Text style={s.fieldLabel}>Tên mục tiêu</Text>
            <TextInput
              style={s.fieldInput}
              value={title}
              onChangeText={setTitle}
              placeholder="VD: Du lịch Nhật, Mua iPhone..."
              placeholderTextColor="#c4b5fd"
              autoFocus
            />

            <View style={s.suggestionRow}>
              {SUGGESTIONS.map(sg => (
                <TouchableOpacity key={sg} style={s.suggestionChip} onPress={() => setTitle(sg)}>
                  <Text style={s.suggestionChipText}>{sg}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Số tiền mục tiêu</Text>
            <TextInput
              style={s.fieldInput}
              value={targetInput}
              onChangeText={setTargetInput}
              placeholder="VD: 5tr, 10tr, 500k"
              placeholderTextColor="#c4b5fd"
              keyboardType="numeric"
            />
            {parseVND(targetInput) > 0 && (
              <Text style={s.fieldPreview}>{formatVND(parseVND(targetInput))}</Text>
            )}

            <Text style={s.fieldLabel}>Hạn chót (tùy chọn)</Text>
            <TouchableOpacity style={s.fieldInput} onPress={() => setShowAddDate(true)}>
              <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: deadline ? '#3b1f6e' : '#c4b5fd' }}>
                {deadline
                  ? deadline.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : 'Chọn ngày...'}
              </Text>
            </TouchableOpacity>
            {deadline && (
              <TouchableOpacity onPress={() => setDeadline(null)}>
                <Text style={s.clearDate}>Xóa hạn chót</Text>
              </TouchableOpacity>
            )}
          </KeyboardAwareScrollView>

          <DatePickerModal
            visible={showAddDate}
            value={deadline ?? new Date()}
            minimumDate={new Date()}
            onConfirm={d => { setDeadline(d); setShowAddDate(false); }}
            onClose={() => setShowAddDate(false)}
          />
        </View>
      </Modal>

      {/* ══ EDIT GOAL MODAL ══ */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet">
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <TouchableOpacity onPress={() => setShowEdit(false)}>
              <Text style={s.sheetCancel}>Hủy</Text>
            </TouchableOpacity>
            <Text style={s.sheetTitle}>Chỉnh sửa mục tiêu</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={saving}>
              <Text style={[s.sheetSave, saving && { opacity: 0.45 }]}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </Text>
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.sheetBody}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
          >
            <Text style={s.fieldLabel}>Tên mục tiêu</Text>
            <TextInput
              style={s.fieldInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="VD: Du lịch Nhật, Mua iPhone..."
              placeholderTextColor="#c4b5fd"
              autoFocus
            />

            <Text style={s.fieldLabel}>Số tiền mục tiêu</Text>
            <TextInput
              style={s.fieldInput}
              value={editTarget}
              onChangeText={setEditTarget}
              placeholder="VD: 5tr, 10tr, 500k"
              placeholderTextColor="#c4b5fd"
              keyboardType="numeric"
            />
            {parseVND(editTarget) > 0 && (
              <Text style={s.fieldPreview}>{formatVND(parseVND(editTarget))}</Text>
            )}

            <Text style={s.fieldLabel}>Hạn chót (tùy chọn)</Text>
            <TouchableOpacity style={s.fieldInput} onPress={() => setShowEditDate(true)}>
              <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: editDeadline ? '#3b1f6e' : '#c4b5fd' }}>
                {editDeadline
                  ? editDeadline.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : 'Chọn ngày...'}
              </Text>
            </TouchableOpacity>
            {editDeadline && (
              <TouchableOpacity onPress={() => setEditDeadline(null)}>
                <Text style={s.clearDate}>Xóa hạn chót</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.deleteGoalBtn} onPress={() => {
              setShowEdit(false);
              setTimeout(() => handleDelete(editingId!, editingGoal?.title ?? ''), 300);
            }}>
              <Text style={s.deleteGoalText}>Xóa mục tiêu</Text>
            </TouchableOpacity>
          </KeyboardAwareScrollView>

          <DatePickerModal
            visible={showEditDate}
            value={editDeadline ?? new Date()}
            minimumDate={new Date()}
            onConfirm={d => { setEditDeadline(d); setShowEditDate(false); }}
            onClose={() => setShowEditDate(false)}
          />
        </View>
      </Modal>

      {/* ══ DEPOSIT MODAL ══ */}
      <Modal visible={showDeposit} animationType="slide" presentationStyle="pageSheet">
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <TouchableOpacity onPress={() => { setShowDeposit(false); setDepositInput(''); }}>
              <Text style={s.sheetCancel}>Hủy</Text>
            </TouchableOpacity>
            <Text style={s.sheetTitle}>Thêm tiết kiệm</Text>
            <TouchableOpacity onPress={handleDeposit}>
              <Text style={s.sheetSave}>Lưu</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.sheetBody}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
          >
            {depositGoal && (
              <View style={s.depositPreview}>
                <Text style={s.depositPreviewTitle}>{depositGoal.title}</Text>
                <View style={s.bar}>
                  <View style={[s.barFill, {
                    width: `${Math.min(depositGoal.target_amount > 0 ? (depositGoal.saved_amount / depositGoal.target_amount) * 100 : 0, 100)}%` as any
                  }]} />
                </View>
                <Text style={s.depositPreviewSub}>
                  {formatVND(depositGoal.saved_amount)} / {formatVND(depositGoal.target_amount)}
                </Text>
              </View>
            )}

            <Text style={s.fieldLabel}>Số tiền thêm vào</Text>
            <TextInput
              style={[s.fieldInput, s.depositAmtInput]}
              value={depositInput}
              onChangeText={setDepositInput}
              placeholder="VD: 500k, 1tr"
              placeholderTextColor="#c4b5fd"
              keyboardType="numeric"
              autoFocus
            />
            {parseVND(depositInput) > 0 && (
              <Text style={[s.fieldPreview, { textAlign: 'center' }]}>{formatVND(parseVND(depositInput))}</Text>
            )}

            <View style={s.quickRow}>
              {QUICK_AMOUNTS.map(a => (
                <TouchableOpacity
                  key={a.label}
                  style={[s.quickChip, parseVND(depositInput) === a.value && s.quickChipActive]}
                  onPress={() => setDepositInput(a.value.toString())}
                >
                  <Text style={[s.quickChipText, parseVND(depositInput) === a.value && s.quickChipTextActive]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eeeaf8' },

  // Header
  header: {
    backgroundColor: '#3b1f6e',
    paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerBubble: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.07)' },
  headerTitle: { fontSize: 26, fontFamily: Fonts.extraBold, color: '#fff', marginBottom: 14 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.medium },

  summaryStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 8,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 17, fontFamily: Fonts.extraBold, color: '#fff', marginBottom: 2 },
  summaryLbl: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.semiBold },
  summaryDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.18)' },

  // Tabs
  tabBar: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 0,
  },
  tabPill: {
    flex: 1, paddingVertical: 9, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#e4dff5',
  },
  tabPillActive: { backgroundColor: '#6b4fa8', borderColor: '#6b4fa8' },
  tabPillText: { fontSize: 13, fontFamily: Fonts.bold, color: '#9b8cc4' },
  tabPillTextActive: { color: '#fff' },

  // List
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 14 },

  // Goal card
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 22, padding: 16, marginBottom: 12,
    shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 3,
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontFamily: Fonts.extraBold, color: '#3b1f6e' },
  bar: { height: 5, backgroundColor: '#ede9f8', borderRadius: 99, overflow: 'hidden', marginVertical: 4 },
  barFill: { height: 5, backgroundColor: '#6b4fa8', borderRadius: 99 },
  barFillDone: { backgroundColor: '#4ade80' },
  cardAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  cardSaved: { fontSize: 14, fontFamily: Fonts.extraBold, color: '#3b1f6e' },
  cardTarget: { fontSize: 12, fontFamily: Fonts.semiBold, color: '#c4b5fd' },
  cardDeadline: { fontSize: 11, color: '#9b8cc4', fontFamily: Fonts.semiBold },
  cardRemaining: { fontSize: 11, color: '#9b8cc4', fontFamily: Fonts.semiBold },
  cardDoneLabel: { fontSize: 12, fontFamily: Fonts.bold, color: '#4ade80' },

  depositBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#6b4fa8', alignItems: 'center', justifyContent: 'center',
  },
  depositBtnText: { color: '#fff', fontSize: 22, fontFamily: Fonts.extraBold, lineHeight: 28 },

  // FAB
  fab: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 18, paddingTop: 10,
    backgroundColor: '#eeeaf8',
  },
  fabBtn: {
    backgroundColor: '#6b4fa8', borderRadius: 18,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 14, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 16, fontFamily: Fonts.extraBold },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 64 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#9b8cc4', fontFamily: Fonts.medium, textAlign: 'center', marginBottom: 28 },
  emptyBtn: { backgroundColor: '#6b4fa8', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontFamily: Fonts.extraBold },

  // Sheet (modal)
  sheet: { flex: 1, backgroundColor: '#eeeaf8' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e4dff5', alignSelf: 'center', marginTop: 12 },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0edfb',
  },
  sheetTitle: { fontSize: 17, fontFamily: Fonts.extraBold, color: '#3b1f6e' },
  sheetCancel: { fontSize: 15, color: '#c4b5fd', fontFamily: Fonts.semiBold },
  sheetSave: { fontSize: 15, color: '#6b4fa8', fontFamily: Fonts.extraBold },
  sheetBody: { padding: 20, paddingTop: 8 },

  // Fields
  fieldLabel: { fontSize: 12, fontFamily: Fonts.bold, color: '#6b4fa8', marginTop: 18, marginBottom: 8 },
  fieldInput: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#3b1f6e', fontFamily: Fonts.semiBold,
    borderWidth: 1.5, borderColor: '#e4dff5',
    justifyContent: 'center',
  },
  fieldPreview: { fontSize: 12, color: '#6b4fa8', fontFamily: Fonts.bold, marginTop: 6 },
  clearDate: { fontSize: 12, color: '#ef4444', fontFamily: Fonts.semiBold, marginTop: 8 },

  // Suggestions
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 4 },
  suggestionChip: {
    backgroundColor: '#fff', borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1.5, borderColor: '#e4dff5',
  },
  suggestionChipText: { fontSize: 13, color: '#6b4fa8', fontFamily: Fonts.bold },

  // Deposit
  depositPreview: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 4, borderWidth: 1.5, borderColor: '#e4dff5' },
  depositPreviewTitle: { fontSize: 15, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 8 },
  depositPreviewSub: { fontSize: 12, color: '#9b8cc4', fontFamily: Fonts.semiBold, marginTop: 6 },
  depositAmtInput: { fontSize: 28, fontFamily: Fonts.extraBold, textAlign: 'center', paddingVertical: 20 },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  quickChip: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#e4dff5' },
  quickChipActive: { backgroundColor: '#6b4fa8', borderColor: '#6b4fa8' },
  quickChipText: { fontSize: 15, color: '#6b4fa8', fontFamily: Fonts.extraBold },
  quickChipTextActive: { color: '#fff' },

  // Delete
  deleteGoalBtn: { marginTop: 32, borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  deleteGoalText: { fontSize: 14, color: '#ef4444', fontFamily: Fonts.extraBold },
});
