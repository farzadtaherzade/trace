import { Pressable, StyleSheet, View } from 'react-native';

import { TraceText } from '@/components/ui/trace-text';
import { Radii } from '@/constants/theme';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';

export interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      className={`flex-row gap-1 ${className ?? ''}`}
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Option label="EN" selected={language === 'en'} onPress={() => void setLanguage('en')} />
      <Option label="فا" selected={language === 'fa'} onPress={() => void setLanguage('fa')} />
    </View>
  );
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, { backgroundColor: selected ? colors.accent : 'transparent' }]}>
      <TraceText
        variant="caption"
        style={{ color: selected ? colors.background : colors.textDim, fontWeight: '700' }}>
        {label}
      </TraceText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 4,
    padding: 4,
    borderWidth: 1,
    borderRadius: Radii.pill,
  },
  option: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
  },
});
