import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { TraceText } from '@/components/ui/trace-text';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';

export interface ScreenHeaderProps extends Omit<ViewProps, 'children' | 'style'> {
  title: ReactNode;
  subtitle?: ReactNode;
  backAction?: ReactNode | (() => void);
  onBack?: () => void;
  trailingAction?: ReactNode;
  trailing?: ReactNode;
  backAccessibilityLabel?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  subtitle,
  backAction,
  onBack,
  trailingAction,
  trailing,
  backAccessibilityLabel,
  className,
  style,
  ...props
}: ScreenHeaderProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const backIcon = (
    <SymbolView
      name={{ android: 'arrow_back', ios: 'chevron.left', web: 'arrow_back' }}
      size={20}
      tintColor={colors.text}
      style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
  const resolvedBackAction =
    typeof backAction === 'function' ? (
      <IconButton
        accessibilityLabel={backAccessibilityLabel ?? t('common.back')}
        icon={backIcon}
        onPress={backAction}
      />
    ) : (
      backAction ??
      (onBack ? (
        <IconButton
          accessibilityLabel={backAccessibilityLabel ?? t('common.back')}
          icon={backIcon}
          onPress={onBack}
        />
      ) : undefined)
    );
  const resolvedTrailingAction = trailingAction ?? trailing;

  return (
    <View
      {...props}
      className={`flex-row items-center gap-3 px-gutter py-4 ${className ?? ''}`}
      style={[styles.header, style]}>
      {resolvedBackAction}
      <View style={styles.titleContainer}>
        <TraceText accessibilityRole="header" numberOfLines={2} variant="title">
          {title}
        </TraceText>
        {subtitle !== undefined && subtitle !== null ? (
          <TraceText tone="dim" variant="body">
            {subtitle}
          </TraceText>
        ) : null}
      </View>
      {resolvedTrailingAction}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.gutter,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
});
