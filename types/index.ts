export type Expense = {
  id: string;
  user_id: string;
  amount: number;
  category: ExpenseCategory;
  note?: string;
  created_at: string;
};

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'bills'
  | 'health'
  | 'entertainment'
  | 'other';

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