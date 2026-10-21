import { useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import type { PublicSession } from "@/features/sessions/public/domain";
import { joinSession } from "../services/join.service";
export function useJoinSession(sessionId: string) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => joinSession(sessionId),
    retry: false,
    onSuccess: (result) => {
      client.setQueryData<PublicSession | null>(
        ["public-session", user?.id ?? "anonymous", sessionId],
        (current) =>
          current
            ? {
                ...current,
                viewer_registration: result.status,
                confirmed_count: result.confirmed_count
              }
            : current
      );
    },
    onSettled: () => {
      void Promise.all([
        client.invalidateQueries({ queryKey: ["public-session"] }),
        client.invalidateQueries({ queryKey: ["organizer-roster"] }),
        client.invalidateQueries({ queryKey: ["organizer-sessions"] }),
        client.invalidateQueries({ queryKey: ["organizer-dashboard"] })
      ]);
    }
  });
}
