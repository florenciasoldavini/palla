// Development-only, read-only pages use the same TanStack pagination and screen.
import { useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { DiscoveryContent } from "../discovery-screen";
import { mergeDiscoveryPages } from "../pagination";
import type { DiscoveryFilters, DiscoverySession } from "../domain";
import type { DiscoveryCity } from "../cities";
export function DiscoveryPaginationPreview({
  filters,
  onFilters,
  onLocation,
  sessions,
  failNext
}: {
  filters: DiscoveryFilters;
  onFilters: (f: DiscoveryFilters) => void;
  onLocation: (city: DiscoveryCity) => Promise<void>;
  sessions: DiscoverySession[];
  failNext: boolean;
}) {
  const failed = useRef(false);
  const query = useInfiniteQuery({
    queryKey: ["discovery-pagination-preview", failNext, filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 800);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new Error("Cancelled"));
          },
          { once: true }
        );
      });
      if (pageParam === 1 && failNext && !failed.current) {
        failed.current = true;
        throw new Error("QA next page failure");
      }
      const all = Array.from({ length: 75 }, (_, n) => ({
        ...sessions[n % 3],
        id: `df390000-0000-4000-8000-${String(n + 1).padStart(12, "0")}`,
        title: `QA session ${n + 1}`,
        starts_at: new Date(Date.now() + (24 + n) * 3600000).toISOString(),
        ends_at: new Date(Date.now() + (26 + n) * 3600000).toISOString()
      }));
      return {
        sessions: all.slice(pageParam * 25, (pageParam + 1) * 25),
        next: pageParam < 2 ? pageParam + 1 : undefined
      };
    },
    getNextPageParam: (p) => p.next,
    retry: false,
    staleTime: Infinity
  });
  return (
    <DiscoveryContent
      filters={filters}
      onFilters={onFilters}
      onLocation={onLocation}
      sessions={mergeDiscoveryPages(query.data?.pages ?? [])}
      loading={query.isPending}
      error={query.isError && !query.data}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      refresh={() => query.refetch()}
      hasMore={!!query.hasNextPage}
      loadingMore={query.isFetchingNextPage}
      loadMoreError={query.isFetchNextPageError}
      loadMore={() => {
        if (!query.isFetching)
          void query.fetchNextPage({ cancelRefetch: false });
      }}
      preview
    />
  );
}
