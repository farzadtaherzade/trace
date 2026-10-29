import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { traceTabs } from '@/constants/tabs';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';

export default function AppTabs() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <NativeTabs
      backBehavior="initialRoute"
      backgroundColor={colors.card}
      disableTransparentOnScrollEdge
      iconColor={{ default: colors.textDim, selected: colors.accent }}
      indicatorColor={colors.accentDim}
      labelStyle={{
        default: { color: colors.textDim },
        selected: { color: colors.accent, fontWeight: '600' },
      }}
      labelVisibilityMode="labeled"
      minimizeBehavior="never"
      rippleColor={colors.accentDim}
      tintColor={colors.accent}>
      {traceTabs.map((tab) => (
        <NativeTabs.Trigger
          contentStyle={{ backgroundColor: colors.background }}
          key={tab.name}
          name={tab.name}>
          <NativeTabs.Trigger.Label>{t(`tabs.${tab.name}`)}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md={tab.icons.android} sf={tab.icons.ios} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
