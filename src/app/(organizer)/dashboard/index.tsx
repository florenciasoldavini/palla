import { Stack } from 'expo-router';

import { Text, View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';

export default function OrganizerDashboardScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Organización' }} />
      <Screen contentContainerClassName="gap-6 px-6 py-8">
        <View className="border-border bg-surface gap-2 rounded-3xl border p-6">
          <Text className="text-ink text-2xl font-semibold tracking-tight" selectable>
            Panel del organizador
          </Text>
          <Text className="text-muted text-base leading-6" selectable>
            La navegación está separada y lista para las features de gestión.
          </Text>
        </View>
      </Screen>
    </>
  );
}
