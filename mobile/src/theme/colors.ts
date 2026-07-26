/**
 * GymBud Mobile — Theme: Color Palette
 *
 * Dark-first design with vibrant accent colors.
 * Inspired by premium fitness apps (strong, bold, energetic).
 */

export const colors = {
  // ─── Core ──────────────────────────────────
  primary: '#6C63FF',         // Electric indigo — main brand color
  primaryLight: '#8B83FF',
  primaryDark: '#4A42DB',

  secondary: '#00D9A6',       // Mint green — success / progress
  secondaryLight: '#33E3BA',
  secondaryDark: '#00B88A',

  accent: '#FF6B6B',          // Coral — warnings / intensity
  accentLight: '#FF8E8E',
  accentDark: '#E84545',

  // ─── Backgrounds ──────────────────────────
  background: '#0A0A0F',      // Deep dark
  surface: '#14141F',         // Card backgrounds
  surfaceLight: '#1E1E2E',    // Elevated surfaces
  surfaceBorder: '#2A2A3D',   // Subtle borders

  // ─── Text ─────────────────────────────────
  text: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6B6B80',
  textInverse: '#0A0A0F',

  // ─── Semantic ──────────────────────────────
  success: '#00D9A6',
  warning: '#FFB547',
  error: '#FF4757',
  info: '#6C63FF',

  // ─── Macro Colors ─────────────────────────
  protein: '#FF6B6B',         // Red-coral
  carbs: '#FFB547',           // Amber
  fat: '#6C63FF',             // Indigo
  water: '#4FC3F7',           // Light blue

  // ─── Gradients (start → end) ──────────────
  gradientPrimary: ['#6C63FF', '#4A42DB'],
  gradientSuccess: ['#00D9A6', '#00B88A'],
  gradientAccent: ['#FF6B6B', '#E84545'],
  gradientDark: ['#14141F', '#0A0A0F'],
} as const;

export type ColorKey = keyof typeof colors;
