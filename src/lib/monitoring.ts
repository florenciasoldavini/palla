import * as Sentry from '@sentry/react-native';

import { env } from '@/lib/env';

Sentry.init({
  dsn: env.sentryDsn,
  enabled: Boolean(env.sentryDsn),
  environment: env.appEnv,
  tracesSampleRate: env.appEnv === 'production' ? 0.1 : 1,
});
