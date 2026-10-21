import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const releaseVersion = Constants.expoConfig?.version;
const releaseSlug = Constants.expoConfig?.slug ?? "palla";

export const isSentryEnabled = Boolean(dsn);

export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true
});

if (isSentryEnabled) {
  Sentry.init({
    debug: __DEV__,
    dsn,
    enabled: true,
    environment:
      process.env.EXPO_PUBLIC_APP_ENV ??
      (__DEV__ ? "development" : "production"),
    integrations: [navigationIntegration],
    release: releaseVersion ? `${releaseSlug}@${releaseVersion}` : undefined,
    tracesSampleRate: __DEV__ ? 1 : 0.2
  });
}

export { Sentry };
