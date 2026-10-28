import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import {
  AppButton,
  AppHeading,
  AppText,
  ErrorState,
  Screen,
  SkeletonBlock
} from "@/components/atoms";
import { useAppLanguage } from "@/infrastructure/localization/language-provider";
import type { LanguagePreference } from "@/infrastructure/localization/language-preference";

export default function LanguageSettingsScreen() {
  const { language, preference, ready, loadError, saving, select, retry } =
    useAppLanguage();
  const [saveError, setSaveError] = useState(false);
  const router = useRouter();
  const es = language === "es";
  return (
    <Screen>
      <View style={{ gap: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppButton
            variant="ghost"
            layout="icon"
            fullWidth={false}
            icon={ArrowLeft}
            accessibilityLabel={es ? "Volver al perfil" : "Back to profile"}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/profile")
            }
          />
          <AppHeading variant="section">
            {es ? "Idioma" : "Language"}
          </AppHeading>
        </View>
        <AppText tone="muted">
          {es
            ? "Elegí el idioma para los textos disponibles en español e inglés. La preferencia se guarda en este dispositivo."
            : "Choose the language for content available in Spanish and English. Your preference is saved on this device."}
        </AppText>
        {!ready ? (
          <SkeletonBlock height={220} />
        ) : loadError ? (
          <ErrorState
            title={
              es ? "No se pudo cargar el idioma" : "Couldn’t load language"
            }
            onRetry={retry}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {(
              [
                {
                  value: "system",
                  label: es
                    ? "Usar idioma del dispositivo"
                    : "Use device language"
                },
                { value: "es", label: "Español" },
                { value: "en", label: "English" }
              ] satisfies { value: LanguagePreference; label: string }[]
            ).map((option) => (
              <AppButton
                key={option.value}
                variant={preference === option.value ? "solid" : "bordered"}
                icon={preference === option.value ? Check : undefined}
                accessibilityState={{
                  selected: preference === option.value,
                  disabled: saving
                }}
                isDisabled={saving}
                onPress={() => {
                  setSaveError(false);
                  void select(option.value).catch(() => setSaveError(true));
                }}
              >
                {option.label}
              </AppButton>
            ))}
            {saving && (
              <AppText accessibilityLiveRegion="polite">
                {es ? "Guardando…" : "Saving…"}
              </AppText>
            )}
            {saveError && (
              <AppText tone="danger" accessibilityRole="alert">
                {es
                  ? "No se pudo guardar. Intentá nuevamente."
                  : "Couldn’t save. Please try again."}
              </AppText>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}
