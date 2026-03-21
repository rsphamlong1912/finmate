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
  loading: boolean;
  updateBudget: (amount: number) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateSettings: (settings: Partial<Pick<Profile, 'notif_enabled' | 'streak_enabled'>>) => Promise<void>;
  checkAndUpdateStreak: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const getLocalDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

      let streak = 0;
      if (streakDays?.length) {
        const sorted = streakDays.map(s => s.date).sort().reverse();
        let current = new Date(today);
        for (const dateStr of sorted) {
          const d = new Date(dateStr);
          const diff = Math.round((current.getTime() - d.getTime()) / 86400000);
          if (diff === 0 || diff === 1) { streak++; current = d; }
          else break;
        }
      }

      const streakUpdate = { streak_count: streak, last_active_date: today, updated_at: new Date().toISOString() };
      await supabase.from('profiles').update(streakUpdate).eq('id', user.id);
      currentProfile = { ...currentProfile, ...streakUpdate };
    }

    setProfile(currentProfile);
    setLoading(false);
  }, [user?.id]);

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

    let streak = 0;
    if (streakDays?.length) {
      const sorted = streakDays.map(s => s.date).sort().reverse();
      let current = new Date(today);
      for (const dateStr of sorted) {
        const d = new Date(dateStr);
        const diff = Math.round((current.getTime() - d.getTime()) / 86400000);
        if (diff === 0 || diff === 1) { streak++; current = d; }
        else break;
      }
    }

    const updated = { streak_count: streak, last_active_date: today, updated_at: new Date().toISOString() };
    setProfile(prev => prev ? { ...prev, ...updated } : prev);
    await supabase.from('profiles').update(updated).eq('id', user.id);
  }, [user?.id, profile]);

  return (
    <ProfileContext.Provider value={{
      profile, loading,
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