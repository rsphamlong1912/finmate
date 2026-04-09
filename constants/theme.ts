export const DarkTheme = {
  // Backgrounds
  bg:           '#0a0a0f',
  surface:      '#0f0f1a',
  card:         'rgba(255,255,255,0.05)',
  cardBorder:   'rgba(129,140,248,0.12)',
  inputBg:      'rgba(255,255,255,0.06)',
  inputBorder:  'rgba(129,140,248,0.2)',

  // Text
  textPrimary:   '#ffffff',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted:     'rgba(255,255,255,0.3)',

  // Accent (indigo)
  accent:       '#818cf8',
  accentText:   '#ffffff',
  accentBg:     'rgba(129,140,248,0.15)',
  accentBorder: 'rgba(129,140,248,0.3)',

  // Semantic
  divider:    'rgba(255,255,255,0.06)',
  danger:     '#ef4444',
  dangerBg:   'rgba(239,68,68,0.08)',
  dangerBorder:'rgba(239,68,68,0.2)',
  success:    '#34d399',
  warning:    '#fbbf24',

  // Shadow
  shadow:        '#818cf8',
  shadowOpacity: 0.15,

  // Orb / decorative
  orb1: 'rgba(129,140,248,0.18)',
  orb2: 'rgba(99,102,241,0.15)',
};

export const LightTheme = {
  // Backgrounds
  bg:           '#F0F2F5',
  surface:      '#FFFFFF',
  card:         '#FFFFFF',
  cardBorder:   'rgba(0,0,0,0.06)',
  inputBg:      '#FFFFFF',
  inputBorder:  'rgba(61,107,53,0.2)',

  // Text
  textPrimary:   '#1a1a2e',
  textSecondary: 'rgba(26,26,46,0.55)',
  textMuted:     'rgba(26,26,46,0.38)',

  // Accent (green — matches home screen)
  accent:       '#3D6B35',
  accentText:   '#ffffff',
  accentBg:     'rgba(61,107,53,0.1)',
  accentBorder: 'rgba(61,107,53,0.25)',

  // Semantic
  divider:     'rgba(0,0,0,0.06)',
  danger:      '#ef4444',
  dangerBg:    'rgba(239,68,68,0.08)',
  dangerBorder:'rgba(239,68,68,0.2)',
  success:     '#10b981',
  warning:     '#f59e0b',

  // Shadow
  shadow:        '#000',
  shadowOpacity: 0.07,

  // Orb / decorative
  orb1: 'rgba(61,107,53,0.14)',
  orb2: 'rgba(45,90,39,0.08)',
};

export type AppTheme = typeof DarkTheme;
