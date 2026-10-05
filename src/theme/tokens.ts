/**
 * Rumi design tokens: the one source of every color. UI reads these through
 * `@/src/theme`; the legacy `palette` in ./colors is built from them, so older
 * screens can never drift to a different shade.
 */

/** Raw scales. Components should prefer the semantic `colors` below. */
export const scale = {
  petrol: {
    900: '#0B1F29',
    800: '#122E3B',
    700: '#1B3A4B',
    600: '#245D6B',
    500: '#2A6F7A',
  },
  coral: {
    600: '#B33418',
    500: '#CF3E1E',
    100: '#FFE6DE',
  },
  gold: {
    400: '#F4C95D',
    100: '#FDF3D6',
  },
  teal: {
    /** Teal for text on light surfaces (AA); 400 is for fills and icons. */
    700: '#1E7F75',
    400: '#2EC4B6',
    100: '#D8F5F1',
  },
  cream: {
    100: '#F3E6D8',
    50: '#FBF7F1',
  },
  neutral: {
    0: '#FFFFFF',
    100: '#F4F1EC',
    200: '#E6E1D9',
  },
  ink: {
    900: '#0F1C24',
    700: '#3A4D57',
    500: '#5A6E79',
  },
} as const;

/** Semantic colors: what a color is for, not what it looks like. */
export const colors = {
  bg: {
    brand: scale.petrol[700],
    brandDeep: scale.petrol[900],
    screen: scale.cream[50],
    surface: scale.neutral[0],
    surfaceMuted: scale.neutral[100],
    scrim: 'rgba(8,20,28,0.55)',
  },
  text: {
    primary: scale.ink[900],
    secondary: scale.ink[700],
    tertiary: scale.ink[500],
    onBrand: '#FFFFFF',
    onBrandMuted: 'rgba(255,255,255,0.78)',
    onAction: '#FFFFFF',
    highlight: scale.gold[400],
    /** Status colors light enough to read on petrol. */
    onBrandSuccess: '#7DFFC8',
    onBrandDanger: '#FFB4A8',
  },
  action: {
    primary: scale.coral[500],
    primaryPressed: scale.coral[600],
    primarySoft: scale.coral[100],
    secondary: scale.petrol[700],
    secondaryPressed: scale.petrol[800],
  },
  border: {
    subtle: 'rgba(15,28,36,0.08)',
    strong: 'rgba(15,28,36,0.16)',
    onBrand: 'rgba(255,255,255,0.16)',
    focus: scale.petrol[600],
  },
  /** Coral is the action color, so warning has its own amber. */
  status: {
    success: '#1A8158',
    successSoft: '#E3F7EE',
    warning: '#C27C0E',
    warningSoft: '#FFF4E0',
    danger: '#B3263F',
    dangerSoft: '#FDE8E8',
    info: scale.petrol[500],
    infoSoft: scale.teal[100],
  },
  accent: {
    gold: scale.gold[400],
    goldSoft: scale.gold[100],
    teal: scale.teal[400],
    tealText: scale.teal[700],
    tealSoft: scale.teal[100],
  },
  /** Base color for native shadows (shadowColor). */
  shadowColor: '#061018',
} as const;

export type StatusTone = 'success' | 'warning' | 'danger' | 'info';

/** 4-pt grid. */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  /** Side gutter of every screen. */
  gutter: 20,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

/** Three elevations only. Over petrol, rely on surface contrast instead. */
export const shadow = {
  e1: { boxShadow: '0px 2px 8px rgba(6,16,24,0.06)' },
  e2: { boxShadow: '0px 6px 16px rgba(6,16,24,0.10)' },
  e3: { boxShadow: '0px 12px 32px rgba(6,16,24,0.16)' },
} as const;

export const motion = {
  duration: {
    fast: 120,
    base: 200,
    slow: 320,
  },
  spring: {
    snappy: { damping: 20, stiffness: 320, mass: 0.6 },
    gentle: { damping: 18, stiffness: 140 },
  },
  /** Scale a pressable shrinks to while held. */
  pressScale: 0.97,
  /** Only the first few blocks of a screen stagger in. */
  staggerStep: 60,
  staggerMax: 4,
} as const;
