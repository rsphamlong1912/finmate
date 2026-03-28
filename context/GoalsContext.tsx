import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Goal } from '../types';

type GoalsContextType = {
  goals: Goal[];
  loading: boolean;
  addGoal: (data: { title: string; target_amount: number; deadline?: string }) => Promise<{ error: any }>;
  updateGoal: (id: string, data: { title: string; target_amount: number; deadline?: string; saved_amount?: number }) => Promise<{ error: any }>;
  addSavings: (goalId: string, amount: number) => Promise<{ error: any }>;
  deleteGoal: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
};

const GoalsContext = createContext<GoalsContextType | null>(null);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setGoals(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const addGoal = async (data: { title: string; target_amount: number; deadline?: string }) => {
    if (!user?.id) return { error: 'No user' };
    const newGoal = {
      user_id: user.id,
      title: data.title,
      target_amount: data.target_amount,
      saved_amount: 0,
      deadline: data.deadline ?? null,
      created_at: new Date().toISOString(),
    };
    const tempId = Date.now().toString();
    setGoals(prev => [{ id: tempId, ...newGoal } as Goal, ...prev]);
    const { data: saved, error } = await supabase
      .from('goals')
      .insert(newGoal)
      .select()
      .single();
    if (error) {
      setGoals(prev => prev.filter(g => g.id !== tempId));
      return { error };
    }
    setGoals(prev => prev.map(g => g.id === tempId ? saved : g));
    return { error: null };
  };

  const updateGoal = async (id: string, data: { title: string; target_amount: number; deadline?: string; saved_amount?: number }) => {
    const patch: Record<string, any> = {
      title: data.title,
      target_amount: data.target_amount,
      deadline: data.deadline ?? null,
    };
    if (data.saved_amount !== undefined) patch.saved_amount = data.saved_amount;
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
    const { error } = await supabase.from('goals').update(patch).eq('id', id);
    if (error) {
      await fetchGoals();
      return { error };
    }
    return { error: null };
  };

  const addSavings = async (goalId: string, amount: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return { error: 'Goal not found' };
    const newSaved = goal.saved_amount + amount;

    // Update local ngay lập tức
    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, saved_amount: newSaved } : g
    ));

    // Lưu vào DB
    const { error } = await supabase
      .from('goals')
      .update({
        saved_amount: newSaved,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId);


    if (error) {
      // Rollback nếu lỗi
      setGoals(prev => prev.map(g =>
        g.id === goalId ? { ...g, saved_amount: goal.saved_amount } : g
      ));
      return { error };
    }

    return { error: null };
  };

  const deleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    await supabase.from('goals').delete().eq('id', id);
  };

  return (
    <GoalsContext.Provider value={{
      goals, loading,
      addGoal, updateGoal, addSavings, deleteGoal,
      refetch: fetchGoals,
    }}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used within GoalsProvider');
  return ctx;
}