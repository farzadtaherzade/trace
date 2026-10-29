import { Alert, Platform, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  Badge,
  Card,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SegmentedControl,
  TraceText,
} from '@/components/ui';
import { clearAllData, exportAllJson } from '@/lib/db';
import { useLanguage, type LanguageMode } from '@/providers/language-provider';
import { useTheme, type ThemeMode } from '@/providers/theme-provider';
import { getUnits, setUnits } from '@/lib/units';
import type { Units } from '@/lib/geo';
import { useEffect, useState } from 'react';

export default function SettingsScreen() {
  const { t, language, setLanguage } = useLanguage();
  const { mode, setMode } = useTheme();
  const [units, setUnitsState] = useState<Units>('metric');

  useEffect(() => {
    void getUnits().then(setUnitsState);
  }, []);

  const handleExportJson = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(t('settings.exportJson'), t('settings.exportUnsupported'));
      return;
    }

    try {
      const json = await exportAllJson();
      const file = new File(Paths.cache, 'trace-backup.json');
      file.write(json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
        return;
      }
      Alert.alert(t('settings.exportJson'), t('settings.exportSuccess'));
    } catch {
      Alert.alert(t('settings.exportJson'), t('settings.exportFailed'));
    }
  };

  const handleClearAll = () => {
    Alert.alert(t('settings.clearConfirmTitle'), t('settings.clearConfirmMessage'), [
      { text: t('trip.cancel'), style: 'cancel' },
      {
        text: t('settings.clearAll'),
        style: 'destructive',
        onPress: () => void clearAllData(),
      },
    ]);
  };

  return (
    <Screen contentClassName="flex-1 pb-gutter" edges={['top', 'right', 'left']}>
      <ScreenHeader title={t('settings.title')} />
      <View className="flex-1 items-start gap-card pt-2">
        <Card className="w-full gap-3">
          <TraceText variant="label" tone="dim">
            {t('settings.theme')}
          </TraceText>
          <SegmentedControl<ThemeMode>
            accessibilityLabel={t('settings.theme')}
            onChange={(value) => void setMode(value)}
            options={[
              { label: t('settings.themeSystem'), value: 'system' },
              { label: t('settings.themeDark'), value: 'dark' },
              { label: t('settings.themeLight'), value: 'light' },
            ]}
            value={mode}
          />
        </Card>

        <Card className="w-full gap-3">
          <TraceText variant="label" tone="dim">
            {t('settings.language')}
          </TraceText>
          <SegmentedControl<LanguageMode>
            accessibilityLabel={t('settings.language')}
            onChange={(value) => void setLanguage(value)}
            options={[
              { label: t('settings.languageSystem'), value: 'system' },
              { label: t('settings.languageEn'), value: 'en' },
              { label: t('settings.languageFa'), value: 'fa' },
            ]}
            value={language}
          />
        </Card>

        <Card className="w-full gap-3">
          <TraceText variant="label" tone="dim">
            {t('settings.units')}
          </TraceText>
          <SegmentedControl<Units>
            accessibilityLabel={t('settings.units')}
            onChange={(value) => {
              setUnitsState(value);
              void setUnits(value);
            }}
            options={[
              { label: t('settings.unitsMetric'), value: 'metric' },
              { label: t('settings.unitsImperial'), value: 'imperial' },
            ]}
            value={units}
          />
        </Card>

        <Card className="w-full gap-3">
          <TraceText variant="label" tone="dim">
            {t('settings.data')}
          </TraceText>
          <PrimaryButton
            className="w-full"
            label={t('settings.exportJson')}
            onPress={() => void handleExportJson()}
            size="small"
          />
          <PrimaryButton
            className="w-full"
            label={t('settings.clearAll')}
            onPress={handleClearAll}
            size="small"
          />
        </Card>

        <Card className="w-full gap-card">
          <Badge label={t('settings.localOnly')} tone="accent" />
          <View className="gap-2">
            <TraceText accessibilityRole="header" variant="heading">
              {t('settings.privacyTitle')}
            </TraceText>
            <TraceText tone="dim" variant="body">
              {t('settings.privacyBody')}
            </TraceText>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
