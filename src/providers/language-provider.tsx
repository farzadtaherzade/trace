import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, View } from 'react-native';

import { applyLanguage, i18n, resolveLanguage } from '@/lib/i18n';
import { LANGUAGE_MODE_STORAGE_KEY } from '@/constants/storage';
import Storage from '@/lib/kv-store';

export type LanguageMode = 'en' | 'fa' | 'system';

export interface LanguageContextValue {
  language: LanguageMode;
  locale: 'en' | 'fa';
  isRTL: boolean;
  ready: boolean;
  setLanguage: (mode: LanguageMode) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    Storage.getItem(LANGUAGE_MODE_STORAGE_KEY)
      .then((stored) => {
        if (!active) {
          return;
        }
        if (stored === 'en' || stored === 'fa' || stored === 'system') {
          setLanguageState(stored);
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

  const locale = resolveLanguage(language);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  const setLanguage = useCallback(async (mode: LanguageMode) => {
    // Apply before the state change so the first re-render already reads the
    // new i18n locale — a post-render effect would leave one render stale.
    applyLanguage(mode);
    setLanguageState(mode);

    try {
      await Storage.setItem(LANGUAGE_MODE_STORAGE_KEY, mode);
    } catch {
      // Language preference is cosmetic; keep the in-memory value if persistence fails.
    }
  }, []);

  // The body must read the reactive `locale`: the React Compiler would
  // otherwise hoist t to a module constant (it cannot see the mutable
  // i18n.locale global), freezing translated strings after a language switch.
  // The explicit locale option also makes each call independent of that global.
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      i18n.t(key, { ...params, locale }),
    [locale],
  );

  const value = useMemo(
    () => ({ language, locale, isRTL: locale === 'fa', ready, setLanguage, t }),
    [language, locale, ready, setLanguage, t],
  );

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0A0A',
        }}>
        <ActivityIndicator color="#34D399" size="small" />
      </View>
    );
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);

  if (!value) {
    throw new Error('useLanguage must be used within LanguageProvider.');
  }

  return value;
}
