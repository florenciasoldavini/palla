import { ChatPushSync } from "@/features/notifications/components/chat-push-sync";
import { ChatRealtimeSync } from "@/features/chat/components/chat-realtime-sync";
import { AppText, Screen } from "@/components/atoms";
import { ActivityIndicator } from "react-native";
import { atomPalette } from "@/components/atoms/theme";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { AnimatedSplash } from "@/components/splash/animated-splash";
import { AuthContext, AuthProvider } from "@/features/auth/auth-provider";
import { ProfileLoadError } from "@/features/auth/components/profile-load-error";
import { queryClient } from "@/lib/query-client";
import { navigationIntegration, Sentry } from "@/lib/sentry";
import "@/global.css";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryPersister } from "@/infrastructure/local-storage/query-persister";
import { ChatOutboxSync } from "@/features/chat/components/chat-outbox-sync";
import { useFonts } from "expo-font";
import { Stack, useNavigationContainerRef, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useContext, useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

if (process.env.EXPO_OS !== "web") {
  void SplashScreen.preventAutoHideAsync();
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Hanken Grotesk": require("@assets/fonts/HankenGrotesk-Regular.ttf"),
    "HankenGrotesk-Regular": require("@assets/fonts/HankenGrotesk-Regular.ttf"),
    "HankenGrotesk-Medium": require("@assets/fonts/HankenGrotesk-Medium.ttf"),
    "HankenGrotesk-SemiBold": require("@assets/fonts/HankenGrotesk-SemiBold.ttf"),
    "HankenGrotesk-Bold": require("@assets/fonts/HankenGrotesk-Bold.ttf"),
    Geist: require("@assets/fonts/Geist-Regular.ttf"),
    "Geist-Regular": require("@assets/fonts/Geist-Regular.ttf"),
    "Geist-Medium": require("@assets/fonts/Geist-Medium.ttf"),
    "Geist-SemiBold": require("@assets/fonts/Geist-SemiBold.ttf"),
    "Geist-Bold": require("@assets/fonts/Geist-Bold.ttf")
  });

  useEffect(() => {
    if (fontError) {
      Sentry.captureException(fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GluestackUIProvider mode="light">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          buster: "offline-chat-v1",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          dehydrateOptions: {
            shouldDehydrateMutation: () => false,
            shouldDehydrateQuery: (query) =>
              query.state.data !== undefined &&
              [
                "auth-profile",
                "chat-inbox",
                "chat-conversation",
                "chat-messages"
              ].includes(String(query.queryKey[0]))
          }
        }}
      >
        <AuthProvider>
          <ChatOutboxSync />
          <ChatRealtimeSync>
            <SafeAreaProvider>
              <RootNavigator />
            </SafeAreaProvider>
          </ChatRealtimeSync>
        </AuthProvider>
      </PersistQueryClientProvider>
    </GluestackUIProvider>
  );
}

function RootNavigator() {
  const { isLoading, session, user } = useContext(AuthContext);
  const segments = useSegments();
  const authHandoff = segments.some(
    (segment) => segment === "callback" || segment === "reset-password"
  );
  const ready = Boolean(session && user?.onboarding_completed_at);
  const navigationRef = useNavigationContainerRef();
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  useEffect(() => {
    navigationIntegration.registerNavigationContainer(navigationRef);
  }, [navigationRef]);

  return (
    <>
      <ChatPushSync ready={ready && !isLoading && splashDone} />
      {!isLoading || authHandoff ? (
        session && !user && !authHandoff ? (
          <ProfileLoadError />
        ) : (
          <Stack screenOptions={{ headerShown: false, statusBarStyle: "dark" }}>
            <Stack.Screen name="index" />
            {/* Auth callbacks must survive changes to the signed-out guard. */}
            <Stack.Screen name="callback" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="onboarding-preview" />
            <Stack.Protected guard={__DEV__}>
              <Stack.Screen name="navigation-preview" />
              <Stack.Screen name="sessions-preview" />
            </Stack.Protected>
            <Stack.Protected guard={Boolean(session && user)}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
            <Stack.Protected guard={ready}>
              <Stack.Screen name="(player)" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="messages" />
            </Stack.Protected>
            <Stack.Protected
              guard={ready && user?.organizer_status === "active"}
            >
              <Stack.Screen name="(organizer)" />
              <Stack.Screen name="organizer-session" />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        )
      ) : null}
      {isLoading && splashDone && !authHandoff ? (
        <Screen centered>
          <ActivityIndicator color={atomPalette.accent} />
          <AppText style={{ textAlign: "center" }}>
            Loading your profile…
          </AppText>
        </Screen>
      ) : null}
      {!splashDone ? (
        <AnimatedSplash appReady={!isLoading} onFinish={handleSplashFinish} />
      ) : null}
    </>
  );
}

export default Sentry.wrap(RootLayout);
