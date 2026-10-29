import { useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { TraceText } from '@/components/ui/trace-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';

export type PrimaryButtonSize = 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg';
export type PrimaryButtonStyle = PressableProps['style'];

export interface PrimaryButtonProps extends Omit<PressableProps, 'children' | 'onPress' | 'style'> {
  label?: ReactNode;
  children?: ReactNode;
  onPress?: (event: GestureResponderEvent) => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  size?: PrimaryButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  containerStyle?: StyleProp<ViewStyle>;
  style?: PrimaryButtonStyle;
  textClassName?: string;
}

const sizeMap: Record<PrimaryButtonSize, 'small' | 'medium' | 'large'> = {
  small: 'small',
  medium: 'medium',
  large: 'large',
  sm: 'small',
  md: 'medium',
  lg: 'large',
};

const sizeStyles = StyleSheet.create({
  small: {
    minHeight: 48,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.two,
  },
  medium: {
    minHeight: 48,
    paddingHorizontal: Spacing.card,
    paddingVertical: Spacing.three,
  },
  large: {
    minHeight: 52,
    paddingHorizontal: Spacing.section,
    paddingVertical: Spacing.three,
  },
});

export function PrimaryButton({
  label,
  children,
  onPress,
  disabled = false,
  loading = false,
  size = 'medium',
  leftIcon,
  rightIcon,
  className,
  containerStyle,
  style,
  textClassName,
  accessibilityLabel,
  accessibilityState,
  ...props
}: PrimaryButtonProps) {
  const pressLock = useRef(false);
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const resolvedSize = sizeMap[size] ?? 'medium';
  const content = label ?? children;
  const textLabel =
    typeof content === 'string' || typeof content === 'number' ? String(content) : undefined;
  const releasePressLock = () => {
    pressLock.current = false;
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (isDisabled || pressLock.current) {
      return;
    }

    pressLock.current = true;

    try {
      const result = onPress?.(event);
      if (result) {
        void result.then(releasePressLock, releasePressLock);
        return;
      }
    } catch (error) {
      releasePressLock();
      throw error;
    }

    releasePressLock();
  };

  return (
    <View className={className} style={containerStyle}>
      <Pressable
        {...props}
        accessibilityLabel={accessibilityLabel ?? textLabel}
        accessibilityRole="button"
        accessibilityState={{
          ...accessibilityState,
          busy: loading,
          disabled: isDisabled,
        }}
        disabled={isDisabled}
        onPress={handlePress}
        style={(state) => [
          styles.button,
          sizeStyles[resolvedSize],
          { backgroundColor: colors.accent },
          isDisabled ? styles.disabled : null,
          state.pressed ? styles.pressed : null,
          typeof style === 'function' ? style(state) : style,
        ]}>
        {loading ? (
          <ActivityIndicator color={colors.background} size={resolvedSize === 'large' ? 'large' : 'small'} />
        ) : (
          <>
            {leftIcon ? (
              <View pointerEvents="none" style={styles.icon}>
                {leftIcon}
              </View>
            ) : null}
            <TraceText
              className={textClassName ?? ''}
              style={[styles.buttonText, { color: colors.background }]}
              variant={resolvedSize === 'large' ? 'heading' : 'body'}>
              {content}
            </TraceText>
            {rightIcon ? (
              <View pointerEvents="none" style={styles.icon}>
                {rightIcon}
              </View>
            ) : null}
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radii.control,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
  },
});
