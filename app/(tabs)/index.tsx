import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../context/ExpensesContext';
import { useProfile } from '../../context/ProfileContext';
import { useCategories } from '../../context/CategoriesContext';
import { formatVND } from '../../lib/vnd';
import Svg, { Defs, Pattern, Rect, Line } from 'react-native-svg';
import { Fonts } from '../../constants/fonts';
import { StreakCalendar } from '../../components/StreakCalendar';
import { CoinLoader } from '../../components/CoinLoader';
import { StreakCelebrationModal } from '../../components/StreakCelebrationModal';


export default function DashboardScreen() {
  const { user } = useAuth();
  const { totalThisMonth, byCategory, expenses, loading: expensesLoading } = useExpenses();
  const { profile, streakDates, checkAndUpdateStreak, loading: profileLoading, newStreakDay, clearNewStreakDay } = useProfile();
  const { getCategoryLabel, getCategoryColor, getCategoryEmoji, loading: categoriesLoading } = useCategories();
  const router = useRouter();

  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const loaderTimerDone = useRef(false);
  const dataReady = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      loaderTimerDone.current = true;
      if (dataReady.current) setShowLoader(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!profileLoading && !expensesLoading && !categoriesLoading) {
      dataReady.current = true;
      if (loaderTimerDone.current) setShowLoader(false);
    }
  }, [profileLoading, expensesLoading, categoriesLoading]);

  useEffect(() => {
    if (!showLoader && newStreakDay) {
      const t = setTimeout(() => setShowCelebration(true), 500);
      return () => clearTimeout(t);
    }
  }, [showLoader, newStreakDay]);

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
  const scrollY = useRef(new Animated.Value(0)).current;
  const streakModalAnim = useRef(new Animated.Value(0)).current;

  const insightOpacity = scrollY.interpolate({ inputRange: [0, 60, 120], outputRange: [1, 0.5, 0], extrapolate: 'clamp' });
  const insightScale = scrollY.interpolate({ inputRange: [0, 120], outputRange: [1, 0.93], extrapolate: 'clamp' });
  const insightTranslateY = scrollY.interpolate({ inputRange: [0, 120], outputRange: [0, -8], extrapolate: 'clamp' });

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

  useEffect(() => {
    if (showStreakModal) {
      streakModalAnim.setValue(0);
      Animated.timing(streakModalAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    }
  }, [showStreakModal]);


  const budget = profile?.monthly_budget ?? 10_000_000;
  const streakCount = profile?.streak_count ?? 0;
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'bạn';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5  && h < 11) return `Chào buổi sáng, ${displayName} ☀️`;
    if (h >= 11 && h < 13) return `Trưa rồi, ${displayName} ăn chưa? 🍜`;
    if (h >= 13 && h < 18) return `Buổi chiều vui vẻ, ${displayName} 🌤️`;
    if (h >= 18 && h < 22) return `Buổi tối bình yên, ${displayName} 🌙`;
    return `Thức khuya vậy, ${displayName}? 🦉`;
  })();

  const recentExpenses = expenses.slice(0, 12);
  const pct = Math.min((totalThisMonth / budget) * 100, 100);

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = toLocalDateStr(new Date());
  const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterdayDate);
  const getDayLabel = (s: string) => {
    if (s === todayStr) return 'Hôm nay';
    if (s === yesterdayStr) return 'Hôm qua';
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
  };
  const groupedByDay = recentExpenses.reduce((acc, e) => {
    const key = toLocalDateStr(new Date(e.created_at));
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, typeof expenses>);
  const sortedDays = Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a)).slice(0, 3);
  const remaining = Math.max(budget - totalThisMonth, 0);
  const now = new Date();
  const monthName = now.toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

  // Insight cho recap banner
  const topCat = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0];
  const topCatName = topCat ? getCategoryLabel(topCat[0]) : null;

  const pctBudget = Math.round(pct);

  // Insight card
  const topCatPct = topCat
    ? Math.round((topCat[1] / (totalThisMonth || 1)) * 100)
    : 0;
  type BodyPart = { text: string; bold?: boolean };
  const insight = (() => {
    if (totalThisMonth === 0) return {
      emoji: '🌱',
      title: 'Chưa có giao dịch nào',
      bodyParts: [{ text: 'Thêm chi tiêu đầu tiên để FinMate bắt đầu phân tích cho bạn.' }] as BodyPart[],
      prompt: '💡 Gợi ý tiết kiệm cho tôi',
      bg: '#f0f4ff', border: '#c7d6ff', titleColor: '#1e3a8a',
      bodyColor: '#3b5299', badgeBg: '#e4dff5', badgeColor: '#1e40af', ctaColor: '#1e40af',
    };
    if (pct >= 90) return {
      emoji: '😬',
      title: `Đã dùng ${pctBudget}% ngân sách`,
      bodyParts: [
        { text: 'Bạn sắp vượt mức tháng này. ' },
        ...(topCatName ? [{ text: topCatName, bold: true }, { text: ` chiếm nhiều nhất (${topCatPct}%). ` }] : []),
        { text: 'Muốn tôi gợi ý cắt giảm không?' },
      ] as BodyPart[],
      prompt: '⚠️ Tôi đang tiêu quá tay không?',
      bg: '#fff5f5', border: '#fecaca', titleColor: '#7f1d1d',
      bodyColor: '#b91c1c', badgeBg: '#fee2e2', badgeColor: '#991b1b', ctaColor: '#dc2626',
    };
    if (pct >= 60) return {
      emoji: '🤔',
      title: topCatName ? `${topCatName} chiếm ${topCatPct}%` : `Đã dùng ${pctBudget}% ngân sách`,
      bodyParts: [
        { text: `Bạn đã dùng ${pctBudget}% ngân sách tháng này. Hãy để FinMate giúp bạn cân bằng lại.` },
      ] as BodyPart[],
      prompt: '📊 Phân tích chi tiêu tháng này',
      bg: '#fffbeb', border: '#fde68a', titleColor: '#78350f',
      bodyColor: '#92400e', badgeBg: '#fef3c7', badgeColor: '#b45309', ctaColor: '#d97706',
    };
    return {
      emoji: '💪',
      title: 'Bạn đang kiểm soát tốt!',
      bodyParts: [
        { text: `Mới dùng ${pctBudget}% ngân sách. ` },
        ...(topCatName ? [{ text: topCatName, bold: true }, { text: ` chiếm ${topCatPct}% chi tiêu. ` }] : []),
        { text: 'Tiếp tục phát huy nhé!' },
      ] as BodyPart[],
      prompt: '🎯 Lập kế hoạch ngân sách',
      bg: '#f5f3ff', border: '#bbf7d0', titleColor: '#14532d',
      bodyColor: '#166534', badgeBg: '#dcfce7', badgeColor: '#15803d', ctaColor: '#16a34a',
    };
  })();

  return (
    <View style={styles.root}>

      {/* HEADER — sticky, ngoài ScrollView */}
      <View style={styles.top}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
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
                <Text style={styles.greeting}>{greeting}</Text>
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
              <TouchableOpacity onPress={() => setShowStreakModal(true)} activeOpacity={0.8}>
                <Animated.View style={[styles.streakBadge, { opacity: streakAnim }]}>
                  <Text style={{ fontSize: 13 }}>🔥</Text>
                  <Text style={styles.streakText}>{streakCount} ngày streak!</Text>
                  <Text style={styles.streakArrow}>›</Text>
                </Animated.View>
              </TouchableOpacity>
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
            <View style={styles.progBottom}>
              <Text style={styles.progSub}>
                {remaining > 0
                  ? `Còn lại ${formatVND(remaining)} 💪`
                  : 'Đã vượt ngân sách ⚠️'}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/stats')}>
                <Text style={styles.reportLink}>Xem báo cáo →</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
      </View>

      {/* SCROLL — chỉ phần này scroll */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <View style={styles.bottom}>

          {/* AI Insight Card */}
          <Animated.View style={{ opacity: insightOpacity, transform: [{ scale: insightScale }, { translateY: insightTranslateY }] }}>
          <TouchableOpacity
            style={[styles.insightCard, { backgroundColor: insight.bg, borderColor: insight.border }]}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/(tabs)/chat', params: { prompt: insight.prompt } })}
          >
            <View style={styles.insightTop}>
              <Text style={styles.insightEmoji}>{insight.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightTitle, { color: insight.titleColor }]}>{insight.title}</Text>
                <Text style={[styles.insightBody, { color: insight.bodyColor }]}>
                  {insight.bodyParts.map((p, i) =>
                    p.bold
                      ? <Text key={i} style={{ fontFamily: Fonts.bold, color: insight.titleColor }}>{p.text}</Text>
                      : p.text
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.insightFooter}>
              <View style={[styles.insightBadge, { backgroundColor: insight.badgeBg }]}>
                <Text style={[styles.insightBadgeText, { color: insight.badgeColor }]}>✦ FinMate AI</Text>
              </View>
              <Text style={[styles.insightCta, { color: insight.ctaColor }]}>Hỏi FinMate →</Text>
            </View>
          </TouchableOpacity>
          </Animated.View>

          {/* Recent */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                <Text style={styles.seeAll}>Xem tất cả →</Text>
              </TouchableOpacity>
            </View>
            {recentExpenses.length === 0 ? (
              <View style={styles.txCard}>
                <View style={styles.emptyWrap}>
                  <Text style={{ fontSize: 40, marginBottom: 10 }}>💳</Text>
                  <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-expense')}>
                    <Text style={styles.emptyBtnText}>+ Thêm chi tiêu đầu tiên</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              sortedDays.map(day => {
                const items = groupedByDay[day];
                return (
                  <View key={day} style={{ marginBottom: 10 }}>
                    <Text style={styles.dayLabel}>{getDayLabel(day)}</Text>
                    <View style={styles.txCard}>
                      {items.map((e, i) => {
                        const color = getCategoryColor(e.category);
                        const catLabel = getCategoryLabel(e.category);
                        const time = new Date(e.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <TouchableOpacity
                            key={e.id}
                            style={[styles.txRow, i < items.length - 1 && styles.txBorder]}
                            activeOpacity={0.7}
                            onPress={() => router.push({ pathname: '/edit-expense', params: { id: e.id, amount: String(e.amount), category: e.category, note: e.note ?? '', date: e.created_at } })}
                          >
                            <View style={[styles.txIconWrap, { backgroundColor: color + '1a' }]}>
                              <Text style={{ fontSize: 20 }}>{getCategoryEmoji(e.category)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.txCat} numberOfLines={1}>{e.note || catLabel}</Text>
                              <Text style={styles.txMeta}>{catLabel} · {time}</Text>
                            </View>
                            <Text style={[styles.txAmt, { color }]}>-{formatVND(e.amount)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
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

      {/* COIN LOADER */}
      {showLoader && <CoinLoader />}

      {/* STREAK CELEBRATION */}
      <StreakCelebrationModal
        visible={showCelebration}
        streak={profile?.streak_count ?? 0}
        onClose={() => { setShowCelebration(false); clearNewStreakDay(); }}
      />

      {/* STREAK CALENDAR MODAL */}
      <Modal visible={showStreakModal} animationType="none" transparent presentationStyle="overFullScreen">
        <Animated.View style={[styles.modalOverlay, { opacity: streakModalAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowStreakModal(false)} />
          <Animated.View style={[styles.modalSheet, {
            transform: [{ translateY: streakModalAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }],
          }]}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Hero banner */}
            <View style={styles.modalBanner}>
              <View style={styles.bannerOrb1} />
              <View style={styles.bannerOrb2} />
              <TouchableOpacity style={styles.bannerCloseBtn} onPress={() => setShowStreakModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.bannerCloseTxt}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.bannerFire}>🔥</Text>
              <Text style={styles.bannerCount}>{streakCount}</Text>
              <Text style={styles.bannerLabel}>ngày liên tiếp</Text>
              <Text style={styles.bannerHint}>Ghi lại mỗi ngày để không bỏ lỡ{'\n'}bức tranh tài chính của bạn</Text>
            </View>

            {/* Calendar */}
            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <StreakCalendar streakDates={streakDates} streakCount={streakCount} />
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eeeaf8' },

  top: {
    backgroundColor: '#1a0a3c',
    paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  orb1: { position: 'absolute', top: -70, right: -70, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(107,79,168,0.4)' },
  orb2: { position: 'absolute', bottom: -40, left: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(59,31,110,0.5)' },
  orb3: { position: 'absolute', top: 50, left: 30, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(196,181,253,0.1)' },
  ring1: { position: 'absolute', top: -20, right: 20, width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  ring2: { position: 'absolute', bottom: 20, right: 60, width: 45, height: 45, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  dot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)' },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 18, fontFamily: Fonts.extraBold, color: '#fff' },
  period: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2, fontFamily: Fonts.medium },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  avatarText: { fontSize: 17, fontFamily: Fonts.extraBold, color: '#fff' },

  totalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: Fonts.semiBold, marginBottom: 4 },
  totalAmount: { fontSize: 36, fontFamily: Fonts.extraBold, color: '#fff', letterSpacing: -1, marginBottom: 14 },

  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 18 },
  streakText: { fontSize: 12, color: '#fff', fontFamily: Fonts.extraBold },
  streakArrow: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.bold, marginLeft: 2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,4,30,0.65)',
    justifyContent: 'flex-end',
    flexDirection: 'column',
  },
  modalSheet: {
    backgroundColor: '#f5f3ff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 36,
    overflow: 'hidden',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignSelf: 'center',
    position: 'absolute', top: 10, zIndex: 10,
  },

  /* Banner */
  modalBanner: {
    backgroundColor: '#1a0a3c',
    paddingTop: 20, paddingBottom: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  bannerOrb1: {
    position: 'absolute', top: -50, right: -50,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(107,79,168,0.45)',
  },
  bannerOrb2: {
    position: 'absolute', bottom: -40, left: -40,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(59,31,110,0.5)',
  },
  bannerCloseBtn: {
    position: 'absolute', top: 14, right: 16,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerCloseTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: Fonts.bold },
  bannerFire: { fontSize: 28, marginBottom: 4 },
  bannerCount: { fontSize: 40, fontFamily: Fonts.extraBold, color: '#fff', lineHeight: 44 },
  bannerLabel: { fontSize: 13, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  bannerHint: { fontSize: 12, fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 17 },

  modalBody: { padding: 20, paddingBottom: 8 },


  progRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: Fonts.semiBold },
  progPct: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontFamily: Fonts.extraBold },
  progTrack: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 99, height: 7, overflow: 'hidden', marginBottom: 10 },
  progFill: { height: 7, borderRadius: 99, backgroundColor: '#c4b5fd' },
  progBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.bold },
  reportLink: { fontSize: 12, color: '#c4b5fd', fontFamily: Fonts.bold },

  /* ── BODY ── */
  bottom: { paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#6b4fa8', fontFamily: Fonts.bold },

  insightCard: {
    backgroundColor: '#fff', borderRadius: 22, padding: 18, marginBottom: 20,
    shadowColor: '#1a0a3c', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    borderWidth: 1, borderColor: '#ede9fb',
  },
  insightTop: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  insightEmoji: { fontSize: 28, marginTop: 2 },
  insightTitle: { fontSize: 14, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 5, lineHeight: 20 },
  insightBody: { fontSize: 13, fontFamily: Fonts.regular, color: '#6b5fa0', lineHeight: 20 },
  insightFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  insightBadge: { backgroundColor: '#f0edfb', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  insightBadgeText: { fontSize: 10, fontFamily: Fonts.semiBold, color: '#6b4fa8' },
  insightCta: { fontSize: 13, fontFamily: Fonts.bold, color: '#6b4fa8' },

  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginLeft: 2 },
  dayLabel: { fontSize: 12, fontFamily: Fonts.bold, color: '#9b8cc4', marginBottom: 8 },
  dayTotal: { fontSize: 12, fontFamily: Fonts.extraBold, color: '#6b4fa8' },

  txCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#1a0a3c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  txBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f3ff' },
  txIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  txCat: { fontSize: 13, fontFamily: Fonts.bold, color: '#3b1f6e', marginBottom: 2 },
  txMeta: { fontSize: 11, color: '#c4b5fd', fontFamily: Fonts.medium },
  txAmt: { fontSize: 12, fontFamily: Fonts.extraBold, color: '#6b4fa8' },

  emptyWrap: { alignItems: 'center', padding: 28 },
  emptyText: { fontSize: 14, fontFamily: Fonts.bold, color: '#c4b5fd', marginBottom: 14 },
  emptyBtn: { backgroundColor: '#6b4fa8', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontSize: 13, fontFamily: Fonts.extraBold },

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
  fabText: { fontSize: 30, color: '#fff', fontFamily: Fonts.regular, lineHeight: 34, marginTop: -2 },
});