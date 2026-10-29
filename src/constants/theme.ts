import { DarkTheme, type Theme } from 'expo-router';

import darkTokens from './design-tokens.json';
import lightTokens from './design-tokens.light.json';

export interface ColorSet {
  background: string;
  card: string;
  border: string;
  text: string;
  textDim: string;
  accent: string;
  accentDim: string;
  danger: string;
}

export const darkColors: ColorSet = {
  background: darkTokens.colors.background,
  card: darkTokens.colors.card,
  border: darkTokens.colors.border,
  text: darkTokens.colors.text,
  textDim: darkTokens.colors.textDim,
  accent: darkTokens.colors.accent,
  accentDim: darkTokens.colors.accentDim,
  danger: darkTokens.colors.danger,
};

export const lightColors: ColorSet = {
  background: lightTokens.colors.background,
  card: lightTokens.colors.card,
  border: lightTokens.colors.border,
  text: lightTokens.colors.text,
  textDim: lightTokens.colors.textDim,
  accent: lightTokens.colors.accent,
  accentDim: lightTokens.colors.accentDim,
  danger: lightTokens.colors.danger,
};

export type ColorToken = keyof ColorSet;

export const Radii = { ...darkTokens.radii } as const;

export const Spacing = {
  ...darkTokens.spacing,
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800 as const;

export function navigationThemeFor(colors: ColorSet, isDark: boolean): Theme {
  return {
    ...DarkTheme,
    dark: isDark,
    colors: {
      ...DarkTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };
}
