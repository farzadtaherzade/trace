import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import {
  Card,
  EmptyState,
  IconButton,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SegmentedControl,
  TraceText,
  TripRowWithData,
} from '@/components/ui';
import { useTraces } from '@/hooks/use-traces';
import {
  createTrace,
  currentWeekKey,
  listTraces,
  updateTrace,
  upsertChallengeProgress,
  type ActivityType,
  type Trace,
} from '@/lib/db';
import { formatDistance, formatDuration, type Units } from '@/lib/geo';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';
import { useTracking } from '@/providers/tracking-provider';
import { startOfWeek } from '@/lib/stats';
import { getUnits } from '@/lib/units';

const ACTIVITY_TYPES: ActivityType[] = ['run', 'walk', 'cycle', 'drive'];
const WEEKLY_CHALLENGE_TARGET_M = 5000;

export default function TripsScreen() {
  const { t, locale, isRTL } = useLanguage();
  const { colors } = useTheme();
  const { traces, reload } = useTraces();
  const { resumeTrace, archiveTrace } = useTracking();

  const [units, setUnits] = useState<Units>('metric');
  const [query, setQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<ActivityType | 'all'>('all');

  const [manualOpen, setManualOpen] = useState(false);
  const [manualActivity, setManualActivity] = useState<ActivityType>('run');
  const [manualName, setManualName] = useState('');
  const [manualDistance, setManualDistance] = useState('');
  const [manualDuration, setManualDuration] = useState('');

  useFocusEffect(
    useCallback(() => {
      void getUnits().then(setUnits);
    }, []),
  );

  const matchesFilter = useCallback(
    (trace: Trace) => {
      if (activityFilter !== 'all' && trace.activityType !== activityFilter) {
        return false;
      }
      const needle = query.trim().toLowerCase();
      if (needle && !trace.name.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    },
    [activityFilter, query],
  );

  const completed = (traces ?? []).filter((trace) => trace.status === 'completed' && matchesFilter(trace));
  const unfinished = (traces ?? []).filter((trace) => trace.status !== 'completed' && matchesFilter(trace));
  const hasTraces = (traces?.length ?? 0) > 0;

  const handleResume = async (id: number) => {
    const resumed = await resumeTrace(id);
    if (resumed) {
      router.push('/trace');
    }
  };

  const handleArchive = async (id: number) => {
    await archiveTrace(id);
  };

  const closeManualEntry = () => {
    setManualOpen(false);
    setManualName('');
    setManualDistance('');
    setManualDuration('');
  };

  const handleManualSave = async () => {
    const km = Number(manualDistance.replace(',', '.'));
    const minutes = Number(manualDuration);
    if (!Number.isFinite(km) || km <= 0 || !Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert(t('trips.manualTitle'), t('trips.manualInvalid'));
      return;
    }

    const distanceM = Math.round(km * 1000);
    const durationMs = Math.round(minutes * 60 * 1000);
    const endedAt = Date.now();
    const startedAt = endedAt - durationMs;
    const name =
      manualName.trim() ||
      `${t(`activity.${manualActivity}.label`)} · ${new Date(startedAt).toLocaleString()}`;

    const id = await createTrace(name, manualActivity);
    await updateTrace(id, {
      status: 'completed',
      startedAt,
      endedAt,
      distanceM,
      durationMs,
      pointsCount: 0,
    });

    const weekKey = currentWeekKey();
    const allTraces = await listTraces();
    const weekStart = startOfWeek().getTime();
    const weekDistanceM = allTraces
      .filter((trace) => trace.status === 'completed' && trace.startedAt >= weekStart)
      .reduce((sum, trace) => sum + trace.distanceM, 0);
    await upsertChallengeProgress(`weekly-distance-${weekKey}`, WEEKLY_CHALLENGE_TARGET_M, weekDistanceM, weekKey);

    closeManualEntry();
    await reload();
  };

  return (
    <Screen contentClassName="flex-1 pb-gutter" edges={['top', 'right', 'left']}>
      <ScreenHeader
        subtitle={t('trips.subtitle')}
        title={t('trips.title')}
        trailingAction={
          <IconButton
            accessibilityLabel={t('trips.addManual')}
            icon={
              <SymbolView
                name={{ android: 'add', ios: 'plus', web: 'add' }}
                size={20}
                tintColor={colors.text}
              />
            }
            onPress={() => setManualOpen(true)}
          />
        }
      />

      {traces === null ? (
        <View className="flex-1 items-center justify-center">
          <SymbolView name={{ android: 'bookmarks', ios: 'bookmark', web: 'bookmarks' }} size={28} tintColor={colors.accent} />
        </View>
      ) : !hasTraces ? (
        <View className="flex-1 justify-center pb-section">
          <EmptyState
            icon={
              <SymbolView
                name={{ android: 'bookmarks', ios: 'bookmark', web: 'bookmarks' }}
                size={28}
                tintColor={colors.accent}
              />
            }
            message={t('trips.emptyMessage')}
            title={t('trips.emptyTitle')}
          />
        </View>
      ) : (
        <View className="flex-1 items-start gap-card pt-2">
          <View className="w-full gap-2 px-gutter">
            <TextInput
              accessibilityLabel={t('trips.searchPlaceholder')}
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder={t('trips.searchPlaceholder')}
              placeholderTextColor={colors.textDim}
              value={query}
              style={inputStyle(colors, isRTL)}
            />
            <SegmentedControl<ActivityType | 'all'>
              accessibilityLabel={t('trips.title')}
              onChange={setActivityFilter}
              options={[
                { label: t('trips.filterAll'), value: 'all' },
                ...ACTIVITY_TYPES.map((type) => ({
                  label: t(`activity.${type}.label`),
                  value: type,
                })),
              ]}
              value={activityFilter}
            />
          </View>

          {completed.length === 0 && unfinished.length === 0 ? (
            <View className="w-full justify-center pb-section">
              <EmptyState
                icon={
                  <SymbolView
                    name={{ android: 'search_off', ios: 'magnifyingglass', web: 'search_off' }}
                    size={28}
                    tintColor={colors.accent}
                  />
                }
                message={t('trips.noMatches')}
                title={t('trips.searchPlaceholder')}
              />
            </View>
          ) : null}

          {completed.length > 0 ? (
            <View className="w-full gap-2 px-gutter">
              {completed.map((trace) => (
                <TripRowWithData
                  key={trace.id}
                  trace={trace}
                  onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trace.id } })}
                />
              ))}
            </View>
          ) : null}

          {unfinished.length > 0 ? (
            <View className="w-full gap-2 px-gutter">
              <TraceText variant="label" tone="dim">
                {t('trips.unfinished')}
              </TraceText>
              {unfinished.map((trace) => {
                const archived = trace.status === 'archived';
                const date = new Date(trace.startedAt).toLocaleDateString(
                  locale === 'fa' ? 'fa-IR-u-nu-latn' : 'en-US',
                  { month: 'short', day: 'numeric' },
                );

                return (
                  <Card key={trace.id} className="gap-3">
                    <TripRowWithData
                      trace={trace}
                      onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trace.id } })}
                    />
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="gap-1">
                        <TraceText variant="caption" tone="dim">
                          {date} · {formatDistance(trace.distanceM, units)} · {formatDuration(trace.durationMs)}
                        </TraceText>
                      </View>
                      {archived ? null : (
                        <View className="flex-row gap-2">
                          <PrimaryButton
                            label={t('trips.resume')}
                            onPress={() => void handleResume(trace.id)}
                            size="small"
                          />
                          <PrimaryButton
                            label={t('trips.markIncomplete')}
                            onPress={() => void handleArchive(trace.id)}
                            size="small"
                          />
                        </View>
                      )}
                    </View>
                  </Card>
                );
              })}
            </View>
          ) : null}
        </View>
      )}

      {manualOpen ? (
        <View className="absolute inset-0 items-center justify-center bg-black/60 px-gutter">
          <Card className="w-full gap-3">
            <TraceText accessibilityRole="header" variant="heading">
              {t('trips.manualTitle')}
            </TraceText>
            <SegmentedControl<ActivityType>
              accessibilityLabel={t('trips.manualTitle')}
              onChange={setManualActivity}
              options={ACTIVITY_TYPES.map((type) => ({
                label: t(`activity.${type}.label`),
                value: type,
              }))}
              value={manualActivity}
            />
            <TextInput
              accessibilityLabel={t('trips.manualName')}
              onChangeText={setManualName}
              placeholder={t('trips.manualName')}
              placeholderTextColor={colors.textDim}
              value={manualName}
              style={inputStyle(colors, isRTL)}
            />
            <TextInput
              accessibilityLabel={t('trips.manualDistance')}
              keyboardType="decimal-pad"
              onChangeText={setManualDistance}
              placeholder={t('trips.manualDistance')}
              placeholderTextColor={colors.textDim}
              value={manualDistance}
              style={inputStyle(colors, isRTL)}
            />
            <TextInput
              accessibilityLabel={t('trips.manualDuration')}
              keyboardType="number-pad"
              onChangeText={setManualDuration}
              placeholder={t('trips.manualDuration')}
              placeholderTextColor={colors.textDim}
              value={manualDuration}
              style={inputStyle(colors, isRTL)}
            />
            <View className="flex-row gap-3">
              <PrimaryButton
                className="flex-1"
                label={t('trip.cancel')}
                onPress={closeManualEntry}
              />
              <PrimaryButton
                className="flex-1"
                label={t('trip.save')}
                onPress={() => void handleManualSave()}
              />
            </View>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

function inputStyle(
  colors: { card: string; border: string; text: string; textDim: string },
  isRTL: boolean,
) {
  return {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: isRTL ? ('right' as const) : ('left' as const),
  };
}
