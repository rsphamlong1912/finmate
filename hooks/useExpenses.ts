import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Expense, ExpenseCategory } from '../types';

export function useExpenses(userId?: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) setExpenses(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = async (params: {
    amount: number;
    category: ExpenseCategory;
    note?: string;
  }) => {
    if (!userId) return { error: 'Not authenticated' };
    const { error } = await supabase.from('expenses').insert({
      user_id: userId,
      ...params,
    });
    if (!error) fetchExpenses();
    return { error };
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) setExpenses((prev) => prev.filter((e) => e.id !== id));
    return { error };
  };

  // Tổng chi tiêu tháng hiện tại
  const totalThisMonth = expenses
    .filter((e) => {
      const d = new Date(e.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);

  // Chi tiêu theo danh mục (tháng này)
  const byCategory = expenses
    .filter((e) => {
      const d = new Date(e.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

  return { expenses, loading, addExpense, deleteExpense, totalThisMonth, byCategory, refetch: fetchExpenses };
}