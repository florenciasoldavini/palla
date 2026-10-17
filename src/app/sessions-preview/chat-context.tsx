import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { AppButton } from "@/components/atoms";
import { ChatInbox } from "@/features/chat/components/chat-inbox";
import { ChatThread } from "@/features/chat/components/chat-thread";
import type { ConversationSummary } from "@/features/chat/domain";
const actor = "97000000-0000-4000-8000-000000000001";
function row(
  n: number,
  name: string,
  upcoming: number,
  past: number,
  title: string
): ConversationSummary {
  const id = `97000000-0000-4000-8001-${String(n).padStart(12, "0")}`;
  const peer = `97000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  return {
    conversation: {
      id,
      organizer_id: actor,
      player_id: peer,
      source_session_id: "97000000-0000-4000-8002-000000000001",
      created_at: new Date().toISOString()
    },
    other_participant: {
      id: peer,
      first_name: name,
      last_name: "M.",
      avatar_url: null,
      playing_category: 7
    },
    other_role: "player",
    last_message: null,
    unread_count: 0,
    other_read_sequence: "0",
    pinned_at: null,
    marked_unread: n === 5,
    source_session: {
      id: "97000000-0000-4000-8002-000000000001",
      title: "Old static session",
      starts_at: "2026-01-01T19:00:00Z"
    },
    session_context: {
      upcoming_count: upcoming,
      past_count: past,
      next_session: upcoming
        ? {
            id: "97000000-0000-4000-8002-000000000002",
            title,
            starts_at: new Date(Date.now() + 86400000).toISOString(),
            ends_at: new Date(Date.now() + 90000000).toISOString()
          }
        : null
    }
  };
}
export default function ChatContextPreview() {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [phase, setPhase] = useState(0);
  const rows = [
    row(
      2,
      "Carlos",
      Math.max(0, 2 - phase),
      1,
      phase === 0 ? "Thursday social padel" : "Saturday social padel"
    ),
    row(3, "Elena", 1, 0, "Club evening"),
    row(4, "David", 0, 2, ""),
    row(5, "Sofia", 0, 0, "")
  ];
  const selected = rows.find((r) => r.conversation.id === open);
  if (selected)
    return (
      <View style={{ flex: 1 }}>
        <ChatThread
          summary={selected}
          actorId={actor}
          messages={[]}
          preview
          draftReady
          onReload={() => {}}
          onSend={() => {}}
          onRetry={() => {}}
          onBack={() => setOpen(null)}
        />
        {selected.other_participant.first_name === "Carlos" && phase < 2 ? (
          <AppButton onPress={() => setPhase((p) => p + 1)}>
            Cancel next QA session
          </AppButton>
        ) : null}
      </View>
    );
  return (
    <ChatInbox
      conversations={rows}
      actorId={actor}
      preview
      onOpen={setOpen}
      onReload={() => {}}
      onBack={() => router.back()}
    />
  );
}
