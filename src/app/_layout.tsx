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
import { QueryClientProvider } from "@tanstack/react-query";
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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SafeAreaProvider>
            <RootNavigator />
          </SafeAreaProvider>
        </AuthProvider>
      </QueryClientProvider>
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
      {!isLoading || authHandoff ? (
        session && !user && !authHandoff ? (
          <ProfileLoadError />
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
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
            </Stack.Protected>
            <Stack.Protected
              guard={ready && user?.organizer_status === "active"}
            >
              <Stack.Screen name="(organizer)" />
              <Stack.Screen name="organizer-session" />
            </Stack.Protected>
            <Stack.Protected guard={!session || authHandoff}>
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
