import { FieldSurface } from "@/components/atoms/field-surface";
import { AppButton, AppText, TextField } from "@/components/atoms";
import { atomSpacing as sp } from "@/components/atoms/theme";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Check, Pencil, X, ImagePlus } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ReplyQuote } from "../domain";
import { ChatReplyQuote } from "./chat-reply-quote";
import { View } from "react-native";
import { z } from "zod";
import { messageBodySchema } from "../domain";
// Drafts may be empty; only submitted messages require nonblank text.
const schema = z.object({ body: z.string().max(4000) });
export function ChatComposer({
  onSend,
  onTypingChange,
  editing,
  onCancelEdit,
  onSaveEdit,
  saving = false,
  editError,
  initialDraft = "",
  draftReady = true,
  onDraftChange,
  reply,
  replyAuthor = "Palla member",
  onCancelReply,
  sendDisabled = false,
  onPickPhoto,
  pickingPhoto = false,
  clearDraftVersion = 0
}: {
  onPickPhoto?: (caption: string) => void;
  pickingPhoto?: boolean;
  clearDraftVersion?: number;
  initialDraft?: string;
  draftReady?: boolean;
  onDraftChange?: (body: string) => void;
  reply?: ReplyQuote | null;
  replyAuthor?: string;
  onCancelReply?: () => void;
  sendDisabled?: boolean;
  editing?: ChatMessage | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (body: string) => void;
  saving?: boolean;
  editError?: string | null;
  onSend: (body: string) => void | Promise<void>;
  onTypingChange?: (hasText: boolean) => void;
}) {
  const { control, handleSubmit, watch, reset, getValues } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { body: "" }
  });
  const [committing, setCommitting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const hydrated = useRef(false);
  const initialBody = useRef(initialDraft);
  initialBody.current = initialDraft;
  useEffect(() => {
    if (draftReady && !hydrated.current) {
      reset({ body: initialBody.current });
      hydrated.current = true;
    }
  }, [draftReady, reset]);
  useEffect(() => {
    if (clearDraftVersion) reset({ body: "" });
  }, [clearDraftVersion, reset]);
  const previous = useRef<string | undefined>(undefined);
  const draft = useRef("");
  const editingId = editing?.id;
  const editingBody = useRef(editing?.body ?? "");
  editingBody.current = editing?.body ?? "";
  useEffect(() => {
    if (editingId) {
      if (!previous.current) draft.current = getValues("body");
      reset({ body: editingBody.current });
    } else if (previous.current) reset({ body: draft.current });
    previous.current = editingId;
  }, [editingId, getValues, reset]);
  return (
    <FieldSurface surface="white">
      <View style={{ gap: sp[2] }}>
        {!editing && reply && (
          <ChatReplyQuote
            quote={reply}
            author={replyAuthor}
            composer
            onCancel={onCancelReply}
          />
        )}
        {editing && (
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: sp[2] }}
          >
            <Pencil size={16} />
            <AppText variant="caption" style={{ flex: 1 }}>
              Editing message
            </AppText>
            <AppButton
              variant="ghost"
              layout="icon"
              fullWidth={false}
              icon={X}
              accessibilityLabel="Cancel editing"
              isDisabled={saving}
              onPress={onCancelEdit}
            />
          </View>
        )}

        <View
          style={{ flexDirection: "row", alignItems: "flex-end", gap: sp[2] }}
        >
          {!editing && onPickPhoto && (
            <AppButton
              variant="ghost"
              layout="icon"
              icon={ImagePlus}
              fullWidth={false}
              accessibilityLabel="Choose photo"
              loading={pickingPhoto}
              isDisabled={sendDisabled || !draftReady || committing || saving}
              onPress={() => onPickPhoto(getValues("body"))}
            />
          )}
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="body"
              render={({ field }) => (
                <TextField
                  key={editing?.id ?? reply?.id ?? "draft"}
                  autoFocus={!!editing || !!reply}
                  editable={!saving && !committing && draftReady}
                  accessibilityLabel="Write a message"
                  placeholder="Write a message…"
                  multiline
                  scrollEnabled
                  inputStyle={{ maxHeight: 144 }}
                  maxLength={4000}
                  value={field.value}
                  onChangeText={(text) => {
                    field.onChange(text);
                    if (!editing) onDraftChange?.(text);
                    setSendError(null);
                    onTypingChange?.(!!text.trim());
                  }}
                  onBlur={() => {
                    field.onBlur();
                    onTypingChange?.(false);
                  }}
                />
              )}
            />
          </View>
          <AppButton
            layout="icon"
            fullWidth={false}
            color="essential"
            icon={editing ? Check : Send}
            accessibilityLabel={
              editing ? "Save message changes" : "Send message"
            }
            loading={saving || committing}
            isDisabled={
              sendDisabled ||
              !draftReady ||
              committing ||
              saving ||
              !watch("body").trim() ||
              (!!editing && watch("body").trim() === editing.body)
            }
            onPress={handleSubmit(async ({ body }) => {
              const message = messageBodySchema.safeParse(body);
              if (!message.success) return;
              onTypingChange?.(false);
              if (editing) {
                onSaveEdit?.(message.data);
                return;
              }
              setCommitting(true);
              try {
                await onSend(message.data);
                reset({ body: "" });
                setSendError(null);
              } catch {
                setSendError(
                  "Couldn’t save this message on your device. Your text is still here. Try again."
                );
              } finally {
                setCommitting(false);
              }
            })}
          />
        </View>
        {!draftReady && (
          <AppText variant="caption" tone="subtle">
            Loading saved draft…
          </AppText>
        )}
        {sendError && (
          <AppText
            variant="caption"
            tone="danger"
            accessibilityLiveRegion="polite"
          >
            {sendError}
          </AppText>
        )}
        {editError && (
          <AppText
            variant="caption"
            tone="danger"
            accessibilityLiveRegion="polite"
          >
            {editError}
          </AppText>
        )}
      </View>
    </FieldSurface>
  );
}
