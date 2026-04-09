import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Vui lòng nhập lại mật khẩu giống nhau');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      Alert.alert('Lỗi', error.message);
    } else {
      Alert.alert('Thành công! 🎉', 'Tài khoản đã được tạo. Hãy đăng nhập nhé!', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
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
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Image source={require('../../assets/app-icon.png')} style={{ width: 65, height: 65, borderRadius: 16 }} />
          </View>
          <Text style={styles.appName}>FinMate</Text>
          <Text style={styles.tagline}>
            Trợ lý tài chính cá nhân{'\n'}thông minh của bạn
          </Text>
        </View>

        {/* FORM */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Tạo tài khoản</Text>
          <Text style={styles.formSub}>Bắt đầu hành trình tài chính của bạn</Text>

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

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Nhập lại mật khẩu</Text>
            <TextInput
              style={[
                styles.input,
                confirmPassword.length > 0 && confirmPassword !== password && styles.inputError,
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
            {confirmPassword.length > 0 && confirmPassword !== password && (
              <Text style={styles.errorText}>Mật khẩu không khớp</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitText}>
              {loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.switchText}>
              Đã có tài khoản? <Text style={styles.switchLink}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
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

  inputError: { borderColor: colors.danger },
  errorText: { fontSize: 11, color: colors.danger, fontFamily: Fonts.medium, marginTop: 4 },

  submitBtn: {
    backgroundColor: colors.accent, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    marginTop: 8, marginBottom: 16,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.accentText, fontSize: 16, fontFamily: Fonts.extraBold },

  switchBtn: { alignItems: 'center' },
  switchText: { fontSize: 13, color: colors.textMuted, fontFamily: Fonts.medium },
  switchLink: { color: colors.accent, fontFamily: Fonts.extraBold },

  footer: {
    textAlign: 'center', fontSize: 12,
    color: colors.textMuted, fontFamily: Fonts.semiBold, marginTop: 24,
  },
});
