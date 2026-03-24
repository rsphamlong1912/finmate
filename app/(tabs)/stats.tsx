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

const { width } = Dimensions.get('window');
const FILTERS = ['Ngày', 'Tuần', 'Tháng', 'Tùy chỉnh'];

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}


/* ── So sánh ngày được chọn vs ngày trước đó ── */
function DayCompareCard({ expenses, total, selectedDay, todayStr }: { expenses: any[]; total: number; selectedDay: Date; todayStr: string }) {
  const isToday = toLocalDateStr(selectedDay) === todayStr;
  const prevDay = new Date(selectedDay);
  prevDay.setDate(selectedDay.getDate() - 1);
  const prevStr = toLocalDateStr(prevDay);
  const prevTotal = expenses
    .filter(e => toLocalDateStr(new Date(e.created_at)) === prevStr)
    .reduce((s: number, e: any) => s + e.amount, 0);
  const diff = total - prevTotal;
  const isMore = diff > 0;
  const isSame = diff === 0;
  const dayLabel = isToday ? 'Hôm nay' : `${selectedDay.getDate()}/${selectedDay.getMonth()+1}`;
  const prevLabel = isToday ? 'hôm qua' : `${prevDay.getDate()}/${prevDay.getMonth()+1}`;
  return (
    <View style={styles.dayCompareCard}>
      <Text style={{ fontSize: 22 }}>{prevTotal === 0 ? '📅' : isMore ? '📈' : '📉'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.dayCompareText}>
          {prevTotal === 0 ? `Ngày ${prevLabel} không có giao dịch`
            : isSame ? `${dayLabel} bằng ${prevLabel}`
            : isMore ? `${dayLabel} nhiều hơn ${prevLabel} ${formatVNDShort(Math.abs(diff))}`
            : `${dayLabel} ít hơn ${prevLabel} ${formatVNDShort(Math.abs(diff))}`}
        </Text>
        {prevTotal > 0 && <Text style={styles.dayCompareSub}>Ngày {prevLabel}: {formatVNDShort(prevTotal)}</Text>}
      </View>
      {prevTotal > 0 && !isSame && (
        <View style={[styles.dayCompareBadge, { backgroundColor: isMore ? '#fef3c7' : '#eeeaf8' }]}>
          <Text style={[styles.dayCompareBadgeText, { color: isMore ? '#92400e' : '#065f46' }]}>
            {isMore ? '+' : '-'}{Math.abs(Math.round((diff / prevTotal) * 100))}%
          </Text>
        </View>
      )}
    </View>
  );
}

/* ── So sánh 7 ngày gần nhất vs 7 ngày trước đó ── */
function WeekCompareCard({ expenses, total }: { expenses: any[]; total: number }) {
  const now = new Date();
  const prev7Start = new Date(now); prev7Start.setDate(now.getDate() - 14); prev7Start.setHours(0,0,0,0);
  const prev7End = new Date(now); prev7End.setDate(now.getDate() - 7); prev7End.setHours(0,0,0,0);
  const lastWeekTotal = expenses
    .filter(e => { const d = new Date(e.created_at); return d >= prev7Start && d < prev7End; })
    .reduce((s: number, e: any) => s + e.amount, 0);
  const diff = total - lastWeekTotal;
  const isMore = diff > 0;
  const isSame = diff === 0 || lastWeekTotal === 0;
  const pct = lastWeekTotal > 0 ? Math.abs(Math.round((diff / lastWeekTotal) * 100)) : 0;
  return (
    <View style={styles.weekCompareCard}>
      <View style={styles.weekCmpItem}>
        <Text style={styles.weekCmpLbl}>Tuần này</Text>
        <Text style={styles.weekCmpVal}>{formatVNDShort(total)}</Text>
      </View>
      <View style={styles.weekCmpDivider} />
      <View style={styles.weekCmpItem}>
        <Text style={styles.weekCmpLbl}>Tuần trước</Text>
        <Text style={[styles.weekCmpVal, { color: '#c4b5fd', fontSize: 15 }]}>
          {lastWeekTotal > 0 ? formatVNDShort(lastWeekTotal) : '—'}
        </Text>
      </View>
      <View style={styles.weekCmpDivider} />
      <View style={styles.weekCmpItem}>
        <Text style={styles.weekCmpLbl}>Chênh lệch</Text>
        {isSame || lastWeekTotal === 0 ? (
          <Text style={[styles.weekCmpVal, { color: '#c4b5fd', fontSize: 13 }]}>—</Text>
        ) : (
          <View style={[styles.weekCmpBadge, { backgroundColor: isMore ? '#fef3c7' : '#eeeaf8' }]}>
            <Text style={[styles.weekCmpBadgeText, { color: isMore ? '#92400e' : '#065f46' }]}>
              {isMore ? `+${pct}%` : `-${pct}%`} {isMore ? '😬' : '🎉'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const { expenses } = useExpenses();
  const { profile } = useProfile();
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  const { getCategoryLabel, getCategoryColor, getCategoryEmoji } = useCategories();
  const [filter, setFilter] = useState('Ngày');
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [showCustomDetail, setShowCustomDetail] = useState(false);

  const dayDetailAnim = useRef(new Animated.Value(0)).current;
  const customDetailAnim = useRef(new Animated.Value(0)).current;
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

  useEffect(() => { if (showDayDetail) fadeIn(dayDetailAnim); }, [showDayDetail]);
  useEffect(() => { if (showCustomDetail) fadeIn(customDetailAnim); }, [showCustomDetail]);
  useEffect(() => { if (showRangeModal) fadeIn(rangeModalAnim); }, [showRangeModal]);
  useEffect(() => { if (showDayPicker) fadeIn(dayPickerAnim); }, [showDayPicker]);

  const [now, setNow] = useState(() => new Date());
  const todayStr = toLocalDateStr(now);
  const month = now.getMonth();
  const year = now.getFullYear();

  useEffect(() => {
    const interval = setInterval(() => {
      const next = new Date();
      if (toLocalDateStr(next) !== todayStr) {
        setNow(next);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [todayStr]);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.created_at);
      if (filter === 'Ngày') return toLocalDateStr(new Date(e.created_at)) === toLocalDateStr(selectedDay);
      if (filter === 'Tuần') {
        const ws = new Date(now); ws.setDate(now.getDate() - 6); ws.setHours(0,0,0,0);
        return d >= ws;
      }
      if (filter === 'Tùy chỉnh') return d >= customStart && d <= customEnd;
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [expenses, filter, selectedDay, todayStr, month, year, customStart, customEnd]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const budget = profile?.monthly_budget ?? 10_000_000;
  const periodBudget =
    filter === 'Ngày' ? Math.round(budget / 30) :
    filter === 'Tuần' ? Math.round(budget / 4.33) : budget;
  const saved = Math.max(periodBudget - total, 0);
  const daysElapsed =
    filter === 'Ngày' ? 1 :
    filter === 'Tuần' ? (now.getDay() === 0 ? 7 : now.getDay()) :
    now.getDate();
  const avgPerDay = total > 0 ? total / Math.max(daysElapsed, 1) : 0;
  const pctBudget = periodBudget > 0 ? Math.round((total / periodBudget) * 100) : 0;

  /* ── Tháng trước ── */
  const lastMonthTotal = useMemo(() => {
    const lm = month === 0 ? 11 : month - 1;
    const ly = month === 0 ? year - 1 : year;
    return expenses
      .filter(e => { const d = new Date(e.created_at); return d.getMonth() === lm && d.getFullYear() === ly; })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const monthDiff = total - lastMonthTotal;
  const monthIsMore = monthDiff > 0;
  const monthPct = lastMonthTotal > 0 ? Math.abs(Math.round((monthDiff / lastMonthTotal) * 100)) : 0;

  /* ── Slope insight ── */
  const slopeInsight = useMemo(() => {
    if (now.getDate() < 7) return null;
    const halfway = Math.floor(now.getDate() / 2);
    const firstHalf = expenses
      .filter(e => { const d = new Date(e.created_at); return d.getMonth() === month && d.getFullYear() === year && d.getDate() <= halfway; })
      .reduce((s, e) => s + e.amount, 0);
    const secondHalf = expenses
      .filter(e => { const d = new Date(e.created_at); return d.getMonth() === month && d.getFullYear() === year && d.getDate() > halfway; })
      .reduce((s, e) => s + e.amount, 0);
    const rateFirst = firstHalf / halfway;
    const rateSecond = secondHalf / Math.max(now.getDate() - halfway, 1);
    if (rateSecond > rateFirst * 1.2) return { text: 'Slope dốc — đang tiêu nhanh hơn 🚨', color: '#ef4444', bg: '#fef2f2' };
    if (rateSecond < rateFirst * 0.8) return { text: 'Slope giảm — đang kiểm soát tốt hơn 👍', color: '#065f46', bg: '#eeeaf8' };
    return { text: 'Slope đều — chi tiêu ổn định 💪', color: '#6b4fa8', bg: '#f0edfb' };
  }, [expenses]);

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
      const d = new Date(now); d.setDate(now.getDate() - 6 + i);
      const dStr = toLocalDateStr(d);
      return { x: `${d.getDate()}/${d.getMonth()+1}\n${dayNames[d.getDay()]}`, y: (expensesByDate[dStr] ?? 0) / 1000 };
    });
  }, [expensesByDate, now]);

  const lineData = useMemo(() => {
    let cum = 0;
    return Array.from({ length: now.getDate() }, (_, i) => {
      const d = new Date(year, month, i + 1);
      cum += expensesByDate[toLocalDateStr(d)] ?? 0;
      return { x: i + 1, y: cum / 1_000_000 };
    });
  }, [expensesByDate, now]);

  /* ── Custom bar data ── */
  const customBarData = useMemo(() => {
    const dayMs = 86400000;
    const diffDays = Math.floor((customEnd.getTime() - customStart.getTime()) / dayMs) + 1;
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
  }, [filtered]);
  const pieTotal = pieData.reduce((s, d) => s + d.y, 0);

  const peakDay = useMemo(() => {
    if (weekBarData.every(d => d.y === 0)) return null;
    return weekBarData.reduce((max, d) => d.y > max.y ? d : max, weekBarData[0]);
  }, [weekBarData]);

  const budgetLine = budget / 1_000_000;

  return (
    <View style={styles.root}>
      {/* HEADER - fixed */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
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
          <View style={styles.dayBody}>
            <View style={styles.dayMainCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={styles.dayLbl}>
                  {toLocalDateStr(selectedDay) === todayStr ? 'Hôm nay đã tiêu' : `Ngày ${selectedDay.getDate()}/${selectedDay.getMonth()+1}/${selectedDay.getFullYear()}`}
                </Text>
                <TouchableOpacity onPress={() => setShowDayPicker(true)} style={styles.editRangeBtn}>
                  <Text style={styles.editRangeBtnText}>{selectedDay.getDate()}/{selectedDay.getMonth()+1}/{selectedDay.getFullYear()} ›</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.dayAmt}>{formatVND(total)}</Text>
              <View style={styles.dayTrack}>
                <View style={[styles.dayFill, { width: `${Math.min(periodBudget > 0 ? (total / periodBudget) * 100 : 0, 100)}%` as any, backgroundColor: total > periodBudget ? '#ef4444' : '#6b4fa8' }]} />
              </View>
              <TouchableOpacity
                onPress={() => filtered.length > 0 && setShowDayDetail(true)}
                style={[styles.dayRemainBtn, filtered.length > 0 && styles.dayRemainBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayRemain, filtered.length > 0 && styles.dayRemainActive]}>
                  🧾 {filtered.length} giao dịch{toLocalDateStr(selectedDay) === todayStr ? ' hôm nay' : ''}{filtered.length > 0 ? ' →' : ''}
                </Text>
              </TouchableOpacity>
            </View>
            {toLocalDateStr(selectedDay) === todayStr && (
              <DayCompareCard expenses={expenses} total={total} selectedDay={selectedDay} todayStr={todayStr} />
            )}
            {pieData.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{toLocalDateStr(selectedDay) === todayStr ? 'Tiêu vào đâu hôm nay?' : `Tiêu vào đâu ngày ${selectedDay.getDate()}/${selectedDay.getMonth()+1}?`}</Text>
                <View style={styles.chartCard}>
                  <View style={styles.pieWrap}>
                    <VictoryPie data={pieData} width={240} height={240} padding={30} colorScale={pieData.map(d => d.color)} padAngle={2} labelRadius={65} labels={({ datum }) => pieTotal > 0 && (datum.y / pieTotal) >= 0.05 ? `${Math.round((datum.y / pieTotal) * 100)}%` : ''} style={{ labels: { fontSize: 12, fill: '#fff', fontWeight: '700' } }} animate={false} />
                    <View style={styles.pieLegend}>
                      {pieData.map(d => (
                        <View key={d.category} style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                          <Text style={styles.legendName}>{d.x}</Text>
                          <Text style={styles.legendPct}>{pieTotal > 0 ? Math.round((d.y / pieTotal) * 100) : 0}%</Text>
                          <Text style={styles.legendAmt}>{formatVNDShort(d.y)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.dayEmpty}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text>
                <Text style={styles.dayEmptyTitle}>{toLocalDateStr(selectedDay) === todayStr ? 'Hôm nay chưa có giao dịch' : `Ngày ${selectedDay.getDate()}/${selectedDay.getMonth()+1} không có giao dịch`}</Text>
                <Text style={styles.dayEmptySub}>Ghi lại mỗi khoản chi — cậu sẽ ngạc nhiên khi nhìn lại</Text>
              </View>
            )}
            <View style={{ height: 100 }} />
          </View>
        )}

        {/* ── TUẦN ── */}
        {filter === 'Tuần' && (
          <View style={styles.weekBody}>
            <WeekCompareCard expenses={expenses} total={total} />
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Ngày nào tiêu nhiều nhất?</Text>
                {peakDay && <View style={styles.peakBadge}><Text style={styles.peakBadgeText}>🔴 {peakDay.x} cao nhất</Text></View>}
              </View>
              <View style={styles.chartCard}>
                {weekBarData.every(d => d.y === 0) ? (
                  <View style={styles.emptyChart}><Text style={styles.emptyText}>Chưa có dữ liệu tuần này</Text></View>
                ) : (
                  <VictoryChart width={width - 64} height={230} theme={VictoryTheme.material} domainPadding={{ x: 16 }} padding={{ top: 36, bottom: 36, left: 48, right: 16 }}>
                    <VictoryAxis style={{ axis: { stroke: '#e4dff5' }, tickLabels: { fontSize: 10, fill: '#9b8cc4', fontFamily: 'System' }, grid: { stroke: 'transparent' } }} />
                    <VictoryAxis dependentAxis tickFormat={t => `${t}k`} style={{ axis: { stroke: 'transparent' }, tickLabels: { fontSize: 10, fill: '#9b8cc4', fontFamily: 'System' }, grid: { stroke: '#f0edfb', strokeDasharray: '4' } }} />
                    <VictoryBar
                      data={weekBarData}
                      style={{ data: { fill: ({ datum }) => peakDay && datum.x === peakDay.x ? '#ef4444' : '#6b4fa8' } }}
                      cornerRadius={{ top: 6 }}
                      animate={false}
                      labels={({ datum }) => datum.y > 0 ? `${datum.y}k` : ''}
                      labelComponent={
                        <VictoryLabel
                          dy={-4}
                          style={{ fontSize: 9, fill: '#6b4fa8', fontFamily: 'System', fontWeight: '700' }}
                        />
                      }
                    />
                  </VictoryChart>
                )}
              </View>
            </View>
            {pieData.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Danh mục chiếm nhiều nhất</Text>
                <View style={styles.chartCard}>
                  <View style={styles.pieWrap}>
                    <VictoryPie data={pieData} width={240} height={240} padding={30} colorScale={pieData.map(d => d.color)} padAngle={2} labelRadius={65} labels={({ datum }) => pieTotal > 0 && (datum.y / pieTotal) >= 0.05 ? `${Math.round((datum.y / pieTotal) * 100)}%` : ''} style={{ labels: { fontSize: 12, fill: '#fff', fontWeight: '700' } }} animate={false} />
                    <View style={styles.pieLegend}>
                      {pieData.map(d => (
                        <View key={d.category} style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                          <Text style={styles.legendName}>{d.x}</Text>
                          <Text style={styles.legendPct}>{pieTotal > 0 ? Math.round((d.y / pieTotal) * 100) : 0}%</Text>
                          <Text style={styles.legendAmt}>{formatVNDShort(d.y)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.empty}><Text style={{ fontSize: 48, marginBottom: 12 }}>📊</Text><Text style={styles.emptyTitle}>Chưa có dữ liệu</Text><Text style={styles.emptySub}>Thêm chi tiêu để xem thống kê</Text></View>
            )}
            <View style={{ height: 100 }} />
          </View>
        )}

        {/* ── THÁNG: Option B Review Style ── */}
        {filter === 'Tháng' && (
          <View style={styles.monthBody}>

            {/* 1. Score card gradient */}
            <View style={styles.monthScoreCard}>
              <View style={styles.monthScoreCircle} />
              <Text style={styles.monthScoreLbl}>
                {now.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })} · Tổng chi tiêu
              </Text>
              <Text style={styles.monthScoreAmt}>{formatVND(total)}</Text>
              <View style={styles.monthScoreRow}>
                <View style={styles.monthScoreItem}>
                  <Text style={styles.monthScoreItemVal}>{pctBudget}%</Text>
                  <Text style={styles.monthScoreItemLbl}>ngân sách</Text>
                </View>
                <View style={styles.monthScoreItemDivider} />
                <View style={styles.monthScoreItem}>
                  <Text style={styles.monthScoreItemVal}>{formatVNDShort(saved)}</Text>
                  <Text style={styles.monthScoreItemLbl}>còn lại</Text>
                </View>
                <View style={styles.monthScoreItemDivider} />
                <View style={styles.monthScoreItem}>
                  <Text style={styles.monthScoreItemVal}>{formatVNDShort(avgPerDay)}</Text>
                  <Text style={styles.monthScoreItemLbl}>TB/ngày</Text>
                </View>
              </View>
            </View>

            {/* 2. Line chart xu hướng + slope insight */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Xu hướng tích lũy</Text>
              {slopeInsight && (
                <View style={[styles.insightBadge, { backgroundColor: slopeInsight.bg }]}>
                  <Text style={[styles.insightText, { color: slopeInsight.color }]}>{slopeInsight.text}</Text>
                </View>
              )}
              <View style={styles.chartCard}>
                {lineData.length < 2 ? (
                  <View style={styles.emptyChart}><Text style={styles.emptyText}>Cần ít nhất 2 ngày dữ liệu</Text></View>
                ) : (
                  <VictoryChart
                    width={width - 64} height={200}
                    theme={VictoryTheme.material}
                    padding={{ top: 20, bottom: 36, left: 56, right: 24 }}
                    domain={{ y: [0, Math.max(budgetLine * 1.1, (lineData[lineData.length - 1]?.y ?? 0) * 1.1)] }}
                  >
                    <VictoryAxis tickCount={6} style={{ axis: { stroke: '#e4dff5' }, tickLabels: { fontSize: 10, fill: '#9b8cc4', fontFamily: 'System' }, grid: { stroke: 'transparent' } }} />
                    <VictoryAxis dependentAxis tickFormat={t => `${t}tr`} style={{ axis: { stroke: 'transparent' }, tickLabels: { fontSize: 10, fill: '#9b8cc4', fontFamily: 'System' }, grid: { stroke: '#f0edfb', strokeDasharray: '4' } }} />
                    {/* Budget reference line */}
                    <VictoryLine
                      data={[{ x: 1, y: budgetLine }, { x: now.getDate(), y: budgetLine }]}
                      style={{ data: { stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '6 4', opacity: 0.5 } }}
                    />
                    {/* Area fill */}
                    <VictoryArea
                      data={lineData}
                      style={{ data: { fill: '#6b4fa8', fillOpacity: 0.08, stroke: '#6b4fa8', strokeWidth: 2.5 } }}
                      animate={false}
                    />
                  </VictoryChart>
                )}
                {lineData.length >= 2 && (
                  <View style={styles.budgetLineLabel}>
                    <View style={styles.budgetLineDash} />
                    <Text style={styles.budgetLineLabelText}>Ngân sách {formatVNDShort(budget)}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* 3. So sánh tháng trước */}
            <View style={styles.monthCmpCard}>
              <View style={styles.monthCmpItem}>
                <Text style={styles.monthCmpLbl}>Tháng này</Text>
                <Text style={styles.monthCmpAmt}>{formatVNDShort(total)}</Text>
              </View>
              <View style={styles.monthCmpDivider} />
              <View style={styles.monthCmpItem}>
                <Text style={styles.monthCmpLbl}>Tháng trước</Text>
                <Text style={[styles.monthCmpAmt, { color: '#c4b5fd', fontSize: 18 }]}>
                  {lastMonthTotal > 0 ? formatVNDShort(lastMonthTotal) : '—'}
                </Text>
                {lastMonthTotal > 0 && (
                  <View style={[styles.monthCmpBadge, { backgroundColor: monthIsMore ? '#fef3c7' : '#eeeaf8', marginTop: 6 }]}>
                    <Text style={[styles.monthCmpBadgeText, { color: monthIsMore ? '#92400e' : '#065f46' }]}>
                      {monthIsMore ? `+${monthPct}% so tháng trước 😬` : `-${monthPct}% so tháng trước 🎉`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* 4. Pie chart danh mục */}
            {pieData.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tiền đi đâu tháng này?</Text>
                <View style={styles.chartCard}>
                  <View style={styles.pieWrap}>
                    <VictoryPie data={pieData} width={240} height={240} padding={30} colorScale={pieData.map(d => d.color)} padAngle={2} labelRadius={65} labels={({ datum }) => pieTotal > 0 && (datum.y / pieTotal) >= 0.05 ? `${Math.round((datum.y / pieTotal) * 100)}%` : ''} style={{ labels: { fontSize: 12, fill: '#fff', fontWeight: '700' } }} animate={false} />
                    <View style={styles.pieLegend}>
                      {pieData.map(d => (
                        <View key={d.category} style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                          <Text style={styles.legendName}>{d.x}</Text>
                          <Text style={styles.legendPct}>{pieTotal > 0 ? Math.round((d.y / pieTotal) * 100) : 0}%</Text>
                          <Text style={styles.legendAmt}>{formatVNDShort(d.y)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.empty}><Text style={{ fontSize: 48, marginBottom: 12 }}>📊</Text><Text style={styles.emptyTitle}>Chưa có dữ liệu</Text><Text style={styles.emptySub}>Thêm chi tiêu để xem thống kê</Text></View>
            )}

            <View style={{ height: 100 }} />
          </View>
        )}

        {/* ── TÙY CHỈNH ── */}
        {filter === 'Tùy chỉnh' && (
          <View style={styles.customBody}>
            {/* Main card — giống Ngày */}
            <View style={styles.dayMainCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={styles.dayLbl}>Tổng chi tiêu</Text>
                <TouchableOpacity onPress={() => setShowRangeModal(true)} style={styles.editRangeBtn}>
                  <Text style={styles.editRangeBtnText}>{customStart.getDate()}/{customStart.getMonth()+1} — {customEnd.getDate()}/{customEnd.getMonth()+1} ›</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.dayAmt}>{formatVND(total)}</Text>
              <TouchableOpacity
                onPress={() => filtered.length > 0 && setShowCustomDetail(true)}
                style={[styles.dayRemainBtn, filtered.length > 0 && styles.dayRemainBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayRemain, filtered.length > 0 && styles.dayRemainActive]}>
                  🧾 {filtered.length} giao dịch{filtered.length > 0 ? ' →' : ''}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bar chart theo ngày — cuộn ngang */}
            {customBarData.some(d => d.y > 0) && (
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Chi tiêu theo ngày</Text>
                  {customPeakBar && <View style={styles.peakBadge}><Text style={styles.peakBadgeText}>🔴 {customPeakBar.x.split('\n')[0]} cao nhất</Text></View>}
                </View>
                <View style={[styles.chartCard, { padding: 0, overflow: 'hidden' }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
                    <VictoryChart
                      width={Math.max(width - 64, customBarData.length * 52)}
                      height={230}
                      theme={VictoryTheme.material}
                      domainPadding={{ x: 20 }}
                      padding={{ top: 36, bottom: 40, left: 48, right: 16 }}
                    >
                      <VictoryAxis style={{ axis: { stroke: '#e4dff5' }, tickLabels: { fontSize: 10, fill: '#9b8cc4', fontFamily: 'System' }, grid: { stroke: 'transparent' } }} />
                      <VictoryAxis dependentAxis tickFormat={t => `${t}k`} style={{ axis: { stroke: 'transparent' }, tickLabels: { fontSize: 10, fill: '#9b8cc4', fontFamily: 'System' }, grid: { stroke: '#f0edfb', strokeDasharray: '4' } }} />
                      <VictoryBar
                        data={customBarData}
                        style={{ data: { fill: ({ datum }) => customPeakBar && datum.x === customPeakBar.x ? '#ef4444' : '#6b4fa8' } }}
                        cornerRadius={{ top: 6 }}
                        animate={false}
                        labels={({ datum }) => datum.y > 0 ? `${datum.y}k` : ''}
                        labelComponent={<VictoryLabel dy={-4} style={{ fontSize: 9, fill: '#6b4fa8', fontFamily: 'System', fontWeight: '700' }} />}
                      />
                    </VictoryChart>
                  </ScrollView>
                </View>
              </View>
            )}

            {/* Danh mục */}
            {pieData.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tiêu vào đâu?</Text>
                <View style={styles.chartCard}>
                  <View style={styles.pieWrap}>
                    <VictoryPie data={pieData} width={240} height={240} padding={30} colorScale={pieData.map(d => d.color)} padAngle={2} labelRadius={65} labels={({ datum }) => pieTotal > 0 && (datum.y / pieTotal) >= 0.05 ? `${Math.round((datum.y / pieTotal) * 100)}%` : ''} style={{ labels: { fontSize: 12, fill: '#fff', fontWeight: '700' } }} animate={false} />
                    <View style={styles.pieLegend}>
                      {pieData.map(d => (
                        <View key={d.category} style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                          <Text style={styles.legendName}>{d.x}</Text>
                          <Text style={styles.legendPct}>{pieTotal > 0 ? Math.round((d.y / pieTotal) * 100) : 0}%</Text>
                          <Text style={styles.legendAmt}>{formatVNDShort(d.y)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.dayEmpty}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text>
                <Text style={styles.dayEmptyTitle}>Không có giao dịch</Text>
                <Text style={styles.dayEmptySub}>trong khoảng thời gian này</Text>
              </View>
            )}

            <View style={{ height: 100 }} />
          </View>
        )}

      </ScrollView>

      {/* ── Modal chi tiết giao dịch hôm nay ── */}
      <Modal visible={showDayDetail} transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={() => setShowDayDetail(false)}>
        <Animated.View style={[styles.modalContainer, { opacity: dayDetailAnim }]}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDayDetail(false)} />
          <Animated.View style={[styles.modalSheet, { opacity: dayDetailAnim, transform: [{ translateY: dayDetailAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Giao dịch hôm nay</Text>
            <TouchableOpacity onPress={() => setShowDayDetail(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {[...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(e => {
              const catLabel = getCategoryLabel(e.category);
              const time = new Date(e.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const color = getCategoryColor(e.category);
              return (
                <View key={e.id} style={styles.modalItem}>
                  <View style={[styles.modalItemIcon, { backgroundColor: color + '1a' }]}>
                    <Text style={{ fontSize: 20 }}>{getCategoryEmoji(e.category)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemNote} numberOfLines={1}>{e.note || catLabel}</Text>
                    <Text style={styles.modalItemCat}>{catLabel} · {time}</Text>
                  </View>
                  <Text style={[styles.modalItemAmt, { color }]}>-{formatVNDShort(e.amount)}</Text>
                </View>
              );
            })}
          </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* ── Modal chi tiết giao dịch tùy chỉnh ── */}
      <Modal visible={showCustomDetail} transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={() => setShowCustomDetail(false)}>
        <Animated.View style={[styles.modalContainer, { opacity: customDetailAnim }]}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowCustomDetail(false)} />
          <Animated.View style={[styles.modalSheet, { opacity: customDetailAnim, transform: [{ translateY: customDetailAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {customStart.getDate()}/{customStart.getMonth()+1} — {customEnd.getDate()}/{customEnd.getMonth()+1}/{customEnd.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => setShowCustomDetail(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {[...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(e => {
                const catLabel = getCategoryLabel(e.category);
                const d = new Date(e.created_at);
                const dateStr = `${d.getDate()}/${d.getMonth()+1} · ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
                const color = getCategoryColor(e.category);
                return (
                  <View key={e.id} style={styles.modalItem}>
                    <View style={[styles.modalItemIcon, { backgroundColor: color + '1a' }]}>
                      <Text style={{ fontSize: 20 }}>{getCategoryEmoji(e.category)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemNote} numberOfLines={1}>{e.note || catLabel}</Text>
                      <Text style={styles.modalItemCat}>{catLabel} · {dateStr}</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eeeaf8' },
  header: { backgroundColor: '#3b1f6e', paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerCircle: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' },
  headerTitle: { fontSize: 24, fontFamily: Fonts.extraBold, color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: Fonts.medium, marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  filterTabActive: { backgroundColor: '#fff' },
  filterTabText: { fontSize: 13, fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.6)' },
  filterTabTextActive: { color: '#3b1f6e' },

  /* ── NGÀY ── */
  dayBody: { backgroundColor: '#eeeaf8', padding: 20 },
  dayMainCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 12, shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  dayLbl: { fontSize: 11, fontFamily: Fonts.bold, color: '#9b8cc4', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  dayAmt: { fontSize: 34, fontFamily: Fonts.extraBold, color: '#3b1f6e', letterSpacing: -1.5, marginBottom: 14 },
  dayTrack: { backgroundColor: '#f0edfb', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 10 },
  dayFill: { height: 6, borderRadius: 99 },
  dayRemain: { fontSize: 13, fontFamily: Fonts.bold, color: '#9b8cc4' },
  dayRemainBtn: { alignSelf: 'flex-start', marginTop: 2 },
  dayRemainBtnActive: { backgroundColor: '#f0edfb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  dayRemainActive: { color: '#6b4fa8' },
  dayRemainLink: { color: '#3b1f6e' },
  dayCompareCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  dayCompareText: { fontSize: 13, fontFamily: Fonts.bold, color: '#3b1f6e', marginBottom: 3 },
  dayCompareSub: { fontSize: 11, color: '#c4b5fd', fontFamily: Fonts.medium },
  dayCompareBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  dayCompareBadgeText: { fontSize: 12, fontFamily: Fonts.extraBold },
  dayCatCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 12, marginBottom: 12, shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  dayCatTitle: { fontSize: 14, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 2 },
  dayCatRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayCatDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  dayCatName: { fontSize: 13, fontFamily: Fonts.semiBold, color: '#3b1f6e', flex: 1 },
  dayCatAmt: { fontSize: 14, fontFamily: Fonts.extraBold, color: '#6b4fa8' },
  dayEmpty: { alignItems: 'center', paddingVertical: 40 },
  dayEmptyTitle: { fontSize: 16, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 6 },
  dayEmptySub: { fontSize: 13, color: '#c4b5fd', fontFamily: Fonts.medium },

  /* ── TUẦN ── */
  weekBody: { backgroundColor: '#eeeaf8', padding: 20 },
  weekCompareCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20, shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  weekCmpItem: { flex: 1, alignItems: 'center' },
  weekCmpLbl: { fontSize: 10, fontFamily: Fonts.bold, color: '#9b8cc4', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 5 },
  weekCmpVal: { fontSize: 16, fontFamily: Fonts.extraBold, color: '#3b1f6e', letterSpacing: -0.5 },
  weekCmpDivider: { width: 1, backgroundColor: '#f0edfb', height: 36, marginHorizontal: 4 },
  weekCmpBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  weekCmpBadgeText: { fontSize: 11, fontFamily: Fonts.extraBold },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  peakBadge: { backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  peakBadgeText: { fontSize: 10, fontFamily: Fonts.bold, color: '#ef4444' },

  /* ── THÁNG ── */
  monthBody: { backgroundColor: '#eeeaf8', padding: 20 },

  monthScoreCard: {
    borderRadius: 20, padding: 20, marginBottom: 20,
    backgroundColor: '#1a0a3c',
    overflow: 'hidden',
    shadowColor: '#1a0a3c', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  monthScoreCircle: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(107,79,168,0.3)' },
  monthScoreLbl: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.semiBold, marginBottom: 6, position: 'relative', zIndex: 1 },
  monthScoreAmt: { fontSize: 34, fontFamily: Fonts.extraBold, color: '#fff', letterSpacing: -1.5, marginBottom: 16, position: 'relative', zIndex: 1 },
  monthScoreRow: { flexDirection: 'row', position: 'relative', zIndex: 1 },
  monthScoreItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10 },
  monthScoreItemDivider: { width: 8 },
  monthScoreItemVal: { fontSize: 14, fontFamily: Fonts.extraBold, color: '#fff', marginBottom: 3 },
  monthScoreItemLbl: { fontSize: 9, color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.semiBold },

  insightBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 10 },
  insightText: { fontSize: 12, fontFamily: Fonts.bold },

  budgetLineLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  budgetLineDash: { width: 20, height: 2, backgroundColor: '#ef4444', opacity: 0.5 },
  budgetLineLabelText: { fontSize: 10, color: '#ef4444', fontFamily: Fonts.semiBold, opacity: 0.7 },

  monthCmpCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    flexDirection: 'row', marginBottom: 20,
    shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  monthCmpItem: { flex: 1, alignItems: 'center' },
  monthCmpLbl: { fontSize: 10, fontFamily: Fonts.bold, color: '#9b8cc4', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  monthCmpAmt: { fontSize: 20, fontFamily: Fonts.extraBold, color: '#3b1f6e', letterSpacing: -0.5 },
  monthCmpDivider: { width: 1, backgroundColor: '#f0edfb', marginHorizontal: 8 },
  monthCmpBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  monthCmpBadgeText: { fontSize: 10, fontFamily: Fonts.extraBold },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 10 },
  chartCard: { backgroundColor: '#fff', borderRadius: 20, padding: 8, shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, alignItems: 'center' },
  pieWrap: { flexDirection: 'column', alignItems: 'center', paddingVertical: 8, alignSelf: 'stretch' },
  pieLegend: { alignSelf: 'stretch', gap: 8, paddingHorizontal: 12, paddingTop: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendName: { fontSize: 12, fontFamily: Fonts.semiBold, color: '#3b1f6e', flex: 1 },
  legendPct: { fontSize: 12, fontFamily: Fonts.extraBold, color: '#6b4fa8', minWidth: 32, textAlign: 'right' },
  legendAmt: { fontSize: 11, fontFamily: Fonts.bold, color: '#9b8cc4', minWidth: 56, textAlign: 'right' },
  emptyChart: { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: '#c4b5fd', fontFamily: Fonts.semiBold },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#c4b5fd', fontFamily: Fonts.medium },

  /* ── Modal chi tiết ── */
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,4,30,0.6)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', paddingTop: 12, paddingHorizontal: 20, maxHeight: '75%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e4dff5', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontFamily: Fonts.extraBold, color: '#3b1f6e' },
  modalClose: { fontSize: 16, color: '#9b8cc4', fontFamily: Fonts.bold, paddingHorizontal: 4 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0edfb' },
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0edfb' },
  modalItemIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modalItemNote: { fontSize: 14, fontFamily: Fonts.semiBold, color: '#3b1f6e', marginBottom: 3 },
  modalItemCat: { fontSize: 11, fontFamily: Fonts.medium, color: '#c4b5fd' },
  modalItemAmt: { fontSize: 15, fontFamily: Fonts.extraBold },
  modalBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  modalBubble: { flex: 1, backgroundColor: '#f0edfb', borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  modalBubbleMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalBubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalBubbleText: { fontSize: 14, fontFamily: Fonts.semiBold, color: '#3b1f6e', flex: 1 },
  modalBubbleAmt: { fontSize: 16, fontFamily: Fonts.extraBold, color: '#6b4fa8' },
  modalBubbleTime: { fontSize: 11, fontFamily: Fonts.medium, color: '#c4b5fd', paddingBottom: 4 },
  modalCatTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 4 },
  modalCatDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  modalCatName: { fontSize: 11, fontFamily: Fonts.semiBold, color: '#9b8cc4' },
  modalNote: { fontSize: 11, fontFamily: Fonts.medium, color: '#9b8cc4', marginTop: 2 },
  modalAmt: { fontSize: 14, fontFamily: Fonts.extraBold, color: '#6b4fa8' },
  modalTime: { fontSize: 11, fontFamily: Fonts.medium, color: '#c4b5fd', marginTop: 2 },

  /* ── TÙY CHỈNH ── */
  customBody: { backgroundColor: '#eeeaf8', padding: 20 },
  customRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  customDateBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1.5, borderColor: '#e4dff5' },
  customDateLbl: { fontSize: 10, fontFamily: Fonts.bold, color: '#9b8cc4', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  customDateVal: { fontSize: 15, fontFamily: Fonts.extraBold, color: '#3b1f6e' },
  customRangeSep: { fontSize: 18, color: '#9b8cc4', fontFamily: Fonts.bold },
  customSummaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, alignItems: 'center', shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  customSummaryLbl: { fontSize: 11, fontFamily: Fonts.bold, color: '#9b8cc4', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  customSummaryAmt: { fontSize: 32, fontFamily: Fonts.extraBold, color: '#3b1f6e', letterSpacing: -1, marginBottom: 4 },
  customSummaryCount: { fontSize: 13, fontFamily: Fonts.medium, color: '#9b8cc4' },

  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  dateModalSheet: { backgroundColor: '#fff', borderRadius: 24, padding: 20, width: '85%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  dateModalTitle: { fontSize: 16, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 8 },
  dateModalBtn: { marginTop: 12, backgroundColor: '#6b4fa8', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 12 },
  dateModalBtnText: { fontSize: 15, fontFamily: Fonts.extraBold, color: '#fff' },

  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  presetChip: { backgroundColor: '#f0edfb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  presetChipText: { fontSize: 13, fontFamily: Fonts.bold, color: '#6b4fa8' },
  rangeModalSectionLbl: { fontSize: 11, fontFamily: Fonts.bold, color: '#9b8cc4', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  editRangeBtn: { backgroundColor: '#f0edfb', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  editRangeBtnText: { fontSize: 11, fontFamily: Fonts.bold, color: '#6b4fa8' },
});