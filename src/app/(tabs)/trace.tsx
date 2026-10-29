import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import type { Region } from 'react-native-maps';

import { MapCanvas } from '@/components/map-canvas';
import {
  Card,
  Confetti,
  IconButton,
  PrimaryButton,
  Screen,
  TraceText,
} from '@/components/ui';
import { i18n } from '@/lib/i18n';
import { getPoints, type ActivityType, type TracePoint } from '@/lib/db';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  type Units,
} from '@/lib/geo';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';
import { useTracking } from '@/providers/tracking-provider';
import { getUnits } from '@/lib/units';

const DEFAULT_REGION: Region = {
  latitude: 35.6892,
  longitude: 51.389,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#151515' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c8c8cc' }],
  },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6e6e73' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a241d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#232323' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#101010' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e1e1e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4d6a8a' }] },
];

const ACTIVITY_ICONS = {
  run: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  walk: { ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' },
  cycle: { ios: 'bicycle', android: 'directions_bike', web: 'directions_bike' },
  drive: { ios: 'car.fill', android: 'directions_car', web: 'directions_car' },
} as const;

const ACTIVITY_TYPES: ActivityType[] = ['run', 'walk', 'cycle', 'drive'];

export default function TraceScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const {
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
    dismissToast,
  } = useTracking();

  const [units, setUnits] = useState<Units>('metric');
  const [points, setPoints] = useState<TracePoint[]>([]);
  const [following, setFollowing] = useState(true);
  const [now, setNow] = useState(0);

  useEffect(() => {
    void getUnits().then(setUnits);
  }, []);

  useEffect(() => {
    if (!traceId || (status !== 'recording' && status !== 'paused')) {
      return;
    }

    let active = true;
    const load = async () => {
      const loaded = await getPoints(traceId);
      if (active) {
        setPoints(loaded);
      }
    };
    void load();
    const interval = setInterval(load, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [traceId, status]);

  useEffect(() => {
    if (status !== 'paused' || !pausedAt) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [status, pausedAt]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = setTimeout(dismissToast, 4000);
    return () => clearTimeout(timeout);
  }, [toast, dismissToast]);

  const handleFinish = async () => {
    setPoints([]);
    const id = await finish();
    if (id) {
      router.push({ pathname: '/trip/[id]', params: { id: String(id) } });
    }
  };

  const handleDiscard = async () => {
    setPoints([]);
    await discard();
  };

  const handleStart = () => {
    setPoints([]);
    void start();
  };

  const pausedElapsedMs = status === 'paused' && pausedAt ? now - pausedAt : 0;
  const autoSaveRemainingMs = status === 'paused' && pausedAt
    ? Math.max(0, 20 * 60 * 1000 - pausedElapsedMs)
    : 0;

  const showMap = status === 'recording' || status === 'paused' || status === 'countdown';
  const coordinates = points.map((point) => ({ latitude: point.lat, longitude: point.lng }));
  const showPace = activityType === 'run' || activityType === 'walk';
  const milestoneProgress = nextMilestoneM ? Math.min(1, distanceM / nextMilestoneM) : 0;

  return (
    <Screen contentClassName="flex-1" edges={['top', 'right', 'left', 'bottom']}>
      {showMap ? (
        <MapCanvas
          style={StyleSheet.absoluteFill}
          accessibilityLabel={t('trace.title')}
          darkStyle={DARK_MAP_STYLE}
          followUserLocation={following}
          initialRegion={DEFAULT_REGION}
          muted
          onUserPan={() => setFollowing(false)}
          polylines={
            coordinates.length > 1
              ? [{ coordinates, color: colors.accent, width: 5 }]
              : []
          }
          showsUserLocation
        />
      ) : null}

      {status === 'idle' ? (
        <View className="flex-1 items-center justify-center gap-section px-gutter">
          <View className="items-center gap-3">
            <TraceText accessibilityRole="header" variant="display">
              {t('trace.readyTitle')}
            </TraceText>
            <TraceText className="text-center" tone="dim" variant="body">
              {t('trace.readyMessage')}
            </TraceText>
          </View>

          <View className="w-full flex-row flex-wrap gap-3">
            {ACTIVITY_TYPES.map((type) => {
              const selected = activityType === type;
              return (
                <View key={type} className="w-[48%] flex-1">
                  <Card
                    className={`items-center gap-2 ${selected ? '' : 'opacity-60'}`}
                    padding={false}
                    style={selected ? { borderColor: colors.accent, borderWidth: 2 } : undefined}>
                    <Pressable
                      className="items-center gap-2 p-card"
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setActivityType(type)}>
                      <SymbolView
                        name={ACTIVITY_ICONS[type]}
                        size={28}
                        tintColor={selected ? colors.accent : colors.textDim}
                      />
                      <TraceText
                        tone={selected ? 'accent' : 'dim'}
                        variant="caption"
                        style={{ fontWeight: '700' }}>
                        {t(`activity.${type}.label`)}
                      </TraceText>
                    </Pressable>
                  </Card>
                </View>
              );
            })}
          </View>

          {locationDenied ? (
            <Card className="w-full items-center gap-3">
              <TraceText accessibilityRole="header" variant="heading" tone="danger">
                {t('trace.permissionTitle')}
              </TraceText>
              <TraceText className="text-center" tone="dim" variant="body">
                {t('trace.permissionMessage')}
              </TraceText>
              <PrimaryButton
                label={t('settings.title')}
                onPress={() => Linking.openSettings()}
                size="small"
              />
            </Card>
          ) : null}

          {backgroundDenied && !locationDenied ? (
            <Card className="w-full gap-2">
              <TraceText tone="dim" variant="caption">
                {t('trace.backgroundWarning')}
              </TraceText>
            </Card>
          ) : null}

          <PrimaryButton
            label={t('trace.start')}
            onPress={handleStart}
            size="large"
          />
        </View>
      ) : null}

      {status === 'countdown' ? (
        <View className="pointer-events-none absolute inset-0 items-center justify-center">
          <TraceText accessibilityRole="header" variant="display" style={styles.countdown}>
            {countdown > 0 ? String(countdown) : 'Go!'}
          </TraceText>
        </View>
      ) : null}

      {toast?.tone === 'reward' ? <Confetti key={toast.id} /> : null}

      {status === 'recording' || status === 'paused' ? (
        <>
          {toast ? (
            <View className="absolute inset-x-0 top-4 z-10 px-gutter">
              <Card className="items-center gap-1" style={{ backgroundColor: colors.accentDim }}>
                <TraceText
                  tone="accent"
                  variant="heading"
                  style={{ color: colors.accent }}>
                  {i18n.t(toast.titleKey, toast.params)}
                </TraceText>
              </Card>
            </View>
          ) : null}

          {status === 'recording' && !following ? (
            <View className="absolute bottom-44 end-4">
              <IconButton
                accessibilityLabel={t('trace.recenter')}
                icon={
                  <SymbolView
                    name={{ android: 'my_location', ios: 'location.fill', web: 'my_location' }}
                    size={20}
                    tintColor={colors.text}
                  />
                }
                onPress={() => setFollowing(true)}
              />
            </View>
          ) : null}

          <View className="absolute inset-x-0 bottom-0 px-gutter pb-5">
            <Card className="gap-3">
              <View className="items-center">
                <TraceText variant="label" tone="dim">
                  {t('trace.distance')}
                </TraceText>
                <TraceText accessibilityRole="header" variant="display" style={styles.bigStat}>
                  {formatDistance(distanceM, units)}
                </TraceText>
              </View>

              <View className="flex-row justify-between gap-3">
                <View className="flex-1 items-center gap-1">
                  <TraceText variant="label" tone="dim">
                    {t('trace.duration')}
                  </TraceText>
                  <TraceText variant="heading" style={styles.stat}>
                    {formatDuration(durationMs)}
                  </TraceText>
                </View>
                <View className="flex-1 items-center gap-1">
                  <TraceText variant="label" tone="dim">
                    {showPace ? t('trace.pace') : t('trace.speed')}
                  </TraceText>
                  <TraceText variant="heading" style={styles.stat}>
                    {showPace
                      ? formatPace(speedMps ?? 0, units)
                      : formatSpeed(speedMps ?? 0, units)}
                  </TraceText>
                </View>
                <View className="flex-1 items-center gap-1">
                  <TraceText variant="label" tone="dim">
                    {t('trace.calories')}
                  </TraceText>
                  <TraceText variant="heading" style={styles.stat}>
                    {String(calories)}
                  </TraceText>
                </View>
              </View>

              {nextMilestoneM ? (
                <View className="gap-1">
                  <View className="h-2 w-full overflow-hidden rounded-pill" style={{ backgroundColor: colors.accentDim }}>
                    <View
                      className="h-full rounded-pill"
                      style={{ backgroundColor: colors.accent, width: `${milestoneProgress * 100}%` }}
                    />
                  </View>
                  <TraceText className="text-center" tone="dim" variant="caption">
                    {i18n.t('trace.nextMilestone', {
                      distance: formatDistance(nextMilestoneM - distanceM, units),
                    })}
                  </TraceText>
                </View>
              ) : null}

              {status === 'recording' ? (
                <View className="flex-row gap-3">
                  <PrimaryButton
                    className="flex-1"
                    label={t('trace.pause')}
                    onPress={() => void pause()}
                    size="large"
                  />
                  <PrimaryButton
                    className="flex-1"
                    label={t('trace.finish')}
                    onPress={() => void handleFinish()}
                    size="large"
                  />
                </View>
              ) : (
                <View className="gap-2">
                  <View className="flex-row gap-3">
                    <PrimaryButton
                      className="flex-1"
                      label={t('trace.resume')}
                      onPress={() => void resume()}
                      size="large"
                    />
                    <PrimaryButton
                      className="flex-1"
                      label={t('trace.finish')}
                      onPress={() => void handleFinish()}
                      size="large"
                    />
                  </View>
                  <View className="flex-row items-center justify-between gap-3">
                    <TraceText tone="dim" variant="caption">
                      {t('trace.pausedFor')} {formatDuration(pausedElapsedMs)}
                    </TraceText>
                    <TraceText tone="dim" variant="caption">
                      {i18n.t('trace.autoSaveIn', { time: formatDuration(autoSaveRemainingMs) })}
                    </TraceText>
                  </View>
                  <PrimaryButton
                    className="w-full"
                    label={t('trace.discard')}
                    onPress={() => void handleDiscard()}
                    size="small"
                  />
                </View>
              )}
            </Card>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bigStat: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '700',
    letterSpacing: -1,
  },
  stat: {
    fontSize: 18,
    fontWeight: '700',
  },
  countdown: {
    fontSize: 120,
    fontWeight: '800',
  },
});
