import { ChatThread } from "@/features/chat/components/chat-thread";
import type { ChatMessage, ConversationSummary } from "@/features/chat/domain";
import type { ChatSearchLoader } from "@/features/chat/search-domain";
import { useRouter } from "expo-router";
const actor = "94000000-0000-4000-8000-000000000001";
const peer = "94000000-0000-4000-8000-000000000002";
const id = "94000000-0000-4000-8000-000000000003";
const history: ChatMessage[] = Array.from({ length: 120 }, (_, i) => ({
  id: `94000000-0000-4000-8001-${String(i + 1).padStart(12, "0")}`,
  conversation_id: id,
  sender_id: i % 2 ? actor : peer,
  sequence: String(i + 1),
  body:
    i === 4
      ? "Court 2, next to the entrance."
      : i === 60
        ? "Which court did we get?"
        : i === 118
          ? "The club confirmed our court booking."
          : `Session update ${i + 1} · See you at the club.`,
  created_at: new Date(Date.UTC(2026, 9, 16, 12, i)).toISOString(),
  edited_at: null,
  deleted_at: null,
  delivered_at: null,
  revision: 1
}));
const summary: ConversationSummary = {
  conversation: {
    id,
    organizer_id: actor,
    player_id: peer,
    source_session_id: null,
    created_at: history[0].created_at
  },
  other_participant: {
    id: peer,
    first_name: "Carlos",
    last_name: "M.",
    avatar_url: null,
    playing_category: 7
  },
  other_role: "player",
  last_message: history.at(-1)!,
  unread_count: 0,
  other_read_sequence: "120",
  pinned_at: null,
  marked_unread: false,
  source_session: null
};
const search: ChatSearchLoader = async (_, term, index) => {
  await new Promise((resolve) => setTimeout(resolve, 700));
  if (term.toLowerCase() === "qa fail")
    throw new Error("Simulated search failure");
  const matches = history
    .filter((m) => m.body!.toLowerCase().includes(term.toLowerCase()))
    .reverse();
  const n = Math.min(index, matches.length - 1);
  const selected = matches[n];
  const position = history.findIndex((m) => m.id === selected?.id);
  return {
    total: matches.length,
    index: selected ? n : null,
    selected_id: selected?.id ?? null,
    messages: selected
      ? history.slice(Math.max(0, position - 12), position + 13)
      : []
  };
};
export default function ChatSearchPreview() {
  const router = useRouter();
  return (
    <ChatThread
      summary={summary}
      actorId={actor}
      messages={history.slice(-50)}
      initialDraft="Bring the extra balls 🎾"
      draftReady
      searchLoader={search}
      preview
      online
      onReload={() => {}}
      onSend={() => {}}
      onRetry={() => {}}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/sign-in")
      }
    />
  );
}
