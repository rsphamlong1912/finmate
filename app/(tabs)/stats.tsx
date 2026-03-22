import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, Pressable } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryPie, VictoryLine, VictoryTheme, VictoryArea, VictoryLabel } from 'victory-native';
import { Fonts } from '../../constants/fonts';
import { useExpenses } from '../../context/ExpensesContext';
import { useProfile } from '../../context/ProfileContext';
import { formatVNDShort, formatVND } from '../../lib/vnd';
import { CATEGORY_LABELS } from '../../types';

const { width } = Dimensions.get('window');
const FILTERS = ['Ngày', 'Tuần', 'Tháng'];

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const CAT_COLORS: Record<string, string> = {
  food: '#ef4444', transport: '#3b82f6', shopping: '#8b5cf6',
  bills: '#f59e0b', health: '#10b981', entertainment: '#ec4899', other: '#6b7280',
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/* ── So sánh hôm nay vs hôm qua ── */
function DayCompareCard({ expenses, total }: { expenses: any[]; total: number }) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = toLocalDateStr(yesterday);
  const yesterdayTotal = expenses
    .filter(e => toLocalDateStr(new Date(e.created_at)) === yStr)
    .reduce((s: number, e: any) => s + e.amount, 0);
  const diff = total - yesterdayTotal;
  const isMore = diff > 0;
  const isSame = diff === 0;
  return (
    <View style={styles.dayCompareCard}>
      <Text style={{ fontSize: 22 }}>{yesterdayTotal === 0 ? '📅' : isMore ? '📈' : '📉'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.dayCompareText}>
          {yesterdayTotal === 0 ? 'Hôm qua không có giao dịch'
            : isSame ? 'Hôm nay bằng hôm qua'
            : isMore ? `Hôm nay nhiều hơn hôm qua ${formatVNDShort(Math.abs(diff))}`
            : `Hôm nay ít hơn hôm qua ${formatVNDShort(Math.abs(diff))}`}
        </Text>
        {yesterdayTotal > 0 && <Text style={styles.dayCompareSub}>Hôm qua: {formatVNDShort(yesterdayTotal)}</Text>}
      </View>
      {yesterdayTotal > 0 && !isSame && (
        <View style={[styles.dayCompareBadge, { backgroundColor: isMore ? '#fef3c7' : '#ecfdf5' }]}>
          <Text style={[styles.dayCompareBadgeText, { color: isMore ? '#92400e' : '#065f46' }]}>
            {isMore ? '+' : '-'}{Math.abs(Math.round((diff / yesterdayTotal) * 100))}%
          </Text>
        </View>
      )}
    </View>
  );
}

/* ── So sánh tuần này vs tuần trước ── */
function WeekCompareCard({ expenses, total }: { expenses: any[]; total: number }) {
  const now = new Date();
  const lastWeekStart = getWeekStart(now);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 7);
  const lastWeekTotal = expenses
    .filter(e => { const d = new Date(e.created_at); return d >= lastWeekStart && d < lastWeekEnd; })
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
        <Text style={[styles.weekCmpVal, { color: '#b0a3d4', fontSize: 15 }]}>
          {lastWeekTotal > 0 ? formatVNDShort(lastWeekTotal) : '—'}
        </Text>
      </View>
      <View style={styles.weekCmpDivider} />
      <View style={styles.weekCmpItem}>
        <Text style={styles.weekCmpLbl}>Chênh lệch</Text>
        {isSame || lastWeekTotal === 0 ? (
          <Text style={[styles.weekCmpVal, { color: '#b0a3d4', fontSize: 13 }]}>—</Text>
        ) : (
          <View style={[styles.weekCmpBadge, { backgroundColor: isMore ? '#fef3c7' : '#ecfdf5' }]}>
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
  const [filter, setFilter] = useState('Ngày');
  const [showDayDetail, setShowDayDetail] = useState(false);

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
      if (filter === 'Ngày') return toLocalDateStr(new Date(e.created_at)) === todayStr;
      if (filter === 'Tuần') {
        const ws = getWeekStart(now);
        const we = new Date(ws); we.setDate(ws.getDate() + 7);
        return d >= ws && d < we;
      }
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [expenses, filter, todayStr, month, year]);

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
    if (rateSecond < rateFirst * 0.8) return { text: 'Slope giảm — đang kiểm soát tốt hơn 👍', color: '#065f46', bg: '#ecfdf5' };
    return { text: 'Slope đều — chi tiêu ổn định 💪', color: '#6b4fa8', bg: '#f0edfb' };
  }, [expenses]);

  /* ── Bar & Line data ── */
  const weekBarData = useMemo(() => {
    const ws = getWeekStart(now);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws); d.setDate(ws.getDate() + i);
      const dStr = toLocalDateStr(d);
      const y = expenses.filter(e => toLocalDateStr(new Date(e.created_at)) === dStr).reduce((s, e) => s + e.amount, 0);
      return { x: DAY_LABELS[i], y: y / 1000 };
    });
  }, [expenses]);

  const lineData = useMemo(() => {
    let cum = 0;
    return Array.from({ length: now.getDate() }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const dStr = toLocalDateStr(d);
      cum += expenses.filter(e => toLocalDateStr(new Date(e.created_at)) === dStr).reduce((s, e) => s + e.amount, 0);
      return { x: i + 1, y: cum / 1_000_000 };
    });
  }, [expenses]);

  /* ── Pie data ── */
  const pieData = useMemo(() => {
    const by: Record<string, number> = {};
    filtered.forEach(e => { by[e.category] = (by[e.category] ?? 0) + e.amount; });
    return Object.entries(by).sort(([, a], [, b]) => b - a).slice(0, 5).map(([cat, val]) => ({
      x: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]?.replace(/^.\s/, '') ?? cat,
      y: val, color: CAT_COLORS[cat] ?? '#6b7280', category: cat,
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
            <TouchableOpacity key={f} style={[styles.filterTab, filter === f && styles.filterTabActive]} onPress={() => setFilter(f)}>
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
              <Text style={styles.dayLbl}>Hôm nay đã tiêu</Text>
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
                  🧾 {filtered.length} giao dịch hôm nay{filtered.length > 0 ? ' →' : ''}
                </Text>
              </TouchableOpacity>
            </View>
            <DayCompareCard expenses={expenses} total={total} />
            {pieData.length > 0 ? (
              <View style={styles.dayCatCard}>
                <Text style={styles.dayCatTitle}>Tiêu vào đâu hôm nay?</Text>
                {pieData.map(d => (
                  <View key={d.category} style={styles.dayCatRow}>
                    <View style={[styles.dayCatDot, { backgroundColor: d.color }]} />
                    <Text style={styles.dayCatName}>{d.x}</Text>
                    <Text style={styles.dayCatAmt}>{formatVNDShort(d.y)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.dayEmpty}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text>
                <Text style={styles.dayEmptyTitle}>Hôm nay chưa có giao dịch</Text>
                <Text style={styles.dayEmptySub}>Thêm chi tiêu để xem thống kê</Text>
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
                      animate={{ duration: 500, onLoad: { duration: 500 } }}
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
                    <VictoryPie data={pieData} width={200} height={200} colorScale={pieData.map(d => d.color)} padAngle={2} labels={() => null} animate={{ duration: 600, onLoad: { duration: 600 } }} style={{ parent: { overflow: 'visible' } }} />
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
                      animate={{ duration: 600, onLoad: { duration: 600 } }}
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
                <Text style={[styles.monthCmpAmt, { color: '#b0a3d4', fontSize: 18 }]}>
                  {lastMonthTotal > 0 ? formatVNDShort(lastMonthTotal) : '—'}
                </Text>
                {lastMonthTotal > 0 && (
                  <View style={[styles.monthCmpBadge, { backgroundColor: monthIsMore ? '#fef3c7' : '#ecfdf5', marginTop: 6 }]}>
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
                    <VictoryPie data={pieData} width={200} height={200} colorScale={pieData.map(d => d.color)} padAngle={2} labels={() => null} animate={{ duration: 600, onLoad: { duration: 600 } }} style={{ parent: { overflow: 'visible' } }} />
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

      </ScrollView>

      {/* ── Modal chi tiết giao dịch hôm nay ── */}
      <Modal visible={showDayDetail} transparent animationType="slide" onRequestClose={() => setShowDayDetail(false)}>
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDayDetail(false)} />
          <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Giao dịch hôm nay</Text>
            <TouchableOpacity onPress={() => setShowDayDetail(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {[...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(e => {
              const cat = CATEGORY_LABELS[e.category as keyof typeof CATEGORY_LABELS] ?? e.category;
              const time = new Date(e.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const color = CAT_COLORS[e.category] ?? '#6b7280';
              return (
                <View key={e.id} style={styles.modalItem}>
                  <View style={[styles.modalItemIcon, { backgroundColor: color + '1a' }]}>
                    <Text style={{ fontSize: 20 }}>
                      {CATEGORY_LABELS[e.category as keyof typeof CATEGORY_LABELS]?.match(/^\S+/)?.[0] ?? '💸'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemNote} numberOfLines={1}>{e.note || cat.replace(/^\S+\s/, '')}</Text>
                    <Text style={styles.modalItemCat}>{cat.replace(/^\S+\s/, '')} · {time}</Text>
                  </View>
                  <Text style={[styles.modalItemAmt, { color }]}>-{formatVNDShort(e.amount)}</Text>
                </View>
              );
            })}
          </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3b1f6e' },
  header: { backgroundColor: '#3b1f6e', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24, overflow: 'hidden' },
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
  dayCompareSub: { fontSize: 11, color: '#b0a3d4', fontFamily: Fonts.medium },
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
  dayEmptySub: { fontSize: 13, color: '#b0a3d4', fontFamily: Fonts.medium },

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
  emptyText: { fontSize: 13, color: '#b0a3d4', fontFamily: Fonts.semiBold },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#b0a3d4', fontFamily: Fonts.medium },

  /* ── Modal chi tiết ── */
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', paddingTop: 12, paddingHorizontal: 20, maxHeight: '75%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e4dff5', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontFamily: Fonts.extraBold, color: '#3b1f6e' },
  modalClose: { fontSize: 16, color: '#9b8cc4', fontFamily: Fonts.bold, paddingHorizontal: 4 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0edfb' },
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0edfb' },
  modalItemIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modalItemNote: { fontSize: 14, fontFamily: Fonts.semiBold, color: '#3b1f6e', marginBottom: 3 },
  modalItemCat: { fontSize: 11, fontFamily: Fonts.medium, color: '#b0a3d4' },
  modalItemAmt: { fontSize: 15, fontFamily: Fonts.extraBold },
  modalBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  modalBubble: { flex: 1, backgroundColor: '#f0edfb', borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  modalBubbleMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalBubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalBubbleText: { fontSize: 14, fontFamily: Fonts.semiBold, color: '#3b1f6e', flex: 1 },
  modalBubbleAmt: { fontSize: 16, fontFamily: Fonts.extraBold, color: '#6b4fa8' },
  modalBubbleTime: { fontSize: 11, fontFamily: Fonts.medium, color: '#b0a3d4', paddingBottom: 4 },
  modalCatTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 4 },
  modalCatDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  modalCatName: { fontSize: 11, fontFamily: Fonts.semiBold, color: '#9b8cc4' },
  modalNote: { fontSize: 11, fontFamily: Fonts.medium, color: '#9b8cc4', marginTop: 2 },
  modalAmt: { fontSize: 14, fontFamily: Fonts.extraBold, color: '#6b4fa8' },
  modalTime: { fontSize: 11, fontFamily: Fonts.medium, color: '#b0a3d4', marginTop: 2 },
});