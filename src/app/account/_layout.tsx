import { Stack } from "expo-router";
import { Platform } from "react-native";
export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        statusBarStyle: Platform.OS === "android" ? "dark" : undefined
      }}
    />
  );
}
