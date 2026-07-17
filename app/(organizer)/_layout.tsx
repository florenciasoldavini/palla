import { Stack } from "expo-router";

export default function OrganizerLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: "Organizer" }} />
    </Stack>
  );
}
