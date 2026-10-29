import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { insertLocationBatch } from '@/lib/db';

export const LOCATION_TASK = 'trace-location';

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  if (locations.length === 0) {
    return;
  }

  try {
    await insertLocationBatch(
      locations.map((location) => ({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        altitude: location.coords.altitude,
        speed: location.coords.speed,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      })),
    );
  } catch {
    // Location writes are best-effort; the next batch will retry.
  }
});
