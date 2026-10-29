import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const PARTICLE_COUNT = 24;
const COLORS = ['#34D399', '#FBBF24', '#F87171', '#60A5FA', '#A78BFA', '#F472B6'];

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

interface ParticleParams {
  direction: number;
  distance: number;
  drift: number;
  color: string;
  width: number;
  height: number;
}

interface ParticleProps extends ParticleParams {
  progress: SharedValue<number>;
}

function Particle({ progress, direction, distance, drift, color, width, height }: ParticleProps) {
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, progress.value);
    const ease = 1 - (1 - t) * (1 - t);
    const dx = direction * distance * ease + drift * t;
    const dy = -140 * ease + 420 * t * t;
    const rotation = t * 540 * direction;
    const opacity = t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.25) : 1;

    return {
      transform: [
        { translateX: dx },
        { translateY: dy },
        { rotate: `${rotation}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: '28%',
          left: '50%',
          backgroundColor: color,
          borderRadius: 2,
          marginLeft: -width / 2,
        },
        { width, height },
        style,
      ]}
    />
  );
}

export function Confetti() {
  const progress = useSharedValue(0);

  const particles = useMemo<ParticleParams[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
        direction: index % 2 === 0 ? 1 : -1,
        distance: 40 + pseudoRandom(index + 1) * 120,
        drift: (pseudoRandom(index + 40) - 0.5) * 90,
        color: COLORS[index % COLORS.length],
        width: 5 + pseudoRandom(index + 80) * 6,
        height: 8 + pseudoRandom(index + 120) * 6,
      })),
    [],
  );

  useEffect(() => {
    progress.value = withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) });
  }, [progress]);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {particles.map((particle, index) => (
        <Particle key={index} progress={progress} {...particle} />
      ))}
    </View>
  );
}
