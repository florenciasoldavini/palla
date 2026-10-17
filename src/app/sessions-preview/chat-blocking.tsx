import { useState } from "react";
import { View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { AppButton } from "@/components/atoms";
import { ChatInbox } from "@/features/chat/components/chat-inbox";
import { ChatThread } from "@/features/chat/components/chat-thread";
import type {
  ChatMessage,
  ConversationSummary,
  ChatAction
} from "@/features/chat/domain";
const actor = "99000000-0000-4000-8000-000000000001",
  peer = "99000000-0000-4000-8000-000000000002",
  id = "99000000-0000-4000-8000-000000000003";
const message = (n: number, body: string, sender: string): ChatMessage => ({
  id: `99000000-0000-4000-8001-${String(n).padStart(12, "0")}`,
  conversation_id: id,
  sender_id: sender,
  sequence: String(n),
  body,
  created_at: "2026-10-16T12:00:00Z",
  edited_at: null,
  deleted_at: null,
  revision: 1,
  delivered_at: null
});
const history = [
  message(1, "The club confirmed our court booking.", peer),
  message(2, "Great, I’ll bring the balls.", actor)
];
export default function ChatBlockingPreviewRoute() {
  const { run } = useLocalSearchParams<{ run?: string }>();
  return <ChatBlockingPreview key={run ?? "default"} />;
}
function ChatBlockingPreview() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [own, setOwn] = useState(false);
  const [other, setOther] = useState(false);
  const [fail, setFail] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [markedUnread, setMarkedUnread] = useState(false);
  const [pinnedAt, setPinnedAt] = useState<string | null>(null);
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
    last_message: cleared ? null : history[1],
    unread_count: 0,
    other_read_sequence: "2",
    pinned_at: pinnedAt,
    marked_unread: markedUnread,
    source_session: null,
    blocked_by_me: own,
    messaging_available: !own && !other
  };
  const action = async (_id: string, kind: ChatAction) => {
    await new Promise((r) => setTimeout(r, 400));
    if (fail) {
      setFail(false);
      throw Error("QA failure");
    }
    if (kind === "block") setOwn(true);
    if (kind === "unblock") setOwn(false);
    if (kind === "delete") setCleared(true);
    if (kind === "mark_unread") setMarkedUnread(true);
    if (kind === "mark_read" || kind === "delete") setMarkedUnread(false);
    if (kind === "pin") setPinnedAt(new Date().toISOString());
    if (kind === "unpin" || kind === "delete") setPinnedAt(null);
  };
  return (
    <View style={{ flex: 1 }}>
      {open ? (
        <ChatThread
          summary={summary}
          actorId={actor}
          messages={cleared ? [] : history}
          preview
          online
          typing={false}
          draftReady
          initialDraft="Bring the extra balls"
          searchLoader={async () => ({
            total: 0,
            index: null,
            selected_id: null,
            messages: []
          })}
          onReload={() => {}}
          onSend={() => {}}
          onRetry={() => {}}
          onBack={() => setOpen(false)}
          onUnblock={() => action(id, "unblock")}
        />
      ) : (
        <ChatInbox
          conversations={[summary]}
          actorId={actor}
          preview
          previewOnlineIds={[peer]}
          onOpen={() => {
            setMarkedUnread(false);
            setOpen(true);
          }}
          onReport={async (input) => {
            await new Promise((r) => setTimeout(r, 400));
            if (fail) {
              setFail(false);
              throw Error("unavailable");
            }
            if (input.block) setOwn(true);
            return { id: input.id, blocked: input.block };
          }}
          onChatAction={action}
          onReload={() => {}}
          onBack={() => router.back()}
        />
      )}
      <View style={{ flexDirection: "row", padding: 4, gap: 4 }}>
        <AppButton
          size="sm"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => setOther((v) => !v)}
        >
          Other block QA
        </AppButton>
        <AppButton
          size="sm"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => setFail(true)}
        >
          Fail next QA
        </AppButton>
      </View>
    </View>
  );
}
