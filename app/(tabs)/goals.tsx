import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, Platform
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useGoals } from '../../context/GoalsContext';
import { formatVND, parseVND } from '../../lib/vnd';

const QUICK_AMOUNTS = [
  { label: '100k', value: 100_000 },
  { label: '500k', value: 500_000 },
  { label: '1tr', value: 1_000_000 },
  { label: '2tr', value: 2_000_000 },
];

const SUGGESTIONS = ['✈️ Du lịch', '📱 Mua điện thoại', '🚗 Mua xe', '🏠 Mua nhà', '📚 Học phí', '🎁 Quà tặng'];

export default function GoalsScreen() {
  const { goals, addGoal, addSavings, deleteGoal } = useGoals();
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddSavings, setShowAddSavings] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [addInput, setAddInput] = useState('');
  const [title, setTitle] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [deadline, setDeadline] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  const totalSaved = goals.reduce((s, g) => s + g.saved_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const addAmt = parseVND(addInput);
  const targetAmt = parseVND(targetInput);

  const handleAddGoal = async () => {
    if (!title || !targetAmt) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên và số tiền mục tiêu');
      return;
    }
    setSaving(true);
    const { error } = await addGoal({ title, target_amount: targetAmt, deadline: deadline || undefined });
    setSaving(false);
    if (!error) {
      setTitle(''); setTargetInput(''); setDeadline('');
      setShowAddGoal(false);
    }
  };

  const handleAddSavings = async () => {
    if (!addAmt || !selectedGoalId) return;
    await addSavings(selectedGoalId, addAmt);
    setAddInput('');
    setShowAddSavings(false);
    setSelectedGoalId(null);
    if (selectedGoal && selectedGoal.saved_amount + addAmt >= selectedGoal.target_amount) {
      Alert.alert('🎉 Chúc mừng!', `Bạn đã đạt mục tiêu "${selectedGoal.title}"!`);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Xóa mục tiêu', `Xóa "${title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => deleteGoal(id) },
    ]);
  };

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <Text style={styles.headerTitle}>Mục tiêu 🎯</Text>
        {goals.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Đã tiết kiệm</Text>
                <Text style={styles.summaryAmt}>{formatVND(totalSaved)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.summaryLabel}>Mục tiêu</Text>
                <Text style={[styles.summaryAmt, { color: 'rgba(255,255,255,0.7)', fontSize: 18 }]}>
                  {formatVND(totalTarget)}
                </Text>
              </View>
            </View>
            <View style={styles.totalBar}>
              <View style={[styles.totalFill, {
                width: `${Math.min(totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0, 100)}%` as any
              }]} />
            </View>
            <Text style={styles.summaryPct}>
              {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}% tổng tiến độ 🚀
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {goals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>🎯</Text>
            <Text style={styles.emptyTitle}>Chưa có mục tiêu nào</Text>
            <Text style={styles.emptySub}>Đặt mục tiêu để bắt đầu tiết kiệm</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddGoal(true)}>
              <Text style={styles.emptyBtnText}>+ Tạo mục tiêu đầu tiên</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {goals.map(goal => {
              const pct = Math.min(goal.target_amount > 0 ? (goal.saved_amount / goal.target_amount) * 100 : 0, 100);
              const done = pct >= 100;
              const remaining = Math.max(goal.target_amount - goal.saved_amount, 0);
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalCard}
                  onLongPress={() => handleDelete(goal.id, goal.title)}
                  activeOpacity={0.85}
                >
                  <View style={styles.goalTop}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.goalTitleRow}>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                        {done && (
                          <View style={styles.doneBadge}>
                            <Text style={styles.doneBadgeText}>✓ Xong</Text>
                          </View>
                        )}
                      </View>
                      {goal.deadline && (
                        <Text style={styles.goalDeadline}>
                          🗓 Hạn: {new Date(goal.deadline).toLocaleDateString('vi-VN')}
                        </Text>
                      )}
                      {!done && (
                        <Text style={styles.goalRemain}>Còn thiếu {formatVND(remaining)}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.goalSaved}>{formatVND(goal.saved_amount)}</Text>
                      <Text style={styles.goalTarget}>/{formatVND(goal.target_amount)}</Text>
                    </View>
                  </View>

                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` as any }, done && styles.barFillDone]} />
                  </View>

                  <View style={styles.goalBottom}>
                    <Text style={styles.pctLabel}>{Math.round(pct)}% hoàn thành</Text>
                    {!done && (
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => { setSelectedGoalId(goal.id); setShowAddSavings(true); }}
                      >
                        <Text style={styles.addBtnText}>+ Thêm tiền</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 80 }} />
          </>
        )}
      </ScrollView>

      {goals.length > 0 && (
        <View style={styles.addGoalFloating}>
          <TouchableOpacity
            style={styles.addGoalBtn}
            onPress={() => setShowAddGoal(true)}
          >
            <Text style={styles.addGoalBtnText}>+ Mục tiêu mới</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ADD GOAL MODAL */}
      <Modal visible={showAddGoal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddGoal(false)}>
              <Text style={styles.modalCancel}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Mục tiêu mới</Text>
            <TouchableOpacity onPress={handleAddGoal} disabled={saving}>
              <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </Text>
            </TouchableOpacity>
          </View>
          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
          >
            <Text style={styles.inputLabel}>Tên mục tiêu</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="VD: Du lịch Nhật, Mua iPhone..."
              placeholderTextColor="#c4b5fd"
              autoFocus
            />

            <Text style={styles.inputLabel}>Số tiền mục tiêu (₫)</Text>
            <TextInput
              style={styles.input}
              value={targetInput}
              onChangeText={setTargetInput}
              placeholder="VD: 5tr, 10tr, 500k"
              placeholderTextColor="#c4b5fd"
              keyboardType="numeric"
            />
            {targetAmt > 0 && <Text style={styles.inputPreview}>{formatVND(targetAmt)}</Text>}

            <Text style={styles.inputLabel}>Hạn chót (tùy chọn)</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: deadline ? '#3b1f6e' : '#c4b5fd' }}>
                {deadline
                  ? new Date(deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : 'Chọn ngày...'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={deadline ? new Date(deadline) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(e: DateTimePickerEvent, date?: Date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (e.type === 'set' && date) {
                    setDeadline(date.toISOString().split('T')[0]);
                  }
                }}
              />
            )}

            <Text style={[styles.inputLabel, { marginTop: 24 }]}>Gợi ý nhanh</Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestionBtn}
                  onPress={() => setTitle(s)}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      {/* ADD SAVINGS MODAL */}
      <Modal visible={showAddSavings} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAddSavings(false); setAddInput(''); }}>
              <Text style={styles.modalCancel}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Thêm tiết kiệm</Text>
            <TouchableOpacity onPress={handleAddSavings}>
              <Text style={styles.modalSave}>Lưu</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
          >
            {selectedGoal && (
              <View style={styles.goalPreview}>
                <Text style={styles.goalPreviewTitle}>{selectedGoal.title}</Text>
                <Text style={styles.goalPreviewSub}>
                  {formatVND(selectedGoal.saved_amount)} / {formatVND(selectedGoal.target_amount)}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Số tiền thêm vào (₫)</Text>
            <TextInput
              style={[styles.input, { fontSize: 28, fontWeight: '900', textAlign: 'center', paddingVertical: 20 }]}
              value={addInput}
              onChangeText={setAddInput}
              placeholder="VD: 500k, 1tr"
              placeholderTextColor="#c4b5fd"
              keyboardType="numeric"
              autoFocus
            />
            {addAmt > 0 && (
              <Text style={[styles.inputPreview, { textAlign: 'center' }]}>{formatVND(addAmt)}</Text>
            )}

            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map(a => (
                <TouchableOpacity
                  key={a.label}
                  style={[styles.quickAmtBtn, addAmt === a.value && styles.quickAmtBtnActive]}
                  onPress={() => setAddInput(a.value.toString())}
                >
                  <Text style={[styles.quickAmtText, addAmt === a.value && styles.quickAmtTextActive]}>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3b1f6e' },
  header: {
    backgroundColor: '#3b1f6e', paddingHorizontal: 24,
    paddingTop: 56, paddingBottom: 28,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden',
  },
  headerCircle: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 16 },
  summaryCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 4 },
  summaryAmt: { fontSize: 20, fontWeight: '900', color: '#fff' },
  totalBar: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 8 },
  totalFill: { height: 8, borderRadius: 99, backgroundColor: '#fff' },
  summaryPct: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },

  scroll: { flex: 1, backgroundColor: '#eeeaf8' },
  scrollContent: { padding: 20 },

  goalCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 14,
    shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 5,
  },
  goalTop: { flexDirection: 'row', marginBottom: 16 },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  goalTitle: { fontSize: 16, fontWeight: '800', color: '#3b1f6e', flex: 1 },
  doneBadge: { backgroundColor: '#4ade80', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  doneBadgeText: { fontSize: 10, color: '#fff', fontWeight: '800' },
  goalDeadline: { fontSize: 12, color: '#b0a3d4', fontWeight: '600', marginBottom: 2 },
  goalRemain: { fontSize: 12, color: '#9b8cc4', fontWeight: '600' },
  goalSaved: { fontSize: 16, fontWeight: '900', color: '#3b1f6e' },
  goalTarget: { fontSize: 12, color: '#b0a3d4', fontWeight: '600' },
  barTrack: { backgroundColor: '#f0edfb', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 12 },
  barFill: { height: 8, borderRadius: 99, backgroundColor: '#6b4fa8' },
  barFillDone: { backgroundColor: '#4ade80' },
  goalBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pctLabel: { fontSize: 13, color: '#9b8cc4', fontWeight: '700' },
  addBtn: { backgroundColor: '#6b4fa8', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  addGoalFloating: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 10,
    backgroundColor: '#eeeaf8',
  },
  addGoalBtn: {
    backgroundColor: '#6b4fa8', borderRadius: 18,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  addGoalBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#3b1f6e', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#b0a3d4', fontWeight: '500', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: '#6b4fa8', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  modal: { flex: 1, backgroundColor: '#eeeaf8' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0edfb',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#3b1f6e' },
  modalCancel: { fontSize: 15, color: '#b0a3d4', fontWeight: '600' },
  modalSave: { fontSize: 15, color: '#6b4fa8', fontWeight: '900' },

  inputLabel: { fontSize: 12, fontWeight: '700', color: '#6b4fa8', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#fff', borderRadius: 16, padding: 14, fontSize: 16, color: '#3b1f6e', fontWeight: '600', borderWidth: 2, borderColor: '#e4dff5' },
  inputPreview: { fontSize: 13, color: '#6b4fa8', fontWeight: '700', marginTop: 6 },

  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionBtn: { backgroundColor: '#fff', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 2, borderColor: '#e4dff5' },
  suggestionText: { fontSize: 13, color: '#6b4fa8', fontWeight: '700' },

  goalPreview: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 2, borderColor: '#e4dff5' },
  goalPreviewTitle: { fontSize: 16, fontWeight: '800', color: '#6b4fa8', marginBottom: 4 },
  goalPreviewSub: { fontSize: 13, color: '#b0a3d4', fontWeight: '600' },

  quickAmounts: { flexDirection: 'row', gap: 10, marginTop: 16 },
  quickAmtBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: '#e4dff5' },
  quickAmtBtnActive: { backgroundColor: '#6b4fa8', borderColor: '#6b4fa8' },
  quickAmtText: { fontSize: 15, color: '#6b4fa8', fontWeight: '800' },
  quickAmtTextActive: { color: '#fff' },
});