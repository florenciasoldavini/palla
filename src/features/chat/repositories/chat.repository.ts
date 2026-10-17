import { refreshOnlineTopics } from "./chat-presence.repository";
import {
  requireSupabase,
  toRepositoryError
} from "@/infrastructure/supabase/repository-helpers";
import { OutboxSendError } from "../offline-errors";
import { typingPayloadSchema, type SendMessageInput } from "../domain";
import type { InboxCursor, InboxFilter } from "../inbox-domain";
async function rpc(name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw toRepositoryError(error);
  return data;
}
export const setBlock = (id: string, blocked: boolean) =>
  rpc("set_chat_block", { p_conversation_id: id, p_blocked: blocked });
export { refreshOnlineTopics };
export const fetchConversations = (id?: string) =>
  rpc("list_chat_conversations", { p_conversation_id: id ?? null });
export async function fetchReadPosition(id: string, actorId: string) {
  const { data, error } = await requireSupabase()
    .from("chat_reads")
    .select("through_sequence::text")
    .eq("conversation_id", id)
    .eq("profile_id", actorId)
    .maybeSingle();
  if (error) throw toRepositoryError(error);
  return data;
}
export const fetchMessages = (id: string, before?: string) =>
  rpc("get_chat_messages", {
    p_conversation_id: id,
    p_before_sequence: before ?? null
  });
export const fetchMessage = (id: string) =>
  rpc("get_chat_message", { p_id: id });
export const fetchInboxPage = (
  search: string,
  unread: boolean,
  cursor?: InboxCursor,
  filter?: InboxFilter
) =>
  rpc("list_chat_inbox_filtered", {
    p_search: search,
    p_filter: filter ?? (unread ? "unread" : "all"),
    p_cursor: cursor ?? null,
    p_limit: 30
  });
export const startConversation = (
  organizerId: string,
  playerId: string,
  sessionId?: string
) =>
  rpc("start_chat", {
    p_organizer_id: organizerId,
    p_player_id: playerId,
    p_source_session_id: sessionId ?? null
  });
export const writeMessage = (input: SendMessageInput) =>
  rpc("send_chat_message", {
    p_id: input.id,
    p_conversation_id: input.conversation_id,
    p_body: input.body,
    p_reply_to_id: input.reply_to_id ?? null
  });
export const writeReadPosition = (conversationId: string, sequence: string) =>
  rpc("mark_chat_read", {
    p_conversation_id: conversationId,
    p_through_sequence: sequence
  });

export function watchChat(
  actorId: string,
  token: string,
  onChange: () => void,
  onStatus: (status: "connecting" | "live" | "offline") => void,
  contextOrganizers: string[] = [actorId]
) {
  const client = requireSupabase();
  let closed = false;
  let channel: ReturnType<typeof client.channel> | undefined;
  onStatus("connecting");
  void client.realtime
    .setAuth(token)
    .then(() => {
      if (closed) return;
      channel = client
        .channel(`chat:${actorId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chat_conversations" },
          () => {
            if (!closed) {
              refreshOnlineTopics();
              onChange();
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "registrations" },
          () => {
            if (!closed) onChange();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "sessions",
            filter: `organizer_id=in.(${contextOrganizers.slice(0, 100).join(",")})`
          },
          () => {
            if (!closed) onChange();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chat_reactions" },
          () => {
            if (!closed) onChange();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chat_messages" },
          () => {
            if (!closed) onChange();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_reads"
          },
          () => {
            if (!closed) onChange();
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_deliveries" },
          () => {
            if (!closed) onChange();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_preferences",
            filter: `profile_id=eq.${actorId}`
          },
          () => {
            if (!closed) onChange();
          }
        )
        .subscribe((status) => {
          if (closed) return;
          onStatus(
            status === "SUBSCRIBED"
              ? "live"
              : status === "CHANNEL_ERROR" ||
                  status === "TIMED_OUT" ||
                  status === "CLOSED"
                ? "offline"
                : "connecting"
          );
          if (status === "SUBSCRIBED") onChange(); // Catch events missed during a reconnect.
        });
    })
    .catch(() => {
      if (!closed) onStatus("offline");
    });
  return () => {
    closed = true;
    if (channel) void client.removeChannel(channel);
  };
}

export const writeDeliveries = (ids: string[]) =>
  rpc("acknowledge_chat_deliveries", { p_message_ids: ids });

/** Private ephemeral hints. Never broadcast message contents. */
export function watchTyping(
  id: string,
  actor: string,
  peer: string,
  token: string,
  onTyping: (typing: boolean) => void
) {
  const client = requireSupabase();
  let closed = false;
  let ready = false;
  let desired = false;
  let channel: ReturnType<typeof client.channel> | undefined;
  const publish = () => {
    if (ready && channel)
      void channel
        .send({
          type: "broadcast",
          event: "typing",
          payload: { actor_id: actor, typing: desired }
        })
        .catch(() => undefined);
  };
  void client.realtime
    .setAuth(token)
    .then(async () => {
      if (closed) return;
      const topic = await rpc("get_chat_typing_topic", {
        p_conversation_id: id
      });
      if (closed) return;
      channel = client
        .channel(topic, {
          config: { private: true, broadcast: { self: false } }
        })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          const parsed = typingPayloadSchema.safeParse(payload);
          if (!closed && parsed.success && parsed.data.actor_id === peer)
            onTyping(parsed.data.typing);
        })
        .subscribe((status) => {
          if (closed) return;
          ready = status === "SUBSCRIBED";
          if (ready) publish();
          else onTyping(false);
        });
    })
    .catch(() => {
      if (!closed) onTyping(false);
    });
  return {
    setTyping(value: boolean) {
      desired = value;
      publish();
    },
    stop() {
      desired = false;
      publish();
      closed = true;
      ready = false;
      if (channel) void client.removeChannel(channel);
    }
  };
}

export const editMessage = (id: string, body: string, revision: number) =>
  rpc("edit_chat_message", { p_id: id, p_body: body, p_revision: revision });
export const deleteMessage = (id: string, revision: number) =>
  rpc("delete_chat_message", { p_id: id, p_revision: revision });
export const setReaction = (id: string, emoji: string | null) =>
  rpc("set_chat_reaction", { p_message_id: id, p_emoji: emoji });
export const updatePreferences = (id: string, action: string) =>
  rpc("update_chat_preferences", { p_conversation_id: id, p_action: action });

export async function writeQueuedMessage(
  actor: string,
  input: SendMessageInput,
  signal: AbortSignal
) {
  const client = requireSupabase();
  const {
    data: { session }
  } = await client.auth.getSession();
  if (!session || session.user.id !== actor || signal.aborted)
    throw new OutboxSendError(true);
  // Freeze the checked account's token; a later account switch cannot change this request's sender.
  const { data, error, status } = await client
    .rpc("send_chat_message", {
      p_id: input.id,
      p_conversation_id: input.conversation_id,
      p_body: input.body,
      p_reply_to_id: input.reply_to_id ?? null
    })
    .setHeader("Authorization", `Bearer ${session.access_token}`)
    .abortSignal(signal);
  if (error) {
    const transient =
      status === 0 ||
      status === 401 ||
      status === 408 ||
      status === 429 ||
      status >= 500 ||
      /rate limit|too many|30 messages/i.test(error.message);
    throw new OutboxSendError(transient);
  }
  return data;
}

export const fetchConversationSearch = (
  id: string,
  term: string,
  index: number
) =>
  rpc("search_chat_messages", {
    p_conversation_id: id,
    p_search: term,
    p_index: index
  });
