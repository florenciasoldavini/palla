import { useContext, useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { ImagePlus } from "lucide-react-native";
import { AppButton, AppHeading, AppText } from "@/components/atoms";
import { AuthContext } from "@/features/auth/auth-provider";
import { atomPalette as c } from "@/components/atoms/theme";
import { useOwnCover } from "../hooks/use-cover";
import { pickSessionCover } from "../services/cover.service";
export function SessionCoverField({
  path,
  localUri,
  inheritedPath = null,
  editing,
  clearToVenue = false,
  disabled,
  onChange,
  onBusyChange
}: {
  path: string | null;
  localUri?: string;
  inheritedPath?: string | null;
  editing: boolean;
  clearToVenue?: boolean;
  disabled: boolean;
  onChange: (path: string | null, localUri?: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { user } = useContext(AuthContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const image = useOwnCover(localUri ? null : (path ?? inheritedPath));
  const uri = localUri ?? image.data;
  return (
    <View style={{ gap: 12 }}>
      <AppHeading variant="card">Cover photo</AppHeading>
      <AppText variant="bodySm" tone="muted">
        {editing
          ? "Choose a photo for the selected dates. Removing it uses the series cover when applicable, then the venue’s Google Maps photo."
          : "Optional. Used for the dates you create. Without a cover, we’ll use the venue’s Google Maps photo when available."}
      </AppText>
      {uri ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          style={{ width: "100%", height: 150, borderRadius: 14 }}
          accessibilityLabel="Selected session cover"
          cachePolicy="none"
        />
      ) : (
        <View
          style={{
            height: 100,
            backgroundColor: c.surfaceLow,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <ImagePlus size={26} color={c.accent} />
          <AppText variant="caption" tone="muted">
            {image.isFetching
              ? "Loading cover…"
              : "Venue photo used when available"}
          </AppText>
        </View>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <AppButton
          variant="bordered"
          fullWidth={false}
          loading={busy}
          isDisabled={disabled || !user}
          icon={ImagePlus}
          onPress={() => {
            setBusy(true);
            onBusyChange?.(true);
            setError(null);
            void pickSessionCover(user!.id)
              .then((asset) => {
                if (asset) onChange(asset.path, asset.uri);
              })
              .catch(() => {
                setError("Couldn’t open that photo. Please try another image.");
              })
              .finally(() => {
                setBusy(false);
                onBusyChange?.(false);
              });
          }}
        >
          {uri ? "Change photo" : "Add photo"}
        </AppButton>
        {(path || (editing && clearToVenue && inheritedPath)) && (
          <AppButton
            variant="ghost"
            fullWidth={false}
            isDisabled={disabled || busy}
            onPress={() => onChange(null)}
          >
            {editing && !clearToVenue ? "Use series cover" : "Remove photo"}
          </AppButton>
        )}
      </View>
      {(error || image.isError) && (
        <AppText tone="danger" variant="bodySm">
          {error ?? "Couldn’t load this cover. You can replace or remove it."}
        </AppText>
      )}
    </View>
  );
}
