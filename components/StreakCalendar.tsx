import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '../constants/fonts';
import { useTheme } from '../context/ThemeContext';

type Props = {
  streakDates: string[];
};

const VI_MONTHS_SHORT = [
  'Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12',
];
const CELL = 11;
const GAP = 2;

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOffset(year: number, month: number) {
  const dow = new Date(year, month, 1).getDay();
  return (dow + 6) % 7; // Mon = 0
}

function formatKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getLocalDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

function calcLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort();
  let longest = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000;
    if (diff === 1) { current++; longest = Math.max(longest, current); }
    else if (diff > 1) current = 1;
  }
  return longest;
}

export function StreakCalendar({ streakDates }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const now = new Date();
  const year = now.getFullYear();
  const todayStr = useMemo(() => getLocalDateStr(), []);
  const streakSet = useMemo(() => new Set(streakDates), [streakDates]);

  const daysElapsed = Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + 1;
  const activeDays = useMemo(
    () => streakDates.filter(d => d.startsWith(`${year}-`)).length,
    [streakDates, year],
  );
  const pct = daysElapsed > 0 ? Math.round((activeDays / daysElapsed) * 100) : 0;
  const longestStreak = useMemo(() => calcLongestStreak(streakDates), [streakDates]);

  const monthGroups = chunk(Array.from({ length: 12 }, (_, i) => i), 3);

  return (
    <View style={styles.container}>
      {/* Stats header */}
      <View style={styles.statsHeader}>
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{activeDays}</Text>
            <Text style={styles.statLabel}>ngày ghi chép</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{pct}%</Text>
            <Text style={styles.statLabel}>tỉ lệ năm nay</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>🔥 {longestStreak}</Text>
            <Text style={styles.statLabel}>streak dài nhất</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* 12-month grid: 3 per row */}
      {monthGroups.map((group, gi) => (
        <View key={gi} style={styles.monthRow}>
          {group.map(m => {
            const daysInMonth = getDaysInMonth(year, m);
            const offset = getFirstDayOffset(year, m);
            const isFutureMonth = m > now.getMonth();

            const cells: (number | null)[] = [];
            for (let i = 0; i < offset; i++) cells.push(null);
            for (let d = 1; d <= daysInMonth; d++) cells.push(d);
            while (cells.length % 7 !== 0) cells.push(null);
            const rows = chunk(cells, 7);

            return (
              <View key={m} style={styles.monthBlock}>
                <Text style={styles.monthLabel}>{VI_MONTHS_SHORT[m]}</Text>
                {rows.map((row, ri) => (
                  <View key={ri} style={styles.weekRow}>
                    {row.map((day, ci) => {
                      if (day === null) return <View key={ci} style={styles.cellEmpty} />;
                      const key = formatKey(year, m, day);
                      const isActive = streakSet.has(key);
                      const isToday = key === todayStr;
                      const isFuture = isFutureMonth || (m === now.getMonth() && day > now.getDate());
                      return (
                        <View key={ci} style={[
                          styles.cell,
                          isActive && styles.cellActive,
                          isToday && !isActive && styles.cellToday,
                          isFuture && styles.cellFuture,
                        ]} />
                      );
                    })}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },

    statsHeader: {
      marginBottom: 14,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
    },
    statValue: {
      fontSize: 16,
      fontFamily: Fonts.extraBold,
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 10,
      fontFamily: Fonts.medium,
      color: colors.textMuted,
      textAlign: 'center',
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.divider,
    },

    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginBottom: 16,
    },

    monthRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 18,
    },
    monthBlock: {
      flex: 1,
    },
    monthLabel: {
      fontSize: 10,
      fontFamily: Fonts.bold,
      color: colors.textSecondary,
      marginBottom: 5,
    },
    weekRow: {
      flexDirection: 'row',
      gap: GAP,
      marginBottom: GAP,
    },

    cell: {
      width: CELL,
      height: CELL,
      borderRadius: 3,
      backgroundColor: colors.divider,
    },
    cellEmpty: {
      width: CELL,
      height: CELL,
    },
    cellActive: {
      backgroundColor: colors.accent,
    },
    cellToday: {
      backgroundColor: colors.accentBg,
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    cellFuture: {
      backgroundColor: colors.divider,
      opacity: 0.4,
    },
  });
