/**
 * StashFlix Premium Theme Colors (Neon Red/Black Flow)
 */

import { Platform } from 'react-native';

const darkColors = {
  background: '#030000',
  surface: '#0A0000',
  surfaceHighlight: '#110000',
  text: '#FFFFFF',
  textSecondary: '#FF4D4D',
  border: '#2A0000',
  error: '#FF0033',
  success: '#00FF41',
  gradientStart: '#FF003C',
  gradientEnd: '#8B0000'
};

const lightColors = {
  background: '#FFFFFF',
  surface: '#F3F4F6',
  surfaceHighlight: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#D1D5DB',
  error: '#DC2626',
  success: '#16A34A',
  gradientStart: '#FF003C',
  gradientEnd: '#8B0000'
};

export const Palettes = {
  dark: {
    red: { tint: '#FF0033', ...darkColors },
    green: { tint: '#00FF41', ...darkColors },
    blue: { tint: '#00D8FF', ...darkColors },
    white: { tint: '#FFFFFF', ...darkColors },
  },
  light: {
    red: { tint: '#FF0033', ...lightColors },
    green: { tint: '#00B32C', ...lightColors },
    blue: { tint: '#0088FF', ...lightColors },
    black: { tint: '#000000', ...lightColors },
  }
};

export type ThemePalette = typeof Palettes.dark.red;

export const Colors = {
  light: Palettes.light.red,
  dark: Palettes.dark.red,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});
