import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markIntroDone } from './_layout';
import { Fonts } from '../constants/fonts';
import Slide1 from '../assets/intro/slide1.svg';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: null,
    title: 'Chào mừng đến\nvới FinMate',
    sub: 'Trợ lý tài chính cá nhân thông minh giúp bạn kiểm soát tiền bạc dễ dàng hơn bao giờ hết.',
    accent: '#6b4fa8',
  },
  {
    id: '2',
    emoji: '📊',
    title: 'Theo dõi\nchi tiêu',
    sub: 'Ghi lại mọi khoản chi trong vài giây. Phân loại tự động theo danh mục thông minh.',
    accent: '#5a3d96',
  },
  {
    id: '3',
    emoji: '🤖',
    title: 'Chat AI\nthông minh',
    sub: 'Hỏi FinMate bất cứ điều gì về tài chính. Nhận gợi ý cá nhân hóa dựa trên chi tiêu của bạn.',
    accent: '#4a2d86',
  },
  {
    id: '4',
    emoji: '🎯',
    title: 'Mục tiêu\ntiết kiệm',
    sub: 'Đặt mục tiêu và theo dõi tiến trình từng ngày. Từ du lịch, mua xe đến mua nhà.',
    accent: '#3b1f6e',
  },
  {
    id: '5',
    emoji: '🔥',
    title: 'Streak\nhàng ngày',
    sub: 'Xây dựng thói quen tài chính lành mạnh. Duy trì streak mỗi ngày để đạt tự do tài chính.',
    accent: '#2d1558',
  },
];

export const INTRO_DONE_KEY = 'intro_done';

export default function IntroScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const markDoneAndGo = async (signup: boolean) => {
    await AsyncStorage.setItem(INTRO_DONE_KEY, 'true');
    markIntroDone();
    router.replace({ pathname: '/(auth)/login', params: { signup: signup ? '1' : '0' } });
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={[styles.slide, { width }]}>
      {/* Decorative orbs */}
      <View style={[styles.orb1, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
      <View style={[styles.orb2, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />

      {/* Content */}
      <View style={styles.slideContent}>
        <View style={styles.emojiWrap}>
          {item.id === '1' ? (
            <Slide1 width={85} height={85} />
          ) : (
            <Text style={styles.emoji}>{item.emoji}</Text>
          )}
        </View>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSub}>{item.sub}</Text>
      </View>
    </View>
  );

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={i => i.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        style={styles.list}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottom}>
        {isLast ? (
          <>
            <TouchableOpacity style={styles.registerBtn} onPress={() => markDoneAndGo(true)}>
              <Text style={styles.registerText}>Tạo tài khoản miễn phí</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.loginBtn} onPress={() => markDoneAndGo(false)}>
              <Text style={styles.loginText}>Đã có tài khoản? Đăng nhập</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextText}>Tiếp theo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={() => markDoneAndGo(false)}>
              <Text style={styles.skipText}>Bỏ qua</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3b1f6e' },
  list: { flex: 1 },

  slide: {
    height: height,
    backgroundColor: '#3b1f6e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 240,
    paddingHorizontal: 32,
  },
  orb1: {
    position: 'absolute', top: -60, right: -60,
    width: 260, height: 260, borderRadius: 130,
  },
  orb2: {
    position: 'absolute', bottom: 160, left: -80,
    width: 220, height: 220, borderRadius: 110,
  },

  slideContent: { alignItems: 'center' },
  emojiWrap: {
    width: 110, height: 110, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  emoji: { fontSize: 52 },
  slideTitle: {
    fontSize: 34, fontFamily: Fonts.extraBold,
    color: '#fff', textAlign: 'center',
    lineHeight: 42, letterSpacing: -1, marginBottom: 16,
  },
  slideSub: {
    fontSize: 16, fontFamily: Fonts.medium,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center', lineHeight: 24,
  },

  dotsRow: {
    position: 'absolute',
    bottom: 210,
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#fff',
  },

  bottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 16,
    gap: 10,
  },

  nextBtn: {
    backgroundColor: '#fff',
    borderRadius: 18, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 6,
  },
  nextText: { fontSize: 16, fontFamily: Fonts.extraBold, color: '#3b1f6e' },

  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.45)' },

  registerBtn: {
    backgroundColor: '#fff',
    borderRadius: 18, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 6,
  },
  registerText: { fontSize: 16, fontFamily: Fonts.extraBold, color: '#3b1f6e' },

  loginBtn: {
    borderRadius: 18, paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  loginText: { fontSize: 15, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.85)' },
});
