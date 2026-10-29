import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { captureRef } from 'react-native-view-shot';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Svg, { Polyline as SvgPolyline } from 'react-native-svg';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import type { Region } from 'react-native-maps';

import { MapCanvas } from '@/components/map-canvas';

import {
  Badge,
  Card,
  EmptyState,
  IconButton,
  PrimaryButton,
  Screen,
  ScreenHeader,
  StatPill,
  TraceText,
} from '@/components/ui';
import {
  deleteTrace,
  getPoints,
  getTrace,
  listRewards,
  updateTrace,
  type Reward,
  type Trace,
  type TracePoint,
} from '@/lib/db';
import {
  computeSplits,
  elevationGainM,
  formatDistance,
  formatDuration,
  formatElevation,
  formatSpeed,
  MILE_M,
  pathDistanceM,
  type Units,
} from '@/lib/geo';
import { buildGpx } from '@/lib/gpx';
import { i18n } from '@/lib/i18n';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';
import { getUnits } from '@/lib/units';
import * as ImagePicker from 'expo-image-picker';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#151515' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#232323' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
];

const SLOW_COLOR = '#F87171';
const FAST_COLOR = '#34D399';

function lerpColor(from: string, to: string, ratio: number) {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * ratio);
  return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`;
}

function speedColor(speed: number, maxSpeed: number) {
  if (maxSpeed <= 0) {
    return FAST_COLOR;
  }
  return lerpColor(SLOW_COLOR, FAST_COLOR, Math.min(1, speed / maxSpeed));
}

interface Segment {
  coordinates: { latitude: number; longitude: number }[];
  color: string;
}

function buildSegments(points: TracePoint[], maxSpeed: number): Segment[] {
  const segments: Segment[] = [];
  const maxSegments = 120;
  const groupSize = Math.max(1, Math.ceil(points.length / maxSegments));

  for (let index = 0; index < points.length - 1; index += groupSize) {
    const group = points.slice(index, Math.min(index + groupSize + 1, points.length));
    const speeds = group.map((point) => point.speed ?? 0);
    const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / Math.max(1, speeds.length);
    segments.push({
      coordinates: group.map((point) => ({ latitude: point.lat, longitude: point.lng })),
      color: speedColor(avgSpeed, maxSpeed),
    });
  }

  return segments;
}

function rewardLabel(code: string, t: (key: string, params?: Record<string, string>) => string) {
  if (code.startsWith('distance-')) {
    const meters = Number(code.slice(9));
    if (Number.isFinite(meters) && meters > 0) {
      return meters >= 1000
        ? t('reward.milestoneKm', { kilometers: String(meters / 1000) })
        : t('reward.milestoneMeters', { meters: String(meters) });
    }
  }
  if (code === 'loop') {
    return t('reward.loop');
  }
  if (code.startsWith('streak-')) {
    return t('reward.streak', { days: code.slice(7) });
  }
  if (code.startsWith('challenge-')) {
    return t('reward.weeklyChallenge');
  }
  if (code.startsWith('store-')) {
    return t('reward.storeTreat');
  }
  return code;
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const traceId = Number(id);
  const { t, locale } = useLanguage();
  const { colors } = useTheme();

  const [trace, setTrace] = useState<Trace | null>(null);
  const [points, setPoints] = useState<TracePoint[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [units, setUnits] = useState<Units>('metric');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const shareCardRef = useRef<View>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(traceId)) {
      return;
    }
    const [loadedTrace, loadedPoints, loadedRewards, loadedUnits] = await Promise.all([
      getTrace(traceId),
      getPoints(traceId),
      listRewards(),
      getUnits(),
    ]);
    setTrace(loadedTrace);
    setPoints(loadedPoints);
    setRewards(loadedRewards.filter((reward) => reward.traceId === traceId));
    setUnits(loadedUnits);
    setNameDraft(loadedTrace?.name ?? '');
    setNoteDraft(loadedTrace?.note ?? '');
  }, [traceId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const distance = pathDistanceM(points);
  const durationMs = trace?.durationMs ?? 0;
  const avgSpeedMps = durationMs > 0 ? distance / (durationMs / 1000) : 0;
  const maxSpeed = trace?.maxSpeedMps ?? points.reduce((max, point) => Math.max(max, point.speed ?? 0), 0);
  const splits = useMemo(() => computeSplits(points, units === 'imperial' ? MILE_M : undefined), [points, units]);
  const elevationGain = useMemo(() => elevationGainM(points), [points]);
  const maxAltitude = points.reduce((max, point) => Math.max(max, point.altitude ?? 0), 0);

  const region: Region | null = useMemo(() => {
    if (points.length === 0) {
      return null;
    }
    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.005, (maxLat - minLat) * 1.4),
      longitudeDelta: Math.max(0.005, (maxLng - minLng) * 1.4),
    };
  }, [points]);

  const segments = useMemo(() => buildSegments(points, maxSpeed), [points, maxSpeed]);

  const elevationPoints = useMemo(() => points.filter((point) => point.altitude !== null), [points]);
  const elevationRange = useMemo(() => {
    if (elevationPoints.length === 0) {
      return { min: 0, max: 0 };
    }
    const altitudes = elevationPoints.map((point) => point.altitude ?? 0);
    return { min: Math.min(...altitudes), max: Math.max(...altitudes) };
  }, [elevationPoints]);
  const replayPoint = replayIndex !== null && replayIndex < points.length ? points[replayIndex] : null;
  const weatherJson = trace?.weather ?? null;
  const weather = useMemo<{ tempC: number; conditionKey: string } | null>(() => {
    if (!weatherJson) {
      return null;
    }
    try {
      return JSON.parse(weatherJson) as { tempC: number; conditionKey: string };
    } catch {
      return null;
    }
  }, [weatherJson]);

  useEffect(() => {
    if (replayIndex === null || points.length === 0) {
      return;
    }
    const timeout = setTimeout(() => {
      setReplayIndex((index) => {
        if (index === null || index >= points.length - 1) {
          return null;
        }
        return index + 1;
      });
    }, 40);
    return () => clearTimeout(timeout);
  }, [replayIndex, points.length]);

  const handleSaveName = async () => {
    if (trace) {
      await updateTrace(trace.id, { name: nameDraft.trim() || trace.name });
      setEditingName(false);
      await load();
    }
  };

  const handleSaveNote = async () => {
    if (trace) {
      await updateTrace(trace.id, { note: noteDraft.trim() || null });
      setEditingNote(false);
      await load();
    }
  };

  const handleDelete = () => {
    Alert.alert(t('trip.deleteConfirmTitle'), t('trip.deleteConfirmMessage'), [
      { text: t('trip.cancel'), style: 'cancel' },
      {
        text: t('trip.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteTrace(traceId);
          router.back();
        },
      },
    ]);
  };

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0] && trace) {
      await updateTrace(trace.id, { photoUri: result.assets[0].uri });
      await load();
    }
  };

  const handleShare = async () => {
    if (!shareCardRef.current) {
      return;
    }
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('trip.share') });
      }
    } catch {
      // Sharing is best-effort.
    }
  };

  const handleExportGpx = async () => {
    if (!trace) {
      return;
    }
    try {
      const gpx = buildGpx(points, trace.name);
      const file = new File(Paths.cache, `trace-${trace.id}.gpx`);
      file.write(gpx);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/gpx+xml' });
      }
    } catch {
      // Export is best-effort.
    }
  };

  if (!trace) {
    return (
      <Screen contentClassName="flex-1 pb-gutter" edges={['top', 'right', 'left']}>
        <ScreenHeader backAction={() => router.back()} title={t('trips.title')} />
        <View className="flex-1 justify-center">
          <EmptyState title={t('trips.emptyTitle')} message={t('trips.emptyMessage')} />
        </View>
      </Screen>
    );
  }

  const date = new Date(trace.startedAt).toLocaleDateString(locale === 'fa' ? 'fa-IR-u-nu-latn' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Screen contentClassName="flex-1 pb-gutter" edges={['top', 'right', 'left']}>
      <ScreenHeader
        backAction={() => router.back()}
        title={editingName ? t('trip.rename') : trace.name}
        trailingAction={
          <View className="flex-row gap-2">
            <IconButton
              accessibilityLabel={editingName ? t('trip.save') : t('trip.rename')}
              icon={
                <SymbolView
                  name={{ android: 'check', ios: 'checkmark', web: 'check' }}
                  size={18}
                  tintColor={colors.text}
                />
              }
              onPress={() => (editingName ? void handleSaveName() : setEditingName(true))}
            />
            <IconButton
              accessibilityLabel={t('trip.delete')}
              icon={
                <SymbolView
                  name={{ android: 'delete', ios: 'trash', web: 'delete' }}
                  size={18}
                  tintColor={colors.danger}
                />
              }
              onPress={handleDelete}
            />
          </View>
        }
      />

      {editingName ? (
        <View className="px-gutter pb-2">
          <TextInput
            accessibilityLabel={t('trip.rename')}
            autoFocus
            defaultValue={trace.name}
            onBlur={() => setEditingName(false)}
            onChangeText={setNameDraft}
            onSubmitEditing={() => void handleSaveName()}
            placeholder={t('trip.rename')}
            placeholderTextColor={colors.textDim}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 12,
              color: colors.text,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
            }}
          />
        </View>
      ) : null}

      <ScrollView className="flex-1" contentContainerClassName="gap-card pb-8">
        {region ? (
          <View className="h-56 overflow-hidden">
            <MapCanvas
              accessibilityLabel={trace.name}
              darkStyle={DARK_MAP_STYLE}
              initialRegion={region}
              interactive={false}
              markers={[
                {
                  key: 'start',
                  coordinate: segments[0]?.coordinates[0] ?? {
                    latitude: region.latitude,
                    longitude: region.longitude,
                  },
                  color: FAST_COLOR,
                },
                {
                  key: 'finish',
                  coordinate:
                    segments[segments.length - 1]?.coordinates.slice(-1)[0] ?? {
                      latitude: region.latitude,
                      longitude: region.longitude,
                    },
                  color: SLOW_COLOR,
                },
                ...(replayPoint
                  ? [
                      {
                        key: 'replay',
                        coordinate: { latitude: replayPoint.lat, longitude: replayPoint.lng },
                        color: colors.accent,
                      },
                    ]
                  : []),
              ]}
              muted
              polylines={segments.map((segment, index) => ({
                key: `segment-${index}`,
                coordinates: segment.coordinates,
                color: segment.color,
                width: 5,
              }))}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <View className="h-44">
            <Card className="h-full items-center justify-center">
              <TraceText tone="dim" variant="caption">
                {date}
              </TraceText>
            </Card>
          </View>
        )}

        <View className="px-gutter">
          <Card className="gap-3">
            {editingName ? (
              <TraceText variant="body" tone="dim">
                {date}
              </TraceText>
            ) : (
              <TraceText tone="dim" variant="caption">
                {date}
              </TraceText>
            )}
            <View className="flex-row flex-wrap gap-x-6 gap-y-3">
              <StatPill label={t('trace.distance')} value={formatDistance(distance, units)} />
              <StatPill label={t('trace.duration')} value={formatDuration(durationMs)} />
              <StatPill label={t('trip.avgSpeed')} value={formatSpeed(avgSpeedMps, units)} />
              <StatPill label={t('trip.maxSpeed')} value={formatSpeed(maxSpeed, units)} />
              <StatPill label={t('trace.calories')} value={String(trace.calories)} />
              <StatPill
                label={t('trip.elevationGain')}
                value={formatElevation(elevationGain, units)}
              />
            </View>

            {Platform.OS !== 'web' ? (
              <PrimaryButton
                label={replayIndex !== null ? t('trip.stop') : t('trip.replay')}
                onPress={() => setReplayIndex(replayIndex !== null ? null : 0)}
              />
            ) : null}

            {weather ? (
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <SymbolView
                    name={{ android: 'cloud', ios: 'cloud.fill', web: 'cloud' }}
                    size={20}
                    tintColor={colors.textDim}
                  />
                  <TraceText variant="body" tone="dim">
                    {t('trip.weather')}: {t(`trip.weatherConditions.${weather.conditionKey}`)}
                  </TraceText>
                </View>
                <TraceText variant="heading">{`${weather.tempC}°`}</TraceText>
              </View>
            ) : null}

            {editingNote ? (
              <View className="gap-2">
                <TextInput
                  accessibilityLabel={t('trip.editNote')}
                  multiline
                  onChangeText={setNoteDraft}
                  placeholder={t('trip.notePlaceholder')}
                  placeholderTextColor={colors.textDim}
                  value={noteDraft}
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    color: colors.text,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                />
                <View className="flex-row gap-2">
                  <PrimaryButton
                    label={t('trip.cancel')}
                    onPress={() => {
                      setNoteDraft(trace.note ?? '');
                      setEditingNote(false);
                    }}
                    size="small"
                  />
                  <PrimaryButton
                    label={t('trip.save')}
                    onPress={() => void handleSaveNote()}
                    size="small"
                  />
                </View>
              </View>
            ) : (
              <View className="gap-2">
                {trace.note ? (
                  <TraceText tone="dim" variant="body">
                    {trace.note}
                  </TraceText>
                ) : null}
                <PrimaryButton
                  className="self-start"
                  label={trace.note ? t('trip.editNote') : t('trip.notePlaceholder')}
                  onPress={() => {
                    setNoteDraft(trace.note ?? '');
                    setEditingNote(true);
                  }}
                  size="small"
                />
              </View>
            )}
          </Card>
        </View>

        {trace.photoUri ? (
          <View className="px-gutter">
            <Image
              accessibilityLabel={t('trip.photo')}
              contentFit="cover"
              source={{ uri: trace.photoUri }}
              style={{ height: 180, borderRadius: 16, width: '100%' }}
            />
          </View>
        ) : null}

        <View className="flex-row px-gutter gap-3">
          <PrimaryButton
            className="flex-1"
            label={t('trip.addPhoto')}
            onPress={() => void handleAddPhoto()}
            size="small"
          />
          <PrimaryButton
            className="flex-1"
            label={t('trip.share')}
            onPress={() => void handleShare()}
            size="small"
          />
          <PrimaryButton
            className="flex-1"
            label={t('settings.exportGpx')}
            onPress={() => void handleExportGpx()}
            size="small"
          />
        </View>

        {splits.length > 0 ? (
          <View className="px-gutter">
            <Card className="gap-2">
              <TraceText variant="label" tone="dim">
                {t('trip.splits')}
              </TraceText>
              <View className="flex-row flex-wrap gap-x-6 gap-y-2">
                {splits.map((split) => (
                  <View key={split.km} className="gap-1">
                    <TraceText variant="caption" tone="dim">
                      {`${split.km} ${units === 'imperial' ? 'mi' : 'km'}`}
                    </TraceText>
                    <TraceText variant="body">{formatDuration(split.splitMs)}</TraceText>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        {points.length > 0 && maxAltitude > 0 ? (
          <View className="px-gutter">
            <Card className="gap-2">
              <TraceText variant="label" tone="dim">
                {t('trip.elevation')}
              </TraceText>
              <View className="h-24 w-full">
                <Svg height="100%" width="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <SvgPolyline
                    fill="none"
                    points={elevationPoints
                      .map((point, index) => {
                        const x = (index / Math.max(1, elevationPoints.length - 1)) * 100;
                        const y =
                          elevationRange.max > elevationRange.min
                            ? 90 - (((point.altitude ?? 0) - elevationRange.min) / (elevationRange.max - elevationRange.min)) * 80
                            : 50;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                    stroke={colors.accent}
                    strokeWidth={2}
                    opacity={0.9}
                  />
                </Svg>
              </View>
              <View className="flex-row justify-between">
                <TraceText variant="caption" tone="dim">
                  {t('trip.elevationGain')}: {formatElevation(elevationGain, units)}
                </TraceText>
                <TraceText variant="caption" tone="dim">
                  {formatElevation(maxAltitude, units)}
                </TraceText>
              </View>
            </Card>
          </View>
        ) : null}

        {rewards.length > 0 ? (
          <View className="px-gutter">
            <Card className="gap-2">
              <TraceText variant="label" tone="dim">
                {t('trip.milestones')}
              </TraceText>
              <View className="flex-row flex-wrap gap-2">
                {rewards.map((reward) => (
                  <Badge key={reward.id} label={rewardLabel(reward.code, i18n.t)} tone="accent" />
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        <View
          ref={shareCardRef}
          collapsable={false}
          style={{ backgroundColor: colors.background, paddingHorizontal: 16 }}>
          <Card className="items-center gap-3">
            <TraceText variant="label" tone="dim">
              {t('trip.shareCardTagline')}
            </TraceText>
            <TraceText accessibilityRole="header" variant="display" style={{ fontSize: 40 }}>
              {formatDistance(distance, units)}
            </TraceText>
            <View className="flex-row gap-6">
              <StatPill label={t('trace.duration')} value={formatDuration(durationMs)} />
              <StatPill label={t('trace.calories')} value={String(trace.calories)} />
            </View>
            <TraceText variant="caption" tone="dim">
              {date}
            </TraceText>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
