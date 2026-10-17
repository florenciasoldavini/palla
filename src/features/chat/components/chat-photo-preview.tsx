import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import {
  Modal,
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { Send, X } from "lucide-react-native";
import { AppButton, AppText, TextField } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import type { LocalPhoto } from "../attachment-domain";
const schema = z.object({ caption: z.string().trim().max(4000) });
export function ChatPhotoPreview({
  photo,
  caption,
  onClose,
  onSend,
  disabled = false
}: {
  photo: LocalPhoto;
  caption: string;
  onClose: () => void;
  onSend: (caption: string) => Promise<void>;
  disabled?: boolean;
}) {
  const insets = useSafeAreaInsets(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { caption }
  });
  return (
    <Modal
      visible
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + sp[2] }]}>
          <AppButton
            variant="ghost"
            layout="icon"
            icon={X}
            fullWidth={false}
            accessibilityLabel="Cancel photo"
            isDisabled={busy}
            onPress={onClose}
          />
          <AppText variant="label" style={{ flex: 1, textAlign: "center" }}>
            Send photo
          </AppText>
          <View style={{ width: 48 }} />
        </View>
        <Image
          source={{ uri: photo.uri }}
          contentFit="contain"
          style={{ flex: 1, width: "100%" }}
          accessibilityLabel="Photo to send"
        />
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, sp[3]) }
          ]}
        >
          {error && (
            <AppText variant="caption" tone="danger">
              {error}
            </AppText>
          )}
          <View
            style={{ flexDirection: "row", alignItems: "flex-end", gap: sp[2] }}
          >
            <View style={{ flex: 1 }}>
              <Controller
                name="caption"
                control={control}
                render={({ field }) => (
                  <TextField
                    placeholder="Add a caption…"
                    accessibilityLabel="Photo caption"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    maxLength={4000}
                    multiline
                    inputStyle={{ maxHeight: 120 }}
                    editable={!busy}
                  />
                )}
              />
            </View>
            <AppButton
              layout="icon"
              icon={Send}
              color="essential"
              fullWidth={false}
              accessibilityLabel="Send photo"
              loading={busy}
              isDisabled={disabled}
              onPress={handleSubmit(async ({ caption }) => {
                setBusy(true);
                setError(null);
                try {
                  await onSend(caption);
                } catch {
                  setError(
                    "Couldn’t save this photo on your device. Try again."
                  );
                } finally {
                  setBusy(false);
                }
              })}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: sp[3],
    paddingBottom: sp[2],
    backgroundColor: c.surface
  },
  footer: { padding: sp[3], backgroundColor: c.surface, gap: sp[2] }
});
