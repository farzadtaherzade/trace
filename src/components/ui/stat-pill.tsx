import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { TraceText } from '@/components/ui/trace-text';
import { Spacing } from '@/constants/theme';

export interface StatPillProps extends Omit<ViewProps, 'style'> {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatPill({ label, value, className, style, ...props }: StatPillProps) {
  return (
    <View
      {...props}
      className={`gap-1 ${className ?? ''}`}
      style={[styles.container, style]}>
      <TraceText variant="label" tone="dim">
        {label}
      </TraceText>
      <TraceText className="font-bold" style={styles.value} variant="heading">
        {value}
      </TraceText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 64,
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: Spacing.one,
  },
  value: {
    fontWeight: '700',
  },
});
