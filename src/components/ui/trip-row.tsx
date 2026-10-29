import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { RouteShape, type RoutePoint } from '@/components/ui/route-shape';
import { StatPill } from '@/components/ui/stat-pill';
import { TraceText } from '@/components/ui/trace-text';
import { Radii, Spacing } from '@/constants/theme';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';

export interface TripRowProps extends Omit<ViewProps, 'style'> {
  name: ReactNode;
  date: ReactNode;
  distance: ReactNode;
  duration: ReactNode;
  points: RoutePoint[];
  accessibilityLabel: string;
  onPress?: PressableProps['onPress'];
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function TripRow({
  name,
  date,
  distance,
  duration,
  points,
  onPress,
  className,
  style,
  accessibilityLabel,
  accessible,
  ...props
}: TripRowProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const rowClassName = `flex-row rounded-card border ${className ?? ''}`;
  const rowStyle = [
    styles.row,
    { backgroundColor: colors.card, borderColor: colors.border },
    style,
  ];
  const content = (
    <View pointerEvents={onPress ? 'none' : undefined} style={styles.content}>
      <View
        style={[
          styles.thumbnail,
          { borderColor: colors.border, backgroundColor: colors.card },
        ]}>
        <RouteShape height={56} points={points} strokeWidth={2} width={68} />
      </View>
      <View style={styles.details}>
        <TraceText numberOfLines={1} variant="heading">
          {name}
        </TraceText>
        <TraceText numberOfLines={1} tone="dim" variant="caption">
          {date}
        </TraceText>
        <View style={styles.stats}>
          <StatPill label={t('common.distance')} value={distance} />
          <StatPill label={t('common.duration')} value={duration} />
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        {...props}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessible={accessible ?? true}
        className={rowClassName}
        onPress={onPress}
        style={rowStyle}>
        {content}
      </Pressable>
    );
  }

  return (
    <View {...props} accessible={accessible ?? true} className={rowClassName} style={rowStyle}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.card,
    gap: Spacing.gutter,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
  },
  thumbnail: {
    width: 68,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: Radii.control,
    borderWidth: 1,
  },
  details: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.gutter,
    marginTop: Spacing.one,
  },
});
