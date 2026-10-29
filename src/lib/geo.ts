import type { ActivityType } from '@/lib/db';

export type Units = 'metric' | 'imperial';

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function pathDistanceM(points: { lat: number; lng: number }[]) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += haversineMeters(
      points[index - 1].lat,
      points[index - 1].lng,
      points[index].lat,
      points[index].lng,
    );
  }
  return total;
}

export const KILOMETER_M = 1000;
export const MILE_M = 1609.344;

export interface Split {
  km: number;
  splitMs: number;
  avgSpeedMps: number;
}

export function computeSplits(
  points: { lat: number; lng: number; timestamp: number }[],
  segmentMeters: number = KILOMETER_M,
) {
  const splits: Split[] = [];
  let currentStart = 0;

  for (let index = 1; index < points.length; index += 1) {
    const segmentDistance = haversineMeters(
      points[index - 1].lat,
      points[index - 1].lng,
      points[index].lat,
      points[index].lng,
    );
    const segmentTime = points[index].timestamp - points[index - 1].timestamp;

    if (segmentDistance > 3 && segmentTime > 0) {
      const segmentSoFar = pathDistanceM(points.slice(currentStart, index + 1)) / segmentMeters;

      if (segmentSoFar >= splits.length + 1) {
        const splitPoints = points.slice(currentStart, index + 1);
        const splitMs = splitPoints[splitPoints.length - 1].timestamp - splitPoints[0].timestamp;
        splits.push({
          km: splits.length + 1,
          splitMs,
          avgSpeedMps: pathDistanceM(splitPoints) / (splitMs / 1000),
        });
        currentStart = index;
      }
    }
  }

  return splits;
}

export function elevationGainM(points: { altitude: number | null }[]) {
  let gain = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1].altitude;
    const current = points[index].altitude;
    if (previous !== null && current !== null && current > previous) {
      gain += current - previous;
    }
  }
  return gain;
}

export function formatDistance(meters: number, units: Units) {
  if (units === 'imperial') {
    const miles = meters / 1609.344;
    return `${miles.toFixed(miles < 10 ? 2 : 1)} mi`;
  }
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 2 : 1)} km`;
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatSpeed(mps: number, units: Units) {
  if (units === 'imperial') {
    return `${(mps * 2.23694).toFixed(1)} mph`;
  }
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

export function formatPace(mps: number, units: Units) {
  if (mps <= 0.1) {
    return '--:--';
  }
  const unitMeters = units === 'imperial' ? MILE_M : KILOMETER_M;
  const totalSeconds = Math.round(unitMeters / mps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');
  return units === 'imperial'
    ? `${minutes}:${paddedSeconds} /mi`
    : `${minutes}:${paddedSeconds} /km`;
}

export function formatElevation(meters: number, units: Units) {
  if (units === 'imperial') {
    return `${Math.round(meters * 3.28084)} ft`;
  }
  return `${Math.round(meters)} m`;
}

const MET_BY_ACTIVITY: Record<ActivityType, number> = {
  run: 9.8,
  walk: 3.5,
  cycle: 7.5,
  drive: 2.0,
};

const TYPICAL_SPEED_MPS: Record<ActivityType, number> = {
  run: 2.8,
  walk: 1.4,
  cycle: 5.5,
  drive: 11.1,
};

const ASSUMED_WEIGHT_KG = 70;

export function estimateCaloriesKcal(activity: ActivityType, distanceM: number) {
  const hours = distanceM / TYPICAL_SPEED_MPS[activity] / 3600;
  return Math.round(MET_BY_ACTIVITY[activity] * ASSUMED_WEIGHT_KG * hours);
}

export function nextMilestoneMeters(distanceM: number) {
  const milestones = [300, 1000, 2000, 5000, 10000, 21097, 42195];
  return milestones.find((milestone) => distanceM < milestone) ?? null;
}

export function isLoopTrace(points: { lat: number; lng: number }[], distanceM: number) {
  if (points.length < 20 || distanceM < 400) {
    return false;
  }
  const first = points[0];
  const last = points[points.length - 1];
  return haversineMeters(first.lat, first.lng, last.lat, last.lng) < distanceM * 0.15;
}
