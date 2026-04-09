import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Fonts } from '../constants/fonts';
import { useAchievements } from '../context/AchievementsContext';
import {
  ACHIEVEMENTS, TIER_CONFIG, LEVELS,
  AchievementCategory, AchievementDef,
} from '../lib/achievements';
import { useTheme } from '../context/ThemeContext';

const TABS: Array<{ key: AchievementCategory | 'all'; label: string }> = [
  { key: 'all',          label: 'Tất cả'       },
  { key: 'streak',       label: '🔥 Streak'    },
  { key: 'transactions', label: '💰 Giao dịch' },
  { key: 'goals',        label: '🎯 Mục tiêu'  },
];

const LEVEL_COLORS = ['#34D399', '#818cf8', '#fbbf24', '#ef4444', '#a855f7'];

function LevelPath({ currentIndex, totalXP, levelProgress }: { currentIndex: number; totalXP: number; levelProgress: number }) {
  const { colors } = useTheme();
  const pathStyles = makePathStyles(colors);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.5, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={pathStyles.wrap}>

      {/* ── Row 1: circles + lines ── */}
      <View style={pathStyles.circleRow}>
        {LEVELS.map((lv, i) => {
          const done   = i < currentIndex;
          const active = i === currentIndex;
          const locked = i > currentIndex;
          const color  = LEVEL_COLORS[i];
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: i < LEVELS.length - 1 ? 1 : 0 }}>
              <View style={pathStyles.circleWrap}>
                {active && (
                  <Animated.View style={[
                    pathStyles.pulse,
                    { borderColor: color, transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({ inputRange: [1, 1.5], outputRange: [0.45, 0] }) }
                  ]} />
                )}
                <View style={[
                  pathStyles.node,
                  done   && { backgroundColor: color, borderColor: color },
                  active && { backgroundColor: color, borderColor: colors.bg, borderWidth: 2.5 },
                  locked && { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                ]}>
                  <Text style={[pathStyles.nodeEmoji, locked && { opacity: 0.3 }]}>{lv.emoji}</Text>
                </View>
              </View>
              {i < LEVELS.length - 1 && (
                <View style={[pathStyles.line, { backgroundColor: i < currentIndex ? LEVEL_COLORS[i] : colors.divider }]} />
              )}
            </View>
          );
        })}
      </View>

      {/* ── Row 2: labels ── */}
      <View style={pathStyles.labelRow}>
        {LEVELS.map((lv, i) => {
          const active = i === currentIndex;
          const locked = i > currentIndex;
          return (
            <View key={i} style={i < LEVELS.length - 1 ? pathStyles.labelOuter : null}>
              <View style={pathStyles.labelItem}>
                <Text style={[pathStyles.nodeLabel, active && { color: colors.textPrimary, fontFamily: Fonts.extraBold }, locked && { opacity: 0.35 }]} numberOfLines={1}>
                  {lv.label}
                </Text>
                {active && <Text style={pathStyles.nodeXP}>{totalXP} XP</Text>}
              </View>
            </View>
          );
        })}
      </View>

      {/* ── XP bar ── */}
      <View style={pathStyles.barWrap}>
        <View style={pathStyles.barTrack}>
          <View style={[pathStyles.barFill, { width: `${levelProgress * 100}%` as any, backgroundColor: LEVEL_COLORS[currentIndex] }]} />
        </View>
        {LEVELS[currentIndex].next && (
          <Text style={pathStyles.barLabel}>còn {LEVELS[currentIndex].next! - totalXP} XP lên cấp tiếp</Text>
        )}
      </View>
    </View>
  );
}

const NODE = 36;
const makePathStyles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) => StyleSheet.create({
  wrap:        { marginTop: 8 },

  // Row 1 — circles + lines
  circleRow:   { flexDirection: 'row', alignItems: 'center' },
  line:        { flex: 1, height: 2, borderRadius: 99 },
  circleWrap:  { width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' },
  pulse: {
    position: 'absolute',
    width: NODE + 16, height: NODE + 16,
    borderRadius: (NODE + 16) / 2,
    borderWidth: 2,
    top: -(16 / 2), left: -(16 / 2),
  },
  node: {
    width: NODE, height: NODE, borderRadius: NODE / 2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.cardBorder,
    backgroundColor: colors.inputBg,
  },
  nodeEmoji:   { fontSize: 16 },

  // Row 2 — labels
  labelRow:    { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  labelOuter:  { flex: 1 },
  labelItem:   { width: NODE, alignItems: 'center', gap: 2 },
  nodeLabel:   { fontSize: 7, fontFamily: Fonts.semiBold, color: colors.textMuted, textAlign: 'center', width: 72 },
  nodeXP:      { fontSize: 8, fontFamily: Fonts.extraBold, color: colors.textPrimary, opacity: 0.85 },

  // XP bar
  barWrap:     { marginTop: 12, gap: 4 },
  barTrack:    { height: 4, backgroundColor: colors.divider, borderRadius: 99, overflow: 'hidden' },
  barFill:     { height: 4, borderRadius: 99 },
  barLabel:    { fontSize: 9, color: colors.textMuted, fontFamily: Fonts.medium, textAlign: 'right' },
});

function AchievementCard({ a, current, unlocked, colors }: { a: AchievementDef; current: number; unlocked: boolean; colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors'] }) {
  const tier = TIER_CONFIG[a.tier];
  // Nếu đã unlock thì luôn hiển thị progress = 100%, không dùng stats hiện tại
  // (vì stats có thể thấp hơn threshold nếu streak bị reset sau khi đã đạt)
  const displayCurrent = unlocked ? a.threshold : current;
  const pct  = Math.min(displayCurrent / a.threshold, 1);
  const styles = makeStyles(colors);

  return (
    <View style={[styles.card, !unlocked && styles.cardLocked]}>
      {/* Badge */}
      <View style={[styles.badgeCircle, { backgroundColor: tier.bg, borderColor: unlocked ? tier.border : colors.cardBorder }]}>
        <Text style={[styles.badgeEmoji, !unlocked && { opacity: 0.35 }]}>{a.emoji}</Text>
        {!unlocked && (
          <View style={styles.lockDot}><Text style={{ fontSize: 8 }}>🔒</Text></View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, !unlocked && styles.cardTitleLocked]} numberOfLines={1}>
            {a.title}
          </Text>
          <View style={[styles.tierPill, { backgroundColor: tier.bg, borderColor: tier.border }]}>
            <Text style={[styles.tierPillText, { color: tier.color }]}>{tier.medal}</Text>
          </View>
        </View>

        <Text style={styles.cardDesc} numberOfLines={1}>{a.description}</Text>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: unlocked ? tier.border : colors.accentBorder }]} />
        </View>
        <View style={styles.progressBottom}>
          <Text style={styles.progressLabel}>
            {Math.min(displayCurrent, a.threshold)}/{a.threshold}
          </Text>
          <Text style={[styles.xpLabel, unlocked && styles.xpLabelEarned]}>
            {unlocked ? `✓ +${a.xp} XP` : `+${a.xp} XP`}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function AchievementsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { stats, earnedIds, totalXP, level, levelProgress } = useAchievements();
  const [activeTab, setActiveTab] = useState<AchievementCategory | 'all'>('all');

  const visible = activeTab === 'all'
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter(a => a.category === activeTab);

  const unlockedCount = earnedIds.size;

  const styles = makeStyles(colors);

  return (
    <View style={styles.root}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerBubble} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thành tích</Text>
        <Text style={styles.headerSub}>{unlockedCount}/{ACHIEVEMENTS.length} đã mở khóa</Text>

        <LevelPath currentIndex={level.index} totalXP={totalXP} levelProgress={levelProgress} />
      </View>

      {/* ── TABS ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── LIST ── */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visible.map(a => (
          <AchievementCard
            key={a.id}
            a={a}
            current={a.getValue(stats)}
            unlocked={earnedIds.has(a.id)}
            colors={colors}
          />
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    backgroundColor: colors.surface,
    paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerBubble: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(129,140,248,0.08)' },
  backBtn:      { marginBottom: 8 },
  backText:     { fontSize: 13, color: colors.textSecondary, fontFamily: Fonts.bold },
  headerTitle:  { fontSize: 26, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 2 },
  headerSub:    { fontSize: 13, color: colors.textSecondary, fontFamily: Fonts.medium, marginBottom: 18 },


  tabScroll:   { flexShrink: 0, maxHeight: 52 },
  tabContent:  { paddingHorizontal: 16, paddingVertical: 10, gap: 6, alignItems: 'center' },
  tab: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  tabActive:     { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText:       { fontSize: 12, fontFamily: Fonts.bold, color: colors.textMuted },
  tabTextActive: { color: colors.accentText },

  scroll:        { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 4, gap: 12 },

  card: {
    backgroundColor: colors.card, borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: colors.cardBorder,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 3,
  },
  cardLocked: { backgroundColor: colors.inputBg, opacity: 0.7 },

  badgeCircle: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  badgeEmoji: { fontSize: 26 },
  lockDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },

  cardBody:      { flex: 1, gap: 3 },
  cardTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle:     { flex: 1, fontSize: 14, fontFamily: Fonts.extraBold, color: colors.textPrimary },
  cardTitleLocked: { color: colors.textMuted },
  cardDesc:      { fontSize: 11, color: colors.textMuted, fontFamily: Fonts.medium },

  tierPill: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  tierPillText: { fontSize: 12 },

  progressTrack: { height: 5, backgroundColor: colors.divider, borderRadius: 99, overflow: 'hidden', marginTop: 6 },
  progressFill:  { height: 5, borderRadius: 99 },
  progressBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressLabel:  { fontSize: 10, color: colors.textMuted, fontFamily: Fonts.semiBold },
  xpLabel:        { fontSize: 10, color: colors.textMuted, fontFamily: Fonts.extraBold },
  xpLabelEarned:  { color: colors.accent },
});
