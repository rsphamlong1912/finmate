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
  bg:           '#FFFFFF',
  surface:      '#FFE234',
  card:         '#FFFFFF',
  cardBorder:   'rgba(0,0,0,0.06)',
  inputBg:      '#FFFFFF',
  inputBorder:  'rgba(180,130,0,0.25)',

  // Text
  textPrimary:   '#5C3D00',
  textSecondary: 'rgba(92,61,0,0.65)',
  textMuted:     'rgba(92,61,0,0.4)',

  // Accent (yellow — matches header)
  accent:       '#FFE234',
  accentText:   '#5C3D00',
  accentBg:     'rgba(255,226,52,0.15)',
  accentBorder: 'rgba(255,226,52,0.5)',

  // Semantic
  divider:     'rgba(0,0,0,0.06)',
  danger:      '#ef4444',
  dangerBg:    'rgba(239,68,68,0.08)',
  dangerBorder:'rgba(239,68,68,0.2)',
  success:     '#10b981',
  warning:     '#f59e0b',

  // Shadow
  shadow:        '#5C3D00',
  shadowOpacity: 0.1,

  // Orb / decorative
  orb1: 'rgba(255,210,0,0.3)',
  orb2: 'rgba(200,150,12,0.15)',
};

export type AppTheme = typeof DarkTheme;
