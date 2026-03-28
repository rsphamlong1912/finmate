import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();
  const router = useRouter();

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ email');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Lỗi', error.message);
    } else {
      setSent(true);
    }
  };

  const styles = makeStyles(colors);

  return (
    <View style={styles.root}>
      <View style={styles.bgShape} />
      <View style={styles.bgShape2} />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoIcon}>🔐</Text>
          </View>
          <Text style={styles.appName}>Quên mật khẩu</Text>
          <Text style={styles.tagline}>
            Nhập email của bạn để nhận{'\n'}link đặt lại mật khẩu
          </Text>
        </View>

        <View style={styles.formCard}>
          {sent ? (
            <View style={styles.successWrap}>
              <Text style={styles.successIcon}>📬</Text>
              <Text style={styles.successTitle}>Đã gửi!</Text>
              <Text style={styles.successText}>
                Kiểm tra hộp thư của <Text style={styles.emailHighlight}>{email}</Text> để lấy link đặt lại mật khẩu.
              </Text>
              <TouchableOpacity style={styles.submitBtn} onPress={() => router.back()}>
                <Text style={styles.submitText}>Quay lại đăng nhập</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.formTitle}>Đặt lại mật khẩu</Text>
              <Text style={styles.formSub}>
                Chúng tôi sẽ gửi link xác nhận đến email của bạn
              </Text>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleReset}
                disabled={loading}
              >
                <Text style={styles.submitText}>
                  {loading ? 'Đang gửi...' : 'Gửi link đặt lại'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backText}>
                  Quay lại <Text style={styles.backLink}>Đăng nhập</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.footer}>Made by LONGEN lab</Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bgShape: {
    position: 'absolute', top: -100, right: -100,
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: colors.orb1,
  },
  bgShape2: {
    position: 'absolute', bottom: -80, left: -80,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: colors.orb2,
  },
  scroll: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 40,
  },

  hero: { alignItems: 'center', marginBottom: 40 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: colors.accent, alignItems: 'center',
    justifyContent: 'center', marginBottom: 16,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  logoIcon: { fontSize: 40 },
  appName: {
    fontSize: 34, fontFamily: Fonts.extraBold, color: colors.textPrimary,
    letterSpacing: -1.5, marginBottom: 8,
  },
  tagline: {
    fontSize: 15, color: colors.textMuted, fontFamily: Fonts.medium,
    textAlign: 'center', lineHeight: 22,
  },

  formCard: {
    backgroundColor: colors.card, borderRadius: 28, padding: 24,
    borderWidth: 1, borderColor: colors.cardBorder,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  formTitle: { fontSize: 22, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 4 },
  formSub: { fontSize: 13, color: colors.textMuted, fontFamily: Fonts.medium, marginBottom: 24 },

  inputWrap: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontFamily: Fonts.bold, color: colors.accent, marginBottom: 6 },
  input: {
    backgroundColor: colors.inputBg, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.textPrimary, fontFamily: Fonts.semiBold,
    borderWidth: 1, borderColor: colors.inputBorder,
  },

  submitBtn: {
    backgroundColor: colors.accent, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    marginTop: 8, marginBottom: 16,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.textPrimary, fontSize: 16, fontFamily: Fonts.extraBold },

  backBtn: { alignItems: 'center' },
  backText: { fontSize: 13, color: colors.textMuted, fontFamily: Fonts.medium },
  backLink: { color: colors.accent, fontFamily: Fonts.extraBold },

  successWrap: { alignItems: 'center', paddingVertical: 8 },
  successIcon: { fontSize: 52, marginBottom: 16 },
  successTitle: { fontSize: 22, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 8 },
  successText: {
    fontSize: 14, color: colors.textMuted, fontFamily: Fonts.medium,
    textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  emailHighlight: { color: colors.accent, fontFamily: Fonts.bold },

  footer: {
    textAlign: 'center', fontSize: 12,
    color: colors.textMuted, fontFamily: Fonts.semiBold, marginTop: 24,
  },
});
