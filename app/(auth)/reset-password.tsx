import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { Fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    const processUrl = async (url: string | null) => {
      if (!url || handled.current) return;
      handled.current = true;

      const getQueryParam = (u: string, key: string): string | null => {
        const qStart = u.indexOf('?');
        if (qStart === -1) return null;
        const query = u.substring(qStart + 1).split('#')[0];
        return new URLSearchParams(query).get(key);
      };
      const getHashParam = (u: string, key: string): string | null => {
        const hStart = u.indexOf('#');
        if (hStart === -1) return null;
        return new URLSearchParams(u.substring(hStart + 1)).get(key);
      };

      // Case 1: Supabase verify URL trực tiếp
      // https://xxx.supabase.co/auth/v1/verify?token=pkce_xxx&type=recovery
      const tokenHash = getQueryParam(url, 'token');
      const urlType = getQueryParam(url, 'type');
      if (tokenHash && urlType === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (error) {
          setLinkError('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
        } else {
          setSessionReady(true);
        }
        return;
      }

      // Case 2: PKCE redirect: finmate://reset-password?code=XXXXX
      const code = getQueryParam(url, 'code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setLinkError('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
        } else {
          setSessionReady(true);
        }
        return;
      }

      // Case 3: Implicit redirect: finmate://reset-password#access_token=xxx&type=recovery
      const accessToken = getHashParam(url, 'access_token');
      const refreshToken = getHashParam(url, 'refresh_token') ?? '';
      const hashType = getHashParam(url, 'type');
      if (accessToken && hashType === 'recovery') {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setLinkError('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
        } else {
          setSessionReady(true);
        }
        return;
      }

      setLinkError('Link không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới.');
    };

    // Cold start: app mở từ email link
    Linking.getInitialURL().then(processUrl);

    // Foreground: app đã mở, nhận link mới
    const subscription = Linking.addEventListener('url', ({ url }) => processUrl(url));

    // Timeout: nếu sau 8s vẫn không có URL, báo lỗi
    const timer = setTimeout(() => {
      if (!handled.current) {
        setLinkError('Không nhận được link. Vui lòng thử lại từ email.');
      }
    }, 8000);

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      Alert.alert('Lỗi', error.message);
    } else {
      await supabase.auth.signOut();
      Alert.alert(
        'Thành công',
        'Mật khẩu đã được đặt lại. Vui lòng đăng nhập lại.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
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
            <Text style={styles.logoIcon}>🔑</Text>
          </View>
          <Text style={styles.appName}>Đặt lại mật khẩu</Text>
          <Text style={styles.tagline}>
            Nhập mật khẩu mới cho tài khoản của bạn
          </Text>
        </View>

        <View style={styles.formCard}>
          {linkError ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Link không hợp lệ</Text>
              <Text style={styles.errorText}>{linkError}</Text>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => router.replace('/(auth)/forgot-password')}
              >
                <Text style={styles.submitText}>Yêu cầu link mới</Text>
              </TouchableOpacity>
            </View>
          ) : !sessionReady ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>Đang xác thực link...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.formTitle}>Mật khẩu mới</Text>
              <Text style={styles.formSub}>Chọn mật khẩu mạnh, ít nhất 6 ký tự</Text>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Ít nhất 6 ký tự"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitText}>
                  {loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
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
    marginTop: 8, marginBottom: 8,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.accentText, fontSize: 16, fontFamily: Fonts.extraBold },

  loadingWrap: { alignItems: 'center', paddingVertical: 32 },
  loadingText: { marginTop: 16, fontSize: 14, color: colors.textMuted, fontFamily: Fonts.medium },

  errorWrap: { alignItems: 'center', paddingVertical: 8 },
  errorIcon: { fontSize: 52, marginBottom: 16 },
  errorTitle: { fontSize: 22, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 8 },
  errorText: {
    fontSize: 14, color: colors.textMuted, fontFamily: Fonts.medium,
    textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },

  footer: {
    textAlign: 'center', fontSize: 12,
    color: colors.textMuted, fontFamily: Fonts.semiBold, marginTop: 24,
  },
});
