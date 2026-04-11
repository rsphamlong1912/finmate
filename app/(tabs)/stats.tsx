import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CoinLoader } from '../../components/CoinLoader';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, Pressable, Animated } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryPie, VictoryLine, VictoryTheme, VictoryArea, VictoryLabel } from 'victory-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Fonts } from '../../constants/fonts';
import { useExpenses } from '../../context/ExpensesContext';
import { useProfile } from '../../context/ProfileContext';
import { formatVNDShort, formatVND } from '../../lib/vnd';
import { useCategories } from '../../context/CategoriesContext';
import { useTheme } from '../../context/ThemeContext';
import { ExpenseCalendar } from '../../components/ExpenseCalendarModal';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const FILTERS = ['Ngày', 'Tuần', 'Tháng', 'Tùy chỉnh'];

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}


/* ── So sánh ngày được chọn vs ngày trước đó (3 cột) ── */
function DayCompareCard({ expenses, total, selectedDay, todayStr, styles }: { expenses: any[]; total: number; selectedDay: Date; todayStr: string; styles: any }) {
  const { colors } = useTheme();
  const isToday = toLocalDateStr(selectedDay) === todayStr;
  const prevDay = new Date(selectedDay);
  prevDay.setDate(selectedDay.getDate() - 1);
  const prevTotal = expenses
    .filter(e => toLocalDateStr(new Date(e.created_at)) === toLocalDateStr(prevDay))
    .reduce((s: number, e: any) => s + e.amount, 0);
  const diff = total - prevTotal;
  const isMore = diff > 0;
  const pct = prevTotal > 0 ? Math.abs(Math.round((diff / prevTotal) * 100)) : 0;
  const currentLabel = isToday ? 'Hôm nay' : `${selectedDay.getDate()}/${selectedDay.getMonth()+1}`;
  const prevLabel    = isToday ? 'Hôm qua'  : `${prevDay.getDate()}/${prevDay.getMonth()+1}`;

  return (
    <View style={styles.weekCompareCard}>
      <View style={styles.weekCmpItem}>
        <Text style={styles.weekCmpLbl}>{currentLabel}</Text>
        <Text style={styles.weekCmpVal}>{formatVNDShort(total)}</Text>
      </View>
      <View style={styles.weekCmpDivider} />
      <View style={styles.weekCmpItem}>
        <Text style={styles.weekCmpLbl}>{prevLabel}</Text>
        <Text style={[styles.weekCmpVal, { color: colors.textMuted, fontSize: 15 }]}>
          {prevTotal > 0 ? formatVNDShort(prevTotal) : '—'}
        </Text>
      </View>
      <View style={styles.weekCmpDivider} />
      <View style={styles.weekCmpItem}>
        <Text style={styles.weekCmpLbl}>So sánh</Text>
        {prevTotal === 0 ? (
          <Text style={[styles.weekCmpVal, { color: colors.textMuted, fontSize: 13 }]}>—</Text>
        ) : (
          <View style={[styles.weekCmpBadge, { backgroundColor: isMore ? 'rgba(251,191,36,0.12)' : 'rgba(52,211,153,0.12)' }]}>
            <Text style={[styles.weekCmpBadgeText, { color: isMore ? '#fbbf24' : '#34d399' }]}>
              {isMore ? `+${pct}%` : `-${pct}%`} {isMore ? '😬' : '🎉'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ── So sánh tuần đang xem vs tuần trước đó ── */
function WeekCompareCard({ expenses, total, weekStart, weekOffset, styles }: {
  expenses: any[]; total: number; weekStart: Date; weekOffset: number; styles: any;
}) {
  const { colors } = useTheme();
  const prevStart = new Date(weekStart); prevStart.setDate(weekStart.getDate() - 7);
  const prevEnd   = new Date(weekStart); prevEnd.setMilliseconds(-1);
  const prevTotal = expenses
    .filter(e => { const d = new Date(e.created_at); return d >= prevStart && d <= prevEnd; })
    .reduce((s: number, e: any) => s + e.amount, 0);
  const diff = total - prevTotal;
  const isMore = diff > 0;
  const pct = prevTotal > 0 ? Math.abs(Math.round((diff / prevTotal) * 100)) : 0;

  const currentLabel = weekOffset === 0 ? 'Tuần này' : 'Tuần trước';
  const prevLabel    = weekOffset === 0 ? 'Tuần trước' : 'Tuần trước đó';

  return (
    <View style={styles.weekCompareCard}>
      <View style={styles.weekCmpItem}>
        <Text style={styles.weekCmpLbl}>{currentLabel}</Text>
        <Text style={styles.weekCmpVal}>{formatVNDShort(total)}</Text>
      </View>
      <View style={styles.weekCmpDivider} />
      <View style={styles.weekCmpItem}>
        <Text style={styles.weekCmpLbl}>{prevLabel}</Text>
        <Text style={[styles.weekCmpVal, { color: colors.textMuted, fontSize: 15 }]}>
          {prevTotal > 0 ? formatVNDShort(prevTotal) : '—'}
        </Text>
      </View>
      <View style={styles.weekCmpDivider} />
      <View style={styles.weekCmpItem}>
        <Text style={styles.weekCmpLbl}>So sánh</Text>
        {prevTotal === 0 ? (
          <Text style={[styles.weekCmpVal, { color: colors.textMuted, fontSize: 13 }]}>—</Text>
        ) : (
          <View style={[styles.weekCmpBadge, { backgroundColor: isMore ? 'rgba(251,191,36,0.12)' : 'rgba(52,211,153,0.12)' }]}>
            <Text style={[styles.weekCmpBadgeText, { color: isMore ? '#fbbf24' : '#34d399' }]}>
              {isMore ? `+${pct}%` : `-${pct}%`} {isMore ? '😬' : '🎉'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ── Pie chart danh mục — dùng chung 4 tab ── */
function PieCategoryChart({ data, total, title, styles }: { data: any[]; total: number; title: string; styles: any }) {
  if (data.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chartCard}>
        <View style={styles.pieWrap}>
          <VictoryPie data={data} width={240} height={240} padding={30} colorScale={data.map((d: any) => d.color)} padAngle={2} labelRadius={65} labels={({ datum }) => total > 0 && (datum.y / total) >= 0.05 ? `${Math.round((datum.y / total) * 100)}%` : ''} style={{ labels: { fontSize: 12, fill: '#ffffff', fontWeight: '700' } }} animate={false} />
          <View style={styles.pieLegend}>
            {data.map((d: any) => (
              <View key={d.category} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                <Text style={styles.legendName}>{d.x}</Text>
                <Text style={styles.legendPct}>{total > 0 ? Math.round((d.y / total) * 100) : 0}%</Text>
                <Text style={styles.legendAmt}>{formatVNDShort(d.y)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const { expenses, loading: expensesLoading } = useExpenses();
  const { profile, loading: profileLoading } = useProfile();
  const [showLoader, setShowLoader] = useState(true);
  const [timerDone, setTimerDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimerDone(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (timerDone && !profileLoading && !expensesLoading) {
      setShowLoader(false);
    }
  }, [timerDone, profileLoading, expensesLoading]);
  const { categories: allCategories, getCategoryLabel, getCategoryColor, getCategoryEmoji } = useCategories();
  const [filter, setFilter] = useState('Ngày');
  const [showTxDetail, setShowTxDetail] = useState(false);

  const txDetailAnim = useRef(new Animated.Value(0)).current;
  const rangeModalAnim = useRef(new Animated.Value(0)).current;
  const dayPickerAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback((anim: Animated.Value) => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, []);

  // Custom range
  const [customStart, setCustomStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; });
  const [customEnd, setCustomEnd] = useState(() => { const d = new Date(); d.setHours(23,59,59,999); return d; });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [showDayPicker, setShowDayPicker] = useState(false);

  useEffect(() => { if (showTxDetail) fadeIn(txDetailAnim); }, [showTxDetail]);
  useEffect(() => { if (showRangeModal) fadeIn(rangeModalAnim); }, [showRangeModal]);
  useEffect(() => { if (showDayPicker) fadeIn(dayPickerAnim); }, [showDayPicker]);

  const [weekOffset, setWeekOffset] = useState(0); // 0 = tuần này, -1 = tuần trước...
  const [monthOffset, setMonthOffset] = useState(0); // 0 = tháng này, -1 = tháng trước...
  const [showTrend, setShowTrend] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const todayStr = toLocalDateStr(now);
  const month = now.getMonth();
  const year = now.getFullYear();

  // Tháng đang xem (month tab)
  const { viewMonth, viewYear } = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return { viewMonth: d.getMonth(), viewYear: d.getFullYear() };
  }, [now, monthOffset]);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = new Date();
      if (toLocalDateStr(next) !== todayStr) {
        setNow(next);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [todayStr]);

  // T2 của tuần hiện tại + offset
  const weekStart = useMemo(() => {
    const d = new Date(now);
    const dow = d.getDay(); // 0=CN,1=T2...
    const diffToMon = (dow + 6) % 7; // khoảng cách tới T2
    d.setDate(d.getDate() - diffToMon + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now, weekOffset]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStart]);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.created_at);
      if (filter === 'Ngày') return toLocalDateStr(new Date(e.created_at)) === toLocalDateStr(selectedDay);
      if (filter === 'Tuần') return d >= weekStart && d <= weekEnd;
      if (filter === 'Tùy chỉnh') return d >= customStart && d <= customEnd;
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });
  }, [expenses, filter, selectedDay, todayStr, viewMonth, viewYear, customStart, customEnd, weekStart, weekEnd]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const budget = profile?.monthly_budget ?? 10_000_000;
  const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Bug #3: tab Tuần luôn show 7 ngày → daysElapsed = 7
  const daysElapsed =
    filter === 'Ngày'      ? 1 :
    filter === 'Tuần'      ? 7 :
    filter === 'Tùy chỉnh' ? Math.max(Math.floor((customEnd.getTime() - customStart.getTime()) / 86400000) + 1, 1) :
    monthOffset < 0        ? daysInViewMonth : now.getDate();
  const avgPerDay = total > 0 ? total / Math.max(daysElapsed, 1) : 0;

  /* ── Tháng trước (so với tháng đang xem) ── */
  const lastMonthTotal = useMemo(() => {
    const lm = viewMonth === 0 ? 11 : viewMonth - 1;
    const ly = viewMonth === 0 ? viewYear - 1 : viewYear;
    return expenses
      .filter(e => { const d = new Date(e.created_at); return d.getMonth() === lm && d.getFullYear() === ly; })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, viewMonth, viewYear]);

  const monthDiff = total - lastMonthTotal;
  const monthIsMore = monthDiff > 0;
  const monthPct = lastMonthTotal > 0 ? Math.abs(Math.round((monthDiff / lastMonthTotal) * 100)) : 0;

  /* ── Slope insight (chỉ tháng hiện tại) ── */
  const slopeInsight = useMemo(() => {
    if (monthOffset !== 0) return null; // Không có slope cho tháng đã qua
    if (now.getDate() < 7) return null;
    const halfway = Math.floor(now.getDate() / 2);
    const firstHalf = expenses
      .filter(e => { const d = new Date(e.created_at); return d.getMonth() === viewMonth && d.getFullYear() === viewYear && d.getDate() <= halfway; })
      .reduce((s, e) => s + e.amount, 0);
    const secondHalf = expenses
      .filter(e => { const d = new Date(e.created_at); return d.getMonth() === viewMonth && d.getFullYear() === viewYear && d.getDate() > halfway; })
      .reduce((s, e) => s + e.amount, 0);
    const rateFirst = firstHalf / halfway;
    const rateSecond = secondHalf / Math.max(now.getDate() - halfway, 1);
    if (rateSecond > rateFirst * 1.2) return { text: 'Slope dốc — đang tiêu nhanh hơn 🚨', color: '#ef4444', bg: '#fef2f2' };
    if (rateSecond < rateFirst * 0.8) return { text: 'Slope giảm — đang kiểm soát tốt hơn 👍', color: '#34d399', bg: 'rgba(52,211,153,0.12)' };
    return { text: 'Slope đều — chi tiêu ổn định 💪', color: '#818cf8', bg: 'rgba(129,140,248,0.15)' };
  }, [expenses, viewMonth, viewYear, monthOffset, now]);

  /* ── Pre-group expenses theo ngày — O(n) một lần, lookup O(1) ── */
  const expensesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const key = toLocalDateStr(new Date(e.created_at));
      map[key] = (map[key] ?? 0) + e.amount;
    });
    return map;
  }, [expenses]);

  /* ── Bar & Line data ── */
  const dayNames = ['CN','T2','T3','T4','T5','T6','T7'];

  const weekBarData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      const dStr = toLocalDateStr(d);
      return { x: `${d.getDate()}/${d.getMonth()+1}\n${dayNames[d.getDay()]}`, y: (expensesByDate[dStr] ?? 0) / 1000 };
    });
  }, [expensesByDate, weekStart]);

  const lineData = useMemo(() => {
    const numDays = monthOffset < 0 ? daysInViewMonth : now.getDate();
    let cum = 0;
    return Array.from({ length: numDays }, (_, i) => {
      const d = new Date(viewYear, viewMonth, i + 1);
      cum += expensesByDate[toLocalDateStr(d)] ?? 0;
      return { x: i + 1, y: cum / 1_000_000 };
    });
  }, [expensesByDate, viewYear, viewMonth, monthOffset, daysInViewMonth, now]);

  /* ── Custom bar data ── */
  const customBarData = useMemo(() => {
    const dayMs = 86400000;
    const diffDays = Math.min(Math.floor((customEnd.getTime() - customStart.getTime()) / dayMs) + 1, 90);
    return Array.from({ length: diffDays }, (_, i) => {
      const d = new Date(customStart); d.setDate(customStart.getDate() + i);
      const dStr = toLocalDateStr(d);
      return { x: `${d.getDate()}/${d.getMonth()+1}\n${dayNames[d.getDay()]}`, y: (expensesByDate[dStr] ?? 0) / 1000 };
    });
  }, [expensesByDate, customStart, customEnd]);

  const customPeakBar = useMemo(() => {
    if (customBarData.every(d => d.y === 0)) return null;
    return customBarData.reduce((max, d) => d.y > max.y ? d : max, customBarData[0]);
  }, [customBarData]);


  /* ── Pie data ── */
  const pieData = useMemo(() => {
    const by: Record<string, number> = {};
    filtered.forEach(e => { by[e.category] = (by[e.category] ?? 0) + e.amount; });
    return Object.entries(by).sort(([, a], [, b]) => b - a).slice(0, 5).map(([cat, val]) => ({
      x: getCategoryLabel(cat),
      y: val, color: getCategoryColor(cat), category: cat,
    }));
  }, [filtered, allCategories]);
  const pieTotal = pieData.reduce((s, d) => s + d.y, 0);

  const peakDay = useMemo(() => {
    if (weekBarData.every(d => d.y === 0)) return null;
    return weekBarData.reduce((max, d) => d.y > max.y ? d : max, weekBarData[0]);
  }, [weekBarData]);

  const budgetLine = budget / 1_000_000;

  const styles = makeStyles(colors);

  return (
    <View style={styles.root}>
      {/* HEADER - fixed */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#FFD000', '#FFE234', '#FFF0A0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
        <View style={styles.orb1} pointerEvents="none" />
        <View style={styles.orb2} pointerEvents="none" />
        <View style={styles.orb3} pointerEvents="none" />
        <Text style={styles.headerTitle}>Báo cáo chi tiêu</Text>
        <Text style={styles.headerSub}>Phân tích chi tiêu theo danh mục và thời gian</Text>
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => { setFilter(f); if (f === 'Tùy chỉnh') setShowRangeModal(true); }}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── NGÀY ── */}
        {filter === 'Ngày' && (
          <View style={styles.periodBody}>
            {/* 1. Hero card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Text style={styles.periodLbl}>
                  {toLocalDateStr(selectedDay) === todayStr ? 'HÔM NAY' : `NGÀY ${selectedDay.getDate()}/${selectedDay.getMonth()+1}`}
                </Text>
                <TouchableOpacity onPress={() => setShowDayPicker(true)} style={styles.editRangeBtn}>
                  <Text style={styles.editRangeBtnText}>{selectedDay.getDate()}/{selectedDay.getMonth()+1}/{selectedDay.getFullYear()} ›</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.heroAmt}>{formatVND(total)}</Text>
              <TouchableOpacity onPress={() => filtered.length > 0 && setShowTxDetail(true)} style={[styles.txBtn, filtered.length > 0 && styles.txBtnActive]} activeOpacity={0.7}>
                <Text style={[styles.txBtnText, filtered.length > 0 && styles.txBtnTextActive]}>🧾 {filtered.length} giao dịch{filtered.length > 0 ? ' →' : ''}</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Compare card */}
            {total > 0 && toLocalDateStr(selectedDay) === todayStr && <DayCompareCard expenses={expenses} total={total} selectedDay={selectedDay} todayStr={todayStr} styles={styles} />}

            {/* 3. (Không có biểu đồ cho 1 ngày) */}

            {/* 4. Pie */}
            <PieCategoryChart data={pieData} total={pieTotal} title={toLocalDateStr(selectedDay) === todayStr ? 'Tiêu vào đâu hôm nay?' : `Tiêu vào đâu ngày ${selectedDay.getDate()}/${selectedDay.getMonth()+1}?`} styles={styles} />
            {pieData.length === 0 && (
              <View style={styles.empty}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text>
                <Text style={styles.emptyTitle}>{toLocalDateStr(selectedDay) === todayStr ? 'Hôm nay chưa có giao dịch' : `Ngày ${selectedDay.getDate()}/${selectedDay.getMonth()+1} không có giao dịch`}</Text>
                <Text style={styles.emptySub}>Ghi lại mỗi khoản chi — cậu sẽ ngạc nhiên khi nhìn lại</Text>
              </View>
            )}
            <View style={{ height: 100 }} />
          </View>
        )}

        {/* ── TUẦN ── */}
        {filter === 'Tuần' && (
          <View style={styles.periodBody}>
            {/* 1. Hero card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Text style={styles.periodLbl}>
                  {weekOffset === 0 ? 'TUẦN NÀY' : weekOffset === -1 ? 'TUẦN TRƯỚC' : 'TUẦN TRƯỚC'}
                </Text>
                <View style={styles.heroNavInline}>
                  <TouchableOpacity onPress={() => setWeekOffset(o => o - 1)} style={styles.weekNavBtn}>
                    <Text style={styles.weekNavArrow}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.editRangeBtnText}>{weekStart.getDate()}/{weekStart.getMonth()+1} – {weekEnd.getDate()}/{weekEnd.getMonth()+1}</Text>
                  <TouchableOpacity onPress={() => setWeekOffset(o => Math.min(o + 1, 0))} style={styles.weekNavBtn} disabled={weekOffset === 0}>
                    <Text style={[styles.weekNavArrow, weekOffset === 0 && { opacity: 0.25 }]}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.heroAmt}>{formatVND(total)}</Text>
              {total > 0 && (
                <View style={styles.customMetaRow}>
                  <Text style={styles.customMetaText}>Trung bình {formatVNDShort(avgPerDay)}/ngày</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => filtered.length > 0 && setShowTxDetail(true)} style={[styles.txBtn, filtered.length > 0 && styles.txBtnActive]} activeOpacity={0.7}>
                <Text style={[styles.txBtnText, filtered.length > 0 && styles.txBtnTextActive]}>🧾 {filtered.length} giao dịch{filtered.length > 0 ? ' →' : ''}</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Compare card — chỉ hiện ở tuần hiện tại */}
            {weekOffset === 0 && <WeekCompareCard expenses={expenses} total={total} weekStart={weekStart} weekOffset={weekOffset} styles={styles} />}

            {/* 3. Bar chart */}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Chi tiêu theo ngày</Text>
                {peakDay && <View style={styles.peakBadge}><Text style={styles.peakBadgeText}>🔴 {peakDay.x.split('\n')[0]} cao nhất</Text></View>}
              </View>
              <View style={styles.chartCard}>
                {weekBarData.every(d => d.y === 0) ? (
                  <View style={styles.emptyChart}><Text style={styles.emptyText}>Chưa có dữ liệu</Text></View>
                ) : (
                  <VictoryChart width={width - 64} height={230} theme={VictoryTheme.material} domainPadding={{ x: 16 }} padding={{ top: 36, bottom: 36, left: 48, right: 16 }}>
                    <VictoryAxis style={{ axis: { stroke: 'rgba(129,140,248,0.2)' }, tickLabels: { fontSize: 10, fill: colors.textMuted, fontFamily: 'System' }, grid: { stroke: 'transparent' } }} />
                    <VictoryAxis dependentAxis tickFormat={t => `${t}k`} style={{ axis: { stroke: 'transparent' }, tickLabels: { fontSize: 10, fill: colors.textMuted, fontFamily: 'System' }, grid: { stroke: colors.divider, strokeDasharray: '4' } }} />
                    <VictoryBar data={weekBarData} style={{ data: { fill: ({ datum }) => peakDay && datum.x === peakDay.x ? '#ef4444' : '#818cf8' } }} cornerRadius={{ top: 6 }} animate={false}
                      labels={({ datum }) => datum.y > 0 ? `${Math.round(datum.y)}k` : ''}
                      labelComponent={<VictoryLabel dy={-4} style={{ fontSize: 9, fill: '#818cf8', fontFamily: 'System', fontWeight: '700' }} />}
                    />
                  </VictoryChart>
                )}
              </View>
            </View>

            {/* 4. Pie */}
            <PieCategoryChart data={pieData} total={pieTotal} title="Tiêu vào đâu?" styles={styles} />
            {pieData.length === 0 && (
              <View style={styles.empty}><Text style={{ fontSize: 48, marginBottom: 12 }}>📊</Text><Text style={styles.emptyTitle}>Chưa có dữ liệu</Text><Text style={styles.emptySub}>Thêm chi tiêu để xem thống kê</Text></View>
            )}
            <View style={{ height: 100 }} />
          </View>
        )}

        {/* ── THÁNG ── */}
        {filter === 'Tháng' && (
          <View style={styles.periodBody}>
            {/* 1. Hero card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Text style={styles.periodLbl}>
                  {monthOffset === 0 ? 'THÁNG NÀY' : monthOffset === -1 ? 'THÁNG TRƯỚC' : 'THÁNG TRƯỚC'}
                </Text>
                <View style={styles.heroNavInline}>
                  <TouchableOpacity onPress={() => setMonthOffset(o => o - 1)} style={styles.weekNavBtn}>
                    <Text style={styles.weekNavArrow}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.editRangeBtnText}>T{viewMonth + 1}/{viewYear}</Text>
                  <TouchableOpacity onPress={() => setMonthOffset(o => Math.min(o + 1, 0))} style={styles.weekNavBtn} disabled={monthOffset === 0}>
                    <Text style={[styles.weekNavArrow, monthOffset === 0 && { opacity: 0.25 }]}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.heroAmt}>{formatVND(total)}</Text>
              {total > 0 && (
                <View style={styles.customMetaRow}>
                  <Text style={styles.customMetaText}>Trung bình {formatVNDShort(avgPerDay)}/ngày</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => filtered.length > 0 && setShowTxDetail(true)} style={[styles.txBtn, filtered.length > 0 && styles.txBtnActive]} activeOpacity={0.7}>
                <Text style={[styles.txBtnText, filtered.length > 0 && styles.txBtnTextActive]}>🧾 {filtered.length} giao dịch{filtered.length > 0 ? ' →' : ''}</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Compare card — chỉ hiện ở tháng hiện tại */}
            {monthOffset === 0 && <View style={styles.weekCompareCard}>
              <View style={styles.weekCmpItem}>
                <Text style={styles.weekCmpLbl}>THÁNG NÀY</Text>
                <Text style={styles.weekCmpVal}>{formatVNDShort(total)}</Text>
              </View>
              <View style={styles.weekCmpDivider} />
              <View style={styles.weekCmpItem}>
                <Text style={styles.weekCmpLbl}>THÁNG TRƯỚC</Text>
                <Text style={[styles.weekCmpVal, { color: colors.textMuted, fontSize: 15 }]}>
                  {lastMonthTotal > 0 ? formatVNDShort(lastMonthTotal) : '—'}
                </Text>
              </View>
              <View style={styles.weekCmpDivider} />
              <View style={styles.weekCmpItem}>
                <Text style={styles.weekCmpLbl}>So sánh</Text>
                {lastMonthTotal === 0 ? (
                  <Text style={[styles.weekCmpVal, { color: colors.textMuted, fontSize: 13 }]}>—</Text>
                ) : (
                  <View style={[styles.weekCmpBadge, { backgroundColor: monthIsMore ? 'rgba(251,191,36,0.12)' : 'rgba(52,211,153,0.12)' }]}>
                    <Text style={[styles.weekCmpBadgeText, { color: monthIsMore ? '#fbbf24' : '#34d399' }]}>
                      {monthIsMore ? `+${monthPct}%` : `-${monthPct}%`} {monthIsMore ? '😬' : '🎉'}
                    </Text>
                  </View>
                )}
              </View>
            </View>}

            {/* 3. Calendar */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chi tiêu theo ngày</Text>
              <View style={styles.chartCard}>
                <ExpenseCalendar fixedYear={viewYear} fixedMonth={viewMonth} />
              </View>
            </View>

            {/* 4. Pie */}
            <PieCategoryChart data={pieData} total={pieTotal} title="Tiêu vào đâu?" styles={styles} />
            {pieData.length === 0 && (
              <View style={styles.empty}><Text style={{ fontSize: 48, marginBottom: 12 }}>📊</Text><Text style={styles.emptyTitle}>Chưa có dữ liệu</Text><Text style={styles.emptySub}>Thêm chi tiêu để xem thống kê</Text></View>
            )}

            {/* 5. Line chart xu hướng — collapsible */}
            {lineData.length >= 2 && (
              <View style={styles.section}>
                <TouchableOpacity style={styles.trendToggle} onPress={() => setShowTrend(v => !v)} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trendToggleTitle}>Xu hướng tích lũy</Text>
                    {slopeInsight && <Text style={[styles.trendToggleSub, { color: slopeInsight.color }]}>{slopeInsight.text}</Text>}
                  </View>
                  <Text style={styles.trendToggleArrow}>{showTrend ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showTrend && (
                  <View style={styles.chartCard}>
                    <VictoryChart width={width - 64} height={200} theme={VictoryTheme.material} padding={{ top: 20, bottom: 36, left: 56, right: 24 }} domain={{ y: [0, Math.max(budgetLine * 1.1, (lineData[lineData.length - 1]?.y ?? 0) * 1.1)] }}>
                      <VictoryAxis tickCount={6} style={{ axis: { stroke: 'rgba(129,140,248,0.2)' }, tickLabels: { fontSize: 10, fill: colors.textMuted, fontFamily: 'System' }, grid: { stroke: 'transparent' } }} />
                      <VictoryAxis dependentAxis tickFormat={t => `${t}tr`} style={{ axis: { stroke: 'transparent' }, tickLabels: { fontSize: 10, fill: colors.textMuted, fontFamily: 'System' }, grid: { stroke: colors.divider, strokeDasharray: '4' } }} />
                      <VictoryLine data={[{ x: 1, y: budgetLine }, { x: monthOffset < 0 ? daysInViewMonth : now.getDate(), y: budgetLine }]} style={{ data: { stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '6 4', opacity: 0.5 } }} />
                      <VictoryArea data={lineData} style={{ data: { fill: '#818cf8', fillOpacity: 0.1, stroke: '#818cf8', strokeWidth: 2.5 } }} animate={false} />
                    </VictoryChart>
                    <View style={styles.budgetLineLabel}>
                      <View style={styles.budgetLineDash} />
                      <Text style={styles.budgetLineLabelText}>Ngân sách {formatVNDShort(budget)}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 100 }} />
          </View>
        )}

        {/* ── TÙY CHỈNH ── */}
        {filter === 'Tùy chỉnh' && (() => {
          return (
          <View style={styles.periodBody}>
            {/* 1. Hero card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Text style={styles.periodLbl}>KỲ TÙY CHỈNH</Text>
                <TouchableOpacity onPress={() => setShowRangeModal(true)} style={styles.editRangeBtn}>
                  <Text style={styles.editRangeBtnText}>{customStart.getDate()}/{customStart.getMonth()+1} — {customEnd.getDate()}/{customEnd.getMonth()+1} ›</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.heroAmt}>{formatVND(total)}</Text>
              <TouchableOpacity onPress={() => filtered.length > 0 && setShowTxDetail(true)} style={[styles.txBtn, filtered.length > 0 && styles.txBtnActive]} activeOpacity={0.7}>
                <Text style={[styles.txBtnText, filtered.length > 0 && styles.txBtnTextActive]}>🧾 {filtered.length} giao dịch{filtered.length > 0 ? ' →' : ''}</Text>
              </TouchableOpacity>
            </View>

            {/* 3. Bar chart */}
            {customBarData.some(d => d.y > 0) && (
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Chi tiêu theo ngày</Text>
                  {customPeakBar && <View style={styles.peakBadge}><Text style={styles.peakBadgeText}>🔴 {customPeakBar.x.split('\n')[0]} cao nhất</Text></View>}
                </View>
                <View style={[styles.chartCard, { padding: 0, overflow: 'hidden' }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
                    <VictoryChart width={Math.max(width - 64, customBarData.length * 52)} height={230} theme={VictoryTheme.material} domainPadding={{ x: 20 }} padding={{ top: 36, bottom: 40, left: 48, right: 16 }}>
                      <VictoryAxis style={{ axis: { stroke: 'rgba(129,140,248,0.2)' }, tickLabels: { fontSize: 10, fill: colors.textMuted, fontFamily: 'System' }, grid: { stroke: 'transparent' } }} />
                      <VictoryAxis dependentAxis tickFormat={t => `${t}k`} style={{ axis: { stroke: 'transparent' }, tickLabels: { fontSize: 10, fill: colors.textMuted, fontFamily: 'System' }, grid: { stroke: colors.divider, strokeDasharray: '4' } }} />
                      <VictoryBar data={customBarData} style={{ data: { fill: ({ datum }) => customPeakBar && datum.x === customPeakBar.x ? '#ef4444' : '#818cf8' } }} cornerRadius={{ top: 6 }} animate={false}
                        labels={({ datum }) => datum.y > 0 ? `${Math.round(datum.y)}k` : ''}
                        labelComponent={<VictoryLabel dy={-4} style={{ fontSize: 9, fill: '#818cf8', fontFamily: 'System', fontWeight: '700' }} />}
                      />
                    </VictoryChart>
                  </ScrollView>
                </View>
              </View>
            )}

            {/* 4. Pie */}
            <PieCategoryChart data={pieData} total={pieTotal} title="Tiêu vào đâu?" styles={styles} />
            {pieData.length === 0 && (
              <View style={styles.empty}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text>
                <Text style={styles.emptyTitle}>Không có giao dịch</Text>
                <Text style={styles.emptySub}>trong khoảng thời gian này</Text>
              </View>
            )}
            <View style={{ height: 100 }} />
          </View>
          );
        })()}

      </ScrollView>

      {/* ── Modal chi tiết giao dịch (dùng chung Ngày + Tùy chỉnh) ── */}
      <Modal visible={showTxDetail} transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={() => setShowTxDetail(false)}>
        <Animated.View style={[styles.modalContainer, { opacity: txDetailAnim }]}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowTxDetail(false)} />
          <Animated.View style={[styles.modalSheet, { opacity: txDetailAnim, transform: [{ translateY: txDetailAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {filter === 'Ngày'
                  ? (toLocalDateStr(selectedDay) === todayStr ? 'Giao dịch hôm nay' : `Ngày ${selectedDay.getDate()}/${selectedDay.getMonth()+1}/${selectedDay.getFullYear()}`)
                  : filter === 'Tuần'
                  ? (weekOffset === 0 ? 'Tuần này' : weekOffset === -1 ? 'Tuần trước' : `${weekStart.getDate()}/${weekStart.getMonth()+1}`)
                  : filter === 'Tháng'
                  ? `Tháng ${viewMonth + 1}/${viewYear}`
                  : `${customStart.getDate()}/${customStart.getMonth()+1} — ${customEnd.getDate()}/${customEnd.getMonth()+1}/${customEnd.getFullYear()}`}
              </Text>
              <TouchableOpacity onPress={() => setShowTxDetail(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {[...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(e => {
                const catLabel = getCategoryLabel(e.category);
                const d = new Date(e.created_at);
                const timeStr = filter === 'Ngày'
                  ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  : `${d.getDate()}/${d.getMonth()+1} · ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
                const color = getCategoryColor(e.category);
                return (
                  <View key={e.id} style={styles.modalItem}>
                    <View style={[styles.modalItemIcon, { backgroundColor: color + '1a' }]}>
                      <Text style={{ fontSize: 20 }}>{getCategoryEmoji(e.category)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemNote} numberOfLines={1}>{e.note || catLabel}</Text>
                      <Text style={styles.modalItemCat}>{catLabel} · {timeStr}</Text>
                    </View>
                    <Text style={[styles.modalItemAmt, { color }]}>-{formatVNDShort(e.amount)}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* ── Modal chọn khoảng thời gian (không lồng modal) ── */}
      <Modal visible={showRangeModal} transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={() => { setShowRangeModal(false); setShowStartPicker(false); setShowEndPicker(false); }}>
        <Animated.View style={[styles.modalContainer, { opacity: rangeModalAnim }]}>
          <Pressable style={styles.modalOverlay} onPress={() => { setShowRangeModal(false); setShowStartPicker(false); setShowEndPicker(false); }} />
          <Animated.View style={[styles.modalSheet, { maxHeight: '85%', opacity: rangeModalAnim, transform: [{ translateY: rangeModalAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showStartPicker ? 'Từ ngày' : showEndPicker ? 'Đến ngày' : 'Chọn khoảng thời gian'}
              </Text>
              <TouchableOpacity onPress={() => {
                if (showStartPicker) { setShowStartPicker(false); }
                else if (showEndPicker) { setShowEndPicker(false); }
                else { setShowRangeModal(false); }
              }}>
                <Text style={styles.modalClose}>{showStartPicker || showEndPicker ? '← Quay lại' : '✕'}</Text>
              </TouchableOpacity>
            </View>

            {!showStartPicker && !showEndPicker && (
              <>
                <Text style={styles.rangeModalSectionLbl}>Chọn nhanh</Text>
                <View style={styles.presetRow}>
                  {[
                    { label: '3 ngày qua', onPress: () => { const s = new Date(now); s.setDate(now.getDate()-2); s.setHours(0,0,0,0); const e = new Date(now); e.setHours(23,59,59,999); setCustomStart(s); setCustomEnd(e); setShowRangeModal(false); } },
                { label: '7 ngày qua', onPress: () => { const s = new Date(now); s.setDate(now.getDate()-6); s.setHours(0,0,0,0); const e = new Date(now); e.setHours(23,59,59,999); setCustomStart(s); setCustomEnd(e); setShowRangeModal(false); } },
                    { label: '30 ngày qua', onPress: () => { const s = new Date(now); s.setDate(now.getDate()-29); s.setHours(0,0,0,0); const e = new Date(now); e.setHours(23,59,59,999); setCustomStart(s); setCustomEnd(e); setShowRangeModal(false); } },
                    { label: 'Tháng này', onPress: () => { const s = new Date(year, month, 1); const e = new Date(now); e.setHours(23,59,59,999); setCustomStart(s); setCustomEnd(e); setShowRangeModal(false); } },
                    { label: 'Tháng trước', onPress: () => { const pm = month === 0 ? 11 : month-1; const py = month === 0 ? year-1 : year; const s = new Date(py, pm, 1); const e = new Date(py, pm+1, 0, 23, 59, 59, 999); setCustomStart(s); setCustomEnd(e); setShowRangeModal(false); } },
                  ].map(p => (
                    <TouchableOpacity key={p.label} style={styles.presetChip} onPress={p.onPress}>
                      <Text style={styles.presetChipText}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.rangeModalSectionLbl}>Hoặc chọn ngày</Text>
                <View style={styles.customRangeRow}>
                  <TouchableOpacity style={styles.customDateBtn} onPress={() => setShowStartPicker(true)}>
                    <Text style={styles.customDateLbl}>Từ ngày</Text>
                    <Text style={styles.customDateVal}>{customStart.getDate()}/{customStart.getMonth()+1}/{customStart.getFullYear()}</Text>
                  </TouchableOpacity>
                  <Text style={styles.customRangeSep}>→</Text>
                  <TouchableOpacity style={styles.customDateBtn} onPress={() => setShowEndPicker(true)}>
                    <Text style={styles.customDateLbl}>Đến ngày</Text>
                    <Text style={styles.customDateVal}>{customEnd.getDate()}/{customEnd.getMonth()+1}/{customEnd.getFullYear()}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.dateModalBtn} onPress={() => setShowRangeModal(false)}>
                  <Text style={styles.dateModalBtnText}>Xem kết quả</Text>
                </TouchableOpacity>
              </>
            )}

            {showStartPicker && (
              <>
                <DateTimePicker value={customStart} mode="date" display="spinner" maximumDate={customEnd}
                  onChange={(_, date) => { if (date) { const d = new Date(date); d.setHours(0,0,0,0); setCustomStart(d); } }} />
                <TouchableOpacity style={styles.dateModalBtn} onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.dateModalBtnText}>Xong</Text>
                </TouchableOpacity>
              </>
            )}

            {showEndPicker && (
              <>
                <DateTimePicker value={customEnd} mode="date" display="spinner" minimumDate={customStart} maximumDate={new Date()}
                  onChange={(_, date) => { if (date) { const d = new Date(date); d.setHours(23,59,59,999); setCustomEnd(d); } }} />
                <TouchableOpacity style={styles.dateModalBtn} onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.dateModalBtnText}>Xong</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={{ height: 24 }} />
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* ── Modal chọn ngày (tab Ngày) ── */}
      <Modal visible={showDayPicker} transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={() => setShowDayPicker(false)}>
        <Animated.View style={{ flex: 1, opacity: dayPickerAnim }}>
          <Pressable style={styles.dateModalOverlay} onPress={() => setShowDayPicker(false)}>
          <Pressable style={styles.dateModalSheet}>
            <Text style={styles.dateModalTitle}>Chọn ngày</Text>
            <DateTimePicker
              value={selectedDay}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_, date) => {
                if (date) { const d = new Date(date); d.setHours(0,0,0,0); setSelectedDay(d); }
              }}
            />
            <TouchableOpacity style={styles.dateModalBtn} onPress={() => setShowDayPicker(false)}>
              <Text style={styles.dateModalBtnText}>Xong</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
        </Animated.View>
      </Modal>

      {showLoader && <CoinLoader />}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  orb1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.18)', top: -60, right: -40 },
  orb2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)', top: 30, right: 80 },
  orb3: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(180,120,0,0.12)', bottom: 20, left: -20 },
  header: { backgroundColor: colors.surface, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTitle: { fontSize: 24, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 4 },
  headerSub: { fontSize: 13, color: colors.textSecondary, fontFamily: Fonts.medium, marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: { flex: 1, backgroundColor: colors.inputBg, borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  filterTabActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  filterTabText: { fontSize: 13, fontFamily: Fonts.bold, color: colors.textMuted },
  filterTabTextActive: { color: '#fff' },

  /* ── NGÀY ── */
  dayBody: { backgroundColor: colors.bg, padding: 20 },
  dayMainCard: { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  dayLbl: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  dayAmt: { fontSize: 34, fontFamily: Fonts.extraBold, color: colors.textPrimary, letterSpacing: -1.5, marginBottom: 14 },
  dayTrack: { backgroundColor: colors.divider, borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 10 },
  dayFill: { height: 6, borderRadius: 99 },
  dayRemain: { fontSize: 13, fontFamily: Fonts.bold, color: colors.textMuted },
  dayRemainBtn: { alignSelf: 'flex-start', marginTop: 2 },
  dayRemainBtnActive: { backgroundColor: 'rgba(92,61,0,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  dayRemainActive: { color: colors.textPrimary },
  dayRemainLink: { color: colors.textPrimary },
  dayCompareCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  dayCompareText: { fontSize: 13, fontFamily: Fonts.bold, color: colors.textPrimary, marginBottom: 3 },
  dayCompareSub: { fontSize: 11, color: colors.textMuted, fontFamily: Fonts.medium },
  dayCompareBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  dayCompareBadgeText: { fontSize: 12, fontFamily: Fonts.extraBold },
  dayCatCard: { backgroundColor: colors.card, borderRadius: 20, padding: 18, gap: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  dayCatTitle: { fontSize: 14, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 2 },
  dayCatRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayCatDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  dayCatName: { fontSize: 13, fontFamily: Fonts.semiBold, color: colors.textPrimary, flex: 1 },
  dayCatAmt: { fontSize: 14, fontFamily: Fonts.extraBold, color: colors.accent },
  dayEmpty: { alignItems: 'center', paddingVertical: 40 },
  dayEmptyTitle: { fontSize: 16, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 6 },
  dayEmptySub: { fontSize: 13, color: colors.textMuted, fontFamily: Fonts.medium },

  /* ── TUẦN ── */
  weekBody: { backgroundColor: colors.bg, padding: 20 },
  weekCompareCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.cardBorder, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  weekCmpItem: { flex: 1, alignItems: 'center' },
  weekCmpLbl: { fontSize: 10, fontFamily: Fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 5 },
  weekCmpVal: { fontSize: 16, fontFamily: Fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.5 },
  weekCmpDivider: { width: 1, backgroundColor: colors.divider, height: 36, marginHorizontal: 4 },
  weekCmpBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  weekCmpBadgeText: { fontSize: 11, fontFamily: Fonts.extraBold },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  peakBadge: { backgroundColor: colors.dangerBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  peakBadgeText: { fontSize: 10, fontFamily: Fonts.bold, color: colors.danger },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weekNavBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  weekNavArrow: { fontSize: 22, fontFamily: Fonts.bold, color: colors.textPrimary, lineHeight: 26 },
  weekNavLabel: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textMuted, minWidth: 64, textAlign: 'center' },

  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 8 },

  /* ── SHARED HERO CARD (dùng chung 4 tab) ── */
  periodBody: { backgroundColor: colors.bg, padding: 20 },
  heroCard: {
    backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: colors.cardBorder,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  heroNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 6 },
  heroNavInline: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  periodLbl: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroAmt: { fontSize: 34, fontFamily: Fonts.extraBold, color: colors.textPrimary, letterSpacing: -1.5, marginBottom: 14 },
  heroMetrics: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  heroMetricItem: { flex: 1, alignItems: 'center', gap: 3 },
  heroMetricVal: { fontSize: 15, fontFamily: Fonts.extraBold, color: colors.textPrimary },
  heroMetricLbl: { fontSize: 10, fontFamily: Fonts.medium, color: colors.textMuted, textAlign: 'center' },
  heroMetricDiv: { width: 1, height: 32, backgroundColor: colors.divider },
  heroTrack: { backgroundColor: colors.divider, borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 10 },
  heroFill: { height: 6, borderRadius: 99 },
  txBtn: { alignSelf: 'flex-start', marginTop: 2 },
  txBtnActive: { backgroundColor: 'rgba(92,61,0,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  txBtnText: { fontSize: 13, fontFamily: Fonts.bold, color: colors.textMuted },
  txBtnTextActive: { color: colors.textPrimary },
  customMetaRow: { marginBottom: 10 },
  customMetaText: { fontSize: 13, fontFamily: Fonts.medium, color: colors.textMuted },

  /* ── THÁNG ── */
  monthBody: { backgroundColor: colors.bg, padding: 20 },

  monthScoreCard: {
    borderRadius: 20, padding: 20, marginBottom: 20,
    backgroundColor: colors.card,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.cardBorder,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  monthScoreCircle: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.cardBorder },
  monthScoreLbl: { fontSize: 11, color: colors.textSecondary, fontFamily: Fonts.semiBold, marginBottom: 6, position: 'relative', zIndex: 1 },
  monthScoreAmt: { fontSize: 34, fontFamily: Fonts.extraBold, color: colors.textPrimary, letterSpacing: -1.5, marginBottom: 16, position: 'relative', zIndex: 1 },
  monthScoreRow: { flexDirection: 'row', position: 'relative', zIndex: 1 },
  monthScoreItem: { flex: 1, alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.cardBorder },
  monthScoreItemDivider: { width: 8 },
  monthScoreItemVal: { fontSize: 14, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 3 },
  monthScoreItemLbl: { fontSize: 9, color: colors.textMuted, fontFamily: Fonts.semiBold },

  insightBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 10 },
  insightText: { fontSize: 12, fontFamily: Fonts.bold },

  budgetLineLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  budgetLineDash: { width: 20, height: 2, backgroundColor: colors.danger, opacity: 0.5 },
  budgetLineLabelText: { fontSize: 10, color: colors.danger, fontFamily: Fonts.semiBold, opacity: 0.7 },

  monthCmpCard: {
    backgroundColor: colors.card, borderRadius: 20, padding: 20,
    flexDirection: 'row', marginBottom: 20,
    borderWidth: 1, borderColor: colors.cardBorder,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  monthCmpItem: { flex: 1, alignItems: 'center' },
  monthCmpLbl: { fontSize: 10, fontFamily: Fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  monthCmpAmt: { fontSize: 20, fontFamily: Fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.5 },
  monthCmpDivider: { width: 1, backgroundColor: colors.divider, marginHorizontal: 8 },
  monthCmpBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  monthCmpBadgeText: { fontSize: 10, fontFamily: Fonts.extraBold },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 10 },
  chartCard: { backgroundColor: colors.card, borderRadius: 20, padding: 8, borderWidth: 1, borderColor: colors.cardBorder, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 3, alignItems: 'center' },
  pieWrap: { flexDirection: 'column', alignItems: 'center', paddingVertical: 8, alignSelf: 'stretch' },
  pieLegend: { alignSelf: 'stretch', gap: 8, paddingHorizontal: 12, paddingTop: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendName: { fontSize: 12, fontFamily: Fonts.semiBold, color: colors.textPrimary, flex: 1 },
  legendPct: { fontSize: 12, fontFamily: Fonts.extraBold, color: colors.accent, minWidth: 32, textAlign: 'right' },
  legendAmt: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textMuted, minWidth: 56, textAlign: 'right' },
  emptyChart: { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: colors.textMuted, fontFamily: Fonts.semiBold },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.textMuted, fontFamily: Fonts.medium },

  /* ── Modal chi tiết ── */
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,4,30,0.6)' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', paddingTop: 12, paddingHorizontal: 20, maxHeight: '75%', borderWidth: 1, borderColor: colors.cardBorder },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.accentBorder, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontFamily: Fonts.extraBold, color: colors.textPrimary },
  modalClose: { fontSize: 16, color: colors.textMuted, fontFamily: Fonts.bold, paddingHorizontal: 4 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  modalItemIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modalItemNote: { fontSize: 14, fontFamily: Fonts.semiBold, color: colors.textPrimary, marginBottom: 3 },
  modalItemCat: { fontSize: 11, fontFamily: Fonts.medium, color: colors.textMuted },
  modalItemAmt: { fontSize: 15, fontFamily: Fonts.extraBold },
  modalBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  modalBubble: { flex: 1, backgroundColor: colors.accentBg, borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, gap: 6, borderWidth: 1, borderColor: colors.cardBorder },
  modalBubbleMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalBubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalBubbleText: { fontSize: 14, fontFamily: Fonts.semiBold, color: colors.textPrimary, flex: 1 },
  modalBubbleAmt: { fontSize: 16, fontFamily: Fonts.extraBold, color: colors.accent },
  modalBubbleTime: { fontSize: 11, fontFamily: Fonts.medium, color: colors.textMuted, paddingBottom: 4 },
  modalCatTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 4 },
  modalCatDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  modalCatName: { fontSize: 11, fontFamily: Fonts.semiBold, color: colors.textMuted },
  modalNote: { fontSize: 11, fontFamily: Fonts.medium, color: colors.textMuted, marginTop: 2 },
  modalAmt: { fontSize: 14, fontFamily: Fonts.extraBold, color: colors.accent },
  modalTime: { fontSize: 11, fontFamily: Fonts.medium, color: colors.textMuted, marginTop: 2 },

  /* ── TÙY CHỈNH ── */
  customBody: { backgroundColor: colors.bg, padding: 20 },
  customRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  customDateBtn: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: colors.inputBorder },
  customDateLbl: { fontSize: 10, fontFamily: Fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  customDateVal: { fontSize: 15, fontFamily: Fonts.extraBold, color: colors.textPrimary },
  customRangeSep: { fontSize: 18, color: colors.textMuted, fontFamily: Fonts.bold },
  customSummaryCard: { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  customSummaryLbl: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  customSummaryAmt: { fontSize: 32, fontFamily: Fonts.extraBold, color: colors.textPrimary, letterSpacing: -1, marginBottom: 4 },
  customSummaryCount: { fontSize: 13, fontFamily: Fonts.medium, color: colors.textMuted },

  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' },
  dateModalSheet: { backgroundColor: colors.card, borderRadius: 24, padding: 20, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  dateModalTitle: { fontSize: 16, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 8 },
  dateModalBtn: { marginTop: 12, backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 12 },
  dateModalBtnText: { fontSize: 15, fontFamily: Fonts.extraBold, color: colors.accentText },

  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  presetChip: { backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.cardBorder },
  presetChipText: { fontSize: 13, fontFamily: Fonts.bold, color: colors.textPrimary },
  rangeModalSectionLbl: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  editRangeBtn: { backgroundColor: 'rgba(92,61,0,0.08)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  editRangeBtnText: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textPrimary },

  trendToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.cardBorder },
  trendToggleTitle: { fontSize: 14, fontFamily: Fonts.bold, color: colors.textPrimary, marginBottom: 2 },
  trendToggleSub: { fontSize: 12, fontFamily: Fonts.medium },
  trendToggleArrow: { fontSize: 12, color: colors.textMuted, fontFamily: Fonts.bold },
});