/**
 * Legacy tokens the current screens still read. New code uses `@/src/theme`
 * (tokens.ts / typography.ts); screens move over one at a time.
 */
export const palette = {
  bg: '#1B3A4B',
  bgMid: '#245D6B',
  bgDeep: '#0F2A36',
  mist: '#2A6F7A',
  surface: 'rgba(255,255,255,0.92)',
  surfaceSolid: '#FFFFFF',
  ink: '#0F1C24',
  /** Body secondary — readable at mid/low brightness. */
  inkMuted: '#3A4D57',
  /** Captions / hints — darker than before so greys stay legible. */
  inkSoft: '#5A6E79',
  accent: '#CF3E1E',
  accentDeep: '#B33418',
  accentSoft: '#FFE3DB',
  accentGlow: 'rgba(207,62,30,0.28)',
  teal: '#2EC4B6',
  /** Teal for text on light surfaces; the bright teal is for fills and icons only. */
  tealText: '#1E7F75',
  tealSoft: '#D8F5F1',
  gold: '#F4C95D',
  coral: '#CF3E1E',
  danger: '#B3263F',
  dangerSoft: '#FDE8E8',
  success: '#1A8158',
  successSoft: '#E3F7EE',
  warnSoft: '#FFF1E6',
  border: 'rgba(15,28,36,0.08)',
  white: '#FFFFFF',
  shadow: '#061018',
  brand: '#FFFFFF',
  brandMuted: 'rgba(255,255,255,0.78)',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 12,
  md: 18,
  lg: 28,
  xl: 36,
};
