import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { LanguageToggle, PrimaryButton, RouteShape, Screen, TraceText } from '@/components/ui';
import { useLanguage } from '@/providers/language-provider';
import { useOnboarding } from '@/providers/onboarding-provider';

const welcomeRoute = [
  { lat: 8, lng: 14 },
  { lat: 24, lng: 31 },
  { lat: 20, lng: 48 },
  { lat: 43, lng: 42 },
  { lat: 57, lng: 63 },
  { lat: 72, lng: 54 },
  { lat: 78, lng: 76 },
  { lat: 62, lng: 88 },
];

export default function WelcomeScreen() {
  const { finishOnboarding, isComplete } = useOnboarding();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isComplete && shouldNavigate) {
      router.replace('/explore');
    }
  }, [isComplete, shouldNavigate]);

  const handleGetStarted = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await finishOnboarding();
      setShouldNavigate(true);
    } catch {
      setErrorMessage(t('welcome.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen contentClassName="flex-1 py-section" edges={['top', 'right', 'left', 'bottom']}>
      <View className="flex-row justify-end">
        <LanguageToggle />
      </View>
      <View className="flex-1 items-center justify-center py-section">
        <View className="items-center gap-section">
          <View
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <RouteShape height={220} points={welcomeRoute} strokeWidth={4} width={280} />
          </View>
          <View className="items-center gap-3">
            <TraceText accessibilityRole="header" variant="display">
              Trace
            </TraceText>
            <TraceText className="text-center" tone="dim" variant="body">
              {t('welcome.tagline')}
            </TraceText>
          </View>
        </View>
      </View>

      <View className="gap-3">
        {errorMessage ? (
          <TraceText accessibilityRole="alert" className="text-center" tone="danger" variant="caption">
            {errorMessage}
          </TraceText>
        ) : null}
        <PrimaryButton
          label={t('welcome.getStarted')}
          loading={isSubmitting}
          onPress={handleGetStarted}
          size="large"
        />
      </View>
    </Screen>
  );
}
