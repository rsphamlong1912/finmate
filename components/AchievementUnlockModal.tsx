import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet,
  Animated, TouchableOpacity, Dimensions,
} from 'react-native';
import { Fonts } from '../constants/fonts';
import { AchievementDef, TIER_CONFIG } from '../lib/achievements';

const { width, height } = Dimensions.get('window');

const TIER_GLOW: Record<string, string> = {
  bronze:  '#f59e0b',
  silver:  '#94a3b8',
  gold:    '#eab308',
  diamond: '#818cf8',
};

const TIER_BG: Record<string, string> = {
  bronze:  '#1c1000',
  silver:  '#0d1117',
  gold:    '#1a1200',
  diamond: '#0f0a1e',
};

type Props = {
  visible:     boolean;
  achievement: AchievementDef | null;
  onClose:     () => void;
};

export function AchievementUnlockModal({ visible, achievement, onClose }: Props) {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const cardScale    = useRef(new Animated.Value(0.3)).current;
  const cardOpacity  = useRef(new Animated.Value(0)).current;
  const emojiScale   = useRef(new Animated.Value(0)).current;
  const glowAnim     = useRef(new Animated.Value(0.5)).current;
  const xpScale      = useRef(new Animated.Value(0)).current;
  const glowLoop     = useRef<Animated.CompositeAnimation | null>(null);

  const particleAnims = useRef(
    Array.from({ length: 6 }, (_, i) => ({
      y:       new Animated.Value(height * 0.45),
      opacity: new Animated.Value(0),
      x:       Math.floor((width / 6) * i + 12),
    }))
  ).current;

  useEffect(() => {
    if (!visible) {
      glowLoop.current?.stop();
      backdropAnim.setValue(0);
      cardScale.setValue(0.3);
      cardOpacity.setValue(0);
      emojiScale.setValue(0);
      glowAnim.setValue(0.5);
      xpScale.setValue(0);
      particleAnims.forEach(p => { p.y.setValue(height * 0.45); p.opacity.setValue(0); });
      return;
    }

    Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    Animated.parallel([
      Animated.spring(cardScale,   { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(200),
      Animated.spring(emojiScale, { toValue: 1, tension: 40, friction: 5, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(400),
      Animated.spring(xpScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
    ]).start();

    glowLoop.current = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1200, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
    ]));
    glowLoop.current.start();

    particleAnims.forEach((p, i) => {
      Animated.sequence([
        Animated.delay(300 + i * 180),
        Animated.parallel([
          Animated.timing(p.opacity, { toValue: 1,              duration: 400,  useNativeDriver: true }),
          Animated.timing(p.y,       { toValue: -height * 0.55, duration: 2800, useNativeDriver: true }),
        ]),
        Animated.timing(p.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    });

    return () => { glowLoop.current?.stop(); };
  }, [visible]);

  const tier      = achievement ? TIER_CONFIG[achievement.tier] : TIER_CONFIG['bronze'];
  const glowColor = achievement ? TIER_GLOW[achievement.tier]   : '#f59e0b';
  const bgColor   = achievement ? TIER_BG[achievement.tier]     : '#1c1000';

  const particles = achievement
    ? [achievement.emoji, tier.medal, '✨', '⭐', '💫', '🎉']
    : ['✨', '⭐', '💫', '🎉', '🌟', '🎊'];

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.backdrop, { opacity: backdropAnim }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {particleAnims.map((p, i) => (
        <Animated.Text
          key={i}
          style={[styles.particle, { left: p.x, transform: [{ translateY: p.y }], opacity: p.opacity }]}
        >
          {particles[i]}
        </Animated.Text>
      ))}

      <Animated.View style={[
        styles.card,
        { backgroundColor: bgColor, borderColor: glowColor + '80', transform: [{ scale: cardScale }], opacity: cardOpacity },
      ]}>
        <Animated.View style={[styles.glowRing, { backgroundColor: glowColor + '30', opacity: glowAnim }]} />

        <Text style={[styles.unlockLabel, { color: glowColor }]}>THÀNH TÍCH MỚI</Text>

        <Animated.View style={[styles.emojiBadge, { backgroundColor: tier.bg, borderColor: glowColor, transform: [{ scale: emojiScale }] }]}>
          <Text style={styles.bigEmoji}>{achievement?.emoji}</Text>
        </Animated.View>

        <Animated.View style={[styles.xpWrap, { transform: [{ scale: xpScale }] }]}>
          <View style={[styles.xpPill, { backgroundColor: glowColor + '25', borderColor: glowColor }]}>
            <Text style={[styles.xpText, { color: glowColor }]}>+{achievement?.xp} XP</Text>
            <Text style={styles.medalText}>{tier.medal}</Text>
          </View>
        </Animated.View>

        <Text style={styles.title}>{achievement?.title}</Text>
        <Text style={styles.desc}>{achievement?.description}</Text>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: glowColor, shadowColor: glowColor }]}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Tuyệt vời! Tiếp tục nhé 💪</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 2, 20, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  particle: {
    position: 'absolute',
    fontSize: 26,
  },
  card: {
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    width: width * 0.82,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
    overflow: 'hidden',
  },
  glowRing: {
    position: 'absolute',
    top: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  unlockLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 3,
    marginBottom: 20,
    opacity: 0.9,
  },
  emojiBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bigEmoji:  { fontSize: 52 },
  xpWrap:    { marginBottom: 20 },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 99,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  xpText:    { fontSize: 16, fontFamily: Fonts.extraBold },
  medalText: { fontSize: 18 },
  title: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: 'rgba(220,210,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  btnText: {
    fontSize: 15,
    fontFamily: Fonts.extraBold,
    color: '#fff',
  },
});
