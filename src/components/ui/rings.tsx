import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { TraceText } from '@/components/ui/trace-text';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';

export interface RingValues {
  goal: number;
  activeDays: number;
  activeDaysMax: number;
  streak: number;
  streakMax: number;
}

export function Rings({ values }: { values: RingValues }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const size = 180;
  const center = size / 2;
  const strokeWidth = 14;

  // Accent plus two theme-safe companions (blue / amber read on both the dark
  // and light background).
  const ringColors = [colors.accent, '#60A5FA', '#FBBF24'];
  const rings = [
    { radius: 80, progress: values.goal, label: t('home.goal') },
    { radius: 62, progress: values.activeDays / values.activeDaysMax, label: t('home.activeDays') },
    { radius: 44, progress: values.streak / values.streakMax, label: t('home.streak') },
  ];

  return (
    <View className="items-center gap-3">
      <View style={styles.container}>
        <Svg height={size} width={size}>
          {rings.map((ring, index) => {
            const circumference = 2 * Math.PI * ring.radius;
            const clamped = Math.max(0, Math.min(1, ring.progress));
            return (
              <Circle
                key={ring.radius}
                cx={center}
                cy={center}
                r={ring.radius}
                stroke={ringColors[index]}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${circumference * clamped} ${circumference}`}
                fill="none"
                opacity={clamped > 0 ? 1 : 0.18}
                transform={`rotate(-90 ${center} ${center})`}
              />
            );
          })}
        </Svg>
        <View pointerEvents="none" style={styles.center}>
          <TraceText variant="display" style={styles.centerValue}>
            {String(values.streak)}
          </TraceText>
          <TraceText variant="label" tone="dim">
            {t('home.streak')}
          </TraceText>
        </View>
      </View>

      <View className="flex-row gap-4">
        {rings.map((ring, index) => (
          <View key={ring.radius} className="items-center gap-1">
            <View
              className="h-2.5 w-2.5 rounded-pill"
              style={{ backgroundColor: ringColors[index] }}
            />
            <TraceText variant="caption" tone="dim">
              {ring.label}
            </TraceText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerValue: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
});
