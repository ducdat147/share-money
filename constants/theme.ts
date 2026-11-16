/**
 * Design System - Theme Configuration
 * Bộ G "Ô liu & cát": nền cát ấm, nhấn ô liu. Mọi cặp chữ/nền chính đạt WCAG AA 4.5:1
 * (xem utils/__tests__/color.test.ts).
 */

const CommonColors = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const DarkColors = {
  // Brand
  primary: '#A3E635',
  primaryLight: '#BEF264',
  primaryDark: '#84CC16',
  onPrimary: '#14140F',

  secondary: '#A8B58A', // Xanh xô thơm
  onSecondary: '#14140F',

  accent: '#E5B94E', // Vàng cát
  accentLight: '#F2D488',
  onAccent: '#14140F',

  // Status
  success: '#4ADE80',
  onSuccess: '#14140F',
  warning: '#FBBF24',
  onWarning: '#14140F',
  danger: '#F87171',
  onDanger: '#14140F',
  info: '#6BB8CC',
  onInfo: '#14140F',

  // Surfaces & Backgrounds
  background: '#14140F',
  onBackground: '#EDEBE2',

  surface: '#1E1E17',
  onSurface: '#EDEBE2',
  onSurfaceSecondary: '#B5B2A3',
  onSurfaceMuted: '#8A8778',

  surfaceElevated: '#33332A',
  onSurfaceElevated: '#EDEBE2',

  border: '#33332A',
  borderLight: '#28281F',

  overlay: 'rgba(0, 0, 0, 0.7)',
  cardGradientStart: '#1E1E17',
  cardGradientEnd: '#14140F',

  text: '#EDEBE2',
  textSecondary: '#B5B2A3',
  textMuted: '#8A8778',
  textInverse: '#14140F',
};

export const LightColors: ThemeColors = {
  // Brand
  primary: '#4D7C0F',
  primaryLight: '#BFD98F',
  primaryDark: '#3A5F0B',
  onPrimary: CommonColors.white,

  secondary: '#6B5B3A', // Nâu đất
  onSecondary: CommonColors.white,

  accent: '#B7791F',
  accentLight: '#E2B65A',
  onAccent: CommonColors.white,

  // Status
  success: '#15803D',
  onSuccess: CommonColors.white,
  warning: '#B45309',
  onWarning: CommonColors.white,
  danger: '#B91C1C',
  onDanger: CommonColors.white,
  info: '#0E7490',
  onInfo: CommonColors.white,

  // Surfaces & Backgrounds
  background: '#F5F3EC',
  onBackground: '#2B2A22',

  surface: '#FBFAF6',
  onSurface: '#2B2A22',
  onSurfaceSecondary: '#5E5B4C',
  onSurfaceMuted: '#6F6C5B',

  surfaceElevated: '#EAE6D9',
  onSurfaceElevated: '#2B2A22',

  border: '#E4E0D3',
  borderLight: '#EFECE1',

  overlay: 'rgba(20, 20, 15, 0.45)',
  cardGradientStart: '#FBFAF6',
  cardGradientEnd: '#F5F3EC',

  text: '#2B2A22',
  textSecondary: '#5E5B4C',
  textMuted: '#6F6C5B',
  textInverse: CommonColors.white,
};

export type ThemeColors = typeof DarkColors;
export type ThemeMode = 'system' | 'light' | 'dark';

export const Colors = DarkColors;

// ====== Layout Tokens ======

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// Android không chọn được file font theo fontWeight, nên mỗi độ đậm trỏ tới một file riêng.
export const FontFamily = {
  regular: 'Lexend_400Regular',
  semibold: 'Lexend_600SemiBold',
  bold: 'Lexend_700Bold',
} as const;
