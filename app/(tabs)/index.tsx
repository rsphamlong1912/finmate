import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Modal, useWindowDimensions
} from 'react-native';

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../context/ExpensesContext';
import { useProfile } from '../../context/ProfileContext';
import { useCategories } from '../../context/CategoriesContext';

import { formatVND } from '../../lib/vnd';
import { Fonts } from '../../constants/fonts';
import { StreakCalendar } from '../../components/StreakCalendar';
import { CoinLoader } from '../../components/CoinLoader';
import { StreakCelebrationModal } from '../../components/StreakCelebrationModal';
import { AchievementUnlockModal } from '../../components/AchievementUnlockModal';
import { useAchievements } from '../../context/AchievementsContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { loading: authLoading } = useAuth();
  const { totalThisMonth, byCategory, expenses, loading: expensesLoading } = useExpenses();
  const { profile, streakDates, checkAndUpdateStreak, loading: profileLoading, newStreakDay, clearNewStreakDay } = useProfile();
  const { getCategoryLabel, getCategoryColor, getCategoryEmoji, loading: categoriesLoading } = useCategories();

  const { currentToast, dismissToast } = useAchievements();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const CARD_W = screenWidth - 32;

  // Insight slider
  const sliderRef = useRef<ScrollView>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const slideIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const SLIDE_COUNT = 4;

  const startAutoSlide = useCallback(() => {
    if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    slideIntervalRef.current = setInterval(() => {
      setSlideIndex(prev => {
        const next = (prev + 1) % SLIDE_COUNT;
        sliderRef.current?.scrollTo({ x: next * CARD_W, animated: true });
        return next;
      });
    }, 4000);
  }, [CARD_W]);

  useEffect(() => {
    startAutoSlide();
    return () => { if (slideIntervalRef.current) clearInterval(slideIntervalRef.current); };
  }, [startAutoSlide]);

  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [timerDone, setTimerDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimerDone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (timerDone && !authLoading && !profileLoading && !expensesLoading && !categoriesLoading) {
      setShowLoader(false);
    }
  }, [timerDone, authLoading, profileLoading, expensesLoading, categoriesLoading]);

  useEffect(() => {
    if (!showLoader && newStreakDay && profile?.streak_enabled) {
      const t = setTimeout(() => setShowCelebration(true), 500);
      return () => clearTimeout(t);
    }
  }, [showLoader, newStreakDay, profile?.streak_enabled]);

  const streakModalAnim = useRef(new Animated.Value(0)).current;
  const chatPulse1 = useRef(new Animated.Value(0)).current;
  const chatPulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(chatPulse1, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(chatPulse1, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(chatPulse2, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(chatPulse2, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const checkAndUpdateStreakRef = useRef(checkAndUpdateStreak);
  useEffect(() => { checkAndUpdateStreakRef.current = checkAndUpdateStreak; }, [checkAndUpdateStreak]);
  const streakChecked = useRef(false);
  useEffect(() => {
    if (profile && !streakChecked.current) {
      streakChecked.current = true;
      checkAndUpdateStreakRef.current();
    }
  }, [profile]);

  useEffect(() => {
    if (showStreakModal) {
      streakModalAnim.setValue(0);
      Animated.timing(streakModalAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    }
  }, [showStreakModal]);

  const budget = profile?.monthly_budget ?? 10_000_000;
  const streakCount = profile?.streak_count ?? 0;

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date();
  const todayStr = toLocalDateStr(now);

  // Recent transactions (this month), sorted newest first
  const recentExpenses = expenses
    .filter(e => {
      const d = new Date(e.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const pct = Math.min(totalThisMonth / (budget || 1), 1);
  const monthPct = Math.round(pct * 100);
  const remainingBudget = Math.max(budget - totalThisMonth, 0);

  const daysElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - daysElapsed;


  // Top spending category for insight
  const sortedCats = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
  const topCat = sortedCats[0];
  const topCatPct = topCat && totalThisMonth > 0 ? Math.round((topCat[1] / totalThisMonth) * 100) : 0;

  // Greeting
  const hour = now.getHours();
  const greeting = hour >= 5 && hour < 12 ? 'Chào buổi sáng' : hour >= 12 && hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const greetingEmoji = hour >= 5 && hour < 12 ? '☀️' : hour >= 12 && hour < 18 ? '🌤️' : '🌙';
  const userName = profile?.display_name?.split(' ').pop() ?? 'bạn';

  // Month label
  const monthLabel = `tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;

  const dailyBudgetLeft = daysRemaining > 0 ? Math.round(remainingBudget / daysRemaining) : 0;

  const slides = [
    {
      icon: '💰',
      title: monthPct >= 100 ? 'Đã vượt ngân sách!' : monthPct >= 80 ? 'Gần đến giới hạn!' : 'Kiểm soát tốt!',
      body: monthPct >= 100
        ? `Vượt ${formatVND(totalThisMonth - budget)}. Hãy cẩn thận chi tiêu hơn nhé!`
        : `Dùng ${monthPct}% ngân sách. Còn ${daysRemaining} ngày — mỗi ngày nên giữ dưới ${formatVND(dailyBudgetLeft)}.`,
      accent: monthPct >= 100 ? '#ef4444' : monthPct >= 80 ? '#f59e0b' : colors.accent,
      accentBg: monthPct >= 100 ? 'rgba(239,68,68,0.08)' : monthPct >= 80 ? 'rgba(245,158,11,0.08)' : colors.accentBg,
      accentBorder: monthPct >= 100 ? 'rgba(239,68,68,0.2)' : monthPct >= 80 ? 'rgba(245,158,11,0.2)' : colors.accentBorder,
      cta: 'Xem báo cáo →',
      onCta: () => router.push('/(tabs)/stats'),
    },
    {
      icon: topCat ? getCategoryEmoji(topCat[0]) : '📊',
      title: 'Chi tiêu hàng đầu',
      body: topCat
        ? `${getCategoryLabel(topCat[0])} chiếm ${topCatPct}% tổng chi tiêu tháng này (${formatVND(topCat[1])}).`
        : 'Chưa có giao dịch nào tháng này. Hãy thêm giao dịch đầu tiên!',
      accent: '#f59e0b',
      accentBg: 'rgba(245,158,11,0.08)',
      accentBorder: 'rgba(245,158,11,0.2)',
      cta: 'Xem thống kê →',
      onCta: () => router.push('/(tabs)/stats'),
    },
    {
      icon: '🔥',
      title: streakCount >= 1 ? `${streakCount} ngày streak!` : 'Bắt đầu streak hôm nay',
      body: streakCount >= 7
        ? `Tuyệt vời! ${streakCount} ngày ghi chép liên tiếp. Bạn đang xây dựng thói quen tài chính tuyệt vời!`
        : streakCount >= 1
        ? `${streakCount} ngày liên tiếp rồi! Đừng quên ghi lại chi tiêu hôm nay.`
        : 'Ghi lại chi tiêu mỗi ngày để xây dựng thói quen tài chính vững chắc.',
      accent: '#ef4444',
      accentBg: 'rgba(239,68,68,0.08)',
      accentBorder: 'rgba(239,68,68,0.2)',
      cta: 'Xem lịch streak →',
      onCta: () => setShowStreakModal(true),
    },
    {
      icon: '✨',
      title: 'Hỏi FinMate AI',
      body: 'Phân tích chi tiêu cá nhân hoá, gợi ý tiết kiệm và trả lời mọi câu hỏi tài chính của bạn.',
      accent: colors.accent,
      accentBg: colors.accentBg,
      accentBorder: colors.accentBorder,
      cta: 'Chat ngay →',
      onCta: () => router.push('/(tabs)/chat'),
    },
  ];

  // Group recent expenses by date
  const grouped = recentExpenses.reduce<Record<string, typeof recentExpenses>>((acc, e) => {
    const key = toLocalDateStr(new Date(e.created_at));
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const yesterdayStr = toLocalDateStr(new Date(Date.now() - 86400000));
  const getDayLabel = (dateStr: string) => {
    if (dateStr === todayStr) return 'Hôm nay';
    if (dateStr === yesterdayStr) return 'Hôm qua';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* HEADER BLOCK */}
        <View style={styles.headerBlock}>
          <LinearGradient
            colors={['rgba(61,107,53,0.12)', 'rgba(61,107,53,0.03)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            pointerEvents="none"
          />
          {/* Greeting row */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting}, {userName} {greetingEmoji}</Text>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => router.push('/profile')}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* TOTAL SPENDING */}
          <View style={styles.spendingSection}>
            <Text style={styles.spendingLabel}>Tổng chi tiêu</Text>
            <Text style={styles.spendingAmount}>{formatVND(totalThisMonth)}</Text>

            {/* Streak badge */}
            {profile?.streak_enabled && streakCount > 0 && (
              <TouchableOpacity
                style={styles.streakBadge}
                onPress={() => setShowStreakModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.streakBadgeText}>🔥 {streakCount} ngày streak!</Text>
                <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>

          {/* BUDGET PROGRESS */}
          <View style={styles.budgetSection}>
            <View style={styles.budgetLabelRow}>
              <Text style={styles.budgetLabel}>Ngân sách tháng</Text>
              <Text style={styles.budgetPct}>{monthPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(monthPct, 100)}%` as any, backgroundColor: monthPct >= 100 ? '#ef4444' : monthPct >= 80 ? '#f59e0b' : colors.accent }]} />
            </View>
            <View style={styles.budgetBottomRow}>
              <Text style={styles.remainingText}>
                Còn lại {formatVND(remainingBudget)} 💪
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/stats')} activeOpacity={0.7}>
                <Text style={styles.reportLink}>Xem báo cáo →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* INSIGHT SLIDER */}
        <View style={styles.sliderWrap}>
          <ScrollView
            ref={sliderRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
              setSlideIndex(idx);
              startAutoSlide();
            }}
            scrollEventThrottle={16}
          >
            {slides.map((slide, i) => (
              <View
                key={i}
                style={[styles.insightCard, {
                  width: CARD_W,
                  backgroundColor: slide.accentBg,
                  borderColor: slide.accentBorder,
                }]}
              >
                <View style={styles.insightInner}>
                  <Text style={styles.insightIcon}>{slide.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightTitle, { color: slide.accent }]}>{slide.title}</Text>
                    <Text style={styles.insightBody}>{slide.body}</Text>
                  </View>
                </View>
                <View style={styles.insightFooter}>
                  <View style={[styles.finmateBadge, { backgroundColor: slide.accent }]}>
                    <Text style={styles.finmateBadgeText}>✦ FinMate AI</Text>
                  </View>
                  <TouchableOpacity onPress={slide.onCta} activeOpacity={0.7}>
                    <Text style={[styles.askFinmate, { color: slide.accent }]}>{slide.cta}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Dots */}
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View key={i} style={[styles.dot, i === slideIndex && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* RECENT TRANSACTIONS */}
        <View style={styles.txHeader}>
          <Text style={styles.txHeaderTitle}>Giao dịch gần đây</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')} activeOpacity={0.7}>
            <Text style={styles.txHeaderLink}>Xem tất cả →</Text>
          </TouchableOpacity>
        </View>

        {recentExpenses.length === 0 ? (
          <Text style={styles.emptyMsg}>Chưa có giao dịch nào tháng này</Text>
        ) : (
          sortedDays.map(day => (
            <View key={day}>
              <Text style={styles.dayLabel}>{getDayLabel(day)}</Text>
              <View style={styles.txGroup}>
                {grouped[day].map((e, idx) => {
                  const catLabel = getCategoryLabel(e.category);
                  const emoji = getCategoryEmoji(e.category);
                  const color = getCategoryColor(e.category);
                  const time = new Date(e.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  const isLast = idx === grouped[day].length - 1;
                  return (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.txItem, !isLast && styles.txItemBorder]}
                      activeOpacity={0.7}
                      onPress={() => router.push({
                        pathname: '/edit-expense',
                        params: { id: e.id, amount: String(e.amount), category: e.category, note: e.note ?? '', date: e.created_at },
                      })}
                    >
                      <View style={[styles.txIcon, { backgroundColor: color + '22' }]}>
                        <Text style={{ fontSize: 22 }}>{emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.txName} numberOfLines={1}>{e.note || catLabel}</Text>
                        <Text style={styles.txMeta}>{catLabel} · {time}</Text>
                      </View>
                      <Text style={styles.txAmount}>-{formatVND(e.amount)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* COIN LOADER */}
      {showLoader && <CoinLoader />}

      {/* ACHIEVEMENT UNLOCK */}
      <AchievementUnlockModal
        visible={!!currentToast}
        achievement={currentToast}
        onClose={dismissToast}
      />

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
            <View style={styles.modalHandle} />
            <View style={styles.modalBanner}>
              <View style={styles.bannerOrb1} />
              <View style={styles.bannerOrb2} />
              <TouchableOpacity
                style={styles.bannerCloseBtn}
                onPress={() => setShowStreakModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.bannerCloseTxt}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.bannerFire}>🔥</Text>
              <Text style={styles.bannerCount}>{streakCount}</Text>
              <Text style={styles.bannerLabel}>ngày liên tiếp</Text>
              <Text style={styles.bannerHint}>Ghi lại mỗi ngày để không bỏ lỡ{'\n'}bức tranh tài chính của bạn</Text>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <StreakCalendar streakDates={streakDates} />
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Chat FAB */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <Animated.View style={[styles.fabPulseRing, {
          transform: [{ scale: chatPulse1.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
          opacity: chatPulse1.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.2, 0] }),
        }]} />
        <Animated.View style={[styles.fabPulseRing, {
          transform: [{ scale: chatPulse2.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
          opacity: chatPulse2.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.2, 0] }),
        }]} />
        <TouchableOpacity style={styles.fabShadow} onPress={() => router.push('/(tabs)/chat')} activeOpacity={0.85}>
          <BlurView intensity={75} tint="light" style={styles.fab}>
            <View style={styles.fabOverlay} />
            <Ionicons name="sparkles" size={22} color="#fff" style={{ zIndex: 1 }} />
          </BlurView>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },

    // HEADER
    headerBlock: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 16,
      elevation: 6,
      marginBottom: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 60,
      paddingBottom: 8,
      paddingHorizontal: 20,
    },
    greeting: {
      fontSize: 22,
      fontFamily: Fonts.extraBold,
      color: colors.textPrimary,
      lineHeight: 28,
    },
    monthLabel: {
      fontSize: 13,
      fontFamily: Fonts.medium,
      color: colors.textSecondary,
      marginTop: 2,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    settingsBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontFamily: Fonts.extraBold,
      color: '#fff',
    },

    // SPENDING
    spendingSection: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
    },
    spendingLabel: {
      fontSize: 13,
      fontFamily: Fonts.medium,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    spendingAmount: {
      fontSize: 40,
      fontFamily: Fonts.extraBold,
      color: colors.textPrimary,
      letterSpacing: -1,
      marginBottom: 14,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(0,0,0,0.65)',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
      gap: 4,
    },
    streakBadgeText: {
      fontSize: 13,
      fontFamily: Fonts.semiBold,
      color: '#fff',
    },

    // BUDGET
    budgetSection: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    budgetLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    budgetLabel: {
      fontSize: 13,
      fontFamily: Fonts.medium,
      color: colors.textSecondary,
    },
    budgetPct: {
      fontSize: 13,
      fontFamily: Fonts.extraBold,
      color: colors.textPrimary,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.divider,
      overflow: 'hidden',
      marginBottom: 10,
    },
    progressFill: {
      height: 6,
      borderRadius: 3,
    },
    budgetBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    remainingText: {
      fontSize: 13,
      fontFamily: Fonts.semiBold,
      color: colors.textSecondary,
    },
    reportLink: {
      fontSize: 13,
      fontFamily: Fonts.semiBold,
      color: colors.accent,
    },

    // INSIGHT SLIDER
    sliderWrap: {
      marginHorizontal: 16,
      marginBottom: 24,
    },
    insightCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.divider,
    },
    dotActive: {
      width: 18,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    insightInner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 14,
    },
    insightIcon: {
      fontSize: 28,
    },
    insightTitle: {
      fontSize: 15,
      fontFamily: Fonts.extraBold,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    insightBody: {
      fontSize: 13,
      fontFamily: Fonts.medium,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    insightFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    finmateBadge: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    finmateBadgeText: {
      fontSize: 11,
      fontFamily: Fonts.bold,
      color: '#fff',
    },
    askFinmate: {
      fontSize: 13,
      fontFamily: Fonts.semiBold,
      color: colors.accent,
    },

    // TRANSACTIONS
    txHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    txHeaderTitle: {
      fontSize: 17,
      fontFamily: Fonts.extraBold,
      color: colors.textPrimary,
    },
    txHeaderLink: {
      fontSize: 13,
      fontFamily: Fonts.semiBold,
      color: colors.accent,
    },
    dayLabel: {
      fontSize: 12,
      fontFamily: Fonts.bold,
      color: colors.textMuted,
      marginHorizontal: 20,
      marginBottom: 6,
      marginTop: 2,
    },
    txGroup: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      elevation: 2,
    },
    txItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    txItemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    txIcon: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    txName: {
      fontSize: 14,
      fontFamily: Fonts.bold,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    txMeta: {
      fontSize: 12,
      fontFamily: Fonts.medium,
      color: colors.textMuted,
    },
    txAmount: {
      fontSize: 14,
      fontFamily: Fonts.extraBold,
      color: colors.textPrimary,
    },

    emptyMsg: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: colors.textMuted,
      textAlign: 'center',
      marginVertical: 28,
      marginHorizontal: 20,
    },

    // MODALS
    modalOverlay: { flex: 1, backgroundColor: 'rgba(10,4,30,0.65)', justifyContent: 'flex-end', flexDirection: 'column' },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      maxHeight: '88%', paddingBottom: 36, overflow: 'hidden',
      borderWidth: 1, borderColor: colors.cardBorder,
    },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.accentBorder, alignSelf: 'center', position: 'absolute', top: 10, zIndex: 10 },
    modalBanner: { backgroundColor: colors.surface, paddingTop: 20, paddingBottom: 16, alignItems: 'center', overflow: 'hidden' },
    bannerOrb1: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: colors.orb1 },
    bannerOrb2: { position: 'absolute', bottom: -40, left: -40, width: 110, height: 110, borderRadius: 55, backgroundColor: colors.orb2 },
    bannerCloseBtn: { position: 'absolute', top: 14, right: 16, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    bannerCloseTxt: { color: colors.textSecondary, fontSize: 13, fontFamily: Fonts.bold },
    bannerFire: { fontSize: 28, marginBottom: 4 },
    bannerCount: { fontSize: 40, fontFamily: Fonts.extraBold, color: colors.textPrimary, lineHeight: 44 },
    bannerLabel: { fontSize: 13, fontFamily: Fonts.semiBold, color: colors.textSecondary, marginBottom: 8 },
    bannerHint: { fontSize: 12, fontFamily: Fonts.medium, color: colors.textMuted, textAlign: 'center', lineHeight: 17 },
    modalBody: { padding: 20, paddingBottom: 8 },

    // CHAT FAB
    fabWrap: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabPulseRing: {
      position: 'absolute',
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(245,158,11,0.6)',
    },
    fabShadow: {
      width: 56,
      height: 56,
      borderRadius: 28,
      shadowColor: '#b45309',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 14,
      elevation: 10,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabOverlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(245,158,11,0.75)',
    },
  });
}
