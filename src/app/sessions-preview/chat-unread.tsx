import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppButton } from "@/components/atoms";
import { ChatThread } from "@/features/chat/components/chat-thread";
import type { ChatMessage, ConversationSummary } from "@/features/chat/domain";

const actor = "97000000-0000-4000-8000-000000000001";
const peer = "97000000-0000-4000-8000-000000000002";
const id = "97000000-0000-4000-8000-000000000003";
const make = (n: number, body: string, sender = peer): ChatMessage => ({
  id: `97000000-0000-4000-8001-${String(n).padStart(12, "0")}`,
  conversation_id: id,
  sequence: String(n),
  sender_id: sender,
  body,
  created_at: new Date(Date.UTC(2026, 9, 16, 12, n)).toISOString(),
  deleted_at: null,
  edited_at: null,
  delivered_at: null,
  revision: 1
});
const history = [
  make(1, "The club confirmed our court booking."),
  make(2, "Great, I’ll bring the balls.", actor),
  make(3, "We’re on court 3 today."),
  make(4, "Can you get there 10 minutes early?")
];

export default function ChatUnreadPreview() {
  const { run } = useLocalSearchParams<{ run?: string }>();
  return <UnreadPreview key={run ?? "default"} />;
}

function UnreadPreview() {
  const router = useRouter();
  const [messages, setMessages] = useState(history);
  const [through, setThrough] = useState("2");
  const [epoch, setEpoch] = useState(0);
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
    last_message: messages.at(-1) ?? null,
    unread_count: through === "2" ? 2 : 0,
    marked_unread: false,
    pinned_at: null,
    other_read_sequence: "2",
    source_session: null
  };
  return (
    <View style={{ flex: 1 }}>
      <ChatThread
        key={epoch}
        summary={summary}
        actorId={actor}
        initialReadSequence={through}
        messages={messages}
        preview
        online
        draftReady
        initialDraft=""
        searchLoader={async () => ({
          total: 0,
          index: null,
          selected_id: null,
          messages: []
        })}
        onReload={() => {}}
        onRetry={() => {}}
        onSend={(body) =>
          setMessages((rows) => [...rows, make(rows.length + 1, body, actor)])
        }
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/messages")
        }
      />
      <View style={{ flexDirection: "row", padding: 4 }}>
        <AppButton
          size="sm"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => setThrough(messages.at(-1)!.sequence)}
        >
          Read sync QA
        </AppButton>
        <AppButton
          size="sm"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() =>
            setMessages((rows) => [
              ...rows,
              make(rows.length + 1, "See you at the club!")
            ])
          }
        >
          Receive QA
        </AppButton>
        <AppButton
          size="sm"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => {
            setThrough(messages.at(-1)!.sequence);
            setEpoch((v) => v + 1);
          }}
        >
          Reopen read QA
        </AppButton>
      </View>
    </View>
  );
}
