import { useRouter } from "expo-router";
import { ChatThread } from "@/features/chat/components/chat-thread";
import type { ChatMessage, ConversationSummary } from "@/features/chat/domain";
import type { OutboxEntry } from "@/features/chat/repositories/chat-local.repository";

const actor = "95300000-0000-4000-8000-000000000001";
const peer = "95300000-0000-4000-8000-000000000002";
const id = "95300000-0000-4000-8000-000000000003";
const make = (n: number, body: string, sender = peer): ChatMessage => ({
  id: `95300000-0000-4000-8001-${String(n).padStart(12, "0")}`,
  conversation_id: id,
  sequence: String(n),
  sender_id: sender,
  body,
  created_at: `2026-10-16T20:0${n}:00Z`,
  deleted_at: null,
  edited_at: null,
  delivered_at: null,
  revision: 1
});
const messages = [
  make(1, "Which court are we playing on?"),
  make(2, "Court 3. I’ll send you a photo.", actor),
  make(3, "Perfect, see you there!")
];
const summary: ConversationSummary = {
  conversation: {
    id,
    organizer_id: actor,
    player_id: peer,
    source_session_id: null,
    created_at: messages[0].created_at
  },
  other_participant: {
    id: peer,
    first_name: "Carlos",
    last_name: "M.",
    avatar_url: null,
    playing_category: 7
  },
  other_role: "player",
  last_message: messages.at(-1)!,
  unread_count: 0,
  marked_unread: false,
  pinned_at: null,
  other_read_sequence: "3",
  source_session: null
};
const pending: OutboxEntry[] = [
  {
    id: "95300000-0000-4000-8000-000000000099",
    conversation_id: id,
    body: "",
    created_at: "2026-10-16T20:04:00Z",
    order: 1,
    state: "queued",
    attempts: 0,
    nextAttempt: 0,
    failure: null,
    photo: {
      id: "95300000-0000-4000-8000-000000000099",
      uri: "file:///palla-qa-missing-photo.jpg",
      width: 1536,
      height: 1024,
      size: 100
    }
  }
];
/** Real conversation layout, synthetic missing local photo, no server writes. */
export default function PhotoErrorsPreview() {
  const router = useRouter();
  return (
    <ChatThread
      summary={summary}
      actorId={actor}
      messages={messages}
      pending={pending}
      preview
      online
      draftReady
      initialDraft=""
      onSend={async () => {}}
      onRetry={() => {}}
      onReload={() => {}}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/messages")
      }
    />
  );
}
