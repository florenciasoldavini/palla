import { useContext } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { loadPublicReviews } from "../services/public-reviews.service";
import type { ReviewCursor } from "../reviews-domain";

export function usePublicReviews(id: string) {
  const { session } = useContext(AuthContext);
  return useQuery({
    queryKey: [
      "public-session-reviews",
      session?.user.id ?? "anonymous",
      id,
      "summary"
    ],
    queryFn: ({ signal }) => loadPublicReviews(id, 2, null, signal),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
    enabled: Boolean(id)
  });
}
export function useAllPublicReviews(id: string) {
  const { session } = useContext(AuthContext);
  return useInfiniteQuery({
    queryKey: [
      "public-session-reviews",
      session?.user.id ?? "anonymous",
      id,
      "all"
    ],
    initialPageParam: null as ReviewCursor | null,
    queryFn: ({ pageParam, signal }) =>
      loadPublicReviews(id, 20, pageParam, signal),
    getNextPageParam: (page) => page?.next_cursor ?? undefined,
    staleTime: 15_000,
    retry: 1
  });
}
