import { useEffect, useRef, useState } from "react";
import { Alert, Keyboard, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { randomUUID } from "expo-crypto";
import { Send } from "lucide-react-native";
import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  AvatarGroup,
  TextAreaField
} from "@/components/atoms";
import { SessionSummary } from "@/components/session-summary";
import { atomPalette as c } from "@/components/atoms/theme";
import { CancellationReasons } from "./cancellation-reasons";
import {
  cancellationInputSchema,
  recipientCount,
  type CancellationContext,
  type CancellationInput,
  type CancelOccurrence
} from "../domain";
export function CancellationForm({
  context,
  busy,
  onCancel,
  onBack,
  onDirty
}: {
  context: CancellationContext;
  busy: boolean;
  onCancel: (input: CancelOccurrence) => Promise<void>;
  onBack: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const {
    control,
    watch,
    handleSubmit,
    formState: { isDirty, errors }
  } = useForm<CancellationInput>({
    resolver: zodResolver(cancellationInputSchema),
    defaultValues: { message: "" }
  });
  const message = watch("message");
  const [confirming, setConfirming] = useState(false);
  const request = useRef({ payload: "", id: "" });
  const count = recipientCount(context);
  useEffect(() => onDirty(isDirty), [isDirty, onDirty]);
  const confirm = (input: CancellationInput) => {
    Keyboard.dismiss();
    const payload = JSON.stringify(input);
    if (request.current.payload !== payload)
      request.current = { payload, id: randomUUID() };
    setConfirming(true);
    Alert.alert(
      `Cancel ${context.session_title}?`,
      `${count ? `${count} ${count === 1 ? "player will" : "players will"} be notified and their registrations cancelled.` : "There are no players to notify."} This cancels only the session on ${new Date(context.starts_at).toLocaleDateString(undefined, { day: "numeric", month: "long", timeZone: context.timezone })}.`,
      [
        {
          text: "Keep editing",
          style: "cancel",
          onPress: () => setConfirming(false)
        },
        {
          text: "Cancel session",
          style: "destructive",
          onPress: () => {
            setConfirming(false);
            void onCancel({
              ...input,
              session_id: context.session_id,
              expected_version: context.updated_at,
              request_id: request.current.id,
              expected_count: count
            });
          }
        }
      ],
      { cancelable: true, onDismiss: () => setConfirming(false) }
    );
  };
  return (
    <View style={{ gap: 24 }}>
      <AppCard style={{ gap: 16 }}>
        <SessionSummary context={context} />
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12
          }}
        >
          <AvatarGroup
            items={context.recipients.map((p) => ({
              id: p.id,
              name: p.name,
              imageUrl: p.image_url
            }))}
            totalCount={count}
            accessibilityLabel={`${count} affected players`}
          />
          <AppText variant="bodySm" tone="subtle">
            {context.confirmed_count} confirmed · {context.waitlisted_count}{" "}
            waitlisted
          </AppText>
        </View>
      </AppCard>
      <View style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8
          }}
        >
          <AppHeading variant="card">Reason for cancellation</AppHeading>
          <AppText variant="caption" tone="subtle">
            Required
          </AppText>
        </View>
        <Controller
          control={control}
          name="reason_code"
          render={({ field }) => (
            <CancellationReasons
              value={field.value}
              disabled={busy || confirming}
              onChange={field.onChange}
            />
          )}
        />
        {errors.reason_code && (
          <AppText variant="bodySm" tone="danger" accessibilityRole="alert">
            {errors.reason_code.message}
          </AppText>
        )}
      </View>
      <Controller
        control={control}
        name="message"
        render={({ field }) => (
          <View style={{ gap: 6 }}>
            <TextAreaField
              label="Message to players"
              accessibilityLabel="Message to players (optional)"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              editable={!busy && !confirming}
              maxLength={1000}
              minHeight={126}
              placeholder="Add any details players should know…"
              errorText={errors.message?.message}
            />
            <AppText
              variant="caption"
              tone="subtle"
              style={{ textAlign: "right" }}
            >
              {message.length.toLocaleString("en-US")} / 1,000
            </AppText>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Send size={15} color={c.textSubtle} />
              <AppText variant="caption" tone="subtle" style={{ flex: 1 }}>
                Included in the cancellation notification
              </AppText>
            </View>
          </View>
        )}
      />
      <View style={{ gap: 12 }}>
        <AppText variant="bodySm" tone="subtle">
          {count
            ? `All ${count} ${count === 1 ? "player will" : "players will"} be notified and their registrations cancelled.`
            : "There are no players to notify."}{" "}
          This can’t be undone.
        </AppText>
        <AppButton
          color="danger"
          loading={busy}
          isDisabled={busy || confirming || !context.can_cancel}
          onPress={handleSubmit(confirm)}
        >
          Cancel session
        </AppButton>
        <AppButton
          variant="ghost"
          isDisabled={busy || confirming}
          onPress={onBack}
        >
          Keep session
        </AppButton>
      </View>
    </View>
  );
}
