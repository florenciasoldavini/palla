import type { InboxFilter } from "../inbox-domain";
import { NavigationChromeContext } from "@/components/navigation/chrome-context";
import { AuthContext } from "@/features/auth/auth-provider";
import { useRouter } from "expo-router";
import { useContext, useMemo, useState } from "react";
import { useChatDeliveries } from "../hooks/use-chat-signals";
import { ChatInbox } from "../components/chat-inbox";
import { useChatInbox, useChatInteractions } from "../hooks/use-chat";
export default function InboxScreen() {
  const tabbed = useContext(NavigationChromeContext);
  const actions = useChatInteractions();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const unread = filter === "unread";
  const query = useChatInbox(search, unread, filter);
  const previews = useMemo(
    () =>
      (query.data ?? []).flatMap((row) =>
        row.last_message ? [row.last_message] : []
      ),
    [query.data]
  );
  useChatDeliveries(previews, query.dataUpdatedAt);
  const { user } = useContext(AuthContext);
  const router = useRouter();
  return (
    <ChatInbox
      conversations={query.data ?? []}
      actorId={user?.id ?? ""}
      filters={{
        search,
        unread,
        category: filter,
        onCategory: setFilter,
        onSearch: setSearch,
        onUnread: (value) => setFilter(value ? "unread" : "all")
      }}
      counts={query.counts}
      hasMore={query.hasNextPage}
      loadingMore={query.isFetchingNextPage}
      loadMoreError={query.isFetchNextPageError}
      onLoadMore={() => query.fetchNextPage()}
      onReport={(input) => actions.report.mutateAsync(input)}
      onChatAction={async (id, action) => {
        await actions.preferences.mutateAsync({ id, action });
      }}
      loading={query.isPending || query.isSearching}
      error={
        query.isError && !query.isFetchNextPageError
          ? "Couldn’t load messages"
          : null
      }
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onReload={() => void query.refetch()}
      onOpen={(id) =>
        router.push({ pathname: "/messages/[id]", params: { id } })
      }
      onBack={
        tabbed
          ? undefined
          : () =>
              router.canGoBack()
                ? router.back()
                : router.replace(
                    user?.preferred_mode === "organizer"
                      ? "/(organizer)/dashboard"
                      : "/(player)/discover"
                  )
      }
    />
  );
}
