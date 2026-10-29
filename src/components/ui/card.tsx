import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';

export type CardPadding = boolean | number | keyof typeof Spacing;

export interface CardProps extends Omit<ViewProps, 'style'> {
  padding?: CardPadding;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

function getPaddingValue(padding: CardPadding) {
  if (padding === true) {
    return Spacing.card;
  }

  if (padding === false) {
    return 0;
  }

  if (typeof padding === 'number') {
    return Number.isFinite(padding) ? Math.max(0, padding) : Spacing.card;
  }

  return Spacing[padding] ?? Spacing.card;
}

export function Card({ padding = true, className, style, ...props }: CardProps) {
  const { colors } = useTheme();
  const paddingValue = getPaddingValue(padding);
  const paddingClass = padding === true ? ' p-card' : '';

  return (
    <View
      {...props}
      className={`border rounded-card${paddingClass} ${className ?? ''}`}
      style={[
        styles.card,
        { padding: paddingValue, backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]} />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radii.card,
  },
});
