import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Fonts } from '../../constants/fonts';
import { useExpenses } from '../../context/ExpensesContext';
import { Expense } from '../../types';
import { useCategories } from '../../context/CategoriesContext';
import { formatVND } from '../../lib/vnd';

const FILTERS = ['Hôm nay', 'Tuần này', 'Tháng này', 'Tháng trước'];

export default function TransactionsScreen() {
  const { expenses, deleteExpense } = useExpenses();
  const { getCategoryLabel, getCategoryColor, getCategoryEmoji } = useCategories();
  const [filter, setFilter] = useState('Tháng này');
  const router = useRouter();

  const now = new Date();
  const filtered = expenses.filter(e => {
    const d = new Date(e.created_at);
    if (filter === 'Hôm nay') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }
    if (filter === 'Tuần này') {
      const w = new Date(now); w.setDate(now.getDate() - 6); w.setHours(0,0,0,0); return d >= w;
    }
    if (filter === 'Tháng này') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (filter === 'Tháng trước') {
      const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getMonth() === pm && d.getFullYear() === py;
    }
    return true;
  });

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const toLocaleDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const grouped = filtered.reduce<Record<string, Expense[]>>((acc, e) => {
    const key = toLocaleDateStr(new Date(e.created_at));
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const getDayLabel = (dateStr: string) => {
    const today = toLocaleDateStr(new Date());
    const yesterday = toLocaleDateStr(new Date(Date.now() - 86400000));
    if (dateStr === today) return 'Hôm nay';
    if (dateStr === yesterday) return 'Hôm qua';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
  };

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
        date: e.created_at,
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

      <View style={styles.segmentWrap}>
        <View style={styles.segment}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.segmentItem, filter === f && styles.segmentActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, filter === f && styles.segmentTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {Object.keys(grouped).length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>📭</Text>
            <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
            <Text style={styles.emptySub}>Thêm chi tiêu từ màn hình chính</Text>
          </View>
        ) : (
          sortedDays.map(day => {
            const items = grouped[day];
            return (
              <View key={day} style={styles.group}>
                <Text style={styles.dateLabel}>{getDayLabel(day)}</Text>
                <View style={styles.groupCard}>
                  {items.map((e, i) => {
                    const color = getCategoryColor(e.category);
                    const time = new Date(e.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <TouchableOpacity
                        key={e.id}
                        style={[styles.txRow, i < items.length - 1 && styles.txBorder]}
                        onPress={() => handleEdit(e)}
                        onLongPress={() => handleDelete(e.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.txIconWrap, { backgroundColor: color + '1a' }]}>
                          <Text style={{ fontSize: 20 }}>{getCategoryEmoji(e.category)}</Text>
                        </View>
                        <View style={styles.txInfo}>
                          <Text style={styles.txCat} numberOfLines={1}>{e.note || getCategoryLabel(e.category)}</Text>
                          <Text style={styles.txMeta}>{getCategoryLabel(e.category)} · {time}</Text>
                        </View>
                        <View style={styles.txRight}>
                          <Text style={[styles.txAmt, { color }]}>-{formatVND(e.amount)}</Text>
                          <Text style={styles.txEdit}>Sửa →</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })
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
  headerTitle: { fontSize: 24, fontFamily: Fonts.extraBold, color: '#fff', marginBottom: 16 },
  totalCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 16 },
  totalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: Fonts.semiBold, marginBottom: 4 },
  totalAmt: { fontSize: 28, fontFamily: Fonts.extraBold, color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  totalCount: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.semiBold },

  segmentWrap: { backgroundColor: '#eeeaf8', paddingHorizontal: 20, paddingVertical: 14 },
  segment: { flexDirection: 'row', backgroundColor: '#ddd8f0', borderRadius: 14, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  segmentActive: { backgroundColor: '#fff', shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  segmentText: { fontSize: 12, fontFamily: Fonts.bold, color: '#9b8cc4' },
  segmentTextActive: { color: '#3b1f6e' },

  scroll: { flex: 1, paddingHorizontal: 20, backgroundColor: '#eeeaf8' },
  group: { marginBottom: 12, marginTop: 4 },
  dateLabel: { fontSize: 12, fontFamily: Fonts.bold, color: '#9b8cc4', marginBottom: 6 },
  groupCard: { backgroundColor: '#fff', borderRadius: 20, shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, overflow: 'hidden' },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  txBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f3ff' },
  txIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txCat: { fontSize: 14, fontFamily: Fonts.bold, color: '#3b1f6e', marginBottom: 2 },
  txMeta: { fontSize: 11, color: '#c4b5fd', fontFamily: Fonts.medium },
  txRight: { alignItems: 'flex-end', gap: 3 },
  txAmt: { fontSize: 13, fontFamily: Fonts.extraBold },
  txEdit: { fontSize: 10, color: '#c4b5fd', fontFamily: Fonts.medium },

empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 17, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#c4b5fd', fontFamily: Fonts.medium },
  hint: { textAlign: 'center', fontSize: 11, color: '#d4c9f0', paddingVertical: 8, fontFamily: Fonts.medium },
});