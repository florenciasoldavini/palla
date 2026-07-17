import '@/global.css';
import '@/lib/monitoring';

import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProvider } from '@/providers/app-provider';
import { colors } from '@/theme/tokens';

function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.canvas },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.canvas },
          headerTintColor: colors.ink,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(player)" options={{ headerShown: false }} />
        <Stack.Screen name="(organizer)" options={{ headerShown: false }} />
      </Stack>
    </AppProvider>
  );
}

export default Sentry.wrap(RootLayout);
