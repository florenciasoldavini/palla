import { Link, Stack } from 'expo-router';

import { Pressable, Text, View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';

export default function SessionsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Sesiones' }} />
      <Screen contentContainerClassName="gap-6 px-6 py-8">
        <View className="border-border bg-surface gap-2 rounded-3xl border p-6">
          <Text className="text-ink text-2xl font-semibold tracking-tight" selectable>
            Descubrimiento de sesiones
          </Text>
          <Text className="text-muted text-base leading-6" selectable>
            Esta ruta está lista para alojar la primera feature del jugador.
          </Text>
        </View>
        <Link href="/dashboard" asChild>
          <Pressable className="self-start rounded-xl px-1 py-2 active:opacity-60">
            <Text className="text-accent font-semibold" selectable>
              Ver base de organizadores
            </Text>
          </Pressable>
        </Link>
      </Screen>
    </>
  );
}
