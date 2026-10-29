import '@/global.css';

import Head from 'expo-router/head';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LanguageProvider } from '@/providers/language-provider';
import { OnboardingProvider, useOnboarding } from '@/providers/onboarding-provider';
import { ThemeProvider, useTheme } from '@/providers/theme-provider';
import { TrackingProvider } from '@/providers/tracking-provider';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <TraceProviders />
      </ThemeProvider>
    </LanguageProvider>
  );
}

function TraceProviders() {
  return (
    <>
      <Head>
        <title>Trace</title>
      </Head>
      <OnboardingProvider>
        <TrackingProvider>
          <RootNavigator />
        </TrackingProvider>
      </OnboardingProvider>
    </>
  );
}

function RootNavigator() {
  const { isComplete } = useOnboarding();
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Protected guard={!isComplete}>
          <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={isComplete}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
