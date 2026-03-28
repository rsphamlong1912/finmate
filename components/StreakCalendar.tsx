import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Fonts } from '../constants/fonts';
import { useTheme } from '../context/ThemeContext';

type Props = {
  streakDates: string[];
  streakCount: number;
};

const VI_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];
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

function formatKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

export function StreakCalendar({ streakDates, streakCount }: Props) {
  const { colors } = useTheme();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const todayStr = useMemo(() => getLocalDateStr(), []);
  const streakSet = useMemo(() => new Set(streakDates), [streakDates]);

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const goToPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goToNext = () => {
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cells = useMemo(() => {
    const offset = getFirstDayOffset(viewYear, viewMonth);
    const daysCount = getDaysInMonth(viewYear, viewMonth);
    const result: Array<{ day: number | null; key: string | null }> = [];
    for (let i = 0; i < offset; i++) result.push({ day: null, key: null });
    for (let d = 1; d <= daysCount; d++) result.push({ day: d, key: formatKey(viewYear, viewMonth, d) });
    while (result.length % 7 !== 0) result.push({ day: null, key: null });
    return result;
  }, [viewYear, viewMonth]);

  const rows = chunk(cells, 7);

  const activeThisMonth = useMemo(() =>
    cells.filter(c => c.key && streakSet.has(c.key)).length,
    [cells, streakSet]
  );

  const totalDaysInMonth = getDaysInMonth(viewYear, viewMonth);
  const pct = Math.round((activeThisMonth / totalDaysInMonth) * 100);

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      {/* Month nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={goToPrev} style={styles.navBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{VI_MONTHS[viewMonth]} {viewYear}</Text>
        <TouchableOpacity
          onPress={goToNext}
          style={styles.navBtn}
          disabled={isCurrentMonth}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.navArrow, isCurrentMonth && styles.navArrowDisabled]}>›</Text>
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
            const isActive = !!cell.key && streakSet.has(cell.key);
            const isToday = cell.key === todayStr;
            return (
              <View key={ci} style={styles.cellWrap}>
                {cell.day !== null && (
                  <View style={[
                    styles.cell,
                    isActive && styles.cellActive,
                    isToday && !isActive && styles.cellToday,
                    isToday && isActive && styles.cellTodayActive,
                  ]}>
                    <Text style={[
                      styles.cellText,
                      isActive && styles.cellTextActive,
                      isToday && !isActive && styles.cellTextToday,
                    ]}>
                      {cell.day}
                    </Text>
                    {isActive && <Text style={styles.cellCoin}>🔥</Text>}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}

      {/* Stats footer */}
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statPillNum}>{activeThisMonth}</Text>
          <Text style={styles.statPillLabel}> ngày active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statPill}>
          <Text style={styles.statPillNum}>{pct}%</Text>
          <Text style={styles.statPillLabel}> tháng này</Text>
        </View>
      </View>

    </View>
  );
}

const CELL_SIZE = 36;

const makeStyles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  navArrow: { fontSize: 20, color: colors.accent, fontFamily: Fonts.bold, lineHeight: 24 },
  navArrowDisabled: { color: colors.textMuted },
  monthTitle: { fontSize: 15, fontFamily: Fonts.extraBold, color: colors.textPrimary },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cellWrap: { width: CELL_SIZE, alignItems: 'center' },
  dayLabel: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textMuted, letterSpacing: 0.3 },

  divider: { height: 1, backgroundColor: colors.divider, marginBottom: 10, marginHorizontal: -4 },

  cell: {
    width: CELL_SIZE, height: CELL_SIZE,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column',
    gap: 1,
  },
  cellActive: { backgroundColor: 'rgba(251,146,60,0.85)' },
  cellToday: { borderWidth: 2, borderColor: colors.accent, borderRadius: 10 },
  cellTodayActive: { backgroundColor: '#f97316', borderRadius: 10 },

  cellText: { fontSize: 12, fontFamily: Fonts.medium, color: colors.textSecondary },
  cellTextActive: { color: colors.textPrimary, fontFamily: Fonts.extraBold },
  cellTextToday: { color: colors.accent, fontFamily: Fonts.extraBold },
  cellCoin: { fontSize: 8, lineHeight: 10 },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  statPill: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 16 },
  statPillNum: { fontSize: 20, fontFamily: Fonts.extraBold, color: colors.accent },
  statPillLabel: { fontSize: 12, fontFamily: Fonts.medium, color: colors.textMuted },
  statDivider: { width: 1, height: 24, backgroundColor: colors.inputBorder },

});
