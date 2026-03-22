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
  { id: 'food', name: 'Ăn uống', emoji: '🍜', color: '#E8593C', is_default: true },
  { id: 'transport', name: 'Di chuyển', emoji: '🚗', color: '#378ADD', is_default: true },
  { id: 'shopping', name: 'Mua sắm', emoji: '🛍', color: '#D4537E', is_default: true },
  { id: 'bills', name: 'Hóa đơn', emoji: '🧾', color: '#BA7517', is_default: true },
  { id: 'health', name: 'Sức khỏe', emoji: '💊', color: '#1D9E75', is_default: true },
  { id: 'entertainment', name: 'Giải trí', emoji: '🎮', color: '#7F77DD', is_default: true },
  { id: 'other', name: 'Khác', emoji: '📦', color: '#888780', is_default: true },
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
  food: '#E8593C',
  transport: '#378ADD',
  shopping: '#D4537E',
  bills: '#BA7517',
  health: '#1D9E75',
  entertainment: '#7F77DD',
  other: '#888780',
};