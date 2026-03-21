import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useExpenses } from '../../context/ExpensesContext';
import { CATEGORY_LABELS, CATEGORY_COLORS, Expense } from '../../types';
import { formatVND } from '../../lib/vnd';

const FILTERS = ['Tất cả', 'Tuần này', 'Tháng này'];
const CAT_ICONS: Record<string, string> = {
  food: '🍜', transport: '🚗', shopping: '🛍',
  bills: '💡', health: '💊', entertainment: '🎮', other: '📦',
};

export default function TransactionsScreen() {
  const { expenses, deleteExpense } = useExpenses();
  const [filter, setFilter] = useState('Tháng này');
  const router = useRouter();

  const filtered = expenses.filter(e => {
    const d = new Date(e.created_at);
    const now = new Date();
    if (filter === 'Tuần này') {
      const w = new Date(); w.setDate(now.getDate() - 7); return d >= w;
    }
    if (filter === 'Tháng này') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const grouped = filtered.reduce<Record<string, Expense[]>>((acc, e) => {
    const date = new Date(e.created_at).toLocaleDateString('vi-VN', {
      weekday: 'long', day: 'numeric', month: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(e);
    return acc;
  }, {});

  const handleDelete = (id: string) => {
    Alert.alert('Xóa giao dịch', 'Bạn có chắc muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => deleteExpense(id) },
    ]);
  };

  const handleEdit = (e: Expense) => {
    router.push({
      pathname: '/edit-expense',
      params: {
        id: e.id,
        amount: e.amount.toString(),
        category: e.category,
        note: e.note ?? '',
      },
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <Text style={styles.headerTitle}>Giao dịch</Text>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Tổng chi tiêu</Text>
          <Text style={styles.totalAmt}>{formatVND(total)}</Text>
          <Text style={styles.totalCount}>{filtered.length} giao dịch</Text>
        </View>
      </View>

      <View style={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {Object.keys(grouped).length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>📭</Text>
            <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
            <Text style={styles.emptySub}>Thêm chi tiêu từ màn hình chính</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <View key={date} style={styles.group}>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>{date}</Text>
                <Text style={styles.dateTotal}>-{formatVND(items.reduce((s, e) => s + e.amount, 0))}</Text>
              </View>
              <View style={styles.groupCard}>
                {items.map((e, i) => {
                  const color = CATEGORY_COLORS[e.category as keyof typeof CATEGORY_COLORS] ?? '#6b4fa8';
                  return (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.txRow, i < items.length - 1 && styles.txBorder]}
                      onPress={() => handleEdit(e)}
                      onLongPress={() => handleDelete(e.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.txIconWrap, { backgroundColor: color + '20' }]}>
                        <Text style={{ fontSize: 22 }}>{CAT_ICONS[e.category] ?? '📦'}</Text>
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txCat}>{CATEGORY_LABELS[e.category as keyof typeof CATEGORY_LABELS] ?? e.category}</Text>
                        {e.note ? <Text style={styles.txNote} numberOfLines={1}>{e.note}</Text> : null}
                      </View>
                      <View style={styles.txRight}>
                        <Text style={styles.txAmt}>-{formatVND(e.amount)}</Text>
                        <Text style={styles.txEdit}>Sửa →</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
        <Text style={styles.hint}>Tap để sửa · Nhấn giữ để xóa</Text>
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3b1f6e' },
  header: {
    backgroundColor: '#3b1f6e',
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 28,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden',
  },
  headerCircle: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 16 },
  totalCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 16 },
  totalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginBottom: 4 },
  totalAmt: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  totalCount: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#eeeaf8' },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', borderWidth: 2, borderColor: '#e4dff5' },
  filterActive: { backgroundColor: '#6b4fa8', borderColor: '#6b4fa8' },
  filterText: { fontSize: 12, fontWeight: '700', color: '#9b8cc4' },
  filterTextActive: { color: '#fff' },

  scroll: { flex: 1, paddingHorizontal: 20, backgroundColor: '#eeeaf8' },
  group: { marginBottom: 20, marginTop: 8 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateLabel: { fontSize: 12, fontWeight: '700', color: '#9b8cc4', textTransform: 'capitalize' },
  dateTotal: { fontSize: 12, fontWeight: '800', color: '#6b4fa8' },
  groupCard: { backgroundColor: '#fff', borderRadius: 20, shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, overflow: 'hidden' },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  txBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f3ff' },
  txIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txCat: { fontSize: 14, fontWeight: '700', color: '#3b1f6e', marginBottom: 2 },
  txNote: { fontSize: 12, color: '#b0a3d4', fontWeight: '500' },
  txRight: { alignItems: 'flex-end', gap: 2 },
  txAmt: { fontSize: 13, fontWeight: '900', color: '#6b4fa8' },
  txEdit: { fontSize: 10, color: '#c4b5fd', fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 17, fontWeight: '800', color: '#3b1f6e', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#b0a3d4', fontWeight: '500' },
  hint: { textAlign: 'center', fontSize: 11, color: '#d4c9f0', paddingVertical: 8, fontWeight: '500' },
});