import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../context/ExpensesContext';
import { useProfile } from '../../context/ProfileContext';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../../types';
import { formatVND, formatVNDShort } from '../../lib/vnd';
import Svg, { Defs, Pattern, Rect, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');

const CAT_ICONS: Record<string, string> = {
  food: '🍜', transport: '🚗', shopping: '🛍',
  bills: '💡', health: '💊', entertainment: '🎮', other: '📦',
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const { totalThisMonth, byCategory, expenses } = useExpenses();
  const { profile, checkAndUpdateStreak } = useProfile();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const orb3Anim = useRef(new Animated.Value(0)).current;
  const streakAnim = useRef(new Animated.Value(1)).current;
  const dot1Anim = useRef(new Animated.Value(0.4)).current;
  const dot2Anim = useRef(new Animated.Value(0.4)).current;
  const dot3Anim = useRef(new Animated.Value(0.4)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkAndUpdateStreak();

    const enter = Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]);

    const orb1 = Animated.loop(Animated.sequence([
      Animated.timing(orb1Anim, { toValue: -14, duration: 2500, useNativeDriver: true }),
      Animated.timing(orb1Anim, { toValue: 0, duration: 2500, useNativeDriver: true }),
    ]));
    const orb2 = Animated.loop(Animated.sequence([
      Animated.timing(orb2Anim, { toValue: 10, duration: 3500, useNativeDriver: true }),
      Animated.timing(orb2Anim, { toValue: 0, duration: 3500, useNativeDriver: true }),
    ]));
    const orb3 = Animated.loop(Animated.sequence([
      Animated.timing(orb3Anim, { toValue: -8, duration: 2000, useNativeDriver: true }),
      Animated.timing(orb3Anim, { toValue: 0, duration: 2000, useNativeDriver: true }),
    ]));
    const streak = Animated.loop(Animated.sequence([
      Animated.timing(streakAnim, { toValue: 0.75, duration: 1000, useNativeDriver: true }),
      Animated.timing(streakAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]));
    const dots = [[dot1Anim, 500], [dot2Anim, 1000], [dot3Anim, 1500]].map(([anim, delay]) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay as number),
        Animated.timing(anim as Animated.Value, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim as Animated.Value, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]))
    );

    // FAB bounce in
    Animated.spring(fabAnim, { toValue: 1, delay: 600, useNativeDriver: true, tension: 80, friction: 6 }).start();

    enter.start();
    [orb1, orb2, orb3, streak, ...dots].forEach(a => a.start());

    return () => {
      enter.stop();
      [orb1, orb2, orb3, streak, ...dots].forEach(a => a.stop());
    };
  }, [checkAndUpdateStreak]);

  const budget = profile?.monthly_budget ?? 10_000_000;
  const streakCount = profile?.streak_count ?? 0;
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'bạn';
  const topCategories = Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 4);
  const recentExpenses = expenses.slice(0, 4);
  const pct = Math.min((totalThisMonth / budget) * 100, 100);
  const remaining = Math.max(budget - totalThisMonth, 0);
  const now = new Date();
  const monthName = now.toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

  // Insight cho recap banner
  const topCat = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0];
  const topCatName = topCat
    ? CATEGORY_LABELS[topCat[0] as keyof typeof CATEGORY_LABELS]?.replace(/^.\s/, '') ?? topCat[0]
    : null;
  const topCatIcon = topCat ? CAT_ICONS[topCat[0]] ?? '📦' : null;
  const pctBudget = Math.round(pct);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.top}>
          <View style={StyleSheet.absoluteFillObject}>
            <Svg width="100%" height="100%">
              <Defs>
                <Pattern id="grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                  <Line x1="28" y1="0" x2="28" y2="28" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  <Line x1="0" y1="28" x2="28" y2="28" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                </Pattern>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#grid)" />
            </Svg>
          </View>

          <Animated.View style={[styles.orb1, { transform: [{ translateY: orb1Anim }] }]} />
          <Animated.View style={[styles.orb2, { transform: [{ translateY: orb2Anim }] }]} />
          <Animated.View style={[styles.orb3, { transform: [{ translateY: orb3Anim }] }]} />
          <View style={styles.ring1} />
          <View style={styles.ring2} />
          <Animated.View style={[styles.dot, { top: 40, right: 90, opacity: dot1Anim }]} />
          <Animated.View style={[styles.dot, { top: 65, right: 60, opacity: dot2Anim }]} />
          <Animated.View style={[styles.dot, { top: 28, right: 52, opacity: dot3Anim }]} />
          <Animated.View style={[styles.dot, { top: 80, right: 110, opacity: dot1Anim }]} />

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.topRow}>
              <View>
                <Text style={styles.greeting}>Xin chào, {displayName} 👋</Text>
                <Text style={styles.period}>{monthName}</Text>
              </View>
              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Text style={styles.avatarText}>
                  {(profile?.display_name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.totalLabel}>Tổng chi tiêu</Text>
            <Text style={styles.totalAmount}>{formatVND(totalThisMonth)}</Text>

            {streakCount > 0 && (
              <Animated.View style={[styles.streakBadge, { opacity: streakAnim }]}>
                <Text style={{ fontSize: 13 }}>🔥</Text>
                <Text style={styles.streakText}>{streakCount} ngày streak!</Text>
              </Animated.View>
            )}

            <View style={styles.progRow}>
              <Text style={styles.progLabel}>Ngân sách tháng</Text>
              <Text style={styles.progPct}>{Math.round(pct)}%</Text>
            </View>
            <View style={styles.progTrack}>
              <View style={[
                styles.progFill,
                { width: `${pct}%` as any },
                pct >= 90 && { backgroundColor: '#f87171' },
              ]} />
            </View>
            <Text style={styles.progSub}>
              {remaining > 0
                ? `Còn lại ${formatVND(remaining)} 💪`
                : 'Đã vượt ngân sách ⚠️'}
            </Text>
          </Animated.View>
        </View>

        {/* RECAP BANNER — thay float card */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity
            style={styles.recapBanner}
            onPress={() => router.push('/(tabs)/stats')}
            activeOpacity={0.85}
          >
            <View style={styles.recapLeft}>
              <Text style={styles.recapEyebrow}>📈 Recap chi tiêu của bạn</Text>
              <Text style={styles.recapTitle}>
                {totalThisMonth === 0
                  ? 'Chưa có dữ liệu tháng này'
                  : topCatName
                  ? `${topCatIcon} ${topCatName} chiếm nhiều nhất · ${pctBudget}% ngân sách`
                  : `Đã dùng ${pctBudget}% ngân sách tháng này`}
              </Text>
              <Text style={styles.recapSub}>Xem báo cáo đầy đủ →</Text>
            </View>
            <View style={{ width: 58, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
              <Svg width="58" height="38">
                {(topCategories.length > 0 ? topCategories : [['a', 0.4], ['b', 0.7], ['c', 0.5], ['d', 0.9]] as [string, number][]).slice(0, 4).map(([cat, amt], i) => {
                  const vals = topCategories.length > 0
                    ? topCategories.map(([, v]) => v)
                    : [0.4, 0.7, 0.5, 0.9];
                  const maxAmt = Math.max(...vals) || 1;
                  const barH = Math.max(5, ((amt as number) / maxAmt) * 30);
                  const color = topCategories.length > 0
                    ? (CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] ?? '#6b4fa8')
                    : '#c4b5fd';
                  return (
                    <Rect key={i} x={i * 15 + 1} y={38 - barH} width={11} height={barH} rx={4} fill={color + 'aa'} />
                  );
                })}
              </Svg>
            </View>
            <View style={styles.recapArrow}>
              <Text style={styles.recapArrowText}>›</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* BOTTOM */}
        <View style={styles.bottom}>

          {/* Categories */}
          {topCategories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chi tiêu theo danh mục</Text>
              <View style={styles.catGrid}>
                {topCategories.map(([cat, amt]) => {
                  const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
                  const p = total > 0 ? (amt / total) * 100 : 0;
                  const color = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] ?? '#6b4fa8';
                  return (
                    <View key={cat} style={styles.catCard}>
                      <Text style={styles.catIcon}>{CAT_ICONS[cat] ?? '📦'}</Text>
                      <Text style={styles.catName} numberOfLines={1}>
                        {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]?.replace(/^.\s/, '') ?? cat}
                      </Text>
                      <Text style={styles.catAmt}>{formatVNDShort(amt)}</Text>
                      <View style={styles.catBar}>
                        <View style={[styles.catFill, { width: `${p}%` as any, backgroundColor: color }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Recent */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                <Text style={styles.seeAll}>Xem tất cả →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.txCard}>
              {recentExpenses.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={{ fontSize: 40, marginBottom: 10 }}>💳</Text>
                  <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-expense')}>
                    <Text style={styles.emptyBtnText}>+ Thêm chi tiêu đầu tiên</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                recentExpenses.map((e, i) => {
                  const color = CATEGORY_COLORS[e.category as keyof typeof CATEGORY_COLORS] ?? '#6b4fa8';
                  return (
                    <View key={e.id} style={[styles.txRow, i < recentExpenses.length - 1 && styles.txBorder]}>
                      <View style={[styles.txIconWrap, { backgroundColor: color + '20' }]}>
                        <Text style={{ fontSize: 20 }}>{CAT_ICONS[e.category] ?? '📦'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.txCat}>{CATEGORY_LABELS[e.category as keyof typeof CATEGORY_LABELS] ?? e.category}</Text>
                        <Text style={styles.txMeta}>
                          {new Date(e.created_at).toLocaleDateString('vi-VN')}{e.note ? ` · ${e.note}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.txAmt}>-{formatVND(e.amount)}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* FAB — nút + cố định góc dưới phải */}
      <Animated.View style={[styles.fabWrap, {
        transform: [{ scale: fabAnim }],
        opacity: fabAnim,
      }]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/add-expense')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eeeaf8' },

  top: {
    backgroundColor: '#1a0a3c',
    paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24,
    overflow: 'hidden',
  },
  orb1: { position: 'absolute', top: -70, right: -70, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(107,79,168,0.4)' },
  orb2: { position: 'absolute', bottom: -40, left: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(59,31,110,0.5)' },
  orb3: { position: 'absolute', top: 50, left: 30, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(196,181,253,0.1)' },
  ring1: { position: 'absolute', top: -20, right: 20, width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  ring2: { position: 'absolute', bottom: 20, right: 60, width: 45, height: 45, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  dot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)' },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 18, fontWeight: '800', color: '#fff' },
  period: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2, fontWeight: '500' },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  avatarText: { fontSize: 17, fontWeight: '800', color: '#fff' },

  totalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 4 },
  totalAmount: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1, marginBottom: 14 },

  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 18 },
  streakText: { fontSize: 12, color: '#fff', fontWeight: '800' },

  progRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  progLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  progPct: { fontSize: 11, color: '#c4b5fd', fontWeight: '800' },
  progTrack: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 7 },
  progFill: { height: 6, borderRadius: 99, backgroundColor: '#c4b5fd' },
  progSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },

  /* ── RECAP BANNER ── */
  recapBanner: {
    marginHorizontal: 20, marginTop: -20,
    backgroundColor: '#fff',
    borderRadius: 22, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#1a0a3c', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 12, zIndex: 10,
    overflow: 'hidden',
    borderWidth: 1, borderColor: '#ede9fb',
  },
recapLeft: { flex: 1 },
  recapEyebrow: { fontSize: 11, fontWeight: '700', color: '#6b4fa8', marginBottom: 5 },
  recapTitle: { fontSize: 13, fontWeight: '800', color: '#3b1f6e', lineHeight: 19, marginBottom: 5 },
  recapSub: { fontSize: 11, color: '#b0a3d4', fontWeight: '600' },
  recapArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0edfb', alignItems: 'center', justifyContent: 'center' },
  recapArrowText: { fontSize: 18, color: '#6b4fa8', fontWeight: '700', lineHeight: 22 },

  /* ── BODY ── */
  bottom: { paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#3b1f6e', marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#6b4fa8', fontWeight: '700' },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: { width: (width - 40 - 10) / 2 - 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#1a0a3c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  catIcon: { fontSize: 26, marginBottom: 8 },
  catName: { fontSize: 11, fontWeight: '700', color: '#9b8cc4', marginBottom: 4 },
  catAmt: { fontSize: 18, fontWeight: '900', color: '#3b1f6e', marginBottom: 8 },
  catBar: { backgroundColor: '#f0edfb', borderRadius: 99, height: 5, overflow: 'hidden' },
  catFill: { height: 5, borderRadius: 99 },

  txCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#1a0a3c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  txBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f3ff' },
  txIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  txCat: { fontSize: 13, fontWeight: '700', color: '#3b1f6e', marginBottom: 2 },
  txMeta: { fontSize: 11, color: '#b0a3d4', fontWeight: '500' },
  txAmt: { fontSize: 12, fontWeight: '900', color: '#6b4fa8' },

  emptyWrap: { alignItems: 'center', padding: 28 },
  emptyText: { fontSize: 14, fontWeight: '700', color: '#b0a3d4', marginBottom: 14 },
  emptyBtn: { backgroundColor: '#6b4fa8', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  /* ── FAB ── */
  fabWrap: {
    position: 'absolute',
    bottom: 32, right: 24,
  },
  fab: {
    width: 58, height: 58,
    borderRadius: 29,
    backgroundColor: '#6b4fa8',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3b1f6e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 12,
  },
  fabText: { fontSize: 30, color: '#fff', fontWeight: '300', lineHeight: 34, marginTop: -2 },
});