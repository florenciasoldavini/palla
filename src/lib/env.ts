import { z } from 'zod';

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);
const optionalUrl = z.preprocess((value) => (value === '' ? undefined : value), z.url().optional());

const result = z
  .object({
    appEnv: z.enum(['development', 'preview', 'production']),
    postHogApiKey: optionalString,
    postHogHost: z.url(),
    sentryDsn: optionalUrl,
    supabasePublishableKey: optionalString,
    supabaseUrl: optionalUrl,
  })
  .safeParse({
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    postHogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
    postHogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  });

if (!result.success) {
  throw new Error(`Invalid public environment configuration: ${z.prettifyError(result.error)}`);
}

export const env = result.data;
