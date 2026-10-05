import { colors, scale } from './tokens';

/**
 * Legacy names the older screens still read. Every value comes from
 * ./tokens, so there is one source of truth; new code uses `@/src/theme`.
 */
export const palette = {
  bg: colors.bg.brand,
  bgMid: scale.petrol[600],
  mist: scale.petrol[500],
  surfaceSolid: colors.bg.surface,
  ink: colors.text.primary,
  /** Body secondary — readable at mid/low brightness. */
  inkMuted: colors.text.secondary,
  /** Captions / hints. */
  inkSoft: colors.text.tertiary,
  accent: colors.action.primary,
  accentDeep: colors.action.primaryPressed,
  accentSoft: colors.action.primarySoft,
  teal: colors.accent.teal,
  /** Teal for text on light surfaces; the bright teal is for fills and icons only. */
  tealText: colors.accent.tealText,
  tealSoft: colors.accent.tealSoft,
  gold: colors.accent.gold,
  danger: colors.status.danger,
  dangerSoft: colors.status.dangerSoft,
  success: colors.status.success,
  successSoft: colors.status.successSoft,
  warnSoft: colors.status.warningSoft,
  border: colors.border.subtle,
  white: scale.neutral[0],
  shadow: colors.shadowColor,
  brand: colors.text.onBrand,
  brandMuted: colors.text.onBrandMuted,
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
