import { useRef, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { AppButton } from "@/components/atoms";
import { ChatThread } from "@/features/chat/components/chat-thread";
import type { ChatMessage, ConversationSummary } from "@/features/chat/domain";
const actor = "98000000-0000-4000-8000-000000000001",
  peer = "98000000-0000-4000-8000-000000000002",
  id = "98000000-0000-4000-8000-000000000003";
const make = (
  n: number,
  sender = n % 2 ? peer : actor,
  body = `Padel coordination ${n} · See you at the club.`
): ChatMessage => ({
  id: `98000000-0000-4000-8001-${String(n).padStart(12, "0")}`,
  conversation_id: id,
  sender_id: sender,
  sequence: String(n),
  body,
  created_at: new Date(Date.UTC(2026, 9, 16, 12, n)).toISOString(),
  edited_at: null,
  deleted_at: null,
  delivered_at: null,
  revision: 1
});
const summary: ConversationSummary = {
  conversation: {
    id,
    organizer_id: actor,
    player_id: peer,
    source_session_id: null,
    created_at: "2026-10-16T12:00:00Z"
  },
  other_participant: {
    id: peer,
    first_name: "Carlos",
    last_name: "M.",
    avatar_url: null,
    playing_category: 7
  },
  other_role: "player",
  last_message: null,
  unread_count: 0,
  other_read_sequence: null,
  pinned_at: null,
  marked_unread: false,
  source_session: null
};
export default function ChatLatestPreview() {
  const router = useRouter();
  const [messages, setMessages] = useState(() =>
    Array.from({ length: 60 }, (_, i) => make(i + 21))
  );
  const serial = useRef(80);
  const [older, setOlder] = useState(false);
  const [epoch, setEpoch] = useState(0);
  return (
    <View style={{ flex: 1 }}>
      <ChatThread
        key={epoch}
        searchLoader={async () => ({
          total: 0,
          index: null,
          selected_id: null,
          messages: []
        })}
        summary={summary}
        actorId={actor}
        messages={messages}
        preview
        online
        draftReady
        initialDraft="Bring the extra balls"
        onReload={() => {}}
        onRetry={() => {}}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/sign-in")
        }
        onSend={(body) =>
          setMessages((rows) => [...rows, make(++serial.current, actor, body)])
        }
        hasEarlier={!older}
        onEarlier={async () => {
          setOlder(true);
          setMessages((rows) => [
            ...Array.from({ length: 20 }, (_, i) => make(i + 1)),
            ...rows
          ]);
        }}
      />
      <View style={{ flexDirection: "row", padding: 4, gap: 4 }}>
        <AppButton
          size="sm"
          style={{ flex: 1 }}
          onPress={() =>
            setMessages((rows) => [
              ...rows,
              ...Array.from({ length: 3 }, () =>
                make(++serial.current, peer, `New QA arrival ${serial.current}`)
              )
            ])
          }
        >
          Receive 3 QA
        </AppButton>
        <AppButton
          size="sm"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() =>
            setMessages((rows) =>
              rows.map((m) => ({ ...m, revision: m.revision + 1 }))
            )
          }
        >
          Refresh QA
        </AppButton>
        <AppButton
          size="sm"
          variant="ghost"
          fullWidth={false}
          onPress={() => {
            serial.current = 80;
            setOlder(false);
            setMessages(Array.from({ length: 60 }, (_, i) => make(i + 21)));
            setEpoch((e) => e + 1);
          }}
        >
          Reset QA
        </AppButton>
      </View>
    </View>
  );
}
