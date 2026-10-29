import type { Trace } from '@/lib/db';

export interface WeeklyStats {
  distanceM: number;
  durationMs: number;
  trips: number;
  activeDays: number;
  bestDayLabel: string | null;
  bestDayM: number;
}

export function startOfWeek(date = new Date()): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

export function computeWeeklyStats(traces: Trace[], locale: string): WeeklyStats {
  const start = startOfWeek().getTime();
  const completed = traces.filter((trace) => trace.status === 'completed' && trace.startedAt >= start);

  const dayLabels = new Map<string, string>();
  const dayDistance = new Map<string, number>();
  const activeDays = new Set<string>();
  let durationMs = 0;

  for (const trace of completed) {
    durationMs += trace.durationMs;
    const date = new Date(trace.startedAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    activeDays.add(key);
    dayLabels.set(key, date.toLocaleDateString(locale, { weekday: 'short' }));
    dayDistance.set(key, (dayDistance.get(key) ?? 0) + trace.distanceM);
  }

  let bestDayLabel: string | null = null;
  let bestDayM = 0;
  for (const [key, distance] of dayDistance) {
    if (distance > bestDayM) {
      bestDayM = distance;
      bestDayLabel = dayLabels.get(key) ?? null;
    }
  }

  return {
    distanceM: completed.reduce((sum, trace) => sum + trace.distanceM, 0),
    durationMs,
    trips: completed.length,
    activeDays: activeDays.size,
    bestDayLabel,
    bestDayM,
  };
}
