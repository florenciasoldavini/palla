import { AppText } from "@/components/atoms";
import { ChatThread } from "@/features/chat/components/chat-thread";
import {
  toReplyQuote,
  type ChatMessage,
  type ConversationSummary
} from "@/features/chat/domain";
import { useInfiniteQuery } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

const actor = "93000000-0000-4000-8000-000000000001";
const peer = "93000000-0000-4000-8000-000000000002";
const conversation = "93000000-0000-4000-8000-000000000003";
const history: ChatMessage[] = Array.from({ length: 120 }, (_, index) => ({
  id: `93000000-0000-4000-8001-${String(index + 1).padStart(12, "0")}`,
  conversation_id: conversation,
  sender_id: index % 2 ? actor : peer,
  sequence: String(index + 1),
  body: `QA message ${String(index + 1).padStart(3, "0")} · Session coordination.`,
  created_at: new Date(Date.UTC(2026, 9, 15, 12, index)).toISOString(),
  edited_at: null,
  deleted_at: null,
  delivered_at: null,
  revision: 1
}));
// A quote to an unloaded original exercises automatic history traversal.
history[119] = {
  ...history[119],
  reply_to_id: history[0].id,
  reply: toReplyQuote(history[0])
};
const summary: ConversationSummary = {
  conversation: {
    id: conversation,
    organizer_id: actor,
    player_id: peer,
    source_session_id: null,
    created_at: history[0].created_at
  },
  other_participant: {
    id: peer,
    first_name: "History",
    last_name: "QA",
    avatar_url: null,
    playing_category: null
  },
  other_role: "player",
  last_message: history.at(-1)!,
  unread_count: 0,
  other_read_sequence: null,
  pinned_at: null,
  marked_unread: false,
  source_session: null
};

export default function ChatPaginationPreview() {
  const params = useLocalSearchParams<{ fail?: string; slow?: string }>();
  return (
    <ChatPaginationCase
      key={`${params.fail}:${params.slow}`}
      fail={params.fail === "1"}
      slow={params.slow === "1"}
    />
  );
}

function ChatPaginationCase({ fail, slow }: { fail: boolean; slow: boolean }) {
  const router = useRouter();
  const [run] = useState(randomUUID);
  const [requests, setRequests] = useState(0);
  const failed = useRef(false);
  const messages = useInfiniteQuery({
    queryKey: ["qa-chat-pagination", run],
    initialPageParam: undefined as string | undefined,
    retry: false,
    queryFn: async ({ pageParam }) => {
      setRequests((count) => count + 1);
      await new Promise((resolve) =>
        setTimeout(resolve, pageParam && slow ? 4000 : 600)
      );
      if (pageParam && fail && !failed.current) {
        failed.current = true;
        throw Error("Simulated history failure");
      }
      return history
        .filter((row) => !pageParam || Number(row.sequence) < Number(pageParam))
        .slice(-50);
    },
    getNextPageParam: (page) =>
      page.length === 50 ? page[0].sequence : undefined
  });
  const items = [...(messages.data?.pages ?? [])].reverse().flat();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: 52, paddingHorizontal: 16, paddingBottom: 4 }}>
        <AppText variant="caption" accessibilityLiveRegion="polite">
          Local QA · {items.length}/120 loaded · {requests} requests · No server
          writes
        </AppText>
      </View>
      <ChatThread
        summary={summary}
        actorId={actor}
        messages={items}
        loading={messages.isPending}
        hasEarlier={messages.hasNextPage}
        loadingEarlier={messages.isFetchingNextPage}
        earlierError={messages.isFetchNextPageError}
        onEarlier={() => messages.fetchNextPage()}
        onReload={() => void messages.refetch()}
        onSend={() => {}}
        onRetry={() => {}}
        onBack={() => router.back()}
        preview
      />
    </View>
  );
}
