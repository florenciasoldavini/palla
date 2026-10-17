import { AppButton, AppText } from "@/components/atoms";
import { ChatThread } from "@/features/chat/components/chat-thread";
import { useChatLocal } from "@/features/chat/hooks/use-chat-local";
import { chatLocalStore } from "@/features/chat/services/chat-offline.service";
import {
  createOfflineQaRunner,
  loadOfflineQaLedger,
  offlineQaAccounts,
  offlineQaConversation as id
} from "@/features/chat/services/offline-qa.service";
import { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import type { ChatMessage, ConversationSummary } from "@/features/chat/domain";
import { useRouter } from "expo-router";
export default function OfflineChatPreview() {
  const router = useRouter();
  const [account, setAccount] = useState(0),
    [connected, setConnected] = useState(false),
    [open, setOpen] = useState(true),
    [messages, setMessages] = useState<ChatMessage[]>([]);
  const actor = offlineQaAccounts[account];
  const local = useChatLocal(actor, id);
  const refresh = useCallback(async () => {
    const rows = await loadOfflineQaLedger(actor);
    setMessages(
      rows.map((row, index) => ({
        id: row.id,
        conversation_id: id,
        sender_id: actor,
        sequence: String(index + 1),
        body: row.body,
        created_at: row.created_at,
        revision: 1,
        edited_at: null,
        deleted_at: null,
        delivered_at: null
      }))
    );
  }, [actor]);
  const runner = useMemo(
    () =>
      createOfflineQaRunner(() => {
        void refresh();
      }),
    [refresh]
  );
  useEffect(() => {
    let alive = true;
    void refresh();
    void chatLocalStore.recover(actor).then(() => {
      if (alive) runner.configure(actor, connected);
    });
    const stop = chatLocalStore.subscribe(() => runner.wake());
    const timer = setInterval(() => runner.wake(), 1000);
    return () => {
      alive = false;
      runner.configure(undefined, false);
      stop();
      clearInterval(timer);
    };
  }, [actor, connected, runner, refresh]);
  const summary: ConversationSummary = {
    conversation: {
      id,
      organizer_id: actor,
      player_id: "92000000-0000-4000-8000-000000000004",
      source_session_id: null,
      created_at: new Date().toISOString()
    },
    other_participant: {
      id: "92000000-0000-4000-8000-000000000004",
      first_name: "Offline",
      last_name: "QA",
      avatar_url: null,
      playing_category: 7
    },
    other_role: "player",
    last_message: messages.at(-1) ?? null,
    unread_count: 0,
    pinned_at: null,
    marked_unread: false,
    other_read_sequence: null,
    source_session: null
  };
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingTop: 50,
          paddingHorizontal: 16,
          backgroundColor: "#ffffff",
          gap: 4
        }}
      >
        <AppText variant="caption">
          Local QA · Account {account + 1} · {messages.length} delivered · no
          server writes
        </AppText>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <AppButton
            size="sm"
            fullWidth={false}
            onPress={() => setConnected(!connected)}
          >
            {connected ? "Go offline" : "Reconnect"}
          </AppButton>
          <AppButton
            size="sm"
            variant="ghost"
            fullWidth={false}
            onPress={() => {
              setAccount(1 - account);
              setConnected(false);
            }}
          >
            Switch account
          </AppButton>
        </View>
      </View>
      {open ? (
        <ChatThread
          key={actor}
          actorId={actor}
          summary={summary}
          messages={messages}
          pending={local.pending}
          initialDraft={local.initialDraft}
          draftReady={local.ready}
          onDraftChange={local.saveDraft}
          localError={local.error}
          onSend={local.enqueue}
          onRetry={(row) => local.retry(row.id)}
          onDiscard={(row) => local.discard(row.id)}
          onReload={() => void refresh()}
          onBack={() => setOpen(false)}
          connection={connected ? "live" : "offline"}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <AppButton onPress={() => setOpen(true)}>
            Reopen conversation
          </AppButton>
          <AppButton variant="ghost" onPress={() => router.back()}>
            Exit QA
          </AppButton>
        </View>
      )}
    </View>
  );
}
