import { Pressable, StyleSheet, View } from 'react-native';

import { TraceText } from '@/components/ui/trace-text';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  className,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      className={`flex-row gap-1 ${className ?? ''}`}
      style={[styles.container, { backgroundColor: colors.accentDim, borderColor: colors.border }]}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, { backgroundColor: selected ? colors.accent : 'transparent' }]}>
            <TraceText
              variant="caption"
              style={{ color: selected ? colors.background : colors.textDim, fontWeight: '700' }}>
              {option.label}
            </TraceText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 4,
    padding: 4,
    borderWidth: 1,
    borderRadius: Radii.control,
  },
  option: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.control,
    paddingHorizontal: 12,
  },
});
