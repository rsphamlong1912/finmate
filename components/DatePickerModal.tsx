import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Animated, Dimensions,
} from 'react-native';
import { Fonts } from '../constants/fonts';

const { height } = Dimensions.get('window');

const VI_MONTHS = [
  'Tháng 1','Tháng 2','Tháng 3','Tháng 4',
  'Tháng 5','Tháng 6','Tháng 7','Tháng 8',
  'Tháng 9','Tháng 10','Tháng 11','Tháng 12',
];
const DAY_LABELS = ['T2','T3','T4','T5','T6','T7','CN'];

function toLocalStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getOffset(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}
function getDays(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function chunk<T>(arr: T[], n: number): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < arr.length; i += n) r.push(arr.slice(i, i + n));
  return r;
}

type Props = {
  visible: boolean;
  value: Date;
  maximumDate?: Date;
  minimumDate?: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
};

export function DatePickerModal({ visible, value, maximumDate, minimumDate, onConfirm, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const today = useMemo(() => toLocalStr(maximumDate ?? new Date()), [maximumDate]);
  const minStr = useMemo(() => minimumDate ? toLocalStr(minimumDate) : null, [minimumDate]);

  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [selected, setSelected] = useState(toLocalStr(value));

  // Sync state when value changes
  useEffect(() => {
    setViewYear(value.getFullYear());
    setViewMonth(value.getMonth());
    setSelected(toLocalStr(value));
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: height, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const isCurrentMonth = useMemo(() => {
    const max = maximumDate ?? new Date();
    return viewYear === max.getFullYear() && viewMonth === max.getMonth();
  }, [viewYear, viewMonth, maximumDate]);

  const isMinMonth = useMemo(() => {
    if (!minimumDate) return false;
    return viewYear === minimumDate.getFullYear() && viewMonth === minimumDate.getMonth();
  }, [viewYear, viewMonth, minimumDate]);

  const goToPrev = () => {
    if (isMinMonth) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goToNext = () => {
    // When using minimumDate mode, allow navigating forward freely
    if (!minimumDate && isCurrentMonth) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cells = useMemo(() => {
    const offset = getOffset(viewYear, viewMonth);
    const days = getDays(viewYear, viewMonth);
    const result: Array<{ day: number | null; key: string | null }> = [];
    for (let i = 0; i < offset; i++) result.push({ day: null, key: null });
    for (let d = 1; d <= days; d++) {
      result.push({ day: d, key: `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
    }
    while (result.length % 7 !== 0) result.push({ day: null, key: null });
    return result;
  }, [viewYear, viewMonth]);

  const rows = chunk(cells, 7);

  const handleSelect = (key: string) => {
    if (!minimumDate && key > today) return;
    if (minimumDate && key < (minStr ?? '')) return;
    setSelected(key);
  };

  const handleConfirm = () => {
    const [y, m, d] = selected.split('-').map(Number);
    const picked = new Date(y, m - 1, d, 12, 0, 0);
    onConfirm(picked);
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chọn ngày</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Month nav */}
        <View style={styles.nav}>
          <TouchableOpacity onPress={goToPrev} style={styles.navBtn} disabled={isMinMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.navArrow, isMinMonth && styles.navArrowDisabled]}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{VI_MONTHS[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={goToNext} style={styles.navBtn} disabled={!minimumDate && isCurrentMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.navArrow, !minimumDate && isCurrentMonth && styles.navArrowDisabled]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day labels */}
        <View style={styles.weekRow}>
          {DAY_LABELS.map(d => (
            <View key={d} style={styles.cellWrap}>
              <Text style={styles.dayLabel}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={styles.divider} />

        {/* Grid */}
        {rows.map((row, ri) => (
          <View key={ri} style={styles.weekRow}>
            {row.map((cell, ci) => {
              const isFuture = !minimumDate && !!cell.key && cell.key > today;
              const isPast   = !!minimumDate && !!cell.key && !!minStr && cell.key < minStr;
              const isDisabled = isFuture || isPast;
              const isSelected = cell.key === selected;
              const isToday = cell.key === today;
              return (
                <View key={ci} style={styles.cellWrap}>
                  {cell.day !== null && (
                    <TouchableOpacity
                      onPress={() => cell.key && handleSelect(cell.key)}
                      disabled={isDisabled}
                      style={[
                        styles.cell,
                        isSelected && styles.cellSelected,
                        isToday && !isSelected && styles.cellToday,
                        isDisabled && styles.cellFuture,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.cellText,
                        isSelected && styles.cellTextSelected,
                        isToday && !isSelected && styles.cellTextToday,
                        isDisabled && styles.cellTextFuture,
                      ]}>
                        {cell.day}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* Confirm button */}
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
          <Text style={styles.confirmText}>Xác nhận</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const CELL_SIZE = 42;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,4,30,0.6)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 36, paddingHorizontal: 20,
    shadowColor: '#1a0a3c', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#e4dff5', alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 16,
  },
  headerTitle: { fontSize: 17, fontFamily: Fonts.extraBold, color: '#3b1f6e' },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 13, color: '#6b4fa8', fontFamily: Fonts.bold },

  nav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center',
  },
  navArrow: { fontSize: 20, color: '#6b4fa8', fontFamily: Fonts.bold, lineHeight: 24 },
  navArrowDisabled: { color: '#e4dff5' },
  monthTitle: { fontSize: 15, fontFamily: Fonts.extraBold, color: '#3b1f6e' },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cellWrap: { width: CELL_SIZE, alignItems: 'center' },
  dayLabel: { fontSize: 11, fontFamily: Fonts.bold, color: '#c4b5fd', letterSpacing: 0.3, paddingVertical: 4 },
  divider: { height: 1, backgroundColor: '#f5f3ff', marginBottom: 8, marginHorizontal: -4 },

  cell: {
    width: CELL_SIZE, height: CELL_SIZE,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  cellSelected: { backgroundColor: '#6b4fa8' },
  cellToday: { borderWidth: 2, borderColor: '#6b4fa8' },
  cellFuture: { opacity: 0.25 },

  cellText: { fontSize: 14, fontFamily: Fonts.medium, color: '#3b1f6e' },
  cellTextSelected: { color: '#fff', fontFamily: Fonts.extraBold },
  cellTextToday: { color: '#6b4fa8', fontFamily: Fonts.extraBold },
  cellTextFuture: { color: '#c4b5fd' },

  confirmBtn: {
    backgroundColor: '#6b4fa8', borderRadius: 18,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  confirmText: { color: '#fff', fontSize: 15, fontFamily: Fonts.extraBold },
});
