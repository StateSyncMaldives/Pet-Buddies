// Design tokens — mirrors the "Design Tokens" section of the handoff README.

export const colors = {
  // Brand / actions
  powderBlue: '#8FC7E8', // cat / primary fill
  actionBlue: '#6FB8E0', // primary button / active
  deepBlue: '#3E89BE', // deep blue text
  blush: '#F2A9C4', // birds
  wordmarkPink: '#E78FB4',
  heartPink: '#E6A4C4',
  sand: '#F6C453', // beak accent

  // Text — cool neutral greys for a crisp, product feel
  ink: '#20252C',
  textSecondary: '#697077', // ≥4.5:1 on appBg (#F7F8FA)
  textSecondaryAlt: '#828893',
  faint: '#8d94a0',
  faintAlt: '#a4abb7',

  // Surfaces — cool near-whites
  paper: '#EEF1F6', // tiles / chips
  appBg: '#F7F8FA',
  pageBg: '#E9ECF1',
  pageBgDeep: '#d4d8df', // desktop bezel surround
  photoTint: '#E6EBF2', // single neutral placeholder behind every pet photo

  // Lines
  line: '#e6e9ef',
  lineAlt: '#eef0f5',
  lineNav: '#e9ecf2',

  // Status — text on background pairs
  pendingText: '#C99A2E',
  pendingBg: '#FDF6E3',
  liveText: '#3E89BE',
  liveBg: '#EAF4FB',
  adoptedText: '#3F8C50',
  adoptedBg: '#E7F4EA',
  rejectText: '#C5577A',
  rejectBg: '#FBEAEF',
  approveGreen: '#5AA86A',

  // Nav
  navActive: '#3E89BE',
  navInactive: '#9aa0ab',
} as const

export const font = {
  ui: "'Hanken Grotesk', system-ui, -apple-system, sans-serif",
  brand: "'Quicksand', system-ui, sans-serif",
  mono: 'ui-monospace, Menlo, monospace',
} as const

export const shadow = {
  card: '0 2px 10px rgba(36,48,47,.06)',
  cardSm: '0 2px 8px rgba(36,48,47,.05)',
  raised: '0 6px 16px rgba(62,137,190,.32)',
  raisedLg: '0 8px 20px rgba(62,137,190,.36)',
  sheet: '0 -10px 40px rgba(0,0,0,.18)',
} as const

// Overlay stacking order (from README §Interactions).
export const z = {
  detail: 20,
  add: 20,
  inquiry: 23,
  mod: 24,
  install: 28,
  onboarding: 30,
  toast: 40,
} as const
