import { Stack } from 'expo-router';

import { Text, View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';

export default function SignInScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Ingresar' }} />
      <Screen contentContainerClassName="gap-5 px-6 py-10">
        <View className="gap-2">
          <Text className="text-ink text-3xl font-semibold tracking-tight" selectable>
            Bienvenido a Palla
          </Text>
          <Text className="text-muted text-base leading-6" selectable>
            La autenticación se implementará dentro de la feature de auth.
          </Text>
        </View>
      </Screen>
    </>
  );
}
