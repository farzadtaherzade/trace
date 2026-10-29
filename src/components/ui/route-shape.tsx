import { Platform, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useTheme } from '@/providers/theme-provider';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteShapeProps {
  points: RoutePoint[];
  width: number;
  height: number;
  color?: ColorValue;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  accessibilityLabel?: string;
}

type ProjectedPoint = {
  x: number;
  y: number;
};

function getSafeDimension(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function getValidPoints(points: RoutePoint[] | undefined) {
  if (!Array.isArray(points)) {
    return [];
  }

  return points.filter(
    (point): point is RoutePoint =>
      point != null && Number.isFinite(point.lat) && Number.isFinite(point.lng),
  );
}

function projectPoints(
  points: RoutePoint[],
  width: number,
  height: number,
  strokeWidth: number,
) {
  if (points.length === 0 || width <= 0 || height <= 0) {
    return null;
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;

  if (!Number.isFinite(latSpan) || !Number.isFinite(lngSpan)) {
    return [{ x: width / 2, y: height / 2 }];
  }

  if (latSpan === 0 && lngSpan === 0) {
    return [{ x: width / 2, y: height / 2 }];
  }

  const padding = Math.min(Math.max(strokeWidth / 2 + 1, 1), width / 4, height / 4);
  const availableWidth = Math.max(0, width - padding * 2);
  const availableHeight = Math.max(0, height - padding * 2);
  const horizontalScale = lngSpan > 0 ? availableWidth / lngSpan : Number.POSITIVE_INFINITY;
  const verticalScale = latSpan > 0 ? availableHeight / latSpan : Number.POSITIVE_INFINITY;
  const scale = Math.min(horizontalScale, verticalScale);
  const contentWidth = lngSpan * scale;
  const contentHeight = latSpan * scale;
  const offsetX = (width - contentWidth) / 2;
  const offsetY = (height - contentHeight) / 2;

  return points.map<ProjectedPoint>((point) => ({
    x:
      lngSpan > 0
        ? offsetX + (point.lng - minLng) * scale
        : offsetX + availableWidth / 2,
    y:
      latSpan > 0
        ? offsetY + (maxLat - point.lat) * scale
        : offsetY + availableHeight / 2,
  }));
}

function toPointString(points: ProjectedPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export function RouteShape({
  points,
  width,
  height,
  color,
  strokeWidth = 2.5,
  style,
  className,
  accessibilityLabel,
}: RouteShapeProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.accent;
  const safeWidth = getSafeDimension(width);
  const safeHeight = getSafeDimension(height);
  const safeStrokeWidth = Number.isFinite(strokeWidth) ? Math.max(0.5, strokeWidth) : 2.5;
  const validPoints = getValidPoints(points);
  const projectedPoints = projectPoints(validPoints, safeWidth, safeHeight, safeStrokeWidth);
  const containerStyle = [styles.container, { width: safeWidth, height: safeHeight }, style];
  const accessible = accessibilityLabel !== undefined;

  if (projectedPoints === null) {
    return (
      <View
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
        className={className}
        style={containerStyle}
      />
    );
  }

  const viewBox = `0 0 ${safeWidth} ${safeHeight}`;
  const lineProps = {
    fill: 'none' as const,
    stroke: resolvedColor,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: safeStrokeWidth,
  };

  // react-native-svg forwards unknown props to the DOM node, and `accessible` /
  // `accessibilityRole` are React Native props that are not valid HTML. On web we
  // use the DOM equivalents so React does not warn about unknown attributes.
  const svgAccessibilityProps =
    Platform.OS === 'web'
      ? { 'aria-label': accessibilityLabel, role: 'img' as const }
      : {
          accessible,
          accessibilityLabel,
          accessibilityRole: 'image' as const,
        };

  return (
    <View className={className} style={containerStyle}>
      <Svg
        {...svgAccessibilityProps}
        height={safeHeight}
        preserveAspectRatio="xMidYMid meet"
        style={styles.svg}
        title={accessibilityLabel}
        viewBox={viewBox}
        width={safeWidth}>
        {projectedPoints.length === 1 || projectedPoints.every((point) => point.x === projectedPoints[0].x && point.y === projectedPoints[0].y) ? (
          <Circle
            cx={projectedPoints[0].x}
            cy={projectedPoints[0].y}
            fill={resolvedColor}
            r={Math.max(2, safeStrokeWidth)}
          />
        ) : (
          <Polyline points={toPointString(projectedPoints)} {...lineProps} />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  svg: {
    ...StyleSheet.absoluteFill,
  },
});
