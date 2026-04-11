import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Category, DEFAULT_CATEGORIES } from '../types';

type CategoriesContextType = {
  categories: Category[];
  loading: boolean;
  addCategory: (data: { name: string; emoji: string; color: string }) => Promise<{ error: any }>;
  updateCategory: (id: string, data: { name: string; emoji: string; color: string }) => Promise<{ error: any }>;
  updateCategoryColor: (id: string, color: string) => Promise<{ error: any }>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryLabel: (id: string) => string;
  getCategoryEmoji: (id: string) => string;
  getCategoryColor: (id: string) => string;
};

const CategoriesContext = createContext<CategoriesContextType | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchCustom = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);

    const [{ data }, { data: overrideRows }] = await Promise.all([
      supabase.from('user_categories').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('user_category_colors').select('category_id, color').eq('user_id', user.id),
    ]);

    const custom: Category[] = (data ?? []).map(r => ({
      id: r.id, name: r.name, emoji: r.emoji, color: r.color, is_default: false,
    }));
    setCustomCategories(custom);

    const overrides: Record<string, string> = {};
    (overrideRows ?? []).forEach((r: any) => { overrides[r.category_id] = r.color; });
    setColorOverrides(overrides);

    // Migrate orphaned expenses → 'other'
    const knownIds = new Set([...DEFAULT_CATEGORIES.map(c => c.id), ...custom.map(c => c.id)]);
    const { data: orphans } = await supabase.from('expenses').select('id, category').eq('user_id', user.id);
    const orphanIds = (orphans ?? []).filter((e: any) => !knownIds.has(e.category)).map((e: any) => e.id);
    if (orphanIds.length > 0) {
      await supabase.from('expenses').update({ category: 'other' }).in('id', orphanIds);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchCustom(); }, [fetchCustom]);

  const categories: Category[] = [
    ...DEFAULT_CATEGORIES.map(c => colorOverrides[c.id] ? { ...c, color: colorOverrides[c.id] } : c),
    ...customCategories,
  ];

  const addCategory = async (data: { name: string; emoji: string; color: string }) => {
    if (!user?.id) return { error: 'No user' };
    const { data: saved, error } = await supabase
      .from('user_categories').insert({ user_id: user.id, ...data }).select().single();
    if (error) return { error };
    setCustomCategories(prev => [...prev, { id: saved.id, name: saved.name, emoji: saved.emoji, color: saved.color, is_default: false }]);
    return { error: null };
  };

  const updateCategory = async (id: string, data: { name: string; emoji: string; color: string }) => {
    const { error } = await supabase.from('user_categories').update(data).eq('id', id);
    if (error) return { error };
    setCustomCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    return { error: null };
  };

  const updateCategoryColor = async (id: string, color: string) => {
    const isDefault = DEFAULT_CATEGORIES.some(c => c.id === id);
    if (isDefault) {
      // Optimistic update
      setColorOverrides(prev => ({ ...prev, [id]: color }));
      const { error } = await supabase
        .from('user_category_colors')
        .upsert({ user_id: user!.id, category_id: id, color }, { onConflict: 'user_id,category_id' });
      if (error) {
        // Rollback
        setColorOverrides(prev => { const n = { ...prev }; delete n[id]; return n; });
        return { error };
      }
      return { error: null };
    }
    // Custom category
    const cat = customCategories.find(c => c.id === id);
    if (!cat) return { error: 'Not found' };
    return updateCategory(id, { name: cat.name, emoji: cat.emoji, color });
  };

  const deleteCategory = async (id: string) => {
    setCustomCategories(prev => prev.filter(c => c.id !== id));
    await supabase.from('user_categories').delete().eq('id', id);
  };

  const find = (id: string) => categories.find(c => c.id === id);
  const getCategoryLabel = (id: string) => find(id)?.name ?? 'Khác';
  const getCategoryEmoji = (id: string) => find(id)?.emoji ?? '📦';
  const getCategoryColor = (id: string) => find(id)?.color ?? '#90A4AE';

  return (
    <CategoriesContext.Provider value={{
      categories, loading, addCategory, updateCategory, updateCategoryColor, deleteCategory,
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
