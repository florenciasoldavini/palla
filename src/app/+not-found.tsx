import { Link, Stack } from 'expo-router';

import { Pressable, Text, View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Página no encontrada' }} />
      <Screen contentContainerClassName="flex-1 items-center justify-center gap-5 px-6">
        <View className="items-center gap-2">
          <Text className="text-ink text-2xl font-semibold" selectable>
            Esta página no existe
          </Text>
          <Text className="text-muted text-center text-base" selectable>
            Volvé al inicio para seguir explorando Palla.
          </Text>
        </View>
        <Link href="/" asChild>
          <Pressable className="bg-ink rounded-2xl px-5 py-3 active:opacity-80">
            <Text className="font-semibold text-white" selectable>
              Ir al inicio
            </Text>
          </Pressable>
        </Link>
      </Screen>
    </>
  );
}
