/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Paleta del Dashboard (apps/dashboard/tailwind.config.ts + src/app/globals.css).
// Colors.light y Colors.dark son idénticos a propósito: la app se ve igual sin
// importar el modo claro/oscuro del teléfono, igual que el Dashboard (que es
// siempre oscuro). backgroundElement/backgroundSelected/textSecondary se
// calcularon a partir de cómo el Dashboard pinta tarjetas y texto secundario
// (bg-white/5, border-white/10, text-gray-400) mezclados sobre #1A1A2E.
export const Colors = {
  light: {
    text: '#FFFFFF',
    background: '#1A1A2E',
    backgroundElement: '#252538',
    backgroundSelected: '#313143',
    textSecondary: '#9CA3AF',
    accent: '#6BBF4E',
    accentBlue: '#3AABCE',
  },
  dark: {
    text: '#FFFFFF',
    background: '#1A1A2E',
    backgroundElement: '#252538',
    backgroundSelected: '#313143',
    textSecondary: '#9CA3AF',
    accent: '#6BBF4E',
    accentBlue: '#3AABCE',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
