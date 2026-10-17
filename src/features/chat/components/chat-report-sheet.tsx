import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { randomUUID } from "expo-crypto";
import { Ban, Check, Flag, Info } from "lucide-react-native";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import type { ConversationSummary } from "../domain";
import {
  ChatSafetyPanel,
  ChatSafetySheet,
  ChatSafetyToggle
} from "./chat-safety-sheet";
import { AppButton, AppHeading, AppText, TextField } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import {
  chatReportFieldsSchema,
  reportReasons,
  reportErrorMessage,
  type ChatReportFields,
  type ChatReportInput,
  type ChatReportResult
} from "../report-domain";

/** Embedded in the inbox menu's existing native modal. */
export function ChatReportSheet({
  summary,
  initialBlock = false,
  onBack,
  onSubmit,
  onClose
}: {
  summary: ConversationSummary;
  initialBlock?: boolean;
  onBack?: () => void;
  onSubmit: (input: ChatReportInput) => Promise<ChatReportResult>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"reason" | "details" | "sent">("reason");
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const name = summary.other_participant.first_name || "this person";
  const fullName =
    [summary.other_participant.first_name, summary.other_participant.last_name]
      .filter(Boolean)
      .join(" ") || "this person";
  const conversationId = summary.conversation.id;
  const alreadyBlocked = !!summary.blocked_by_me;
  const submitting = useRef(false);
  const request = useRef<{ key: string; id: string } | null>(null);
  const {
    control,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ChatReportFields>({
    resolver: zodResolver(chatReportFieldsSchema),
    defaultValues: { details: "", block: initialBlock }
  });
  const reason = watch("reason"),
    block = watch("block");
  const submit = handleSubmit(async (fields) => {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    Keyboard.dismiss();
    const key = JSON.stringify(fields);
    if (request.current?.key !== key)
      request.current = { key, id: randomUUID() };
    try {
      const result = await onSubmit({
        ...fields,
        id: request.current.id,
        conversation_id: conversationId
      });
      setBlocked(alreadyBlocked || result.blocked);
      setStep("sent");
    } catch (e) {
      setError(reportErrorMessage(e));
    } finally {
      submitting.current = false;
    }
  });
  return (
    <ChatSafetySheet
      summary={summary}
      title={`Report ${fullName}`}
      onClose={onClose}
      busy={isSubmitting}
      hideHeader={step === "sent"}
      footer={
        <>
          {error && (
            <AppText
              tone="danger"
              variant="caption"
              accessibilityLiveRegion="polite"
            >
              {error}
            </AppText>
          )}
          {step === "reason" ? (
            <>
              <AppButton
                color="essential"
                onPress={async () => {
                  if (await trigger("reason")) setStep("details");
                }}
              >
                Continue
              </AppButton>
              <AppButton variant="ghost" onPress={onBack ?? onClose}>
                {onBack ? "Back" : "Cancel"}
              </AppButton>
            </>
          ) : step === "details" ? (
            <>
              <AppButton
                color="essential"
                icon={block && !alreadyBlocked ? Ban : Flag}
                iconAfter={false}
                loading={isSubmitting}
                onPress={() => void submit()}
              >
                {block && !alreadyBlocked ? "Report & block" : "Submit report"}
              </AppButton>
              <AppButton
                variant="ghost"
                isDisabled={isSubmitting}
                onPress={onClose}
              >
                Cancel
              </AppButton>
            </>
          ) : (
            <AppButton color="essential" onPress={onClose}>
              Done
            </AppButton>
          )}
        </>
      }
    >
      {step === "sent" && (
        <View style={styles.successIcon}>
          <Flag size={28} color={c.text} />
          <View style={styles.successCheck}>
            <Check size={12} color={c.text} />
          </View>
        </View>
      )}
      {step === "sent" && (
        <>
          <AppHeading variant="section" style={{ textAlign: "center" }}>
            Report submitted
          </AppHeading>
          <AppText tone="subtle" style={{ textAlign: "center" }}>
            Thank you for letting us know.
          </AppText>
        </>
      )}
      {step === "reason" && (
        <>
          <AppText variant="label">What would you like to report?</AppText>
          <View accessibilityRole="radiogroup" style={{ gap: sp[2] }}>
            {reportReasons.map((item) => (
              <Pressable
                cssInterop={false}
                key={item.value}
                accessibilityRole="radio"
                accessibilityLabel={item.label}
                accessibilityState={{ checked: reason === item.value }}
                onPress={() =>
                  setValue("reason", item.value, { shouldValidate: true })
                }
                style={({ pressed }) => [
                  styles.choice,
                  {
                    backgroundColor:
                      pressed || reason === item.value
                        ? c.surfaceRaised
                        : c.surface
                  }
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor:
                        reason === item.value ? c.accent : c.textSubtle
                    }
                  ]}
                >
                  {reason === item.value && <View style={styles.radioDot} />}
                </View>
                <AppText style={{ flex: 1 }}>{item.label}</AppText>
              </Pressable>
            ))}
          </View>
          {errors.reason && (
            <AppText
              variant="caption"
              tone="danger"
              accessibilityLiveRegion="polite"
            >
              {errors.reason.message}
            </AppText>
          )}
          <ChatSafetyPanel icon={Info}>
            <AppText variant="caption" tone="subtle">
              Up to 20 recent messages from this chat will be included.
            </AppText>
          </ChatSafetyPanel>
        </>
      )}
      {step === "details" && (
        <>
          <Pressable
            cssInterop={false}
            accessibilityRole="button"
            accessibilityLabel="Change report reason"
            disabled={isSubmitting}
            onPress={() => {
              Keyboard.dismiss();
              setError(null);
              setStep("reason");
            }}
            style={styles.reasonSummary}
          >
            <Flag size={20} color={c.text} />
            <AppText style={{ flex: 1 }}>
              {reportReasons.find((r) => r.value === reason)?.label}
            </AppText>
            <AppText variant="caption" tone="subtle">
              Change
            </AppText>
          </Pressable>
          <Controller
            control={control}
            name="details"
            render={({ field }) => (
              <TextField
                label="Additional details"
                accessibilityLabel="Additional report details"
                placeholder="Tell us what happened…"
                multiline
                numberOfLines={4}
                maxLength={2000}
                inputStyle={{ minHeight: 112, textAlignVertical: "top" }}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!isSubmitting}
                errorText={errors.details?.message}
              />
            )}
          />
          <ChatSafetyPanel icon={Info}>
            <AppText variant="caption" tone="subtle">
              Up to 20 recent messages will be included. {name} won’t be
              notified who submitted this report.
            </AppText>
          </ChatSafetyPanel>
          {alreadyBlocked ? (
            <AppText variant="caption" tone="subtle">
              You’ve already blocked {name}. Reporting won’t change that.
            </AppText>
          ) : (
            <ChatSafetyToggle
              icon={Ban}
              label={`Also block ${name}`}
              description="Stop messages. Keep your chat history."
              value={block}
              onChange={(value) => setValue("block", value)}
              disabled={isSubmitting}
            />
          )}
        </>
      )}
      {step === "sent" && (
        <>
          <AppText
            variant="caption"
            tone="subtle"
            style={{ textAlign: "center" }}
          >
            {blocked
              ? `You’ve blocked ${name}. Your chat history and session registrations stay.`
              : `You can block ${name} at any time from the chat menu.`}
          </AppText>
        </>
      )}
    </ChatSafetySheet>
  );
}
const styles = StyleSheet.create({
  reasonSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[3],
    padding: sp[4],
    minHeight: 56,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 12,
    backgroundColor: c.surfaceRaised
  },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[3],
    minHeight: 52,
    padding: sp[3],
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 12
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.accent
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.surfaceRaised,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: sp[4]
  },
  successCheck: {
    position: "absolute",
    right: 8,
    bottom: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.brand,
    alignItems: "center",
    justifyContent: "center"
  }
});
