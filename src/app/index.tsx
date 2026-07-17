import { Link } from 'expo-router';

import { Pressable, Text, View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';

export default function WelcomeScreen() {
  return (
    <Screen contentContainerClassName="min-h-full justify-between px-6 py-14 md:mx-auto md:w-full md:max-w-2xl">
      <View className="gap-8 pt-12">
        <View className="bg-ink h-12 w-12 items-center justify-center rounded-2xl">
          <Text className="text-xl font-semibold text-white" selectable>
            P
          </Text>
        </View>

        <View className="gap-4">
          <Text className="text-accent text-sm font-semibold tracking-widest uppercase" selectable>
            Palla
          </Text>
          <Text
            className="text-ink max-w-xl text-5xl leading-tight font-semibold tracking-tight"
            selectable
          >
            El próximo partido empieza acá.
          </Text>
          <Text className="text-muted max-w-lg text-lg leading-7" selectable>
            Descubrí y organizá canchas abiertas de pádel, sin perder tiempo coordinando.
          </Text>
        </View>
      </View>

      <View className="gap-3 pt-14 pb-4">
        <Link href="/sessions" asChild>
          <Pressable className="bg-ink items-center rounded-2xl px-5 py-4 active:opacity-80">
            <Text className="text-base font-semibold text-white" selectable>
              Explorar sesiones
            </Text>
          </Pressable>
        </Link>
        <Link href="/sign-in" asChild>
          <Pressable className="border-border bg-surface items-center rounded-2xl border px-5 py-4 active:opacity-70">
            <Text className="text-ink text-base font-semibold" selectable>
              Ingresar
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
