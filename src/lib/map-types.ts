import type { MapStyleElement, Region } from 'react-native-maps';
import type { StyleProp, ViewStyle } from 'react-native';

export interface MapPolyline {
  key?: string;
  coordinates: { latitude: number; longitude: number }[];
  color: string;
  width: number;
}

export interface MapMarker {
  key: string;
  coordinate: { latitude: number; longitude: number };
  color: string;
}

export interface MapCanvasProps {
  style?: StyleProp<ViewStyle>;
  initialRegion: Region;
  muted?: boolean;
  darkStyle?: MapStyleElement[];
  polylines?: MapPolyline[];
  markers?: MapMarker[];
  heatmapPoints?: { latitude: number; longitude: number }[];
  onLongPress?: (coordinate: { latitude: number; longitude: number }) => void;
  showsUserLocation?: boolean;
  followUserLocation?: boolean;
  onUserPan?: () => void;
  interactive?: boolean;
  accessibilityLabel?: string;
}
