import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import {
  Card,
  PrimaryButton,
  Screen,
  ScreenHeader,
  TraceText,
} from '@/components/ui';
import { useTraces } from '@/hooks/use-traces';
import {
  getGoal,
  listRewards,
  saveGoal,
  type Goal,
  type Reward,
} from '@/lib/db';
import { computeWeeklyStats } from '@/lib/stats';
import { formatDistance, type Units } from '@/lib/geo';
import { i18n } from '@/lib/i18n';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';
import { getUnits } from '@/lib/units';

interface CatalogItem {
  code: string;
  icon: { ios: string; android: string; web: string };
  labelKey: string;
  params: Record<string, string>;
}

const REWARD_CATALOG = [
  { code: 'distance-300', icon: { ios: 'star.fill', android: 'star', web: 'star' }, labelKey: 'reward.milestoneMeters', params: { meters: '300' } },
  { code: 'distance-1000', icon: { ios: 'star.fill', android: 'star', web: 'star' }, labelKey: 'reward.milestoneKm', params: { kilometers: '1' } },
  { code: 'distance-2000', icon: { ios: 'star.fill', android: 'star', web: 'star' }, labelKey: 'reward.milestoneKm', params: { kilometers: '2' } },
  { code: 'distance-5000', icon: { ios: 'star.fill', android: 'star', web: 'star' }, labelKey: 'reward.milestoneKm', params: { kilometers: '5' } },
  { code: 'distance-10000', icon: { ios: 'star.fill', android: 'star', web: 'star' }, labelKey: 'reward.milestoneKm', params: { kilometers: '10' } },
  { code: 'loop', icon: { ios: 'arrow.3.trianglepath', android: 'loop', web: 'loop' }, labelKey: 'reward.loop', params: {} },
  { code: 'streak-2', icon: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }, labelKey: 'reward.streak', params: { days: '2' } },
  { code: 'streak-7', icon: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }, labelKey: 'reward.streak', params: { days: '7' } },
  { code: 'challenge-weekly', icon: { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }, labelKey: 'reward.weeklyChallenge', params: {} },
  { code: 'store-treat', icon: { ios: 'gift.fill', android: 'card_giftcard', web: 'card_giftcard' }, labelKey: 'reward.storeTreat', params: {} },
] as const satisfies CatalogItem[];

export default function GoalsScreen() {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const { traces } = useTraces();

  const [dailyGoal, setDailyGoal] = useState<Goal | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<Goal | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [units, setUnits] = useState<Units>('metric');
  const [editing, setEditing] = useState<'daily' | 'weekly' | null>(null);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    const [daily, weekly, loadedRewards, loadedUnits] = await Promise.all([
      getGoal('daily'),
      getGoal('weekly'),
      listRewards(),
      getUnits(),
    ]);
    setDailyGoal(daily);
    setWeeklyGoal(weekly);
    setRewards(loadedRewards);
    setUnits(loadedUnits);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (traces !== null) {
        void load();
      }
    }, [load, traces]),
  );

  const weekly = traces ? computeWeeklyStats(traces, locale === 'fa' ? 'fa-IR-u-nu-latn' : 'en-US') : null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayDistanceM = traces
    ? traces
        .filter((trace) => trace.status === 'completed' && trace.startedAt >= todayStart.getTime())
        .reduce((sum, trace) => sum + trace.distanceM, 0)
    : 0;

  const earnedCodes = new Set(rewards.map((reward) => reward.code));
  const hasReward = (item: CatalogItem) => {
    if (item.code === 'challenge-weekly') {
      return rewards.some((reward) => reward.code.startsWith('challenge-'));
    }
    if (item.code === 'store-treat') {
      return rewards.some((reward) => reward.code.startsWith('store-'));
    }
    return earnedCodes.has(item.code);
  };

  const openEditor = (period: 'daily' | 'weekly') => {
    const goal = period === 'daily' ? dailyGoal : weeklyGoal;
    setDraft(goal ? String(goal.targetM / 1000) : '');
    setEditing(period);
  };

  const handleSave = async () => {
    if (!editing) {
      return;
    }
    const km = Number(draft);
    if (Number.isFinite(km) && km > 0) {
      await saveGoal(editing, Math.round(km * 1000));
      await load();
    }
    setEditing(null);
  };

  const dailyProgress = dailyGoal ? todayDistanceM / dailyGoal.targetM : 0;
  const weeklyProgress = weeklyGoal && weeklyGoal.targetM > 0 ? (weekly?.distanceM ?? 0) / weeklyGoal.targetM : 0;
  const weeklyChallengeDone = (weekly?.distanceM ?? 0) >= 5000;

  return (
    <Screen contentClassName="flex-1 pb-gutter" edges={['top', 'right', 'left']}>
      <ScreenHeader subtitle={t('goals.subtitle')} title={t('goals.title')} />

      <ScrollView className="flex-1" contentContainerClassName="gap-card px-gutter pb-8 pt-2">
        <Card className="gap-2">
          <View className="flex-row items-center justify-between">
            <TraceText variant="label" tone="dim">
              {t('goals.daily')}
            </TraceText>
            <PrimaryButton
              label={dailyGoal ? formatDistance(dailyGoal.targetM, units) : t('goals.tapToSet')}
              onPress={() => openEditor('daily')}
              size="small"
            />
          </View>
          <View className="flex-row items-baseline gap-2">
            <TraceText variant="heading">
              {formatDistance(todayDistanceM, units)}
            </TraceText>
            {dailyGoal ? (
              <TraceText tone="dim" variant="caption">
                / {formatDistance(dailyGoal.targetM, units)}
              </TraceText>
            ) : (
              <TraceText tone="dim" variant="caption">
                {t('goals.noGoal')}
              </TraceText>
            )}
          </View>
          {dailyGoal ? (
            <View className="h-2 w-full overflow-hidden rounded-pill" style={{ backgroundColor: colors.accentDim }}>
              <View
                className="h-full rounded-pill"
                style={{
                  backgroundColor: colors.accent,
                  width: `${Math.min(100, dailyProgress * 100)}%`,
                }}
              />
            </View>
          ) : null}
        </Card>

        <Card className="gap-2">
          <View className="flex-row items-center justify-between">
            <TraceText variant="label" tone="dim">
              {t('goals.weekly')}
            </TraceText>
            <PrimaryButton
              label={weeklyGoal ? formatDistance(weeklyGoal.targetM, units) : t('goals.tapToSet')}
              onPress={() => openEditor('weekly')}
              size="small"
            />
          </View>
          <View className="flex-row items-baseline gap-2">
            <TraceText variant="heading">
              {formatDistance(weekly?.distanceM ?? 0, units)}
            </TraceText>
            {weeklyGoal ? (
              <TraceText tone="dim" variant="caption">
                / {formatDistance(weeklyGoal.targetM, units)}
              </TraceText>
            ) : (
              <TraceText tone="dim" variant="caption">
                {t('goals.noGoal')}
              </TraceText>
            )}
          </View>
          {weeklyGoal ? (
            <View className="h-2 w-full overflow-hidden rounded-pill" style={{ backgroundColor: colors.accentDim }}>
              <View
                className="h-full rounded-pill"
                style={{
                  backgroundColor: colors.accent,
                  width: `${Math.min(100, weeklyProgress * 100)}%`,
                }}
              />
            </View>
          ) : null}
        </Card>

        <Card className="gap-2">
          <TraceText variant="label" tone="dim">
            {t('goals.challenges')}
          </TraceText>
          <View className="flex-row items-center gap-3">
            <SymbolView
              name={{ android: 'emoji_events', ios: 'trophy.fill', web: 'emoji_events' }}
              size={24}
              tintColor={weeklyChallengeDone ? colors.accent : colors.textDim}
            />
            <View className="flex-1 gap-1">
              <TraceText variant="body">
                {t('goals.weeklyChallenge')}
                {weeklyChallengeDone ? ` · ${t('goals.completed')}` : ''}
              </TraceText>
              <View className="h-2 w-full overflow-hidden rounded-pill" style={{ backgroundColor: colors.accentDim }}>
                <View
                  className="h-full rounded-pill"
                  style={{
                    backgroundColor: colors.accent,
                    width: `${Math.min(100, ((weekly?.distanceM ?? 0) / 5000) * 100)}%`,
                  }}
                />
              </View>
            </View>
            <TraceText tone="dim" variant="caption">
              {formatDistance(Math.min(weekly?.distanceM ?? 0, 5000), units)} / {formatDistance(5000, units)}
            </TraceText>
          </View>
        </Card>

        <View className="gap-2">
          <TraceText variant="label" tone="dim">
            {t('goals.rewards')}
          </TraceText>
          {rewards.length === 0 ? (
            <Card>
              <TraceText className="text-center" tone="dim" variant="body">
                {t('goals.noRewards')}
              </TraceText>
            </Card>
          ) : (
            <Card className="flex-row flex-wrap gap-3">
              {REWARD_CATALOG.map((item) => {
                const earned = hasReward(item);
                return (
                  <View
                    key={item.code}
                    className="items-center gap-2"
                    style={earned ? undefined : { opacity: 0.3 }}>
                    <View
                      className="h-12 w-12 items-center justify-center rounded-pill"
                      style={{ backgroundColor: colors.accentDim }}>
                      <SymbolView
                        name={item.icon}
                        size={22}
                        tintColor={earned ? colors.accent : colors.textDim}
                      />
                    </View>
                    <TraceText variant="caption" tone={earned ? 'default' : 'dim'}>
                      {i18n.t(item.labelKey, item.params)}
                    </TraceText>
                  </View>
                );
              })}
            </Card>
          )}
        </View>
      </ScrollView>

      {editing ? (
        <View className="absolute inset-0 items-center justify-center bg-black/60 px-gutter">
          <Card className="w-full gap-3">
            <TraceText accessibilityRole="header" variant="heading">
              {t('goals.setGoalTitle')}
            </TraceText>
            <TextInput
              accessibilityLabel={t('goals.distanceInKm')}
              keyboardType="decimal-pad"
              onChangeText={setDraft}
              placeholder={t('goals.distanceInKm')}
              placeholderTextColor={colors.textDim}
              value={draft}
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
            <View className="flex-row gap-3">
              <PrimaryButton
                className="flex-1"
                label={t('goals.cancel')}
                onPress={() => setEditing(null)}
              />
              <PrimaryButton
                className="flex-1"
                label={t('goals.save')}
                onPress={() => void handleSave()}
              />
            </View>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
