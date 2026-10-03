import type { TextStyle } from 'react-native';

/** Every family here must be loaded in app/_layout.tsx. */
export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semiBold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  displaySemiBold: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
} as const;

/**
 * Fraunces is Rumi's voice (brand, page titles, the hero amount); DM Sans
 * carries the UI. Nothing goes below 12pt.
 */
export const type = {
  display: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.2,
  },
  h1: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  h2: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  overline: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  /** List and table amounts: tabular figures so columns line up. */
  amount: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
