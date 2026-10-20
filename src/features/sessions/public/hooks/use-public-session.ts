import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { loadPublicSession } from "../services/public-session.service";

export function usePublicSession(id: string) {
  const { session } = useContext(AuthContext);
  return useQuery({
    queryKey: ["public-session", session?.user.id ?? "anonymous", id],
    queryFn: ({ signal }) => loadPublicSession(id, signal),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1
  });
}
