import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export type Profile = {
  id: string;
  display_name: string | null;
  monthly_budget: number;
  streak_count: number;
  last_active_date: string | null;
  notif_enabled: boolean;
  streak_enabled: boolean;
};

type ProfileContextType = {
  profile: Profile | null;
  streakDates: string[];
  loading: boolean;
  newStreakDay: boolean;
  clearNewStreakDay: () => void;
  updateBudget: (amount: number) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateSettings: (settings: Partial<Pick<Profile, 'notif_enabled' | 'streak_enabled'>>) => Promise<void>;
  checkAndUpdateStreak: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streakDates, setStreakDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStreakDay, setNewStreakDay] = useState(false);

  const fetchStreakDates = useCallback(async () => {
    if (!user?.id) return;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoff = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`;
    const { data } = await supabase
      .from('streaks')
      .select('date')
      .eq('user_id', user.id)
      .gte('date', cutoff)
      .order('date', { ascending: false });
    setStreakDates(data?.map(s => s.date.slice(0, 10)) ?? []);
  }, [user?.id]);

  const getLocalDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Parse "YYYY-MM-DD" thành UTC timestamp để diff luôn chính xác, không phụ thuộc timezone
  const parseDateUTC = (dateStr: string) => {
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };

  const calcStreak = (sortedDates: string[], today: string) => {
    let streak = 0;
    let current = parseDateUTC(today);
    for (const dateStr of sortedDates) {
      const d = parseDateUTC(dateStr);
      const diff = Math.round((current - d) / 86400000);
      if (diff === 0 || diff === 1) { streak++; current = d; }
      else break;
    }
    return streak;
  };

  const fetchProfile = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    let currentProfile = data;
    if (error || !data) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          monthly_budget: 10_000_000,
          streak_count: 0,
          notif_enabled: true,
          streak_enabled: true,
        })
        .select()
        .single();
      currentProfile = newProfile;
    }

    // Tự động cập nhật streak mỗi khi mở app ngày mới
    const today = getLocalDateStr();
    if (currentProfile && currentProfile.last_active_date !== today) {
      await supabase
        .from('streaks')
        .upsert({ user_id: user.id, date: today }, { onConflict: 'user_id,date' });

      const { data: streakDays } = await supabase
        .from('streaks')
        .select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(365);

      const streak = streakDays?.length
        ? calcStreak(streakDays.map(s => s.date).sort().reverse(), today)
        : 0;

      const streakUpdate = { streak_count: streak, last_active_date: today, updated_at: new Date().toISOString() };
      await supabase.from('profiles').update(streakUpdate).eq('id', user.id);
      currentProfile = { ...currentProfile, ...streakUpdate };
      setNewStreakDay(true);
    }

    setProfile(currentProfile);
    await fetchStreakDates();
    setLoading(false);
  }, [user?.id, fetchStreakDates]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateBudget = async (amount: number) => {
    if (!user?.id) return;
    // Update local state ngay lập tức — không chờ DB
    setProfile(prev => prev ? { ...prev, monthly_budget: amount } : prev);
    await supabase
      .from('profiles')
      .update({ monthly_budget: amount, updated_at: new Date().toISOString() })
      .eq('id', user.id);
  };

  const updateDisplayName = async (name: string) => {
    if (!user?.id) return;
    setProfile(prev => prev ? { ...prev, display_name: name } : prev);
    await supabase
      .from('profiles')
      .update({ display_name: name, updated_at: new Date().toISOString() })
      .eq('id', user.id);
  };

  const updateSettings = async (settings: Partial<Pick<Profile, 'notif_enabled' | 'streak_enabled'>>) => {
    if (!user?.id) return;
    setProfile(prev => prev ? { ...prev, ...settings } : prev);
    await supabase
      .from('profiles')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', user.id);
  };

  const checkAndUpdateStreak = useCallback(async () => {
    if (!user?.id || !profile) return;
    const today = getLocalDateStr();
    if (profile.last_active_date === today) return;

    await supabase
      .from('streaks')
      .upsert({ user_id: user.id, date: today }, { onConflict: 'user_id,date' });

    const { data: streakDays } = await supabase
      .from('streaks')
      .select('date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(365);

    const streak = streakDays?.length
      ? calcStreak(streakDays.map(s => s.date).sort().reverse(), today)
      : 0;

    const updated = { streak_count: streak, last_active_date: today, updated_at: new Date().toISOString() };
    setProfile(prev => prev ? { ...prev, ...updated } : prev);
    await supabase.from('profiles').update(updated).eq('id', user.id);
    await fetchStreakDates();
  }, [user?.id, profile, fetchStreakDates]);

  const clearNewStreakDay = () => setNewStreakDay(false);

  return (
    <ProfileContext.Provider value={{
      profile, streakDates, loading,
      newStreakDay, clearNewStreakDay,
      updateBudget, updateDisplayName, updateSettings, checkAndUpdateStreak,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}