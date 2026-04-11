import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Platform, StatusBar, PanResponder, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fonts } from '../constants/fonts';
import { useTheme } from '../context/ThemeContext';
import { PRE_ONBOARDING_KEY, markPreOnboardingDone } from './_layout';
import RevenueBro from '../assets/intro/revenue-bro.svg';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.52;

// ─── Slide definitions ───────────────────────────────────────────────────────

type Slide =
  | { kind: 'welcome' }
  | { kind: 'feature'; title: string; sub: string; visual: React.ReactNode }
  | { kind: 'pick'; title: string; sub: string; key: string; options: { id: string; label: string; emoji: string }[] }
  | { kind: 'auth' };

// ─── Visual Cards ────────────────────────────────────────────────────────────


function VisualExpense({ colors }: { colors: any }) {
  const rows = [
    { emoji: '🍜', label: 'Bún bò Huế', cat: 'Ăn uống', amount: '-45,000 ₫', color: '#f59e0b' },
    { emoji: '☕', label: 'Cà phê sữa', cat: 'Cà phê', amount: '-35,000 ₫', color: '#10b981' },
    { emoji: '🛍️', label: 'Shopee', cat: 'Mua sắm', amount: '-320,000 ₫', color: '#8b5cf6' },
    { emoji: '🚗', label: 'Grab', cat: 'Di chuyển', amount: '-28,000 ₫', color: '#3b82f6' },
  ];
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ fontFamily: Fonts.extraBold, fontSize: 15, color: colors.textPrimary }}>Hôm nay</Text>
        <Text style={{ fontFamily: Fonts.bold, fontSize: 13, color: colors.textMuted }}>Tháng 4</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: colors.card, borderRadius: 14, padding: 12,
          borderWidth: 1, borderColor: colors.cardBorder }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: r.color + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 13, color: colors.textPrimary }}>{r.label}</Text>
            <Text style={{ fontFamily: Fonts.medium, fontSize: 11, color: colors.textMuted }}>{r.cat}</Text>
          </View>
          <Text style={{ fontFamily: Fonts.bold, fontSize: 13, color: '#ef4444' }}>{r.amount}</Text>
        </View>
      ))}
    </View>
  );
}

function VisualBudget({ colors }: { colors: any }) {
  const cats = [
    { emoji: '🍜', label: 'Ăn uống', used: 72, color: '#f59e0b' },
    { emoji: '🛍️', label: 'Mua sắm', used: 45, color: '#8b5cf6' },
    { emoji: '🚗', label: 'Di chuyển', used: 30, color: '#3b82f6' },
  ];
  return (
    <View style={{ gap: 10 }}>
      <View style={{ backgroundColor: colors.accent + '22', borderRadius: 16, padding: 14, alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ fontFamily: Fonts.bold, fontSize: 12, color: colors.textMuted }}>CÒN LẠI THÁNG NÀY</Text>
        <Text style={{ fontFamily: Fonts.extraBold, fontSize: 30, color: colors.accent, marginVertical: 2 }}>4,230,000 ₫</Text>
        <Text style={{ fontFamily: Fonts.medium, fontSize: 12, color: colors.textMuted }}>trên 10,000,000 ₫</Text>
      </View>
      {cats.map((c, i) => (
        <View key={i} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 12, color: colors.textSecondary }}>{c.emoji} {c.label}</Text>
            <Text style={{ fontFamily: Fonts.bold, fontSize: 12, color: colors.textMuted }}>{c.used}%</Text>
          </View>
          <View style={{ height: 7, borderRadius: 99, backgroundColor: colors.divider }}>
            <View style={{ width: `${c.used}%`, height: 7, borderRadius: 99, backgroundColor: c.color }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function VisualChat({ colors }: { colors: any }) {
  const msgs = [
    { role: 'user', text: 'Tháng này tôi chi tiêu có hợp lý không?' },
    { role: 'ai', text: 'Bạn đã chi 320k cho cà phê — cao hơn 40% so với tháng trước 📊' },
    { role: 'user', text: 'Gợi ý cách tiết kiệm hơn đi' },
    { role: 'ai', text: 'Thử giới hạn 150k/tuần cho cà phê nhé. Bạn sẽ tiết kiệm 680k/tháng! ✨' },
  ];
  return (
    <View style={{ gap: 8 }}>
      {msgs.map((m, i) => (
        <View key={i} style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
          <View style={{
            maxWidth: '80%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
            backgroundColor: m.role === 'user' ? colors.accent : colors.card,
            borderWidth: m.role === 'ai' ? 1 : 0,
            borderColor: colors.cardBorder,
          }}>
            <Text style={{
              fontFamily: Fonts.medium, fontSize: 12, lineHeight: 17,
              color: m.role === 'user' ? colors.accentText : colors.textPrimary,
            }}>{m.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function VisualGoals({ colors }: { colors: any }) {
  const goals = [
    { emoji: '✈️', label: 'Du lịch Nhật Bản', saved: 6_500_000, target: 20_000_000, pct: 33 },
    { emoji: '🏠', label: 'Mua nhà', saved: 45_000_000, target: 200_000_000, pct: 23 },
  ];
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontFamily: Fonts.extraBold, fontSize: 15, color: colors.textPrimary, marginBottom: 4 }}>Mục tiêu của tôi</Text>
      {goals.map((g, i) => (
        <View key={i} style={{ backgroundColor: colors.card, borderRadius: 16, padding: 14,
          borderWidth: 1, borderColor: colors.cardBorder, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: Fonts.bold, fontSize: 13, color: colors.textPrimary }}>{g.label}</Text>
              <Text style={{ fontFamily: Fonts.medium, fontSize: 11, color: colors.textMuted }}>
                {(g.saved / 1e6).toFixed(1)}tr / {(g.target / 1e6).toFixed(0)}tr ₫
              </Text>
            </View>
            <Text style={{ fontFamily: Fonts.extraBold, fontSize: 16, color: colors.accent }}>{g.pct}%</Text>
          </View>
          <View style={{ height: 8, borderRadius: 99, backgroundColor: colors.divider }}>
            <View style={{ width: `${g.pct}%`, height: 8, borderRadius: 99, backgroundColor: colors.accent }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function VisualStreak({ colors }: { colors: any }) {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const done  = [true, true, true, true, true, false, false];
  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 48 }}>🔥</Text>
        <Text style={{ fontFamily: Fonts.extraBold, fontSize: 32, color: colors.accent }}>12</Text>
        <Text style={{ fontFamily: Fonts.bold, fontSize: 14, color: colors.textSecondary }}>ngày streak</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((d, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <View style={{
              width: 34, height: 34, borderRadius: 10,
              backgroundColor: done[i] ? colors.accent : colors.divider,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: done[i] ? 14 : 12 }}>{done[i] ? '✓' : ''}</Text>
            </View>
            <Text style={{ fontFamily: Fonts.bold, fontSize: 10, color: done[i] ? colors.accent : colors.textMuted }}>{d}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});

  const s = makeStyles(colors);

  // ── Welcome animations ──────────────────────────────────────────────────────
  const illAnim   = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const btnAnim   = useRef(new Animated.Value(0)).current;
  const linkAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.stagger(150, [
      Animated.spring(illAnim,   { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 100 }),
      Animated.spring(titleAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 100 }),
      Animated.spring(btnAnim,   { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 100 }),
      Animated.spring(linkAnim,  { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 100 }),
    ]);

    entrance.start();
    return () => entrance.stop();
  }, []);

  const fadeSlide = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
  });

  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 40,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 60) setStep(prev => Math.max(0, prev - 1));
      },
    })
  ).current;

  const SLIDES: Slide[] = [
    { kind: 'welcome' },
    {
      kind: 'feature',
      title: 'Biết tiền\nđi đâu hết',
      sub: 'Theo dõi mọi khoản chi trong vài giây. Không còn cuối tháng giật mình.',
      visual: <VisualExpense colors={colors} />,
    },
    {
      kind: 'feature',
      title: 'Ngân sách\nluôn trong tầm tay',
      sub: 'Đặt giới hạn cho từng danh mục. FinMate cảnh báo trước khi bạn vượt mức.',
      visual: <VisualBudget colors={colors} />,
    },
    {
      kind: 'feature',
      title: 'Chat AI\nthông minh',
      sub: 'Hỏi bất cứ điều gì về tài chính. Nhận gợi ý cá nhân hóa dựa trên chi tiêu thực tế.',
      visual: <VisualChat colors={colors} />,
    },
    {
      kind: 'feature',
      title: 'Đặt mục tiêu\nvà theo dõi',
      sub: 'Từ du lịch, mua xe đến mua nhà. Xem tiến trình rõ ràng mỗi ngày.',
      visual: <VisualGoals colors={colors} />,
    },
    {
      kind: 'feature',
      title: 'Streak\nhàng ngày',
      sub: 'Xây dựng thói quen tài chính lành mạnh. Duy trì streak — duy trì tự do tài chính.',
      visual: <VisualStreak colors={colors} />,
    },
    { kind: 'auth' },
  ];

  const current = step;
  const slide     = SLIDES[step];

  const goNext = () => {
    if (step < SLIDES.length - 1) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const savePendingData = async () => {
    await AsyncStorage.setItem(PRE_ONBOARDING_KEY, 'true');
    for (const [k, v] of Object.entries(picks)) {
      await AsyncStorage.setItem(`onboarding_${k}`, v);
    }
    markPreOnboardingDone();
  };

  const goToAuth = async (path: '/(auth)/login' | '/(auth)/register') => {
    await savePendingData();
    router.replace(path);
  };

  // ── Auth screen ─────────────────────────────────────────────────────────────
  if (slide.kind === 'auth') {
    return (
      <View style={s.root}>
        <View style={s.orb1} />
        <View style={s.orb2} />

        <TouchableOpacity style={s.backBtn} onPress={goBack}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>

        <View style={s.authWrap}>
          <Text style={s.authIcon}>💰</Text>
          <Text style={s.authTitle}>Lưu tiến trình{'\n'}của bạn</Text>
          <Text style={s.authSub}>Tạo tài khoản miễn phí để không mất dữ liệu</Text>

          <TouchableOpacity style={s.appleBtn} onPress={() => {}}>
            <Text style={s.appleBtnText}>🍎  Tiếp tục với Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.googleBtn} onPress={() => {}}>
            <Text style={s.googleBtnText}>G  Tiếp tục với Google</Text>
          </TouchableOpacity>

          <View style={s.divRow}>
            <View style={s.divLine} />
            <Text style={s.divText}>hoặc</Text>
            <View style={s.divLine} />
          </View>

          <TouchableOpacity style={s.emailBtn} onPress={() => goToAuth('/(auth)/register')}>
            <Text style={s.emailBtnText}>✉️  Đăng ký bằng Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.loginLink} onPress={() => goToAuth('/(auth)/login')}>
            <Text style={s.loginLinkText}>Đã có tài khoản? Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Welcome screen ──────────────────────────────────────────────────────────
  if (slide.kind === 'welcome') {
    return (
      <View style={s.root} {...swipe.panHandlers}>
        {/* Illustration */}
        <Animated.View style={[s.welcomeIllustration, fadeSlide(illAnim)]}>
          <RevenueBro width={width * 0.9} height={height * 0.46} />
        </Animated.View>

        {/* Title + CTAs */}
        <View style={s.welcomeBottom}>
          <Animated.Text style={[s.welcomeTitle, fadeSlide(titleAnim)]}>
            Biết tiền đi đâu.{'\n'}Ngay hôm nay.
          </Animated.Text>
          <Animated.View style={fadeSlide(btnAnim)}>
            <TouchableOpacity style={s.welcomeStartBtn} onPress={goNext}>
              <Text style={s.welcomeStartText}>Bắt đầu</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={[fadeSlide(linkAnim), { alignItems: 'center', gap: 8 }]}>
            <TouchableOpacity style={s.welcomeLoginBtn} onPress={() => goToAuth('/(auth)/login')}>
              <Text style={s.welcomeLoginText}>
                Đã có tài khoản?{'  '}
                <Text style={s.welcomeLoginAction}>Đăng nhập →</Text>
              </Text>
            </TouchableOpacity>
            <Text style={s.welcomePrivacy}>
              Bằng cách tiếp tục, bạn đồng ý với{' '}
              <Text style={s.welcomePrivacyLink}>Chính sách bảo mật</Text>
              {' '}và{' '}
              <Text style={s.welcomePrivacyLink}>Điều khoản sử dụng</Text>
            </Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  // ── Feature / Pick screens ──────────────────────────────────────────────────
  const canAdvance =
    slide.kind === 'feature' ||
    (slide.kind === 'pick' && !!picks[slide.key]);

  return (
    <View style={s.root} {...swipe.panHandlers}>
      <StatusBar barStyle="dark-content" />

      {/* Visual card */}
      <View style={[s.card, { height: CARD_HEIGHT }]}>
        <View style={s.cardInner}>
          {slide.kind === 'feature' && slide.visual}
          {slide.kind === 'pick' && (
            <View style={s.pickGrid}>
              {slide.options.map(opt => {
                const selected = picks[slide.key] === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[s.pickCard, selected && s.pickCardActive]}
                    onPress={() => setPicks(p => ({ ...p, [slide.key]: opt.id }))}
                    activeOpacity={0.75}
                  >
                    <Text style={s.pickEmoji}>{opt.emoji}</Text>
                    <Text style={[s.pickLabel, selected && s.pickLabelActive]}>{opt.label}</Text>
                    {selected && <View style={s.pickCheck}><Text style={s.pickCheckText}>✓</Text></View>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Text content */}
      <View style={s.content}>
        {/* Dots */}
        <View style={s.dots}>
          {SLIDES.slice(0, -1).map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i < current && { backgroundColor: colors.accent, opacity: 0.35 },
                i === current && s.dotActive,
              ]}
            />
          ))}
        </View>

        {'title' in slide && <Text style={s.title}>{slide.title}</Text>}
        {'sub' in slide && <Text style={s.sub}>{slide.sub}</Text>}
      </View>

      {/* Navigation */}
      <View style={s.nav}>
        <TouchableOpacity
          style={[s.navNext, !canAdvance && s.navNextDisabled]}
          onPress={canAdvance ? goNext : undefined}
          activeOpacity={canAdvance ? 0.8 : 1}
        >
          <Text style={s.navNextText}>
            {step === SLIDES.length - 2 ? 'Bắt đầu' : 'Tiếp theo'}
          </Text>
          <Text style={[s.navNextText, { fontSize: 18 }]}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },

    orb1: {
      position: 'absolute', top: -60, right: -60,
      width: 240, height: 240, borderRadius: 120,
      backgroundColor: colors.orb1,
    },
    orb2: {
      position: 'absolute', bottom: 80, left: -60,
      width: 180, height: 180, borderRadius: 90,
      backgroundColor: colors.orb2,
    },

    // ── Visual card ──
    card: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
      overflow: 'hidden',
    },
    cardInner: {
      flex: 1,
      paddingTop: Platform.OS === 'ios' ? 60 : 48,
      paddingHorizontal: 24,
      paddingBottom: 24,
      justifyContent: 'center',
    },

    // ── Pick grid ──
    pickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
    },
    pickCard: {
      width: (width - 24 * 2 - 12) / 2,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 20,
      alignItems: 'center',
      gap: 8,
    },
    pickCardActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentBg,
    },
    pickEmoji: { fontSize: 32 },
    pickLabel: {
      fontFamily: Fonts.semiBold,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    pickLabelActive: { color: colors.accent },
    pickCheck: {
      position: 'absolute', top: 10, right: 10,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    pickCheckText: {
      fontSize: 11, color: colors.accentText, fontFamily: Fonts.extraBold,
    },

    // ── Text content ──
    content: {
      flex: 1,
      paddingHorizontal: 28,
      paddingTop: 20,
      justifyContent: 'flex-start',
    },
    dots: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 16,
    },
    dot: {
      width: 6, height: 6, borderRadius: 99,
      backgroundColor: colors.divider,
    },
    dotActive: {
      width: 20, backgroundColor: colors.accent,
    },
    title: {
      fontSize: 34,
      fontFamily: Fonts.extraBold,
      color: colors.textPrimary,
      lineHeight: 41,
      letterSpacing: -1,
      marginBottom: 10,
    },
    sub: {
      fontSize: 15,
      fontFamily: Fonts.medium,
      color: colors.textSecondary,
      lineHeight: 22,
    },

    // ── Navigation ──
    nav: {
      alignItems: 'center',
      paddingBottom: Platform.OS === 'ios' ? 44 : 28,
      paddingTop: 8,
    },
    navNext: {
      height: 52, borderRadius: 99,
      paddingHorizontal: 36,
      backgroundColor: colors.accent,
      alignItems: 'center', justifyContent: 'center',
      flexDirection: 'row', gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2, shadowRadius: 10, elevation: 6,
    },
    navNextDisabled: {
      opacity: 0.35,
    },
    navNextText: {
      fontSize: 16, fontFamily: Fonts.extraBold, color: colors.accentText,
    },

    // ── Auth ──
    backBtn: {
      position: 'absolute', top: Platform.OS === 'ios' ? 56 : 40, left: 20, zIndex: 10,
      width: 44, height: 44, borderRadius: 14,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    backBtnText: { fontSize: 22, color: colors.textSecondary, fontFamily: Fonts.bold },
    authWrap: {
      flex: 1, justifyContent: 'center',
      paddingHorizontal: 28,
      paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    },
    authIcon: { fontSize: 52, textAlign: 'center', marginBottom: 16 },
    authTitle: {
      fontSize: 30, fontFamily: Fonts.extraBold,
      color: colors.textPrimary, textAlign: 'center',
      lineHeight: 38, letterSpacing: -0.5, marginBottom: 10,
    },
    authSub: {
      fontSize: 15, fontFamily: Fonts.medium,
      color: colors.textSecondary, textAlign: 'center',
      lineHeight: 22, marginBottom: 36,
    },
    appleBtn: {
      backgroundColor: '#1a1a1a', borderRadius: 16,
      height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    appleBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: '#fff' },
    googleBtn: {
      backgroundColor: colors.bg, borderRadius: 16,
      height: 52, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: colors.cardBorder, marginBottom: 20,
    },
    googleBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: colors.textPrimary },
    divRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    divLine: { flex: 1, height: 1, backgroundColor: colors.divider },
    divText: { fontSize: 13, fontFamily: Fonts.medium, color: colors.textMuted },
    emailBtn: {
      backgroundColor: colors.accent, borderRadius: 16,
      height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
    },
    emailBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: colors.accentText },
    loginLink: { alignItems: 'center', paddingVertical: 8 },
    loginLinkText: { fontSize: 14, fontFamily: Fonts.semiBold, color: colors.accent },

    // ── Welcome ──
    welcomeWrap: {
      flex: 1,
      paddingHorizontal: 32,
      paddingTop: Platform.OS === 'ios' ? 100 : 80,
      justifyContent: 'flex-start',
    },
    welcomeLogoWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 48,
    },
    welcomeLogoEmoji: { fontSize: 44 },
    welcomeLogoName: {
      fontSize: 32, fontFamily: Fonts.extraBold,
      color: colors.textPrimary, letterSpacing: -1,
    },
    welcomeSub: {
      fontSize: 16, fontFamily: Fonts.medium,
      color: colors.textSecondary, lineHeight: 24,
    },
    welcomeIllustration: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcomeBottom: {
      paddingHorizontal: 28,
      paddingBottom: Platform.OS === 'ios' ? 48 : 32,
      paddingTop: 24,
      gap: 14,
    },
    welcomeTitle: {
      fontSize: 36,
      fontFamily: Fonts.extraBold,
      color: colors.textPrimary,
      lineHeight: 44,
      letterSpacing: -1,
      marginBottom: 8,
    },
    welcomeStartBtn: {
      height: 56, borderRadius: 16,
      backgroundColor: colors.accent,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
    },
    welcomeStartText: {
      fontSize: 17, fontFamily: Fonts.extraBold, color: colors.accentText,
    },
    welcomeLoginBtn: { alignItems: 'center', paddingVertical: 4 },
    welcomeLoginText: {
      fontSize: 15, fontFamily: Fonts.semiBold, color: colors.textSecondary,
    },
    welcomeLoginAction: {
      fontSize: 15, fontFamily: Fonts.bold, color: colors.textPrimary,
    },
    welcomePrivacy: {
      fontSize: 11, fontFamily: Fonts.medium,
      color: colors.textMuted, textAlign: 'center', lineHeight: 16,
    },
    welcomePrivacyLink: {
      fontFamily: Fonts.semiBold, color: colors.textSecondary,
    },

    // ── Floating cards ──
    floatCard: {
      position: 'absolute',
      backgroundColor: colors.card,
      borderRadius: 14, padding: 10,
      borderWidth: 1, borderColor: colors.cardBorder,
      flexDirection: 'row', alignItems: 'center', gap: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
    },
    floatCardWide: { flexDirection: 'row', alignItems: 'center' },
    floatCardIcon: { fontSize: 20 },
    floatCardLabel: {
      fontFamily: Fonts.medium, fontSize: 10, color: colors.textMuted,
    },
    floatCardValue: {
      fontFamily: Fonts.extraBold, fontSize: 16, color: colors.textPrimary, lineHeight: 20,
    },
    floatCardUnit: {
      fontFamily: Fonts.medium, fontSize: 11, color: colors.textMuted,
    },
    floatCardTip: {
      fontFamily: Fonts.semiBold, fontSize: 12, color: colors.textPrimary, lineHeight: 17,
    },

    welcomeDots: {
      flexDirection: 'row', gap: 5, justifyContent: 'center',
      paddingTop: Platform.OS === 'ios' ? 60 : 44,
      paddingBottom: 10,
    },
    welcomeContent: {
      flex: 1, paddingHorizontal: 28, paddingTop: 20, justifyContent: 'flex-start',
    },
    welcomeBullets: { gap: 10, marginTop: 4 },
    welcomeBullet: {
      fontSize: 16, fontFamily: Fonts.medium,
      color: colors.textSecondary, lineHeight: 24,
      textAlign: 'center',
    },
  });
