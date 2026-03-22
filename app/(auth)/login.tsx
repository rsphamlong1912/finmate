import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuth } from '../../hooks/useAuth';
import { Fonts } from '../../constants/fonts';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      setLoading(false);
      if (error) {
        Alert.alert('Lỗi', error.message);
      } else {
        Alert.alert('Thành công! 🎉', 'Tài khoản đã được tạo. Hãy đăng nhập nhé!', [
          { text: 'OK', onPress: () => setIsSignUp(false) }
        ]);
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        Alert.alert('Lỗi', error.message);
      }
      // Không cần navigate — _layout.tsx tự redirect dựa vào session + onboarding_done
    }
  };

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
            <Text style={styles.logoIcon}>💰</Text>
          </View>
          <Text style={styles.appName}>FinMate</Text>
          <Text style={styles.tagline}>
            Trợ lý tài chính cá nhân{'\n'}thông minh của bạn
          </Text>
        </View>

        {/* FORM */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {isSignUp ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
          </Text>
          <Text style={styles.formSub}>
            {isSignUp
              ? 'Bắt đầu hành trình tài chính của bạn'
              : 'Đăng nhập để tiếp tục'}
          </Text>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#c4b5fd"
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
              placeholderTextColor="#c4b5fd"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitText}>
              {loading
                ? 'Đang xử lý...'
                : isSignUp ? 'Tạo tài khoản' : 'Đăng nhập'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => setIsSignUp(v => !v)}
          >
            <Text style={styles.switchText}>
              {isSignUp ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
              <Text style={styles.switchLink}>
                {isSignUp ? 'Đăng nhập' : 'Đăng ký'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Made by LONGEN lab</Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eeeaf8' },
  bgShape: {
    position: 'absolute', top: -100, right: -100,
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: 'rgba(107,79,168,0.12)',
  },
  bgShape2: {
    position: 'absolute', bottom: -80, left: -80,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(59,31,110,0.08)',
  },
  scroll: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 40,
  },

  hero: { alignItems: 'center', marginBottom: 40 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#6b4fa8', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16,
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  logoIcon: { fontSize: 40 },
  appName: {
    fontSize: 34, fontFamily: Fonts.extraBold, color: '#3b1f6e',
    letterSpacing: -1.5, marginBottom: 8,
  },
  tagline: {
    fontSize: 15, color: '#9b8cc4', fontFamily: Fonts.medium,
    textAlign: 'center', lineHeight: 22,
  },

  formCard: {
    backgroundColor: '#fff', borderRadius: 28, padding: 24,
    shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 24, elevation: 10,
  },
  formTitle: { fontSize: 22, fontFamily: Fonts.extraBold, color: '#3b1f6e', marginBottom: 4 },
  formSub: { fontSize: 13, color: '#c4b5fd', fontFamily: Fonts.medium, marginBottom: 24 },

  inputWrap: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontFamily: Fonts.bold, color: '#6b4fa8', marginBottom: 6 },
  input: {
    backgroundColor: '#f5f3ff', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#3b1f6e', fontFamily: Fonts.semiBold,
    borderWidth: 2, borderColor: '#e4dff5',
  },

  submitBtn: {
    backgroundColor: '#6b4fa8', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    marginTop: 8, marginBottom: 16,
    shadowColor: '#6b4fa8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontFamily: Fonts.extraBold },

  switchBtn: { alignItems: 'center' },
  switchText: { fontSize: 13, color: '#c4b5fd', fontFamily: Fonts.medium },
  switchLink: { color: '#6b4fa8', fontFamily: Fonts.extraBold },

  footer: {
    textAlign: 'center', fontSize: 12,
    color: '#c4b5fd', fontFamily: Fonts.semiBold, marginTop: 24,
  },
});