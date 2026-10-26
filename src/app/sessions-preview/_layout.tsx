import { Stack, Redirect } from "expo-router";
import { useEffect } from "react";
import { requireOptionalNativeModule } from "expo-modules-core";
export default function PreviewLayout() {
  useEffect(() => {
    if (!__DEV__) return;
    const prepare = async () => {
      const menu = requireOptionalNativeModule<{
        setOnboardingFinished: (finished: boolean) => Promise<void>;
        closeMenu: () => Promise<void>;
      }>("ExpoDevMenuInternal");
      const preferences = requireOptionalNativeModule<{
        setPreferencesAsync: (
          settings: Record<string, boolean>
        ) => Promise<void>;
      }>("DevMenuPreferences");
      await menu?.setOnboardingFinished(true);
      await preferences?.setPreferencesAsync({
        showsAtLaunch: false,
        keyCommandsEnabled: false
      });
      await menu?.closeMenu();
    };
    const run = () => {
      void prepare().catch(() =>
        console.warn("Could not prepare Expo Go navigation preview.")
      );
    };
    run();
    const lateMenu = setTimeout(run, 2000);
    return () => clearTimeout(lateMenu);
  }, []);
  if (!__DEV__) return <Redirect href="/sign-in" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
