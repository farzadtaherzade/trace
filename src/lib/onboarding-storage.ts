import Storage from '@/lib/kv-store';

import { ONBOARDING_STORAGE_KEY } from '@/constants/storage';

export async function isOnboardingComplete() {
  return (await Storage.getItem(ONBOARDING_STORAGE_KEY)) === 'true';
}

export async function completeOnboarding() {
  await Storage.setItem(ONBOARDING_STORAGE_KEY, 'true');
}
