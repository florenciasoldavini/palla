import { View } from "react-native";
import { useRouter } from "expo-router";
import { ChatThread } from "@/features/chat/components/chat-thread";
import { useChatLocal } from "@/features/chat/hooks/use-chat-local";
import { chatLocalStore } from "@/features/chat/services/chat-offline.service";
import { AppButton } from "@/components/atoms";
import type { ConversationSummary } from "@/features/chat/domain";
const actor = "95300000-0000-4000-8000-000000000001",
  peer = "95300000-0000-4000-8000-000000000002",
  id = "95300000-0000-4000-8000-000000000003";
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
  marked_unread: false,
  pinned_at: null,
  other_read_sequence: null,
  source_session: null
};
export default function PhotoPreviewRoute() {
  const local = useChatLocal(actor, id),
    router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <ChatThread
        summary={summary}
        actorId={actor}
        messages={[]}
        pending={local.pending}
        draftReady={local.ready}
        localError={local.error}
        initialDraft={local.initialDraft}
        onDraftChange={local.saveDraft}
        preview
        online
        onSend={async (body) => {
          await local.enqueue(body);
        }}
        onPhotoSend={async (body, photo, reply) => {
          await local.enqueuePhoto(body, photo, reply);
        }}
        onRetry={(row) => local.retry(row.id)}
        onDiscard={(row) => local.discard(row.id)}
        onReload={() => {}}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/messages")
        }
      />
      <View style={{ flexDirection: "row", padding: 4 }}>
        <AppButton
          size="sm"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => {
            const last = local.pending.at(-1);
            if (last)
              void chatLocalStore.patch(actor, last.id, {
                state: "failed",
                failure: "rejected"
              });
          }}
        >
          Fail photo QA
        </AppButton>
        <AppButton
          size="sm"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => {
            const last = local.pending.at(-1);
            if (last)
              void chatLocalStore.patch(actor, last.id, { state: "sending" });
          }}
        >
          Upload photo QA
        </AppButton>
      </View>
    </View>
  );
}
