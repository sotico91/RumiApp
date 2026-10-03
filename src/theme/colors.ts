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
  accent: '#FF6B4A',
  accentDeep: '#E25538',
  accentSoft: '#FFE3DB',
  accentGlow: 'rgba(255,107,74,0.28)',
  teal: '#2EC4B6',
  tealSoft: '#D8F5F1',
  gold: '#F4C95D',
  coral: '#FF6B4A',
  danger: '#D64545',
  dangerSoft: '#FDE8E8',
  success: '#1F9D6C',
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
