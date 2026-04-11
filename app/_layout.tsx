import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { ProfileProvider } from '../context/ProfileContext';
import { ExpensesProvider } from '../context/ExpensesContext';
import { GoalsProvider } from '../context/GoalsContext';
import { CategoriesProvider } from '../context/CategoriesContext';
import { AchievementsProvider } from '../context/AchievementsContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LightTheme } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';

SplashScreen.preventAutoHideAsync();

// Key đánh dấu user đã xem onboarding (trước auth)
export const PRE_ONBOARDING_KEY = 'pre_onboarding_done';

// Gọi từ onboarding.tsx khi user chọn auth ở màn cuối
let _markPreOnboardingDone: (() => void) | null = null;
export function markPreOnboardingDone() { _markPreOnboardingDone?.(); }

function RootNavigator() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [preOnboardingDone, setPreOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    _markPreOnboardingDone = () => setPreOnboardingDone(true);
    AsyncStorage.getItem(PRE_ONBOARDING_KEY).then(val => {
      setPreOnboardingDone(val === 'true');
    });
    return () => { _markPreOnboardingDone = null; };
  }, []);

  useEffect(() => {
    if (loading || preOnboardingDone === null) return;

    const inAuth      = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs      = segments[0] === '(tabs)';
    const inModal     = ['add-expense', 'edit-expense', 'achievements'].includes(segments[0] as string);

    if (inModal) return;

    if (!session) {
      // Chưa đăng nhập:
      // - chưa xem onboarding → vào onboarding
      // - đã xem → vào login
      if (!preOnboardingDone) {
        if (!inOnboarding) router.replace('/onboarding');
      } else {
        if (!inAuth) router.replace('/(auth)/login');
      }
    } else {
      // Đã đăng nhập → thẳng vào tabs
      if (!inTabs) router.replace('/(tabs)');
    }
  }, [session, loading, preOnboardingDone, segments]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: LightTheme.bg } }}>
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
