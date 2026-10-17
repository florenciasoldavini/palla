import { useRef, useState } from "react";
import { randomUUID } from "expo-crypto";
import { ChatInbox } from "@/features/chat/components/chat-inbox";
import {
  ChatThread,
  type PendingMessage
} from "@/features/chat/components/chat-thread";
import {
  toReplyQuote,
  type ChatMessage,
  type ConversationSummary
} from "@/features/chat/domain";
import { useLocalSearchParams, useRouter } from "expo-router";
const organizer = "90000000-0000-4000-8000-000000000001";
const player = "90000000-0000-4000-8000-000000000002";
const conversationId = "90000000-0000-4000-8000-000000000003";
const timestamp = (minutes: number) =>
  new Date(Date.now() - minutes * 60000).toISOString();
const initial: ChatMessage[] = [
  {
    id: "90000000-0000-4000-8000-000000000004",
    conversation_id: conversationId,
    sender_id: player,
    sequence: "1",
    body: "Hi! Is the entrance on Córdoba?",
    delivered_at: null,
    edited_at: null,
    deleted_at: null,
    revision: 1,
    created_at: timestamp(3)
  },
  {
    id: "90000000-0000-4000-8000-000000000005",
    conversation_id: conversationId,
    sender_id: organizer,
    sequence: "2",
    body: "Yes, use the main entrance. We’ll meet by reception.",
    delivered_at: null,
    edited_at: null,
    deleted_at: null,
    revision: 1,
    created_at: timestamp(2)
  },
  {
    id: "90000000-0000-4000-8000-000000000006",
    conversation_id: conversationId,
    sender_id: player,
    sequence: "3",
    body: "Perfect, thanks! See you there.",
    delivered_at: null,
    edited_at: null,
    deleted_at: null,
    revision: 1,
    created_at: timestamp(1)
  }
];
const summary: ConversationSummary = {
  conversation: {
    id: conversationId,
    organizer_id: organizer,
    player_id: player,
    source_session_id: null,
    created_at: timestamp(30)
  },
  other_participant: {
    id: player,
    first_name: "Carlos",
    last_name: "M.",
    avatar_url: null,
    playing_category: 7
  },
  other_role: "player",
  last_message: initial[2],
  unread_count: 2,
  other_read_sequence: "2",
  pinned_at: null,
  marked_unread: false,
  source_session: {
    id: conversationId,
    title: "Friday evening padel",
    starts_at: new Date().toISOString()
  }
};
export default function ChatPreview() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    view?: string;
    role?: string;
    long?: string;
    failReaction?: string;
  }>();
  const [thread, setThread] = useState(params.view === "thread");
  const [chatPrefs, setChatPrefs] = useState<
    Record<
      string,
      { pinned_at: string | null; marked_unread: boolean; hidden: boolean }
    >
  >({});
  const applyChatAction = async (
    id: string,
    action: import("@/features/chat/domain").ChatAction
  ) => {
    setChatPrefs((prev) => {
      const state = prev[id] ?? {
        pinned_at: null,
        marked_unread: false,
        hidden: false
      };
      return {
        ...prev,
        [id]: {
          ...state,
          pinned_at:
            action === "pin"
              ? new Date().toISOString()
              : action === "unpin" || action === "delete"
                ? null
                : state.pinned_at,
          marked_unread:
            action === "mark_unread"
              ? true
              : action === "mark_read" || action === "delete"
                ? false
                : state.marked_unread,
          hidden: action === "delete" ? true : state.hidden
        }
      };
    });
    if (action === "mark_read") setRead(true);
    if (action === "delete" && id === conversationId) {
      setMessages([]);
      setRead(true);
    }
  };
  const [messages, setMessages] = useState(() =>
    params.long === "1"
      ? initial.map((message, index) =>
          index === 1
            ? {
                ...message,
                body: "QA long message. Meet at the main entrance, bring your racket and arrive fifteen minutes before the session. "
                  .repeat(20)
                  .trim()
              }
            : message
        )
      : initial
  );
  const reactionFailed = useRef(false);
  const [replyId, setReplyId] = useState<string | null>(null);
  const original = messages.find((message) => message.id === replyId);
  const presented = messages.map((message) => {
    const target = messages.find((row) => row.id === message.reply_to_id);
    return { ...message, reply: target ? toReplyQuote(target) : null };
  });
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [read, setRead] = useState(params.view === "thread");
  const actor = params.role === "player" ? player : organizer;
  const selected =
    params.role === "player"
      ? {
          ...summary,
          other_role: "organizer" as const,
          other_participant: {
            ...summary.other_participant,
            id: organizer,
            first_name: "Flor",
            last_name: "Soldavini",
            playing_category: null
          }
        }
      : summary;
  const inbox = [
    {
      ...selected,
      unread_count: read ? 0 : 2,
      last_message: messages.at(-1) ?? null
    },
    {
      ...summary,
      conversation: {
        ...summary.conversation,
        id: "90000000-0000-4000-8000-000000000007"
      },
      other_participant: {
        ...summary.other_participant,
        id: "90000000-0000-4000-8000-000000000020",
        first_name: "Sofía",
        last_name: "T.",
        playing_category: 6
      },
      unread_count: 0,
      last_message: { ...initial[2], body: "Thanks, see you on Friday!" }
    },
    {
      ...summary,
      conversation: {
        ...summary.conversation,
        id: "90000000-0000-4000-8000-000000000008"
      },
      other_participant: {
        ...summary.other_participant,
        id: "90000000-0000-4000-8000-000000000021",
        first_name: "Elena",
        last_name: "G.",
        playing_category: 5
      },
      unread_count: 0,
      last_message: { ...initial[1], body: "Yes, rackets are available." }
    }
  ];
  const dispatch = (row: PendingMessage, retry = false) => {
    setPending((rows) => [
      ...rows.filter((r) => r.id !== row.id),
      { ...row, state: "sending" }
    ]);
    setTimeout(() => {
      if (row.body === "QA fail" && !retry) {
        setPending((rows) =>
          rows.map((r) => (r.id === row.id ? { ...r, state: "failed" } : r))
        );
        return;
      }
      setMessages((rows) => [
        ...rows,
        {
          id: row.id,
          conversation_id: conversationId,
          sender_id: actor,
          sequence: String(Number(rows.at(-1)?.sequence ?? 0) + 1),
          body: row.body,
          reply_to_id: row.reply_to_id,
          delivered_at: null,
          edited_at: null,
          deleted_at: null,
          revision: 1,
          created_at: row.created_at
        }
      ]);
      setPending((rows) => rows.filter((r) => r.id !== row.id));
    }, 600);
  };
  return thread ? (
    <ChatThread
      summary={{
        ...selected,
        unread_count: read ? 0 : 2,
        ...(chatPrefs[conversationId] ?? {})
      }}
      onEdit={async (message, body) => {
        if (body === "QA fail") throw new Error("Simulated update failure");
        setMessages((rows) =>
          rows.map((row) =>
            row.id === message.id
              ? {
                  ...row,
                  body,
                  edited_at: new Date().toISOString(),
                  revision: row.revision + 1
                }
              : row
          )
        );
      }}
      onDelete={async (message) => {
        setMessages((rows) =>
          rows.map((row) =>
            row.id === message.id
              ? {
                  ...row,
                  body: null,
                  deleted_at: new Date().toISOString(),
                  revision: row.revision + 1
                }
              : row
          )
        );
      }}
      actorId={actor}
      messages={presented}
      reply={original ? toReplyQuote(original) : null}
      onReply={(message) => setReplyId(message.id)}
      onCancelReply={() => setReplyId(null)}
      onReact={async (message, emoji) => {
        if (params.failReaction === "1" && !reactionFailed.current) {
          reactionFailed.current = true;
          throw Error("Simulated reaction failure");
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
        setMessages((rows) =>
          rows.map((row) =>
            row.id === message.id
              ? {
                  ...row,
                  reactions: [
                    ...(row.reactions ?? []).filter(
                      (reaction) => reaction.profile_id !== actor
                    ),
                    ...(emoji ? [{ profile_id: actor, emoji }] : [])
                  ]
                }
              : row
          )
        );
      }}
      pending={pending}
      onReload={() => {}}
      onBack={() => setThread(false)}
      onSend={(body, replyTo) => {
        setReplyId(null);
        dispatch({
          id: randomUUID(),
          body,
          reply_to_id: replyTo,
          created_at: new Date().toISOString(),
          state: "sending"
        });
      }}
      onRetry={(row) => dispatch(row, true)}
      preview
    />
  ) : (
    <ChatInbox
      previewOnlineIds={[selected.other_participant.id]}
      conversations={inbox
        .map((row) => ({ ...row, ...(chatPrefs[row.conversation.id] ?? {}) }))
        .filter((row) => !row.hidden)
        .sort((a, b) => (b.pinned_at ?? "").localeCompare(a.pinned_at ?? ""))}
      onChatAction={applyChatAction}
      actorId={actor}
      onOpen={() => {
        setRead(true);
        setChatPrefs((prev) => ({
          ...prev,
          [conversationId]: {
            pinned_at: prev[conversationId]?.pinned_at ?? null,
            marked_unread: false,
            hidden: false
          }
        }));
        setThread(true);
      }}
      onReload={() => {}}
      onBack={() =>
        router.canGoBack()
          ? router.back()
          : router.replace("/sessions-preview/occurrence")
      }
      preview
    />
  );
}
