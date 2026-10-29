import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Card } from '@/components/ui/card';
import { TraceText } from '@/components/ui/trace-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';

export interface EmptyStateProps extends Omit<ViewProps, 'style' | 'children'> {
  icon?: ReactNode;
  title?: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
  style,
  ...props
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <Card
      {...props}
      className={`items-center justify-center ${className ?? ''}`}
      padding={false}
      style={[styles.container, style]}>
      {icon ? (
        <View
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.iconSurface, { backgroundColor: colors.accentDim }]}>
          {icon}
        </View>
      ) : null}
      {title !== undefined && title !== null ? (
        <TraceText style={styles.centeredText} variant="heading">
          {title}
        </TraceText>
      ) : null}
      {message !== undefined && message !== null ? (
        <TraceText style={styles.centeredText} tone="dim" variant="body">
          {message}
        </TraceText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.section,
    gap: Spacing.card,
  },
  centeredText: {
    textAlign: 'center',
  },
  iconSurface: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
  },
  action: {
    marginTop: Spacing.one,
  },
});
