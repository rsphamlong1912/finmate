import { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAchievements } from '../context/AchievementsContext';
import { TIER_CONFIG } from '../lib/achievements';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/fonts';

const TOAST_DURATION = 4000;
const ANIM_DURATION  = 380;

export default function AchievementToast() {
  const { currentToast, dismissToast } = useAchievements();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const progress   = useRef(new Animated.Value(1)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slideIn = () => {
    progress.setValue(1);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity,    { toValue: 1, duration: ANIM_DURATION, useNativeDriver: true }),
    ]).start();

    Animated.timing(progress, {
      toValue: 0,
      duration: TOAST_DURATION,
      useNativeDriver: false,
    }).start();
  };

  const slideOut = (cb?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: ANIM_DURATION, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,    duration: ANIM_DURATION, useNativeDriver: true }),
    ]).start(() => cb?.());
  };

  useEffect(() => {
    if (!currentToast) return;

    translateY.setValue(-120);
    opacity.setValue(0);
    slideIn();

    timerRef.current = setTimeout(() => {
      slideOut(dismissToast);
    }, TOAST_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentToast?.id]);

  if (!currentToast) return null;

  const tier = TIER_CONFIG[currentToast.tier];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + (Platform.OS === 'android' ? 8 : 4),
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => slideOut(dismissToast)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: tier.border }]}
      >
        {/* Left: emoji badge */}
        <View style={[styles.badge, { backgroundColor: tier.bg, borderColor: tier.border }]}>
          <Text style={styles.emoji}>{currentToast.emoji}</Text>
        </View>

        {/* Middle: text */}
        <View style={styles.textBlock}>
          <Text style={styles.label}>Thành tích mới!</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {currentToast.title}
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={1}>
            {currentToast.description}
          </Text>
        </View>

        {/* Right: XP pill */}
        <View style={[styles.xpPill, { backgroundColor: tier.bg, borderColor: tier.border }]}>
          <Text style={[styles.xpText, { color: tier.color }]}>+{currentToast.xp} XP</Text>
          <Text style={styles.medal}>{tier.medal}</Text>
        </View>
      </TouchableOpacity>

      {/* Progress bar */}
      <Animated.View
        style={[
          styles.progressBar,
          {
            backgroundColor: tier.border,
            width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 24 },
  textBlock: { flex: 1, gap: 1 },
  label: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontFamily: Fonts.extraBold,
  },
  desc: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  xpPill: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  xpText: {
    fontSize: 12,
    fontFamily: Fonts.extraBold,
  },
  medal: { fontSize: 14 },
  progressBar: {
    height: 3,
    borderRadius: 99,
    marginTop: 4,
    marginHorizontal: 4,
  },
});
