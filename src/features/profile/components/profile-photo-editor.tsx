import { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus, Trash2 } from "lucide-react-native";
import { AppButton, FieldMessage } from "@/components/atoms";
import { atomPalette } from "@/components/atoms/theme";
import type { ProfileAvatarAsset } from "../repositories/profile-avatar.repository";

export function ProfilePhotoEditor({
  currentUrl,
  value,
  onChange,
  onRemove,
  disabled = false
}: {
  currentUrl: string;
  value: ProfileAvatarAsset | null;
  onChange: (asset: ProfileAvatarAsset) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const { fontScale } = useWindowDimensions();
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = value?.uri ?? currentUrl.trim();
  const pick = async () => {
    setPicking(true);
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 0.82
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          setError("Choose a photo smaller than 5 MB.");
          return;
        }
        onChange({
          uri: asset.uri,
          fileName: asset.fileName,
          mimeType: asset.mimeType
        });
      }
    } catch {
      setError(
        "Couldn’t open your photos. Check photo access in Settings and try again."
      );
    } finally {
      setPicking(false);
    }
  };
  return (
    <View style={{ gap: 12 }}>
      <View
        style={[
          styles.container,
          fontScale > 1.3 && { flexDirection: "column" }
        ]}
      >
        <View style={styles.photo}>
          {uri && uri !== failedUri ? (
            <Image
              accessibilityLabel="Profile photo preview"
              source={{ uri }}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
              onError={() => setFailedUri(uri)}
            />
          ) : (
            <Camera color={atomPalette.textMuted} size={32} strokeWidth={1.5} />
          )}
        </View>

        <View style={styles.actions}>
          <AppButton
            fullWidth={false}
            size="sm"
            variant="bordered"
            style={{
              borderColor: atomPalette.borderSubtle,
              backgroundColor: atomPalette.surfaceLow,
              borderRadius: 999
            }}
            icon={ImagePlus}
            iconAfter={false}
            loading={picking}
            isDisabled={disabled || picking}
            onPress={() => void pick()}
          >
            {uri ? "Change photo" : "Add photo"}
          </AppButton>
          {!!uri && (
            <AppButton
              fullWidth={false}
              size="sm"
              variant="ghost"
              color="danger"
              icon={Trash2}
              iconAfter={false}
              isDisabled={disabled || picking}
              onPress={() => {
                setError(null);
                onRemove();
              }}
            >
              Remove photo
            </AppButton>
          )}
        </View>
      </View>
      {error && <FieldMessage tone="error">{error}</FieldMessage>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    width: "100%"
  },
  photo: {
    height: 96,
    width: 96,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: atomPalette.surfaceLow,
    borderWidth: 1,
    borderColor: atomPalette.borderSubtle,
    alignItems: "center",
    justifyContent: "center"
  },
  actions: {
    flex: 1,
    alignItems: "flex-start",
    gap: 8
  }
});
