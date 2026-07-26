/**
 * GymBud Mobile — Theme: Spacing & Layout
 *
 * 4px base grid system for consistent spacing.
 */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const layout = {
  screenPadding: spacing.base,
  cardPadding: spacing.base,
  sectionGap: spacing.xl,
  inputHeight: 48,
  buttonHeight: 52,
  bottomTabHeight: 80,
} as const;
