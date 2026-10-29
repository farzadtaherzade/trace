import { ONBOARDING_STORAGE_KEY } from '@/constants/storage';

function getLocalStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export async function isOnboardingComplete() {
  return getLocalStorage()?.getItem(ONBOARDING_STORAGE_KEY) === 'true';
}

export async function completeOnboarding() {
  const storage = getLocalStorage();

  if (!storage) {
    throw new Error('Local onboarding storage is unavailable.');
  }

  storage.setItem(ONBOARDING_STORAGE_KEY, 'true');
}
