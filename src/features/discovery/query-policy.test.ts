import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { discoveryQueryPolicy } from "./query-policy";
import type { DiscoveryPage } from "./pagination";

it("keeps map results to one page even when further pages are available", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const fetch = vi.fn(
    async () =>
      ({
        sessions: [],
        has_more: true,
        next_cursor: { id: "cursor" }
      }) as unknown as DiscoveryPage
  );
  const observer = new InfiniteQueryObserver(client, {
    queryKey: ["discovery", "map"],
    queryFn: fetch,
    initialPageParam: null,
    ...discoveryQueryPolicy("map")
  });
  await observer.refetch();
  await observer.fetchNextPage();
  await observer.fetchNextPage();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(observer.getCurrentResult().data?.pages).toHaveLength(1);
  expect(observer.getCurrentResult().hasNextPage).toBe(false);
  client.clear();
});
it("preserves list pagination independently of the bounded map cache", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const fetch = vi.fn(
    async () =>
      ({
        sessions: [],
        has_more: true,
        next_cursor: { id: "next" }
      }) as unknown as DiscoveryPage
  );
  const observer = new InfiniteQueryObserver(client, {
    queryKey: ["discovery", "list"],
    queryFn: fetch,
    initialPageParam: null,
    ...discoveryQueryPolicy("list")
  });
  await observer.refetch();
  await observer.fetchNextPage();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(observer.getCurrentResult().data?.pages).toHaveLength(2);
  client.clear();
});
