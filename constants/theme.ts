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
  bg:           '#ede9ff',
  surface:      '#ffffff',
  card:         '#ffffff',
  cardBorder:   'rgba(109,79,168,0.15)',
  inputBg:      '#ffffff',
  inputBorder:  'rgba(109,79,168,0.25)',

  // Text
  textPrimary:   '#1a0a2e',
  textSecondary: 'rgba(26,10,46,0.6)',
  textMuted:     'rgba(26,10,46,0.35)',

  // Accent (slightly deeper indigo for light bg)
  accent:       '#6d5fe6',
  accentBg:     'rgba(109,95,230,0.12)',
  accentBorder: 'rgba(109,95,230,0.3)',

  // Semantic
  divider:     'rgba(26,10,46,0.08)',
  danger:      '#ef4444',
  dangerBg:    'rgba(239,68,68,0.08)',
  dangerBorder:'rgba(239,68,68,0.2)',
  success:     '#10b981',
  warning:     '#f59e0b',

  // Shadow
  shadow:        '#6d5fe6',
  shadowOpacity: 0.12,

  // Orb / decorative
  orb1: 'rgba(109,95,230,0.15)',
  orb2: 'rgba(129,140,248,0.1)',
};

export type AppTheme = typeof DarkTheme;
