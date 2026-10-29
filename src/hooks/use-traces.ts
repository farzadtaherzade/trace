import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { listTraces, type Trace } from '@/lib/db';

export function useTraces() {
  const [traces, setTraces] = useState<Trace[] | null>(null);

  const reload = useCallback(async () => {
    setTraces(await listTraces());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { traces, reload };
}
