import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';

import {
  addReward,
  archiveTrace,
  computeStreakDays,
  createTrace,
  currentWeekKey,
  deleteTrace,
  getActiveTrace,
  getPoints,
  getTrace,
  hasReward,
  listTraces,
  updateTrace,
  upsertChallengeProgress,
  type ActivityType,
} from '@/lib/db';
import { estimateCaloriesKcal, isLoopTrace, nextMilestoneMeters, pathDistanceM } from '@/lib/geo';
import { LOCATION_TASK } from '@/lib/location-task';
import {
  cancelPauseTimeoutNotification,
  ensureNotificationPermission,
  schedulePauseTimeoutNotification,
  setNotificationHandler,
} from '@/lib/notifications';
import { fetchWeather } from '@/lib/weather';
import { i18n } from '@/lib/i18n';
import { startOfWeek } from '@/lib/stats';
import { useLanguage } from '@/providers/language-provider';

export type TrackingStatus = 'idle' | 'countdown' | 'recording' | 'paused';

export interface TrackingToast {
  id: number;
  titleKey: string;
  params?: Record<string, string>;
  tone: 'reward' | 'info' | 'warning';
}

interface TrackingActions {
  startTask: () => Promise<void>;
  stopTask: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

interface TrackingContextValue {
  status: TrackingStatus;
  countdown: number;
  activityType: ActivityType;
  traceId: number | null;
  distanceM: number;
  durationMs: number;
  calories: number;
  speedMps: number | null;
  nextMilestoneM: number | null;
  pausedAt: number | null;
  toast: TrackingToast | null;
  locationDenied: boolean;
  backgroundDenied: boolean;
  setActivityType: (type: ActivityType) => void;
  start: () => Promise<boolean>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  finish: () => Promise<number | null>;
  discard: () => Promise<void>;
  resumeTrace: (id: number) => Promise<boolean>;
  archiveTrace: (id: number) => Promise<void>;
  dismissToast: () => void;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

const MILESTONES = [300, 1000, 2000, 5000, 10000];
const PAUSE_TIMEOUT_MS = 20 * 60 * 1000;
const AUTO_PAUSE_SPEED = 0.6;
const AUTO_PAUSE_AFTER_MS = 10_000;
const AUTO_RESUME_SPEED = 1.2;
const POLL_INTERVAL_MS = 2000;
const GO_DELAY_MS = 600;

export function TrackingProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useLanguage();

  const [status, setStatus] = useState<TrackingStatus>('idle');
  const [countdown, setCountdown] = useState(3);
  const [activityType, setActivityType] = useState<ActivityType>('run');
  const [traceId, setTraceId] = useState<number | null>(null);
  const [distanceM, setDistanceM] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [calories, setCalories] = useState(0);
  const [speedMps, setSpeedMps] = useState<number | null>(null);
  const [nextMilestoneM, setNextMilestoneM] = useState<number | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [toast, setToast] = useState<TrackingToast | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [backgroundDenied, setBackgroundDenied] = useState(false);

  const statusRef = useRef(status);
  const traceIdRef = useRef<number | null>(null);
  const activityRef = useRef<ActivityType>('run');
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const pausedMsRef = useRef(0);
  const lastDistanceRef = useRef(0);
  const lastPointsCountRef = useRef(0);
  const stillSinceRef = useRef<number | null>(null);
  const movingSinceRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const goTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);
  const actionsRef = useRef<TrackingActions>({
    startTask: async () => {},
    stopTask: async () => {},
    startPolling: () => {},
    stopPolling: () => {},
  });

  useEffect(() => {
    statusRef.current = status;
    traceIdRef.current = traceId;
    activityRef.current = activityType;
  });

  const showToast = useCallback((titleKey: string, tone: TrackingToast['tone'], params?: Record<string, string>) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, titleKey, params, tone });
  }, []);

  const speak = useCallback(
    (key: string, params?: Record<string, string>) => {
      Speech.speak(i18n.t(key, params), { language: locale === 'fa' ? 'fa-IR' : 'en-US' });
    },
    [locale],
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopTask = useCallback(async () => {
    try {
      const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
      if (running) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      }
    } catch {
      // Task may not be registered on this platform.
    }
  }, []);

  const startTask = useCallback(async () => {
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: POLL_INTERVAL_MS,
        distanceInterval: 5,
        deferredUpdatesInterval: 15_000,
        deferredUpdatesDistance: 10,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: t('notifications.serviceTitle'),
          notificationBody: t('notifications.serviceBody'),
        },
      });
    } catch {
      showToast('tracking.taskError', 'warning');
    }
  }, [showToast, t]);

  const persistStats = useCallback(async (id: number, distance: number, duration: number, maxSpeed: number | null) => {
    await updateTrace(id, {
      distanceM: distance,
      durationMs: duration,
      maxSpeedMps: maxSpeed,
      calories: Math.round(estimateCaloriesKcal(activityRef.current, distance)),
      pausedMs: pausedMsRef.current,
      pausedAt: pausedAtRef.current,
      pointsCount: lastPointsCountRef.current,
    });
  }, []);

  const pauseInternal = useCallback(
    async (auto: boolean) => {
      const id = traceIdRef.current;
      if (!id || statusRef.current !== 'recording') {
        return;
      }

      actionsRef.current.stopPolling();
      await actionsRef.current.stopTask();

      const now = Date.now();
      pausedAtRef.current = now;
      const elapsed = now - startedAtRef.current - pausedMsRef.current;
      await persistStats(id, lastDistanceRef.current, elapsed, null);
      await updateTrace(id, { status: 'paused', pausedAt: now });
      setPausedAt(now);
      setStatus('paused');
      await schedulePauseTimeoutNotification();

      if (auto) {
        showToast('tracking.autoPaused', 'info');
      } else {
        speak('voice.paused');
      }
    },
    [persistStats, showToast, speak],
  );

  const resumeInternal = useCallback(async () => {
    const id = traceIdRef.current;
    if (!id || statusRef.current !== 'paused') {
      return;
    }

    const pausedAtValue = pausedAtRef.current;
    if (pausedAtValue && Date.now() - pausedAtValue > PAUSE_TIMEOUT_MS) {
      await updateTrace(id, { status: 'unfinished' });
      await cancelPauseTimeoutNotification();
      setPausedAt(null);
      setStatus('idle');
      setTraceId(null);
      showToast('tracking.resumedTimeout', 'warning');
      return;
    }

    if (pausedAtValue) {
      pausedMsRef.current += Date.now() - pausedAtValue;
    }
    pausedAtRef.current = null;
    stillSinceRef.current = null;
    movingSinceRef.current = null;

    await updateTrace(id, { status: 'recording', pausedAt: null });
    setPausedAt(null);
    await actionsRef.current.startTask();
    setStatus('recording');
    actionsRef.current.startPolling();
    await cancelPauseTimeoutNotification();
    speak('voice.resumed');
  }, [showToast, speak]);

  const pollStats = useCallback(async () => {
    const id = traceIdRef.current;
    if (!id) {
      return;
    }

    const points = await getPoints(id);
    if (points.length === 0) {
      return;
    }

    const distance = pathDistanceM(points);
    const last = points[points.length - 1];
    const duration = Math.max(0, last.timestamp - points[0].timestamp - pausedMsRef.current);

    let maxSpeed = 0;
    for (const point of points) {
      if (point.speed !== null && point.speed > maxSpeed) {
        maxSpeed = point.speed;
      }
    }

    const now = Date.now();

    if (statusRef.current === 'recording') {
      const currentSpeed = last.speed !== null && last.speed >= 0 ? last.speed : 0;

      if (currentSpeed < AUTO_PAUSE_SPEED) {
        if (stillSinceRef.current === null) {
          stillSinceRef.current = now;
        }
        if (now - stillSinceRef.current > AUTO_PAUSE_AFTER_MS) {
          stillSinceRef.current = null;
          await pauseInternal(true);
          return;
        }
      } else {
        stillSinceRef.current = null;
      }
    } else if (statusRef.current === 'paused') {
      const currentSpeed = last.speed !== null && last.speed >= 0 ? last.speed : 0;

      if (currentSpeed > AUTO_RESUME_SPEED) {
        if (movingSinceRef.current === null) {
          movingSinceRef.current = now;
        }
        if (now - movingSinceRef.current > 3000) {
          movingSinceRef.current = null;
          await resumeInternal();
          return;
        }
      } else {
        movingSinceRef.current = null;
      }
    }

    for (const milestone of MILESTONES) {
      if (lastDistanceRef.current < milestone && distance >= milestone) {
        const code = `distance-${milestone}`;
        if (!(await hasReward(code))) {
          await addReward('milestone', code, id);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const params: Record<string, string> =
            milestone >= 1000 ? { kilometers: String(milestone / 1000) } : { meters: String(milestone) };
          showToast(milestone >= 1000 ? 'reward.milestoneKm' : 'reward.milestoneMeters', 'reward', params);
          speak(milestone >= 1000 ? 'voice.milestoneKm' : 'voice.milestoneMeters', params);
        }
      }
    }

    lastDistanceRef.current = distance;
    lastPointsCountRef.current = points.length;
    setDistanceM(distance);
    setDurationMs(duration);
    setCalories(Math.round(estimateCaloriesKcal(activityRef.current, distance)));
    setSpeedMps(last.speed);
    setNextMilestoneM(nextMilestoneMeters(distance));

    await persistStats(id, distance, duration, maxSpeed > 0 ? maxSpeed : null);
  }, [pauseInternal, persistStats, resumeInternal, showToast, speak]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      void pollStats();
    }, POLL_INTERVAL_MS);
  }, [pollStats, stopPolling]);

  useEffect(() => {
    actionsRef.current = { startTask, stopTask, startPolling, stopPolling };
  }, [startTask, stopTask, startPolling, stopPolling]);

  const ensurePermissions = useCallback(async () => {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (!foreground.granted) {
      setLocationDenied(true);
      return false;
    }
    setLocationDenied(false);

    const background = await Location.requestBackgroundPermissionsAsync();
    setBackgroundDenied(!background.granted);
    await ensureNotificationPermission();
    return true;
  }, []);

  const beginRecording = useCallback(
    async (id: number, type: ActivityType) => {
      startedAtRef.current = Date.now();
      pausedMsRef.current = 0;
      lastDistanceRef.current = 0;
      lastPointsCountRef.current = 0;
      await updateTrace(id, { status: 'recording', startedAt: startedAtRef.current, activityType: type });
      await startTask();
      setStatus('recording');
      startPolling();
      speak('voice.start');
    },
    [speak, startPolling, startTask],
  );

  const start = useCallback(async () => {
    if (statusRef.current !== 'idle') {
      return false;
    }

    const granted = await ensurePermissions();
    if (!granted) {
      return false;
    }

    const type = activityRef.current;
    const id = await createTrace(`${t(`activity.${type}.label`)} · ${new Date().toLocaleString()}`, type);
    setTraceId(id);
    traceIdRef.current = id;
    setCountdown(3);
    setStatus('countdown');

    let count = 3;
    countdownRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setCountdown(0);
        goTimeoutRef.current = setTimeout(() => {
          void beginRecording(id, type);
        }, GO_DELAY_MS);
      } else {
        setCountdown(count);
      }
    }, 1000);

    return true;
  }, [beginRecording, ensurePermissions, t]);

  const pause = useCallback(async () => {
    await pauseInternal(false);
  }, [pauseInternal]);

  const resume = useCallback(async () => {
    await resumeInternal();
  }, [resumeInternal]);

  const finish = useCallback(async () => {
    const id = traceIdRef.current;
    if (!id || (statusRef.current !== 'recording' && statusRef.current !== 'paused')) {
      return null;
    }

    stopPolling();
    await stopTask();
    await cancelPauseTimeoutNotification();

    const points = await getPoints(id);
    const distance = pathDistanceM(points);
    const first = points[0];
    const last = points[points.length - 1];
    const duration = Math.max(
      0,
      (last?.timestamp ?? Date.now()) - (first?.timestamp ?? startedAtRef.current) - pausedMsRef.current,
    );

    if (distance < 20) {
      await deleteTrace(id);
      setStatus('idle');
      setTraceId(null);
      showToast('tracking.tooShort', 'info');
      return null;
    }

    let maxSpeed = 0;
    for (const point of points) {
      if (point.speed !== null && point.speed > maxSpeed) {
        maxSpeed = point.speed;
      }
    }

    const type = activityRef.current;
    await updateTrace(id, {
      status: 'completed',
      endedAt: Date.now(),
      distanceM: distance,
      durationMs: duration,
      maxSpeedMps: maxSpeed > 0 ? maxSpeed : null,
      calories: Math.round(estimateCaloriesKcal(type, distance)),
      pointsCount: points.length,
      pausedMs: pausedMsRef.current,
      pausedAt: null,
    });

    if (first) {
      const weather = await fetchWeather(first.lat, first.lng, startedAtRef.current);
      if (weather) {
        await updateTrace(id, { weather: JSON.stringify(weather) });
      }
    }

    if (isLoopTrace(points, distance) && !(await hasReward('loop'))) {
      await addReward('milestone', 'loop', id);
      showToast('reward.loop', 'reward');
    }

    const weekKey = currentWeekKey();
    const allTraces = await listTraces();
    const weekStart = startOfWeek().getTime();
    const weekDistanceM = allTraces
      .filter((trace) => trace.status === 'completed' && trace.startedAt >= weekStart)
      .reduce((sum, trace) => sum + trace.distanceM, 0);
    const challenge = await upsertChallengeProgress(`weekly-distance-${weekKey}`, 5000, weekDistanceM, weekKey);
    if (challenge?.completedAt && !(await hasReward(`challenge-${weekKey}`))) {
      await addReward('challenge', `challenge-${weekKey}`, id);
      showToast('reward.weeklyChallenge', 'reward');
    }

    const streakDays = computeStreakDays(allTraces);
    if (streakDays > 1 && !(await hasReward(`streak-${streakDays}`))) {
      await addReward('streak', `streak-${streakDays}`, id);
      showToast('reward.streak', 'reward', { days: String(streakDays) });
    }

    setStatus('idle');
    setTraceId(null);
    setPausedAt(null);
    speak('voice.finished');
    return id;
  }, [showToast, speak, stopPolling, stopTask]);

  const resumeTrace = useCallback(async (id: number) => {
    const trace = await getTrace(id);
    if (!trace || trace.status !== 'unfinished') {
      return false;
    }

    traceIdRef.current = id;
    setTraceId(id);
    activityRef.current = trace.activityType;
    startedAtRef.current = trace.startedAt;
    pausedMsRef.current = trace.pausedMs;
    pausedAtRef.current = null;
    lastDistanceRef.current = trace.distanceM;
    setDistanceM(trace.distanceM);
    setDurationMs(trace.durationMs);
    setCalories(trace.calories);
    setNextMilestoneM(nextMilestoneMeters(trace.distanceM));

    await updateTrace(id, { status: 'recording', pausedAt: null });
    await actionsRef.current.startTask();
    setStatus('recording');
    actionsRef.current.startPolling();
    return true;
  }, []);

  const discard = useCallback(async () => {
    const id = traceIdRef.current;
    stopPolling();
    await stopTask();
    await cancelPauseTimeoutNotification();
    if (id) {
      await deleteTrace(id);
    }
    setStatus('idle');
    setTraceId(null);
    setPausedAt(null);
  }, [stopPolling, stopTask]);

  const archiveTraceById = useCallback(async (id: number) => {
    await archiveTrace(id);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    void setNotificationHandler();
  }, []);

  useEffect(() => {
    if (restoredRef.current) {
      return;
    }
    restoredRef.current = true;

    void (async () => {
      const active = await getActiveTrace();
      if (!active) {
        return;
      }

      const points = await getPoints(active.id);
      const distance = pathDistanceM(points);
      lastPointsCountRef.current = points.length;
      const duration = Math.max(
        0,
        (points[points.length - 1]?.timestamp ?? active.startedAt) - active.startedAt - active.pausedMs,
      );
      setDistanceM(distance);
      setDurationMs(duration);
      setCalories(Math.round(estimateCaloriesKcal(active.activityType, distance)));
      setTraceId(active.id);
      activityRef.current = active.activityType;
      startedAtRef.current = active.startedAt;
      pausedMsRef.current = active.pausedMs;
      pausedAtRef.current = active.pausedAt;
      lastDistanceRef.current = distance;

      if (active.status === 'recording') {
        const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
        if (!running) {
          await startTask();
        }
        setStatus('recording');
        startPolling();
      } else if (active.status === 'paused') {
        if (active.pausedAt && Date.now() - active.pausedAt > PAUSE_TIMEOUT_MS) {
          await updateTrace(active.id, { status: 'unfinished' });
          setTraceId(null);
          showToast('tracking.timeoutExpired', 'warning');
        } else {
          setPausedAt(active.pausedAt);
          setStatus('paused');
        }
      }
    })();
  }, [showToast, startPolling, startTask]);

  useEffect(() => {
    return () => {
      stopPolling();
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (goTimeoutRef.current) {
        clearTimeout(goTimeoutRef.current);
      }
    };
  }, [stopPolling]);

  const value = useMemo(
    () => ({
      status,
      countdown,
      activityType,
      traceId,
      distanceM,
      durationMs,
      calories,
      speedMps,
      nextMilestoneM,
      pausedAt,
      toast,
      locationDenied,
      backgroundDenied,
      setActivityType,
      start,
      pause,
      resume,
      finish,
      discard,
      resumeTrace,
      archiveTrace: archiveTraceById,
      dismissToast,
    }),
    [
      status,
      countdown,
      activityType,
      traceId,
      distanceM,
      durationMs,
      calories,
      speedMps,
      nextMilestoneM,
      pausedAt,
      toast,
      locationDenied,
      backgroundDenied,
      start,
      pause,
      resume,
      finish,
      discard,
      resumeTrace,
      archiveTraceById,
      dismissToast,
    ],
  );

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
}

export function useTracking() {
  const value = useContext(TrackingContext);

  if (!value) {
    throw new Error('useTracking must be used within TrackingProvider.');
  }

  return value;
}
