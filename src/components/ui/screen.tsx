import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';

export interface ScreenProps extends Omit<ViewProps, 'style'> {
  edges?: SafeAreaViewProps['edges'];
  contentClassName?: string;
  contentStyle?: StyleProp<ViewStyle>;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  edges = ['top', 'right', 'bottom', 'left'],
  contentClassName,
  contentStyle,
  className,
  style,
  ...props
}: ScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      {...props}
      edges={edges}
      className={`flex-1 ${className ?? ''}`}
      style={[styles.root, { backgroundColor: colors.background }, style]}>
      <View className={contentClassName} style={[styles.content, contentStyle]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.gutter,
  },
});
