import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { Region } from 'react-native-maps';

import { MapCanvas } from '@/components/map-canvas';
import {
  Card,
  EmptyState,
  IconButton,
  Screen,
  ScreenHeader,
  TraceText,
  TripRowWithData,
} from '@/components/ui';
import { Rings } from '@/components/ui/rings';
import { useTraces } from '@/hooks/use-traces';
import { computeStreakDays, getGoal, getPoints, type Trace } from '@/lib/db';
import { computeWeeklyStats } from '@/lib/stats';
import { i18n } from '@/lib/i18n';
import { formatDistance, formatDuration, type Units } from '@/lib/geo';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';
import { getUnits } from '@/lib/units';

const DEFAULT_REGION: Region = {
  latitude: 35.6892,
  longitude: 51.389,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#151515' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#232323' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
];

export default function ExploreScreen() {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const { traces, reload } = useTraces();

  const [goalTargetM, setGoalTargetM] = useState<number | null>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [units, setUnits] = useState<Units>('metric');

  useEffect(() => {
    void getUnits().then(setUnits);
  }, []);

  useEffect(() => {
    void getGoal('weekly').then((goal) => setGoalTargetM(goal?.targetM ?? null));
  }, []);

  useEffect(() => {
    if (!traces || traces.length === 0) {
      return;
    }
    let active = true;
    void (async () => {
      const recent = traces.slice(0, 20);
      const allPoints = await Promise.all(recent.map((trace) => getPoints(trace.id)));
      if (!active) {
        return;
      }
      setHeatmapPoints(
        allPoints.flatMap((points) => points.map((point) => ({ latitude: point.lat, longitude: point.lng }))),
      );
    })();
    return () => {
      active = false;
    };
  }, [traces]);

  const weekly = traces ? computeWeeklyStats(traces, locale === 'fa' ? 'fa-IR-u-nu-latn' : 'en-US') : null;
  const streakDays = traces ? computeStreakDays(traces) : 0;
  const latestTrace: Trace | null = traces && traces.length > 0 ? traces[0] : null;
  const goalProgress =
    weekly && goalTargetM && goalTargetM > 0 ? weekly.distanceM / goalTargetM : weekly ? 1 : 0;

  return (
    <Screen contentClassName="flex-1 pb-gutter" edges={['top', 'right', 'left']}>
      <ScreenHeader
        trailingAction={
          <IconButton
            accessibilityLabel={t('common.refresh')}
            icon={
              <SymbolView
                name={{ android: 'refresh', ios: 'arrow.clockwise', web: 'refresh' }}
                size={20}
                tintColor={colors.text}
              />
            }
            onPress={() => void reload()}
          />
        }
        subtitle={t('explore.subtitle')}
        title={t('explore.title')}
      />

      {traces === null ? (
        <View className="flex-1 items-center justify-center">
          <SymbolView name={{ android: 'map', ios: 'map', web: 'map' }} size={28} tintColor={colors.accent} />
        </View>
      ) : traces.length === 0 ? (
        <View className="flex-1 justify-center pb-section">
          <EmptyState
            icon={
              <SymbolView
                name={{ android: 'explore', ios: 'map', web: 'explore' }}
                size={28}
                tintColor={colors.accent}
              />
            }
            message={t('home.emptyMessage')}
            title={t('home.emptyTitle')}
          />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-card pb-8">
          <Card className="gap-3">
            <View className="flex-row items-baseline justify-between">
              <TraceText variant="label" tone="dim">
                {t('home.weeklySummary')}
              </TraceText>
              {weekly?.bestDayLabel ? (
                <TraceText variant="caption" tone="dim">
                  {t('home.bestDay')}: {weekly.bestDayLabel}
                </TraceText>
              ) : null}
            </View>
            <TraceText accessibilityRole="header" variant="display" style={{ fontSize: 44, letterSpacing: -1 }}>
              {formatDistance(weekly?.distanceM ?? 0, units)}
            </TraceText>
            <View className="flex-row gap-6">
              <View className="gap-1">
                <TraceText variant="label" tone="dim">
                  {t('trace.duration')}
                </TraceText>
                <TraceText variant="heading">
                  {formatDuration(weekly?.durationMs ?? 0)}
                </TraceText>
              </View>
              <View className="gap-1">
                <TraceText variant="label" tone="dim">
                  {t('home.activeDays')}
                </TraceText>
                <TraceText variant="heading">{String(weekly?.activeDays ?? 0)}</TraceText>
              </View>
              <View className="gap-1">
                <TraceText variant="label" tone="dim">
                  {i18n.t('home.tripsCount', { count: weekly?.trips ?? 0 })}
                </TraceText>
                <TraceText variant="heading">{String(weekly?.trips ?? 0)}</TraceText>
              </View>
            </View>
          </Card>

          <Card className="items-center gap-4">
            <Rings
              values={{
                goal: goalProgress,
                activeDays: weekly?.activeDays ?? 0,
                activeDaysMax: 7,
                streak: streakDays,
                streakMax: 7,
              }}
            />
            {goalTargetM === null ? (
              <TraceText className="text-center" tone="dim" variant="caption">
                {t('home.noGoal')}
              </TraceText>
            ) : null}
          </Card>

          <Card className="gap-2" padding={false}>
            <View className="p-card pb-0">
              <TraceText variant="label" tone="dim">
                {t('home.heatmapTitle')}
              </TraceText>
            </View>
            <View
              className="h-44 overflow-hidden"
              style={{ borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
              <MapCanvas
                accessibilityLabel={t('home.heatmapTitle')}
                darkStyle={DARK_MAP_STYLE}
                heatmapPoints={heatmapPoints}
                initialRegion={DEFAULT_REGION}
                interactive={false}
                muted
                style={{ flex: 1 }}
              />
            </View>
          </Card>

          {latestTrace ? (
            <Card className="gap-3" padding={false}>
              <View className="p-card pb-0">
                <TraceText variant="label" tone="dim">
                  {t('home.latestTrace')}
                </TraceText>
              </View>
              <View className="p-card pt-0">
                <TripRowWithData
                  trace={latestTrace}
                  onPress={() => router.push({ pathname: '/trip/[id]', params: { id: latestTrace.id } })}
                />
              </View>
            </Card>
          ) : null}

          {traces.length > 1 ? (
            <View className="gap-2">
              <TraceText variant="label" tone="dim">
                {t('home.recentTraces')}
              </TraceText>
              {traces.slice(1, 6).map((trace) => (
                <TripRowWithData
                  key={trace.id}
                  trace={trace}
                  onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trace.id } })}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
