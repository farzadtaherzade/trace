import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { PrimaryButton, RouteShape, Screen, TraceText } from '@/components/ui';
import { darkColors, lightColors } from '@/constants/theme';
import { gateRoute } from '@/constants/routes';
import { useLanguage } from '@/providers/language-provider';
import {
  completeOnboarding as persistOnboardingCompletion,
  isOnboardingComplete,
} from '@/lib/onboarding-storage';

type OnboardingStatus = 'loading' | 'ready' | 'error';

type OnboardingContextValue = {
  isComplete: boolean;
  finishOnboarding: () => Promise<void>;
  retry: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<OnboardingStatus>('loading');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let active = true;

    isOnboardingComplete()
      .then((complete) => {
        if (active) {
          setIsComplete(complete);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (active) {
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const finishOnboarding = useCallback(async () => {
    await persistOnboardingCompletion();
    setIsComplete(true);
    setStatus('ready');
  }, []);

  const retry = useCallback(() => {
    setIsComplete(false);
    setStatus('loading');
    setAttempt((value) => value + 1);
  }, []);

  const value = useMemo(
    () => ({ isComplete, finishOnboarding, retry }),
    [finishOnboarding, isComplete, retry],
  );

  const { t } = useLanguage();

  if (status === 'loading') {
    const gateColors = systemScheme === 'light' ? lightColors : darkColors;

    return (
      <Screen contentClassName="flex-1 items-center justify-center">
        <View className="items-center gap-section">
          <View
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <RouteShape
              color={gateColors.accent}
              height={140}
              points={gateRoute}
              strokeWidth={3}
              width={180}
            />
          </View>
          <ActivityIndicator color={gateColors.accent} size="small" />
        </View>
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen contentClassName="flex-1 justify-center py-section">
        <View className="items-center gap-card">
          <View
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <RouteShape height={140} points={gateRoute} strokeWidth={3} width={180} />
          </View>
          <TraceText accessibilityRole="header" variant="title">
            {t('gate.title')}
          </TraceText>
          <TraceText className="text-center" tone="dim" variant="body">
            {t('gate.error')}
          </TraceText>
          <PrimaryButton className="mt-2 w-full" label={t('gate.retry')} onPress={retry} />
        </View>
      </Screen>
    );
  }

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);

  if (!value) {
    throw new Error('useOnboarding must be used within OnboardingProvider.');
  }

  return value;
}
