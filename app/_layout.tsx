import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { ProfileProvider } from '../context/ProfileContext';
import { ExpensesProvider } from '../context/ExpensesContext';
import { GoalsProvider } from '../context/GoalsContext';
import { useAuth } from '../hooks/useAuth';

SplashScreen.preventAutoHideAsync();

// Cho phép onboarding.tsx cập nhật state ngay lập tức (tránh redirect loop)
let _markOnboardingDone: (() => void) | null = null;
export function markOnboardingDone() { _markOnboardingDone?.(); }

function RootNavigator() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Đọc key theo userId mỗi khi session thay đổi
  useEffect(() => {
    _markOnboardingDone = () => setOnboardingDone(true);

    if (!session?.user?.id) {
      setOnboardingDone(null);
      return;
    }

    AsyncStorage.getItem(`onboarding_done_${session.user.id}`).then(val => {
      setOnboardingDone(val === 'true');
    });

    return () => { _markOnboardingDone = null; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (loading || onboardingDone === null) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';
    const inModal = segments[0] === 'add-expense' || segments[0] === 'edit-expense';

    if (inModal) return;

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
    } else if (!onboardingDone && !inOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingDone && !inTabs) {
      router.replace('/(tabs)');
    }
  }, [session, loading, onboardingDone, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="add-expense" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-expense" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ProfileProvider>
      <ExpensesProvider>
        <GoalsProvider>
          <RootNavigator />
        </GoalsProvider>
      </ExpensesProvider>
    </ProfileProvider>
  );
}
