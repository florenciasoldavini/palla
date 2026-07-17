import { PostHogProvider } from 'posthog-react-native';

import { env } from '@/lib/env';

import type { PropsWithChildren } from 'react';

export function AnalyticsProvider({ children }: PropsWithChildren) {
  if (!env.postHogApiKey) {
    return children;
  }

  return (
    <PostHogProvider
      apiKey={env.postHogApiKey}
      autocapture={false}
      debug={env.appEnv === 'development'}
      options={{ host: env.postHogHost }}
    >
      {children}
    </PostHogProvider>
  );
}
