import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { TraceText } from '@/components/ui/trace-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';

export type BadgeTone = 'neutral' | 'accent' | 'danger';

export interface BadgeProps extends Omit<ViewProps, 'style' | 'children'> {
  label: ReactNode;
  tone?: BadgeTone;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border',
  accent: 'border',
  danger: 'border',
};

const toneTextClasses: Record<BadgeTone, string> = {
  neutral: 'text-text-dim',
  accent: 'text-accent',
  danger: 'text-danger',
};

const toneText: Record<BadgeTone, 'dim' | 'accent' | 'danger'> = {
  neutral: 'dim',
  accent: 'accent',
  danger: 'danger',
};

export function Badge({
  label,
  tone = 'neutral',
  className,
  style,
  accessibilityLabel,
  accessible,
  ...props
}: BadgeProps) {
  const { colors } = useTheme();
  const labelText =
    typeof label === 'string' || typeof label === 'number' ? String(label) : undefined;
  const toneStyles: Record<BadgeTone, { backgroundColor: string; borderColor: string }> = {
    neutral: { backgroundColor: colors.card, borderColor: colors.border },
    accent: { backgroundColor: colors.accentDim, borderColor: colors.accentDim },
    danger: { backgroundColor: 'transparent', borderColor: colors.danger },
  };

  return (
    <View
      {...props}
      accessibilityLabel={accessibilityLabel ?? labelText}
      accessible={accessible ?? Boolean(labelText)}
      className={`rounded-pill border ${toneClasses[tone]} ${className ?? ''}`}
      style={[styles.badge, toneStyles[tone], style]}>
      <TraceText className={toneTextClasses[tone]} tone={toneText[tone]} variant="caption">
        {label}
      </TraceText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 24,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
});
