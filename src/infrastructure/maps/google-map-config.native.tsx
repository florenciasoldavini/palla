import Constants, { ExecutionEnvironment } from "expo-constants";
import { useEffect } from "react";
import { Platform } from "react-native";

// Expo Go supplies its own SDK configuration. Standalone/development builds
// need the platform-specific key embedded when their native binary is built.
export const googleMapsConfigured =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.expoConfig?.extra?.googleMapsConfigured?.[Platform.OS] === true;

export function GoogleMapUnavailable({ onError }: { onError: () => void }) {
  useEffect(() => {
    onError();
  }, [onError]);
  return null;
}
