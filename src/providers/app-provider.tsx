import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { registerSupabaseAuthLifecycle } from '@/lib/supabase';
import { AnalyticsProvider } from '@/providers/analytics-provider';
import { QueryProvider } from '@/providers/query-provider';

import type { PropsWithChildren } from 'react';

export function AppProvider({ children }: PropsWithChildren) {
  useEffect(() => registerSupabaseAuthLifecycle(), []);

  return (
    <SafeAreaProvider>
      <AnalyticsProvider>
        <QueryProvider>{children}</QueryProvider>
      </AnalyticsProvider>
    </SafeAreaProvider>
  );
}
