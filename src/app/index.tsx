import { Redirect, type Href } from 'expo-router';

import { useOnboarding } from '@/providers/onboarding-provider';

export default function IndexScreen() {
  const { isComplete } = useOnboarding();

  return <Redirect href={isComplete ? ('/explore' as Href) : ('/welcome' as Href)} />;
}
