import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { ProfileProvider } from '../context/ProfileContext';
import { ExpensesProvider } from '../context/ExpensesContext';
import { GoalsProvider } from '../context/GoalsContext';
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
    <ProfileProvider>
      <ExpensesProvider>
        <GoalsProvider>
          <RootNavigator />
        </GoalsProvider>
      </ExpensesProvider>
    </ProfileProvider>
  );
}
