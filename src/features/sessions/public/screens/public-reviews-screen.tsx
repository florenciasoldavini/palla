import { useLocalSearchParams, useRouter } from "expo-router";
import { PublicReviewsList } from "../components/public-reviews-list";
import { useAllPublicReviews } from "../hooks/use-public-reviews";
import { usePublicSession } from "../hooks/use-public-session";

export default function PublicReviewsScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof rawId === "string" ? rawId : "";
  const router = useRouter();
  const session = usePublicSession(id);
  const query = useAllPublicReviews(id);
  const pages = query.data?.pages ?? [];
  return (
    <PublicReviewsList
      title={session.data?.title ?? "Session feedback"}
      unavailable={query.isSuccess && pages[0] === null}
      summary={pages[0]}
      items={pages.flatMap((page) => page?.items ?? [])}
      loading={query.isPending}
      error={query.isError}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      loadingMore={query.isFetchingNextPage}
      hasMore={query.hasNextPage}
      onBack={() =>
        router.canGoBack()
          ? router.back()
          : router.replace({ pathname: "/session", params: { id } })
      }
      onRefresh={() => void query.refetch()}
      onMore={() =>
        query.hasNextPage ? void query.fetchNextPage() : void query.refetch()
      }
    />
  );
}
