import type { Href } from 'expo-router';
import {
  TabList,
  TabListProps,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
  Tabs,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TraceText } from '@/components/ui';
import { traceTabs } from '@/constants/tabs';
import { Radii, Spacing } from '@/constants/theme';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';

type TraceTab = (typeof traceTabs)[number];

type TabButtonProps = TabTriggerSlotProps & {
  tab: TraceTab;
};

export default function AppTabs() {
  const { t } = useLanguage();

  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          {traceTabs.map((tab) => (
            <TabTrigger asChild href={tab.href as Href} key={tab.name} name={tab.name}>
              <TabButton tab={tab}>{t(`tabs.${tab.name}`)}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, tab, ...props }: TabButtonProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  // Six tabs do not fit side-by-side with readable labels on phone widths.
  const isCompact = width < 480;

  return (
    <Pressable
      {...props}
      accessibilityLabel={tab.label}
      accessibilityRole="link"
      aria-current={isFocused ? 'page' : undefined}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.tabButton,
        isCompact ? styles.tabButtonCompact : null,
        isFocused ? { backgroundColor: colors.accentDim } : null,
        pressed ? styles.pressed : null,
      ]}>
      <View
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.icon}>
        <SymbolView
          name={{ android: tab.icons.android, ios: tab.icons.ios, web: tab.icons.web }}
          size={20}
          style={styles.symbol}
          tintColor={isFocused ? colors.accent : colors.textDim}
        />
      </View>
      <TraceText
        numberOfLines={1}
        style={isCompact ? styles.compactLabel : undefined}
        tone={isFocused ? 'accent' : 'dim'}
        variant="caption">
        {children}
      </TraceText>
    </Pressable>
  );
}

function CustomTabList({ children, style, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      {...props}
      accessibilityRole="toolbar"
      className="w-full px-gutter pt-2"
      style={[
        styles.tabList,
        { backgroundColor: colors.card, borderTopColor: colors.border },
        { paddingBottom: Spacing.gutter + insets.bottom },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  slot: {
    flex: 1,
    minHeight: 0,
  },
  tabList: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.one,
    borderTopWidth: 1,
  },
  tabButton: {
    minHeight: 56,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Radii.control,
  },
  tabButtonCompact: {
    flexDirection: 'column',
    gap: Spacing.half,
    paddingHorizontal: 0,
  },
  compactLabel: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  icon: {
    width: 20,
    height: 20,
  },
  symbol: {
    width: 20,
    height: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
