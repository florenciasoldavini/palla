import NetInfo from '@react-native-community/netinfo';
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { PropsWithChildren } from 'react';

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected ?? false)),
);

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { networkMode: 'offlineFirst', retry: 1 },
      queries: {
        gcTime: 1000 * 60 * 30,
        networkMode: 'offlineFirst',
        refetchOnWindowFocus: true,
        retry: 2,
        staleTime: 1000 * 60,
      },
    },
  });
}

export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });

    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
