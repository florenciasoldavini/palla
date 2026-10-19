import type { AvatarItem } from "@/components/atoms/avatar-group";
import { useRef, useState } from "react";
import { Alert, Keyboard, View } from "react-native";
import { randomUUID } from "expo-crypto";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Send } from "lucide-react-native";
import {
  AppButton,
  AppText,
  TextAreaField,
  AvatarGroup
} from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
import { atomPalette as c } from "@/components/atoms/theme";
import {
  announcementInputSchema,
  type AnnouncementContext,
  type AnnouncementInput,
  type PublishAnnouncement
} from "../domain";
import { AnnouncementSummary } from "./announcement-summary";
export function AnnouncementComposer({
  context,
  recipients = [],
  recipientsLoading = false,
  busy,
  onSend,
  onClose
}: {
  context: AnnouncementContext;
  recipients?: AvatarItem[];
  recipientsLoading?: boolean;
  busy: boolean;
  onSend: (input: PublishAnnouncement) => Promise<void>;
  onClose: () => void;
}) {
  const {
    control,
    watch,
    handleSubmit,
    formState: { isDirty, errors }
  } = useForm<AnnouncementInput>({
    resolver: zodResolver(announcementInputSchema),
    defaultValues: { body: "" }
  });
  const body = watch("body");
  const request = useRef({ body: "", id: "" });
  const [confirming, setConfirming] = useState(false);
  const close = () => {
    if (busy || confirming) return;
    if (isDirty && body.trim())
      Alert.alert(
        "Discard announcement?",
        "Your unsent message will be lost.",
        [
          { text: "Keep writing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: onClose }
        ]
      );
    else onClose();
  };
  const send = ({ body: value }: AnnouncementInput) => {
    Keyboard.dismiss();
    if (request.current.body !== value)
      request.current = { body: value, id: randomUUID() };
    setConfirming(true);
    Alert.alert(
      `Send to ${context.recipient_count} ${context.recipient_count === 1 ? "player" : "players"}?`,
      "Only confirmed players in this session will be notified.",
      [
        {
          text: "Keep writing",
          style: "cancel",
          onPress: () => setConfirming(false)
        },
        {
          text: "Send",
          onPress: () => {
            setConfirming(false);
            void onSend({
              session_id: context.session_id,
              body: value,
              request_id: request.current.id,
              expected_count: context.recipient_count
            });
          }
        }
      ],
      { cancelable: true, onDismiss: () => setConfirming(false) }
    );
  };
  return (
    <AppBottomSheet
      title="New announcement"
      closeLabel="Close announcement composer"
      busy={busy}
      onClose={close}
      footer={
        <AppButton
          color="essential"
          icon={Send}
          iconAfter={false}
          loading={busy}
          isDisabled={
            busy ||
            confirming ||
            !body.trim() ||
            !context.can_send ||
            context.recipient_count === 0
          }
          onPress={handleSubmit(send)}
        >
          Send announcement
        </AppButton>
      }
    >
      <View style={{ gap: 20 }}>
        <AnnouncementSummary context={context} />
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12
          }}
        >
          {(recipientsLoading || recipients.length > 0) && (
            <AvatarGroup
              items={recipients}
              totalCount={context.recipient_count}
              loading={recipientsLoading}
              accessibilityLabel={`${context.recipient_count} confirmed recipients`}
            />
          )}
          <AppText variant="bodySm" tone="subtle">
            To {context.recipient_count} confirmed{" "}
            {context.recipient_count === 1 ? "player" : "players"}
          </AppText>
        </View>
        <Controller
          control={control}
          name="body"
          render={({ field }) => (
            <View style={{ gap: 6 }}>
              <TextAreaField
                label="Your message"
                accessibilityLabel="Announcement message"
                required
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="Share an update with your players…"
                minHeight={136}
                maxLength={1000}
                editable={!busy}
                errorText={errors.body?.message}
              />
              <AppText
                variant="caption"
                tone="subtle"
                style={{ textAlign: "right" }}
              >
                {body.length.toLocaleString("en-US")} / 1,000
              </AppText>
            </View>
          )}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Info size={16} color={c.textSubtle} />
          <AppText variant="caption" tone="subtle" style={{ flex: 1 }}>
            Announcements can’t be edited after sending.
          </AppText>
        </View>
        {!context.can_send && (
          <AppText variant="bodySm" tone="subtle">
            Announcements are available before the session ends.
          </AppText>
        )}
        {context.recipient_count === 0 && (
          <AppText variant="bodySm" tone="subtle">
            There are no confirmed players to notify yet.
          </AppText>
        )}
      </View>
    </AppBottomSheet>
  );
}
