import { useState } from "react";
import { Platform, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppButton, AppHeading, AppText, Screen } from "@/components/atoms";
import { sessionShareContent } from "@/features/sessions/public/services/session-share-content";

// Development-only parent layout protects this no-write native share harness.
export default function SessionSharingPreview() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const url = `http://127.0.0.1:8084/session?id=${encodeURIComponent(id ?? "")}`;
  return (
    <Screen>
      <AppHeading variant="section">Local sharing test</AppHeading>
      <AppText>Friday Padel — Sharing QA</AppText>
      <AppText>
        Friendly padel, good rallies, and new friends. Bring your racket!
      </AppText>
      <AppText variant="bodySm">
        No account changes. Local preview server required.
      </AppText>
      <AppButton
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            const response = await Share.share(
              sessionShareContent(Platform.OS, {
                title: "Friday Padel — Sharing QA",
                description:
                  "Friendly padel, good rallies, and new friends. Bring your racket!",
                url
              })
            );
            setResult(response.action);
          } catch {
            setResult("Sharing unavailable");
          } finally {
            setBusy(false);
          }
        }}
      >
        Share local preview
      </AppButton>
      <AppText>{result}</AppText>
      <AppButton variant="ghost" onPress={() => router.back()}>
        Back
      </AppButton>
    </Screen>
  );
}
