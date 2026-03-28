import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile }  from './ProfileContext';
import { useExpenses } from './ExpensesContext';
import { useGoals }    from './GoalsContext';
import { useAuth }     from '../hooks/useAuth';
import { supabase }    from '../lib/supabase';
import {
  ACHIEVEMENTS, AchievementDef, AchievementStats,
  getLevel, getLevelProgress,
} from '../lib/achievements';

type AchievementsContextType = {
  stats:              AchievementStats;
  unlockedIds:        Set<string>;
  totalXP:            number;
  level:              ReturnType<typeof getLevel>;
  levelProgress:      number;
  newlyUnlocked:      AchievementDef | null;
  clearNewlyUnlocked: () => void;
};

const AchievementsContext = createContext<AchievementsContextType | null>(null);

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const { user }     = useAuth();
  const { profile }  = useProfile();
  const { expenses } = useExpenses();
  const { goals }    = useGoals();

  const [knownUnlocked, setKnownUnlocked] = useState<Set<string>>(new Set());
  const [newlyUnlocked, setNewlyUnlocked] = useState<AchievementDef | null>(null);
  const [dbLoaded,      setDbLoaded]      = useState(false);

  const CACHE_KEY = `achievements_unlocked_${user?.id}`;

  // Load từ Supabase (source of truth), fallback về AsyncStorage cache
  useEffect(() => {
    if (!user?.id) return;

    const loadFromDB = async () => {
      // Thử load từ DB trước
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (!error && data) {
        const ids = new Set(data.map((r: any) => r.achievement_id as string));
        setKnownUnlocked(ids);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify([...ids]));
      } else {
        // Fallback: load từ AsyncStorage cache
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) setKnownUnlocked(new Set(JSON.parse(cached)));
      }
      setDbLoaded(true);
    };

    loadFromDB();
  }, [user?.id]);

  const stats: AchievementStats = {
    streakCount:    profile?.streak_count ?? 0,
    txCount:        expenses.length,
    doneGoalsCount: goals.filter(g => g.saved_amount >= g.target_amount).length,
  };

  // Tính toán thành tích đã mở khóa từ dữ liệu thực
  const unlockedIds = new Set(
    ACHIEVEMENTS.filter(a => a.getValue(stats) >= a.threshold).map(a => a.id)
  );

  const totalXP = ACHIEVEMENTS
    .filter(a => unlockedIds.has(a.id))
    .reduce((sum, a) => sum + a.xp, 0);

  const level         = getLevel(totalXP);
  const levelProgress = getLevelProgress(totalXP);

  // Detect thành tích mới → lưu Supabase + AsyncStorage
  useEffect(() => {
    if (!user?.id || !dbLoaded) return; // chờ DB load xong mới so sánh

    const newIds = [...unlockedIds].filter(id => !knownUnlocked.has(id));
    if (newIds.length === 0) return;

    // Hiện modal cho thành tích đầu tiên mới mở khóa
    const first = ACHIEVEMENTS.find(a => a.id === newIds[0]) ?? null;
    setNewlyUnlocked(first);

    const merged = new Set([...knownUnlocked, ...unlockedIds]);
    setKnownUnlocked(merged);

    // Lưu vào Supabase
    const rows = newIds.map(achievement_id => ({ user_id: user.id, achievement_id }));
    supabase.from('user_achievements').insert(rows).then(({ error }) => {
      if (error) console.warn('Failed to save achievements to DB:', error.message);
    });

    // Cập nhật AsyncStorage cache
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify([...merged]));

  }, [unlockedIds.size, dbLoaded]);

  const clearNewlyUnlocked = () => setNewlyUnlocked(null);

  return (
    <AchievementsContext.Provider value={{
      stats, unlockedIds, totalXP, level, levelProgress,
      newlyUnlocked, clearNewlyUnlocked,
    }}>
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements() {
  const ctx = useContext(AchievementsContext);
  if (!ctx) throw new Error('useAchievements must be used within AchievementsProvider');
  return ctx;
}
