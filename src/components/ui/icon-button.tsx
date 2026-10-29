import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';

export interface IconButtonProps
  extends Omit<PressableProps, 'accessibilityLabel' | 'children' | 'style'> {
  accessibilityLabel: string;
  icon: ReactNode;
  size?: number;
  className?: string;
  containerStyle?: StyleProp<ViewStyle>;
  style?: PressableProps['style'];
}

export function IconButton({
  accessibilityLabel,
  icon,
  size = 44,
  className,
  containerStyle,
  style,
  accessibilityState,
  disabled,
  hitSlop = 4,
  ...props
}: IconButtonProps) {
  const { colors } = useTheme();
  const safeSize = Number.isFinite(size) ? Math.max(1, size) : 44;
  const resolvedStyle: StyleProp<ViewStyle> = {
    width: safeSize,
    height: safeSize,
    borderRadius: safeSize / 2,
  };

  return (
    <View className={className} style={containerStyle}>
      <Pressable
        {...props}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{
          ...accessibilityState,
          disabled: Boolean(disabled),
        }}
        disabled={disabled}
        hitSlop={hitSlop}
        style={(state) => [
          styles.button,
          resolvedStyle,
          { backgroundColor: colors.card, borderColor: colors.border },
          state.pressed ? styles.pressed : null,
          typeof style === 'function' ? style(state) : style,
        ]}>
        <View pointerEvents="none" style={styles.icon}>
          {icon}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radii.pill,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
