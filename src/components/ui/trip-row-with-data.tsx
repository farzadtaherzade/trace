import { useEffect, useState } from 'react';

import { getPoints, type Trace } from '@/lib/db';
import type { RoutePoint } from '@/components/ui/route-shape';
import { formatDistance, formatDuration, type Units } from '@/lib/geo';
import { useLanguage } from '@/providers/language-provider';
import { getUnits } from '@/lib/units';

import { TripRow } from './trip-row';

export interface TripRowWithDataProps {
  trace: Trace;
  onPress: () => void;
}

const MAX_THUMBNAIL_POINTS = 100;

function sampleForThumbnail(points: RoutePoint[]) {
  if (points.length <= MAX_THUMBNAIL_POINTS) {
    return points;
  }
  const stride = Math.ceil(points.length / MAX_THUMBNAIL_POINTS);
  return points.filter((_, index) => index % stride === 0);
}

export function TripRowWithData({ trace, onPress }: TripRowWithDataProps) {
  const { locale } = useLanguage();
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [units, setUnits] = useState<Units>('metric');

  useEffect(() => {
    let active = true;
    void Promise.all([getPoints(trace.id), getUnits()]).then(([loaded, loadedUnits]) => {
      if (active) {
        setPoints(sampleForThumbnail(loaded));
        setUnits(loadedUnits);
      }
    });
    return () => {
      active = false;
    };
  }, [trace.id]);

  const date = new Date(trace.startedAt).toLocaleDateString(locale === 'fa' ? 'fa-IR-u-nu-latn' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <TripRow
      accessibilityLabel={`${trace.name}, ${formatDistance(trace.distanceM, units)}`}
      date={date}
      distance={formatDistance(trace.distanceM, units)}
      duration={formatDuration(trace.durationMs)}
      name={trace.name}
      onPress={onPress}
      points={points}
    />
  );
}
