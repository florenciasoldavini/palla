import { useContext, useEffect } from "react";
import { AppState } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { ownCoverUrl, requestSessionCover } from "../services/cover.service";
export function useOwnCover(path: string | null) {
  const { user } = useContext(AuthContext);
  const query = useQuery({
    queryKey: ["own-session-cover", user?.id, path],
    queryFn: () => ownCoverUrl(path!),
    enabled: Boolean(path && user),
    staleTime: 20 * 60_000,
    gcTime: 0,
    refetchInterval: 20 * 60_000,
    retry: false
  });
  useRefreshOnResume(Boolean(path && user), query.dataUpdatedAt, query.refetch);
  return query;
}
export function useSessionCover(id: string, enabled: boolean) {
  const { user } = useContext(AuthContext);
  // Google responses stay in this mounted view only; never persist photo names/URIs.
  const query = useQuery({
    queryKey: ["session-cover", user?.id ?? "anonymous", id],
    queryFn: () => requestSessionCover(id),
    enabled,
    staleTime: 20 * 60_000,
    refetchInterval: (query) =>
      query.state.data?.source === "upload" ? 20 * 60_000 : false,
    gcTime: 0,
    retry: false
  });
  useRefreshOnResume(
    enabled && query.data?.source === "upload",
    query.dataUpdatedAt,
    query.refetch
  );
  return query;
}
function useRefreshOnResume(
  enabled: boolean,
  updatedAt: number,
  refetch: () => Promise<unknown>
) {
  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && Date.now() - updatedAt >= 20 * 60_000)
        void refetch();
    });
    return () => subscription.remove();
  }, [enabled, updatedAt, refetch]);
}
