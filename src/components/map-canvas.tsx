import { Platform } from 'react-native';
import MapView, { Heatmap, Marker, Polyline } from 'react-native-maps';

import type { MapCanvasProps } from '@/lib/map-types';

export function MapCanvas({
  style,
  initialRegion,
  muted = false,
  darkStyle,
  polylines = [],
  markers = [],
  heatmapPoints = [],
  onLongPress,
  showsUserLocation = false,
  followUserLocation = false,
  onUserPan,
  interactive = true,
  accessibilityLabel,
}: MapCanvasProps) {
  return (
    <MapView
      accessibilityLabel={accessibilityLabel}
      customMapStyle={Platform.OS === 'android' ? darkStyle : undefined}
      followsUserLocation={followUserLocation}
      initialRegion={initialRegion}
      mapType={muted && Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      onLongPress={
        onLongPress
          ? (event) => onLongPress(event.nativeEvent.coordinate)
          : undefined
      }
      onRegionChangeComplete={onUserPan}
      pitchEnabled={interactive}
      rotateEnabled={interactive}
      scrollEnabled={interactive}
      showsUserLocation={showsUserLocation}
      style={style}
      zoomEnabled={interactive}>
      {heatmapPoints.length > 1 ? <Heatmap opacity={0.6} points={heatmapPoints} radius={30} /> : null}
      {polylines.map((polyline, index) => (
        <Polyline
          coordinates={polyline.coordinates}
          key={polyline.key ?? `polyline-${index}`}
          strokeColor={polyline.color}
          strokeWidth={polyline.width}
        />
      ))}
      {markers.map((marker) => (
        <Marker
          coordinate={marker.coordinate}
          key={marker.key}
          pinColor={marker.color}
        />
      ))}
    </MapView>
  );
}
