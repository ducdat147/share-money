/**
 * Design System - Theme Configuration
 * Quản lý màu sắc tập trung theo nguyên tắc Material Design
 * Đảm bảo độ tương phản (Contrast) và dễ bảo trì.
 */

const Palette = {
  // Travel Adventure Colors
  coral: {
    50: '#FFF5F2',
    100: '#FFEBE5',
    200: '#FFD1C2',
    300: '#FFA88F',
    400: '#FF7552',
    500: '#FF5733', // Primary - Coral
    600: '#E64E2E',
    700: '#BF4126',
    800: '#99341F',
    900: '#732717',
  },
  forest: {
    500: '#2D6A4F', // Secondary - Green
    600: '#1B4332',
  },
  sun: {
    500: '#FFB703', // Accent - Yellow
    600: '#FB8500',
  },
  sky: {
    500: '#219EBC',
    600: '#023047',
  },
  // Neutrals
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
};

const CommonColors = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const DarkColors = {
  // Brand
  primary: '#FF6B4A', // Slightly more vibrant coral for Dark Mode
  primaryLight: Palette.coral[300],
  primaryDark: Palette.coral[600],
  onPrimary: CommonColors.white,

  secondary: '#3DA57A', // More vibrant forest green for Dark Mode
  onSecondary: CommonColors.white,

  accent: Palette.sun[400],
  accentLight: Palette.sun[500],
  onAccent: CommonColors.white,

  // Status
  success: '#3DA57A',
  onSuccess: CommonColors.white,
  warning: Palette.sun[400],
  onWarning: Palette.slate[900],
  danger: '#FF5252',
  onDanger: CommonColors.white,
  info: '#4FC3F7',
  onInfo: CommonColors.white,

  // Surfaces & Backgrounds
  background: '#0B0F1A', // Deeper blue-slate
  onBackground: '#F8FAFC',
  
  surface: '#151C2C', // Slightly lighter than background
  onSurface: '#F1F5F9',
  onSurfaceSecondary: '#94A3B8',
  onSurfaceMuted: '#64748B',
  
  surfaceElevated: '#1E293B',
  onSurfaceElevated: '#F1F5F9',

  border: '#2D3748',
  borderLight: '#1A202C',

  overlay: 'rgba(0, 0, 0, 0.75)',
  cardGradientStart: '#151C2C',
  cardGradientEnd: '#0B0F1A',

  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',
};

export const LightColors: ThemeColors = {
  // Brand
  primary: Palette.coral[500],
  primaryLight: Palette.coral[300],
  primaryDark: Palette.coral[600],
  onPrimary: CommonColors.white,

  secondary: Palette.forest[500],
  onSecondary: CommonColors.white,

  accent: Palette.sun[500],
  accentLight: Palette.sun[600],
  onAccent: CommonColors.white,

  // Status
  success: Palette.forest[500],
  onSuccess: CommonColors.white,
  warning: Palette.sun[500],
  onWarning: CommonColors.white,
  danger: '#EF4444',
  onDanger: CommonColors.white,
  info: Palette.sky[500],
  onInfo: CommonColors.white,

  // Surfaces & Backgrounds
  background: '#FFFBF9', // Nền hơi ngả màu kem nhẹ cho cảm giác du lịch
  onBackground: Palette.slate[900],
  
  surface: CommonColors.white,
  onSurface: Palette.slate[900],
  onSurfaceSecondary: Palette.slate[600],
  onSurfaceMuted: Palette.slate[400],
  
  surfaceElevated: '#FFF1ED',
  onSurfaceElevated: Palette.slate[900],

  border: '#F2E8E5',
  borderLight: '#FBF2F0',

  overlay: 'rgba(0, 0, 0, 0.4)',
  cardGradientStart: CommonColors.white,
  cardGradientEnd: '#FFFBF9',

  text: Palette.slate[900],
  textSecondary: Palette.slate[600],
  textMuted: Palette.slate[400],
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
