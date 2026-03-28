import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Modal } from 'react-native';
import { Fonts } from '../constants/fonts';
import { AchievementDef, TIER_CONFIG } from '../lib/achievements';

const { height } = Dimensions.get('window');

type Props = {
  achievement: AchievementDef | null;
  onClose: () => void;
};

export function AchievementUnlockModal({ achievement, onClose }: Props) {
  const visible     = !!achievement;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(60)).current;
  const emojiAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      slideAnim.setValue(60);
      emojiAnim.setValue(0);
      backdropAnim.setValue(0);

      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim,    { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
        Animated.timing(slideAnim,    { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.loop(Animated.sequence([
          Animated.timing(emojiAnim, { toValue: -12, duration: 600, useNativeDriver: true }),
          Animated.timing(emojiAnim, { toValue: 0,   duration: 600, useNativeDriver: true }),
        ])),
      ]).start();
    }
  }, [visible]);

  if (!achievement) return null;

  const tier = TIER_CONFIG[achievement.tier];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }]}>
        {/* Tier label */}
        <View style={[styles.tierBadge, { backgroundColor: tier.bg, borderColor: tier.border }]}>
          <Text style={[styles.tierText, { color: tier.color }]}>{tier.medal} Thành tích {tier.label}</Text>
        </View>

        <Text style={styles.unlockedLabel}>Mở khóa thành tích!</Text>

        {/* Emoji badge */}
        <Animated.View style={[styles.emojiBadge, { borderColor: tier.border, backgroundColor: tier.bg, transform: [{ translateY: emojiAnim }] }]}>
          <Text style={styles.emoji}>{achievement.emoji}</Text>
        </Animated.View>

        <Text style={styles.title}>{achievement.title}</Text>
        <Text style={styles.description}>{achievement.description}</Text>

        {/* XP */}
        <View style={styles.xpRow}>
          <Text style={styles.xpText}>+{achievement.xp} XP</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
          <Text style={styles.btnText}>Tuyệt vời! 🎉</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,4,30,0.75)',
  },
  card: {
    position: 'absolute',
    bottom: height * 0.12,
    left: 24, right: 24,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#1a0a3c',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
  },
  tierBadge: {
    borderRadius: 99, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 5,
    marginBottom: 16,
  },
  tierText:      { fontSize: 12, fontFamily: Fonts.extraBold },
  unlockedLabel: { fontSize: 13, color: '#9b8cc4', fontFamily: Fonts.semiBold, marginBottom: 20 },
  emojiBadge: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  emoji:       { fontSize: 48 },
  title:       { fontSize: 22, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 8, textAlign: 'center' },
  description: { fontSize: 14, color: '#9b8cc4', fontFamily: Fonts.medium, textAlign: 'center', marginBottom: 20 },
  xpRow: {
    backgroundColor: '#f0edfb', borderRadius: 99,
    paddingHorizontal: 20, paddingVertical: 8,
    marginBottom: 24,
  },
  xpText: { fontSize: 16, fontFamily: Fonts.extraBold, color: '#6b4fa8' },
  btn: {
    backgroundColor: '#6b4fa8', borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 40,
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontFamily: Fonts.extraBold },
});
