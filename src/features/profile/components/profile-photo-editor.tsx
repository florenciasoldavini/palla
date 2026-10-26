import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, Pencil, Plus, Trash2 } from "lucide-react-native";
import { AppButton, AppText, FieldMessage } from "@/components/atoms";
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
  const photoSize = Math.max(112, 80 * Math.min(fontScale, 2));
  const interactionDisabled = disabled || picking;
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
      <View style={styles.container}>
        <View style={{ width: photoSize + 40, height: photoSize + 40 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uri ? "Change photo" : "Add photo"}
            accessibilityHint="Opens your photo library"
            accessibilityState={{
              disabled: interactionDisabled,
              busy: picking
            }}
            disabled={interactionDisabled}
            onPress={() => void pick()}
            style={[
              styles.photo,
              { width: photoSize, height: photoSize },
              { opacity: interactionDisabled ? 0.5 : 1 }
            ]}
          >
            {uri && uri !== failedUri ? (
              <Image
                accessibilityLabel="Profile photo preview"
                source={{ uri }}
                contentFit="cover"
                style={StyleSheet.absoluteFill}
                onError={() => setFailedUri(uri)}
              />
            ) : (
              <Camera
                color={atomPalette.textMuted}
                size={32}
                strokeWidth={1.5}
              />
            )}
            <View pointerEvents="none" style={styles.editOverlay}>
              {picking ? (
                <ActivityIndicator
                  color={atomPalette.textInverse}
                  size="small"
                />
              ) : uri ? (
                <Pencil color={atomPalette.textInverse} size={16} />
              ) : (
                <Plus color={atomPalette.textInverse} size={16} />
              )}
              <AppText
                variant="label"
                style={{ color: atomPalette.textInverse }}
              >
                {picking ? "Opening…" : uri ? "Edit" : "Add"}
              </AppText>
            </View>
          </Pressable>
          {!!uri && (
            <AppButton
              accessibilityLabel="Remove photo"
              fullWidth={false}
              size="sm"
              layout="icon"
              variant="bordered"
              color="danger"
              icon={Trash2}
              style={styles.removeButton}
              isDisabled={interactionDisabled}
              onPress={() => {
                setError(null);
                onRemove();
              }}
            />
          )}
        </View>
      </View>
      {error && <FieldMessage tone="error">{error}</FieldMessage>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%"
  },
  photo: {
    position: "absolute",
    top: 20,
    left: 20,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: atomPalette.surfaceLow,
    borderWidth: 1,
    borderColor: atomPalette.borderSubtle,
    alignItems: "center",
    justifyContent: "center"
  },
  editOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(27, 27, 35, 0.72)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 6
  },
  removeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: atomPalette.surface,
    borderColor: atomPalette.borderSubtle
  }
});
