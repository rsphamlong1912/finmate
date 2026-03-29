import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { INTRO_DONE_KEY } from './intro';

let _markIntroDone: (() => void) | null = null;
export function markIntroDone() { _markIntroDone?.(); }
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { ProfileProvider } from '../context/ProfileContext';
import { ExpensesProvider } from '../context/ExpensesContext';
import { GoalsProvider } from '../context/GoalsContext';
import { CategoriesProvider } from '../context/CategoriesContext';
import { AchievementsProvider } from '../context/AchievementsContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LightTheme } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

SplashScreen.preventAutoHideAsync();

// Cho phép onboarding.tsx cập nhật state ngay lập tức (tránh redirect loop)
let _markOnboardingDone: (() => void) | null = null;
export function markOnboardingDone() { _markOnboardingDone?.(); }

function RootNavigator() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [introDone, setIntroDone] = useState<boolean | null>(null);

  useEffect(() => {
    _markIntroDone = () => setIntroDone(true);
    const DEV_ALWAYS_SHOW_INTRO = false;
    if (DEV_ALWAYS_SHOW_INTRO) {
      setIntroDone(false);
    } else {
      AsyncStorage.getItem(INTRO_DONE_KEY).then(val => {
        setIntroDone(val === 'true');
      });
    }
    return () => { _markIntroDone = null; };
  }, []);

  // Đọc key theo userId mỗi khi session thay đổi
  useEffect(() => {
    _markOnboardingDone = () => setOnboardingDone(true);

    if (!session?.user?.id) {
      setOnboardingDone(null);
      return;
    }

    const key = `onboarding_done_${session.user.id}`;
    AsyncStorage.getItem(key).then(async val => {
      if (val === 'true') {
        setOnboardingDone(true);
      } else {
        // Fallback: kiểm tra Supabase — nếu đã có display_name thì đã onboarding
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', session.user.id)
          .single();
        const done = !!data?.display_name;
        if (done) await AsyncStorage.setItem(key, 'true');
        setOnboardingDone(done);
      }
    });

    return () => { _markOnboardingDone = null; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (loading || introDone === null) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';
    const inIntro = segments[0] === 'intro';
    const inModal = segments[0] === 'add-expense' || segments[0] === 'edit-expense' || segments[0] === 'achievements';

    if (inModal) return;

    if (!session) {
      if (!introDone) {
        if (!inIntro) router.replace('/intro');
      } else {
        if (!inAuth && !inIntro) router.replace('/(auth)/login');
      }
    } else {
      if (onboardingDone === null) return;
      if (!onboardingDone && !inOnboarding) {
        router.replace('/onboarding');
      } else if (onboardingDone && !inTabs) {
        router.replace('/(tabs)');
      }
    }
  }, [session, loading, introDone, onboardingDone, segments]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: LightTheme.bg } }}>
      <Stack.Screen name="intro" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="add-expense"  options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-expense" options={{ presentation: 'modal' }} />
      <Stack.Screen name="achievements" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <ProfileProvider>
        <ExpensesProvider>
          <GoalsProvider>
            <CategoriesProvider>
              <AchievementsProvider>
                <RootNavigator />
              </AchievementsProvider>
            </CategoriesProvider>
          </GoalsProvider>
        </ExpensesProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}
