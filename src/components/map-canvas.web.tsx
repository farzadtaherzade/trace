import { StyleSheet, View } from 'react-native';

import { RouteShape } from '@/components/ui/route-shape';
import type { MapCanvasProps } from '@/lib/map-types';

/**
 * Web preview for maps: react-native-maps has no web implementation, so the
 * browser build draws the route as a static shape instead.
 */
export function MapCanvas({ style, polylines = [], accessibilityLabel }: MapCanvasProps) {
  const points = polylines
    .flatMap((polyline) => polyline.coordinates)
    .map((coordinate) => ({ lat: coordinate.latitude, lng: coordinate.longitude }));

  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.fallback, style]}>
      {points.length > 1 ? (
        <RouteShape
          accessibilityLabel={accessibilityLabel}
          height={200}
          points={points}
          strokeWidth={3}
          width={280}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
