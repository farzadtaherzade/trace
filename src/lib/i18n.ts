import { getLocales } from 'expo-localization';
import { I18nManager, Platform } from 'react-native';
import { I18n } from 'i18n-js';

import en from '@/i18n/en';
import fa from '@/i18n/fa';

export const i18n = new I18n({ en, fa });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export function deviceLanguage(): 'en' | 'fa' {
  const code = getLocales()[0]?.languageCode;
  return code?.startsWith('fa') ? 'fa' : 'en';
}

export function resolveLanguage(mode: 'en' | 'fa' | 'system'): 'en' | 'fa' {
  return mode === 'system' ? deviceLanguage() : mode;
}

export function applyLanguage(mode: 'en' | 'fa' | 'system') {
  const locale = resolveLanguage(mode);
  i18n.locale = locale;

  if (Platform.OS !== 'web') {
    I18nManager.allowRTL(locale === 'fa');
    I18nManager.forceRTL(locale === 'fa');
  }
}

applyLanguage('system');

export function formatDate(date: Date | string | number, opts?: Intl.DateTimeFormatOptions) {
  const locale = i18n.locale === 'fa' ? 'fa-IR-u-nu-latn' : 'en-US';
  return new Intl.DateTimeFormat(locale, opts ?? { month: 'short', day: 'numeric' }).format(
    new Date(date),
  );
}
