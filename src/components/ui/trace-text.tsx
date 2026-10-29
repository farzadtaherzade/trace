import { StyleSheet, Text, type TextProps } from 'react-native';

import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';

export type TraceTextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';
export type TraceTextTone = 'default' | 'dim' | 'accent' | 'danger';

export interface TraceTextProps extends TextProps {
  variant?: TraceTextVariant;
  tone?: TraceTextTone;
  className?: string;
}

const variantClasses: Record<TraceTextVariant, string> = {
  display: 'text-4xl font-semibold leading-10 tracking-tight',
  title: 'text-3xl font-semibold leading-9 tracking-tight',
  heading: 'text-xl font-semibold leading-7',
  body: 'text-base leading-6',
  label: 'text-xs font-semibold uppercase leading-4 tracking-[0.12em]',
  caption: 'text-sm leading-5',
};

const variantStyles = StyleSheet.create({
  display: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  heading: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
});

export function TraceText({
  children,
  variant = 'body',
  tone = 'default',
  className,
  style,
  ...props
}: TraceTextProps) {
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const toneColors: Record<TraceTextTone, string> = {
    default: colors.text,
    dim: colors.textDim,
    accent: colors.accent,
    danger: colors.danger,
  };
  const rtlOverride = isRTL ? { letterSpacing: 0, textTransform: 'none' as const } : null;

  return (
    <Text
      {...props}
      className={`${variantClasses[variant]} ${className ?? ''}`}
      style={[variantStyles[variant], { color: toneColors[tone] }, rtlOverride, style]}>
      {children}
    </Text>
  );
}
