export type AchievementTier     = 'bronze' | 'silver' | 'gold' | 'diamond';
export type AchievementCategory = 'streak' | 'transactions' | 'goals';

export type AchievementStats = {
  streakCount:     number;
  txCount:         number;
  doneGoalsCount:  number;
};

export type AchievementDef = {
  id:          string;
  category:    AchievementCategory;
  tier:        AchievementTier;
  emoji:       string;
  title:       string;
  description: string;
  xp:          number;
  threshold:   number;
  getValue:    (stats: AchievementStats) => number;
};

export const TIER_CONFIG: Record<AchievementTier, { label: string; color: string; bg: string; border: string; medal: string }> = {
  bronze:  { label: 'Đồng',      color: '#b45309', bg: '#fef3c7', border: '#f59e0b', medal: '🥉' },
  silver:  { label: 'Bạc',       color: '#475569', bg: '#f1f5f9', border: '#94a3b8', medal: '🥈' },
  gold:    { label: 'Vàng',      color: '#b45309', bg: '#fffbeb', border: '#eab308', medal: '🥇' },
  diamond: { label: 'Kim cương', color: '#6b4fa8', bg: '#ede9f8', border: '#6b4fa8', medal: '💎' },
};

export const LEVELS = [
  { min: 0,   label: 'Người mới',            emoji: '🌱', color: '#34D399', next: 150  },
  { min: 150, label: 'Tiết kiệm viên',       emoji: '💼', color: '#6b4fa8', next: 400  },
  { min: 400, label: 'Chuyên gia tài chính', emoji: '📊', color: '#f59e0b', next: 700  },
  { min: 700, label: 'Bậc thầy',             emoji: '🏆', color: '#ef4444', next: 1000 },
  { min: 1000, label: 'Truyền kỳ',           emoji: '💎', color: '#a855f7', next: null },
];

export function getLevel(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) return { ...LEVELS[i], index: i };
  }
  return { ...LEVELS[0], index: 0 };
}

export function getLevelProgress(xp: number): number {
  const level = getLevel(xp);
  if (!level.next) return 1;
  return (xp - level.min) / (level.next - level.min);
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Streak ─────────────────────────────────────────────────────────────────
  // Streak khó duy trì nhất → XP cao hơn các loại khác
  { id: 'streak_3',   category: 'streak', tier: 'bronze',  emoji: '🔥', title: 'Tia lửa',         description: 'Mở app 3 ngày liên tiếp',    xp: 15,  threshold: 3,   getValue: s => s.streakCount },
  { id: 'streak_7',   category: 'streak', tier: 'silver',  emoji: '⚡', title: 'Tuần bứt phá',    description: 'Mở app 7 ngày liên tiếp',    xp: 40,  threshold: 7,   getValue: s => s.streakCount },
  { id: 'streak_30',  category: 'streak', tier: 'gold',    emoji: '🌟', title: 'Tháng kiên định', description: 'Mở app 30 ngày liên tiếp',   xp: 110, threshold: 30,  getValue: s => s.streakCount },
  { id: 'streak_100', category: 'streak', tier: 'diamond', emoji: '👑', title: 'Huyền thoại',     description: 'Mở app 100 ngày liên tiếp',  xp: 300, threshold: 100, getValue: s => s.streakCount },

  // ── Transactions ────────────────────────────────────────────────────────────
  // Giao dịch dễ tích lũy hơn → XP vừa phải
  { id: 'tx_10',  category: 'transactions', tier: 'bronze',  emoji: '📝', title: 'Bắt đầu ghi chép',  description: 'Ghi 10 giao dịch đầu tiên', xp: 10,  threshold: 10,  getValue: s => s.txCount },
  { id: 'tx_50',  category: 'transactions', tier: 'silver',  emoji: '📒', title: 'Người ghi chép',    description: 'Ghi 50 giao dịch',          xp: 30,  threshold: 50,  getValue: s => s.txCount },
  { id: 'tx_100', category: 'transactions', tier: 'gold',    emoji: '📚', title: 'Kỷ luật tài chính', description: 'Ghi 100 giao dịch',         xp: 60,  threshold: 100, getValue: s => s.txCount },
  { id: 'tx_500', category: 'transactions', tier: 'diamond', emoji: '🏦', title: 'Nhà tài chính',     description: 'Ghi 500 giao dịch',         xp: 150, threshold: 500, getValue: s => s.txCount },

  // ── Goals ───────────────────────────────────────────────────────────────────
  // Mục tiêu cần thời gian dài + kỷ luật → XP cao
  { id: 'goal_1',  category: 'goals', tier: 'bronze',  emoji: '🎯', title: 'Mục tiêu đầu tiên', description: 'Hoàn thành 1 mục tiêu tiết kiệm',  xp: 20,  threshold: 1,  getValue: s => s.doneGoalsCount },
  { id: 'goal_3',  category: 'goals', tier: 'silver',  emoji: '🎪', title: 'Người kiên trì',    description: 'Hoàn thành 3 mục tiêu tiết kiệm',  xp: 55,  threshold: 3,  getValue: s => s.doneGoalsCount },
  { id: 'goal_5',  category: 'goals', tier: 'gold',    emoji: '🏅', title: 'Nhà tiết kiệm',     description: 'Hoàn thành 5 mục tiêu tiết kiệm',  xp: 100, threshold: 5,  getValue: s => s.doneGoalsCount },
  { id: 'goal_10', category: 'goals', tier: 'diamond', emoji: '💰', title: 'Tỷ phú tương lai',  description: 'Hoàn thành 10 mục tiêu tiết kiệm', xp: 210, threshold: 10, getValue: s => s.doneGoalsCount },

];

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  streak:       '🔥 Streak',
  transactions: '💰 Giao dịch',
  goals:        '🎯 Mục tiêu',
};
