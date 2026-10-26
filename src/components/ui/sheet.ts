import { StyleSheet } from 'react-native';

import { colors } from '@/src/theme';

/**
 * Shared look for bottom sheets: pinned to the bottom edge with a grabber,
 * sentence-case labels, and a chosen option outlined rather than filled, so
 * the sheet's main action is its only coral.
 */
export const sheetStyles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.bg.scrim,
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border.strong,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    flex: 1,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26,
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.text.secondary,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 18,
    color: colors.text.secondary,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: colors.text.primary,
    marginTop: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionOn: {
    backgroundColor: colors.bg.surface,
    borderColor: colors.text.primary,
  },
  optionText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.text.primary,
  },
  primary: {
    backgroundColor: colors.action.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: colors.text.onAction,
  },
  secondary: {
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: colors.text.secondary,
  },
});
