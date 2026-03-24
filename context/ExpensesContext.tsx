import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Expense, ExpenseCategory } from '../types';

type ExpensesContextType = {
  expenses: Expense[];
  totalThisMonth: number;
  byCategory: Record<string, number>;
  loading: boolean;
  addExpense: (data: { amount: number; category: ExpenseCategory; note?: string }) => Promise<{ error: any }>;
  updateExpense: (id: string, data: { amount: number; category: ExpenseCategory; note?: string; created_at?: string }) => Promise<{ error: any }>;
  deleteExpense: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
};

const ExpensesContext = createContext<ExpensesContextType | null>(null);

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setExpenses(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const now = new Date();
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalThisMonth = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = thisMonthExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  const addExpense = async (data: { amount: number; category: ExpenseCategory; note?: string }) => {
    if (!user?.id) return { error: 'No user' };
    const newExpense = {
      user_id: user.id,
      amount: data.amount,
      category: data.category,
      note: data.note ?? '',
      created_at: new Date().toISOString(),
    };
    const tempId = Date.now().toString();
    setExpenses(prev => [{ id: tempId, ...newExpense } as Expense, ...prev]);
    const { data: saved, error } = await supabase
      .from('expenses')
      .insert(newExpense)
      .select()
      .single();
    if (error) {
      setExpenses(prev => prev.filter(e => e.id !== tempId));
      return { error };
    }
    setExpenses(prev => prev.map(e => e.id === tempId ? saved : e));
    return { error: null };
  };

  const updateExpense = async (id: string, data: { amount: number; category: ExpenseCategory; note?: string; created_at?: string }) => {
    // Update local ngay
    setExpenses(prev => prev.map(e =>
      e.id === id ? { ...e, amount: data.amount, category: data.category, note: data.note ?? '', ...(data.created_at ? { created_at: data.created_at } : {}) } : e
    ));
    const updatePayload: any = { amount: data.amount, category: data.category, note: data.note ?? '', updated_at: new Date().toISOString() };
    if (data.created_at) updatePayload.created_at = data.created_at;
    const { error } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', id);
    if (error) {
      // Rollback
      fetchExpenses();
      return { error };
    }
    return { error: null };
  };

  const deleteExpense = async (id: string) => {
    const backup = expenses.find(e => e.id === id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error && backup) {
      setExpenses(prev => [backup, ...prev].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }
  };

  return (
    <ExpensesContext.Provider value={{
      expenses, totalThisMonth, byCategory, loading,
      addExpense, updateExpense, deleteExpense, refetch: fetchExpenses,
    }}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used within ExpensesProvider');
  return ctx;
}