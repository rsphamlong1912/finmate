import { useEffect, useRef } from 'react';
import {
  View, Text, Modal, StyleSheet,
  Animated, TouchableOpacity, Dimensions,
} from 'react-native';
import { Fonts } from '../constants/fonts';

const { width, height } = Dimensions.get('window');

const PARTICLE_EMOJIS = ['🔥', '⭐', '✨', '💫', '🌟', '🎯'];

type Props = {
  visible: boolean;
  streak: number;
  onClose: () => void;
};

const getMessage = (streak: number) => {
  if (streak >= 100) return { title: '100 ngày. Đây là lịch sử.', sub: 'FinMate chưa từng thấy ai kiên trì như bạn.' };
  if (streak >= 60)  return { title: 'Bạn ở top 1%.', sub: 'Ít người làm được điều này. Bạn là một trong số đó.' };
  if (streak >= 30)  return { title: '1 tháng. Bạn đã thay đổi.', sub: 'Thói quen tài chính đã in vào cuộc sống của bạn rồi.' };
  if (streak >= 14)  return { title: `${streak} ngày không ngừng nghỉ.`, sub: 'Phần lớn mọi người bỏ cuộc ở đây. Bạn thì không.' };
  if (streak >= 7)   return { title: '7 ngày. Không một lần bỏ lỡ.', sub: 'Đây không phải may mắn — đây là kỷ luật.' };
  if (streak >= 3)   return { title: 'Không thể dừng lại! 🚀', sub: 'Chuỗi đang bùng cháy. Đừng để hôm mai dập tắt nó!' };
  return               { title: 'Lửa đã bén! 🔥', sub: 'Bước đầu tiên luôn là khó nhất. Bạn đã vượt qua!' };
};

export function StreakCelebrationModal({ visible, streak, onClose }: Props) {
  const backdropAnim  = useRef(new Animated.Value(0)).current;
  const cardScale     = useRef(new Animated.Value(0.3)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const fireScale     = useRef(new Animated.Value(0)).current;
  const glowAnim      = useRef(new Animated.Value(0.5)).current;
  const countScale    = useRef(new Animated.Value(0)).current;
  const glowLoop      = useRef<Animated.CompositeAnimation | null>(null);

  const particleAnims = useRef(
    PARTICLE_EMOJIS.map((_, i) => ({
      y:       new Animated.Value(height * 0.45),
      opacity: new Animated.Value(0),
      x:       Math.floor((width / PARTICLE_EMOJIS.length) * i + 12),
    }))
  ).current;

  useEffect(() => {
    if (!visible) {
      glowLoop.current?.stop();
      backdropAnim.setValue(0);
      cardScale.setValue(0.3);
      cardOpacity.setValue(0);
      fireScale.setValue(0);
      glowAnim.setValue(0.5);
      countScale.setValue(0);
      particleAnims.forEach(p => { p.y.setValue(height * 0.45); p.opacity.setValue(0); });
      return;
    }

    // Backdrop
    Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // Card spring in
    Animated.parallel([
      Animated.spring(cardScale,   { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    // Fire bounce
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(fireScale, { toValue: 1, tension: 40, friction: 5, useNativeDriver: true }),
    ]).start();

    // Count pop
    Animated.sequence([
      Animated.delay(400),
      Animated.spring(countScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
    ]).start();

    // Glow pulse loop
    glowLoop.current = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1200, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
    ]));
    glowLoop.current.start();

    // Particles float up
    particleAnims.forEach((p, i) => {
      Animated.sequence([
        Animated.delay(300 + i * 180),
        Animated.parallel([
          Animated.timing(p.opacity, { toValue: 1,            duration: 400,  useNativeDriver: true }),
          Animated.timing(p.y,       { toValue: -height * 0.5, duration: 2800, useNativeDriver: true }),
        ]),
        Animated.timing(p.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    });

    return () => { glowLoop.current?.stop(); };
  }, [visible]);

  const { title, sub } = getMessage(streak);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>

        {/* Particles */}
        {particleAnims.map((p, i) => (
          <Animated.Text
            key={i}
            style={[styles.particle, { left: p.x, transform: [{ translateY: p.y }], opacity: p.opacity }]}
          >
            {PARTICLE_EMOJIS[i]}
          </Animated.Text>
        ))}

        {/* Card */}
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }], opacity: cardOpacity }]}>
          <Animated.View style={[styles.glowRing, { opacity: glowAnim }]} />

          <Animated.Text style={[styles.fireEmoji, { transform: [{ scale: fireScale }] }]}>
            🔥
          </Animated.Text>

          <Animated.View style={[styles.countWrap, { transform: [{ scale: countScale }] }]}>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>NGÀY STREAK</Text>
          </Animated.View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{sub}</Text>

          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>Tuyệt! Tiếp tục nhé 💪</Text>
          </TouchableOpacity>
        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(92, 61, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    fontSize: 26,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    width: width * 0.82,
    borderWidth: 2,
    borderColor: '#FFE234',
    shadowColor: '#FFD000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 16,
    overflow: 'hidden',
  },
  glowRing: {
    position: 'absolute',
    top: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 226, 52, 0.25)',
  },
  fireEmoji: {
    fontSize: 68,
    marginBottom: 12,
  },
  countWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  streakNumber: {
    fontSize: 76,
    fontFamily: Fonts.extraBold,
    color: '#5C3D00',
    lineHeight: 84,
    textAlign: 'center',
  },
  streakLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: 'rgba(92, 61, 0, 0.45)',
    letterSpacing: 3,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    color: '#5C3D00',
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: 'rgba(92, 61, 0, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: {
    backgroundColor: '#FFE234',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#FFD000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  btnText: {
    fontSize: 15,
    fontFamily: Fonts.extraBold,
    color: '#5C3D00',
  },
});
