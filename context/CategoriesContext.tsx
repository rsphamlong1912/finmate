import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Category, DEFAULT_CATEGORIES } from '../types';

type CategoriesContextType = {
  categories: Category[];
  loading: boolean;
  addCategory: (data: { name: string; emoji: string; color: string }) => Promise<{ error: any }>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryLabel: (id: string) => string;
  getCategoryEmoji: (id: string) => string;
  getCategoryColor: (id: string) => string;
};

const CategoriesContext = createContext<CategoriesContextType | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustom = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (data) {
      setCustomCategories(data.map(r => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        color: r.color,
        is_default: false,
      })));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchCustom(); }, [fetchCustom]);

  const categories = [...DEFAULT_CATEGORIES, ...customCategories];

  const addCategory = async (data: { name: string; emoji: string; color: string }) => {
    if (!user?.id) return { error: 'No user' };
    const { data: saved, error } = await supabase
      .from('user_categories')
      .insert({ user_id: user.id, ...data })
      .select()
      .single();
    if (error) return { error };
    setCustomCategories(prev => [...prev, { id: saved.id, name: saved.name, emoji: saved.emoji, color: saved.color, is_default: false }]);
    return { error: null };
  };

  const deleteCategory = async (id: string) => {
    setCustomCategories(prev => prev.filter(c => c.id !== id));
    await supabase.from('user_categories').delete().eq('id', id);
  };

  const find = (id: string) => categories.find(c => c.id === id);
  const getCategoryLabel = (id: string) => find(id)?.name ?? id;
  const getCategoryEmoji = (id: string) => find(id)?.emoji ?? '📌';
  const getCategoryColor = (id: string) => find(id)?.color ?? '#888780';

  return (
    <CategoriesContext.Provider value={{
      categories, loading, addCategory, deleteCategory,
      getCategoryLabel, getCategoryEmoji, getCategoryColor,
    }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx;
}
