import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const parseDateUTC = (dateStr: string) => {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export type Profile = {
  id: string;
  display_name: string | null;
  monthly_budget: number;
  streak_count: number;
  last_active_date: string | null;
  notif_enabled: boolean;
  streak_enabled: boolean;
};

const DEFAULT_PROFILE: Omit<Profile, 'id'> = {
  display_name: null,
  monthly_budget: 10_000_000,
  streak_count: 0,
  last_active_date: null,
  notif_enabled: true,
  streak_enabled: true,
};

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      // Tạo profile mới nếu chưa có
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: userId, ...DEFAULT_PROFILE })
        .select()
        .single();
      setProfile(newProfile);
    } else {
      setProfile(data);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Cập nhật ngân sách tháng
  const updateBudget = async (amount: number) => {
    if (!userId) return;
    const { data } = await supabase
      .from('profiles')
      .update({ monthly_budget: amount, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (data) setProfile(data);
  };

  // Cập nhật tên hiển thị
  const updateDisplayName = async (name: string) => {
    if (!userId) return;
    const { data } = await supabase
      .from('profiles')
      .update({ display_name: name, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (data) setProfile(data);
  };

  // Cập nhật cài đặt
  const updateSettings = async (settings: Partial<Pick<Profile, 'notif_enabled' | 'streak_enabled'>>) => {
    if (!userId) return;
    const { data } = await supabase
      .from('profiles')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (data) setProfile(data);
  };

  // Cập nhật streak mỗi ngày mở app
  const checkAndUpdateStreak = useCallback(async () => {
    if (!userId || !profile) return;

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const lastActive = profile.last_active_date;

    // Đã check hôm nay rồi → bỏ qua
    if (lastActive === today) return;

    // Thêm vào bảng streaks
    await supabase
      .from('streaks')
      .upsert({ user_id: userId, date: today }, { onConflict: 'user_id,date' });

    // Tính streak liên tiếp
    const { data: streakDays } = await supabase
      .from('streaks')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(365);

    let streak = 0;
    if (streakDays && streakDays.length > 0) {
      const sortedDates = streakDays.map(s => s.date).sort().reverse();
      let current = parseDateUTC(today);
      for (const dateStr of sortedDates) {
        const d = parseDateUTC(dateStr);
        const diff = Math.round((current - d) / 86400000);
        if (diff === 0 || diff === 1) { streak++; current = d; }
        else break;
      }
    }

    // Lưu streak + last_active_date
    const { data } = await supabase
      .from('profiles')
      .update({
        streak_count: streak,
        last_active_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();
    if (data) setProfile(data);
  }, [userId, profile]);

  return {
    profile,
    loading,
    updateBudget,
    updateDisplayName,
    updateSettings,
    checkAndUpdateStreak,
    refetch: fetchProfile,
  };
}