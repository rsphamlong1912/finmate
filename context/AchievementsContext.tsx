import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
  earnedIds:          Set<string>;
  totalXP:            number;
  level:              ReturnType<typeof getLevel>;
  levelProgress:      number;
  currentToast:       AchievementDef | null;
  dismissToast:       () => void;
};

const AchievementsContext = createContext<AchievementsContextType | null>(null);

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const { user }     = useAuth();
  const { profile }  = useProfile();
  const { expenses } = useExpenses();
  const { goals }    = useGoals();

  const [knownUnlocked,   setKnownUnlocked]   = useState<Set<string>>(new Set());
  const [dbLoaded,        setDbLoaded]        = useState(false);
  const [toastQueue,      setToastQueue]      = useState<AchievementDef[]>([]);

  const CACHE_KEY = `achievements_unlocked_${user?.id}`;

  // Load từ Supabase, fallback AsyncStorage
  useEffect(() => {
    if (!user?.id) return;
    setDbLoaded(false);
    setKnownUnlocked(new Set());

    const loadFromDB = async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (!error && data) {
        const ids = new Set(data.map((r: any) => r.achievement_id as string));
        setKnownUnlocked(ids);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify([...ids]));
      } else {
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

  const unlockedIds = useMemo(() => new Set(
    ACHIEVEMENTS.filter(a => a.getValue(stats) >= a.threshold).map(a => a.id)
  ), [stats.streakCount, stats.txCount, stats.doneGoalsCount]);

  const unlockedKey = [...unlockedIds].sort().join(',');

  // earnedIds = union DB + current data (cho display)
  const earnedIds = useMemo(
    () => new Set([...knownUnlocked, ...unlockedIds]),
    [knownUnlocked, unlockedIds]
  );

  const totalXP = ACHIEVEMENTS
    .filter(a => earnedIds.has(a.id))
    .reduce((sum, a) => sum + a.xp, 0);

  const level         = getLevel(totalXP);
  const levelProgress = getLevelProgress(totalXP);

  // Sync achievements mới vào DB
  useEffect(() => {
    if (!user?.id || !dbLoaded) return;

    const toSave = [...unlockedIds].filter(id => !knownUnlocked.has(id));
    if (toSave.length === 0) return;

    const rows = toSave.map(achievement_id => ({ user_id: user.id, achievement_id }));
    supabase.from('user_achievements').insert(rows).then(({ error }) => {
      if (error) console.warn('Failed to save achievements to DB:', error.message);
    });
    const merged = new Set([...knownUnlocked, ...toSave]);
    setKnownUnlocked(merged);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify([...merged]));

    // Queue toast notifications for newly unlocked achievements
    const newDefs = toSave.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean) as AchievementDef[];
if (newDefs.length > 0) setToastQueue(q => [...q, ...newDefs]);
  }, [unlockedKey, dbLoaded]);

  const currentToast = toastQueue[0] ?? null;
  const dismissToast = () => setToastQueue(q => q.slice(1));

  return (
    <AchievementsContext.Provider value={{
      stats, unlockedIds, earnedIds, totalXP, level, levelProgress,
      currentToast, dismissToast,
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
