import { AppText } from "@/components/atoms";
import { ChatInbox } from "@/features/chat/components/chat-inbox";
import {
  isConversationUnread,
  type ConversationSummary
} from "@/features/chat/domain";
import {
  flattenInboxPages,
  inboxPageSchema,
  type InboxCursor
} from "@/features/chat/inbox-domain";
import { useInfiniteQuery } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";
const actor = "97000000-0000-4000-8000-000000000001";
const rows: ConversationSummary[] = Array.from(
  { length: 80 },
  (_, index): ConversationSummary => {
    const n = index + 1,
      id = `98000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    const time = new Date(Date.UTC(2026, 9, 15, 10, index)).toISOString();
    return {
      conversation: {
        id,
        organizer_id: actor,
        player_id: `97000000-0000-4000-8001-${String(n).padStart(12, "0")}`,
        source_session_id: null,
        created_at: time
      },
      other_participant: {
        id: `97000000-0000-4000-8001-${String(n).padStart(12, "0")}`,
        first_name: `QA Contact ${String(n).padStart(3, "0")}`,
        last_name: null,
        avatar_url: null,
        playing_category: null
      },
      other_role: "player",
      last_message: {
        id,
        conversation_id: id,
        sender_id: actor,
        sequence: String(n),
        body: `QA session note ${String(n).padStart(3, "0")}`,
        created_at: time,
        revision: 1,
        edited_at: null,
        deleted_at: null,
        delivered_at: null
      },
      unread_count: n % 3 === 0 ? 1 : 0,
      pinned_at:
        n <= 2 ? new Date(Date.UTC(2026, 9, 15, 13, n)).toISOString() : null,
      marked_unread: n === 2,
      other_read_sequence: null,
      source_session: null
    };
  }
).sort(
  (a, b) =>
    (b.pinned_at ?? "").localeCompare(a.pinned_at ?? "") ||
    b.conversation.created_at.localeCompare(a.conversation.created_at)
);
export default function InboxPaginationPreview() {
  const params = useLocalSearchParams<{ fail?: string }>();
  return <InboxCase key={params.fail ?? "normal"} fail={params.fail === "1"} />;
}
function InboxCase({ fail }: { fail: boolean }) {
  const [run] = useState(randomUUID),
    [search, setSearch] = useState(""),
    [unread, setUnread] = useState(false),
    [requests, setRequests] = useState(0);
  const failed = useRef(false);
  const query = useInfiniteQuery({
    queryKey: ["qa-inbox-pages", run, search.trim(), unread],
    initialPageParam: undefined as InboxCursor | undefined,
    retry: false,
    queryFn: async ({ pageParam }) => {
      setRequests((n) => n + 1);
      await new Promise((r) => setTimeout(r, pageParam && fail ? 4000 : 500));
      if (pageParam && fail && !failed.current) {
        failed.current = true;
        throw Error("Simulated inbox failure");
      }
      const matching = rows.filter((row) =>
        `${row.other_participant.first_name} ${row.last_message?.body}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      );
      const eligible = unread
        ? matching.filter(isConversationUnread)
        : matching;
      const start = pageParam
        ? eligible.findIndex((row) => row.conversation.id === pageParam.id) + 1
        : 0;
      const conversations = eligible.slice(start, start + 30),
        last = conversations.at(-1);
      return inboxPageSchema.parse({
        conversations,
        next_cursor:
          start + 30 < eligible.length && last
            ? {
                id: last.conversation.id,
                pinned_at: last.pinned_at,
                last_at: last.conversation.created_at
              }
            : null,
        counts: {
          all: matching.length,
          unread: matching.filter(isConversationUnread).length,
          total_unread: rows.filter(isConversationUnread).length,
          badge: 27
        }
      });
    },
    getNextPageParam: (page) => page.next_cursor ?? undefined
  });
  const data = query.data ? flattenInboxPages(query.data.pages) : [];
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: 52, paddingHorizontal: 16 }}>
        <AppText variant="caption">
          Local QA · {data.length} loaded · {requests} requests · No server
          writes
        </AppText>
      </View>
      <ChatInbox
        conversations={data}
        actorId={actor}
        filters={{ search, unread, onSearch: setSearch, onUnread: setUnread }}
        counts={query.data?.pages[0].counts}
        loading={query.isPending}
        error={
          query.isError && !query.isFetchNextPageError
            ? "Couldn’t load messages"
            : null
        }
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onReload={() => void query.refetch()}
        onOpen={() => {}}
        hasMore={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        loadMoreError={query.isFetchNextPageError}
        onLoadMore={() => query.fetchNextPage()}
        preview
      />
    </View>
  );
}
