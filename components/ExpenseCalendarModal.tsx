import { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import { Fonts } from '../constants/fonts';
import { useTheme } from '../context/ThemeContext';
import { useExpenses } from '../context/ExpensesContext';
import { useCategories } from '../context/CategoriesContext';
import { formatVND } from '../lib/vnd';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function getLocalDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getFirstDayOffset(year: number, month: number) {
  const dow = new Date(year, month, 1).getDay();
  return (dow + 6) % 7;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

function formatCalAmt(amount: number): string {
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + 'K';
  return String(amount);
}

// ── Shared day detail modal ──────────────────────────────────────────────────
function DayDetailModal({ selectedDay, onClose }: { selectedDay: string; onClose: () => void }) {
  const { colors } = useTheme();
  const { expenses } = useExpenses();
  const { getCategoryLabel, getCategoryColor, getCategoryEmoji } = useCategories();
  const todayStr = getLocalDateStr();

  const items = useMemo(() =>
    expenses
      .filter(e => getLocalDateStr(new Date(e.created_at)) === selectedDay)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [expenses, selectedDay]
  );
  const total = items.reduce((s, e) => s + e.amount, 0);

  const styles = makeSharedStyles(colors);

  return (
    <Modal visible transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={styles.dayModalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.dayModal}>
          <View style={styles.dayModalHandle} />
          <View style={styles.dayModalHeader}>
            <View>
              <Text style={styles.dayModalDate}>
                {selectedDay === todayStr
                  ? 'Hôm nay'
                  : new Date(selectedDay + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
              </Text>
              {total > 0 && <Text style={styles.dayModalTotal}>-{formatVND(total)}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.dayModalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <View style={styles.dayModalEmpty}>
              <Text style={{ fontSize: 32 }}>📭</Text>
              <Text style={styles.dayModalEmptyText}>Không có giao dịch</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {items.map((e, i) => {
                const color = getCategoryColor(e.category);
                const time = new Date(e.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                return (
                  <View key={e.id} style={[styles.txRow, i < items.length - 1 && styles.txRowBorder]}>
                    <View style={[styles.txIcon, { backgroundColor: color + '1a' }]}>
                      <Text style={{ fontSize: 17 }}>{getCategoryEmoji(e.category)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txCat} numberOfLines={1}>{e.note || getCategoryLabel(e.category)}</Text>
                      <Text style={styles.txMeta}>{getCategoryLabel(e.category)} · {time}</Text>
                    </View>
                    <Text style={[styles.txAmt, { color }]}>-{formatVND(e.amount)}</Text>
                  </View>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Calendar grid (inline, dùng được ở mọi nơi) ─────────────────────────────
type CalendarProps = {
  /** Nếu truyền vào thì chỉ xem tháng đó, không có nav */
  fixedYear?: number;
  fixedMonth?: number;
  /** cell width override khi nhúng trong card hẹp hơn */
  cellWidth?: number;
};

export function ExpenseCalendar({ fixedYear, fixedMonth, cellWidth }: CalendarProps) {
  const { colors } = useTheme();
  const { expenses } = useExpenses();

  const now = new Date();
  const todayStr = getLocalDateStr();

  const [viewYear, setViewYear] = useState(fixedYear ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(fixedMonth ?? now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (fixedYear !== undefined) setViewYear(fixedYear);
    if (fixedMonth !== undefined) { setViewMonth(fixedMonth); setSelectedDay(null); }
  }, [fixedYear, fixedMonth]);

  const hasNav = fixedYear === undefined;
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const goToPrev = () => {
    setSelectedDay(null);
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goToNext = () => {
    if (isCurrentMonth) return;
    setSelectedDay(null);
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const expensesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const key = getLocalDateStr(new Date(e.created_at));
      map[key] = (map[key] ?? 0) + e.amount;
    });
    return map;
  }, [expenses]);

  const cells = useMemo(() => {
    const offset = getFirstDayOffset(viewYear, viewMonth);
    const daysCount = getDaysInMonth(viewYear, viewMonth);
    const result: Array<{ day: number | null; key: string | null }> = [];
    for (let i = 0; i < offset; i++) result.push({ day: null, key: null });
    for (let d = 1; d <= daysCount; d++) {
      result.push({ day: d, key: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    while (result.length % 7 !== 0) result.push({ day: null, key: null });
    return result;
  }, [viewYear, viewMonth]);

  const rows = chunk(cells, 7);

  const CELL_W = cellWidth ?? Math.floor((SCREEN_WIDTH - 72) / 7);

  const styles = makeSharedStyles(colors);

  return (
    <View>
      {/* Month nav — chỉ hiện khi không fix tháng */}
      {hasNav && (
        <View style={styles.nav}>
          <TouchableOpacity onPress={goToPrev} style={styles.navBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            <Text style={{ color: colors.textMuted, fontFamily: Fonts.semiBold }}>Tháng {viewMonth + 1} </Text>
            <Text style={{ fontFamily: Fonts.extraBold }}>{viewYear}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity onPress={goToNext} style={styles.navBtn} disabled={isCurrentMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.navArrow, isCurrentMonth && styles.navArrowDisabled]}>›</Text>
            </TouchableOpacity>
            {!isCurrentMonth && (
              <TouchableOpacity onPress={() => { setSelectedDay(null); setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); }} style={styles.navBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.resetIcon}>↺</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Day labels */}
      <View style={[styles.weekRow, { marginBottom: 6 }]}>
        {DAY_LABELS.map(d => (
          <View key={d} style={[styles.cellWrap, { width: CELL_W }]}>
            <Text style={styles.dayLabel}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      {/* Grid */}
      {rows.map((row, ri) => (
        <View key={ri} style={[styles.weekRow, { marginBottom: 4 }]}>
          {row.map((cell, ci) => {
            if (!cell.day || !cell.key) return <View key={ci} style={[styles.cellWrap, { width: CELL_W }]} />;
            const amount = expensesByDate[cell.key] ?? 0;
            const isToday = cell.key === todayStr;
            const isSelected = cell.key === selectedDay;
            const isFuture = cell.key > todayStr;
            return (
              <TouchableOpacity
                key={ci}
                style={[styles.cellWrap, { width: CELL_W }]}
                onPress={() => !isFuture && setSelectedDay(isSelected ? null : cell.key!)}
                activeOpacity={0.7}
                disabled={isFuture}
              >
                <View style={[
                  styles.cell, { width: CELL_W },
                  isToday && styles.cellToday,
                  isSelected && styles.cellSelected,
                ]}>
                  <Text style={[
                    styles.cellDay,
                    isToday && styles.cellDayToday,
                    isSelected && styles.cellDaySelected,
                    isFuture && styles.cellDayFuture,
                  ]}>
                    {cell.day}
                  </Text>
                  {amount > 0 && !isFuture && (
                    <Text
                      style={[styles.cellAmt, { width: CELL_W - 2 }, isSelected && styles.cellAmtSelected]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      -{formatCalAmt(amount)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {selectedDay && (
        <DayDetailModal selectedDay={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </View>
  );
}

// ── Modal wrapper (dùng trong transactions screen) ───────────────────────────
type ModalProps = { visible: boolean; onClose: () => void };

export function ExpenseCalendarModal({ visible, onClose }: ModalProps) {
  const { colors } = useTheme();
  const styles = makeSharedStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Lịch</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <ExpenseCalendar />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const makeSharedStyles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) => StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 20, color: colors.accent, fontFamily: Fonts.bold, lineHeight: 24 },
  navArrowDisabled: { color: colors.textMuted },
  resetIcon: { fontSize: 16, color: colors.accent, fontFamily: Fonts.bold },
  monthTitle: { fontSize: 15, color: colors.textPrimary },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cellWrap: { alignItems: 'center' },
  dayLabel: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textMuted, letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: colors.divider, marginBottom: 8, marginHorizontal: -4 },

  cell: { minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 3, gap: 1 },
  cellToday: { borderWidth: 2, borderColor: colors.accent },
  cellSelected: { backgroundColor: colors.accent },
  cellDay: { fontSize: 13, fontFamily: Fonts.medium, color: colors.textSecondary },
  cellDayToday: { color: colors.accent, fontFamily: Fonts.extraBold },
  cellDaySelected: { color: '#fff', fontFamily: Fonts.extraBold },
  cellDayFuture: { color: colors.textMuted, opacity: 0.4 },
  cellAmt: { fontSize: 9, fontFamily: Fonts.bold, color: '#ef4444', letterSpacing: -0.3, textAlign: 'center' },
  cellAmtSelected: { color: 'rgba(255,255,255,0.9)' },

  // Day detail modal
  dayModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  dayModal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingBottom: 34, maxHeight: '55%', borderTopWidth: 1, borderTopColor: colors.divider },
  dayModalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.inputBorder, alignSelf: 'center', marginTop: 10, marginBottom: 14 },
  dayModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  dayModalDate: { fontSize: 15, fontFamily: Fonts.extraBold, color: colors.textPrimary },
  dayModalTotal: { fontSize: 13, fontFamily: Fonts.semiBold, color: '#ef4444', marginTop: 2 },
  dayModalClose: { fontSize: 16, color: colors.textMuted, fontFamily: Fonts.bold },
  dayModalEmpty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  dayModalEmptyText: { fontSize: 14, color: colors.textMuted, fontFamily: Fonts.medium },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  txIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  txCat: { fontSize: 13, fontFamily: Fonts.bold, color: colors.textPrimary, marginBottom: 2 },
  txMeta: { fontSize: 11, color: colors.textMuted, fontFamily: Fonts.medium },
  txAmt: { fontSize: 13, fontFamily: Fonts.extraBold },

  // Modal wrapper
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 16 },
  modalHeaderTitle: { fontSize: 22, fontFamily: Fonts.extraBold, color: colors.textPrimary },
  modalClose: { fontSize: 18, color: colors.textMuted, fontFamily: Fonts.bold },
});
