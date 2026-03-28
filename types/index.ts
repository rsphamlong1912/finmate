export type ExpenseCategory = string;

export type Expense = {
  id: string;
  user_id: string;
  amount: number;
  category: ExpenseCategory;
  note?: string;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  is_default: boolean;
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food',          name: 'Ăn uống',   emoji: '🍜', color: '#FF9800', is_default: true },
  { id: 'transport',     name: 'Di chuyển', emoji: '🚗', color: '#0288D1', is_default: true },
  { id: 'shopping',      name: 'Mua sắm',   emoji: '🛍', color: '#E91E63', is_default: true },
  { id: 'bills',         name: 'Hóa đơn',   emoji: '🧾', color: '#FFC107', is_default: true },
  { id: 'health',        name: 'Sức khỏe',  emoji: '💊', color: '#4CAF50', is_default: true },
  { id: 'entertainment', name: 'Giải trí',  emoji: '🎮', color: '#9C27B0', is_default: true },
  { id: 'other',         name: 'Khác',      emoji: '📦', color: '#607D8B', is_default: true },
];

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  deadline?: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: '🍜 Ăn uống',
  transport: '🚗 Di chuyển',
  shopping: '🛍 Mua sắm',
  bills: '💡 Hóa đơn',
  health: '💊 Sức khỏe',
  entertainment: '🎮 Giải trí',
  other: '📦 Khác',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food:          '#FF9800',
  transport:     '#0288D1',
  shopping:      '#E91E63',
  bills:         '#FFC107',
  health:        '#4CAF50',
  entertainment: '#9C27B0',
  other:         '#607D8B',
};