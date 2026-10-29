import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeProvider as ExpoThemeProvider } from 'expo-router';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { setBackgroundColorAsync } from 'expo-system-ui';

import { darkColors, lightColors, navigationThemeFor, type ColorSet } from '@/constants/theme';
import { THEME_MODE_STORAGE_KEY } from '@/constants/storage';
import Storage from '@/lib/kv-store';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface ThemeContextValue {
  colors: ColorSet;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    Storage.getItem(THEME_MODE_STORAGE_KEY)
      .then((stored) => {
        if (!active) {
          return;
        }
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          setModeState(stored);
        }
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);

    try {
      await Storage.setItem(THEME_MODE_STORAGE_KEY, next);
    } catch {
      // Theme preference is cosmetic; keep the in-memory value if persistence fails.
    }
  }, []);

  const isDark = mode === 'system' ? systemScheme !== 'light' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  const value = useMemo(
    () => ({ colors, isDark, mode, setMode, ready }),
    [colors, isDark, mode, setMode, ready],
  );

  if (!ready) {
    const gateColors = systemScheme === 'light' ? lightColors : darkColors;

    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: gateColors.background,
        }}>
        <ActivityIndicator color={gateColors.accent} size="small" />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      <ExpoThemeProvider value={navigationThemeFor(colors, isDark)}>
        {children}
      </ExpoThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider.');
  }

  return value;
}
