import { useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import type { PublicSession } from "@/features/sessions/public/domain";
import { cancelRegistration } from "../services/cancel-registration.service";
export function useCancelRegistration(sessionId: string) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => cancelRegistration(sessionId),
    retry: false,
    onSuccess: (result) => {
      client.setQueryData<PublicSession | null>(
        ["public-session", user?.id ?? "anonymous", sessionId],
        (current) =>
          current
            ? {
                ...current,
                viewer_registration: null,
                waitlisted_count:
                  result.waitlisted_count ?? current.waitlisted_count,
                confirmed_count: result.confirmed_count
              }
            : current
      );
    },
    onSettled: () => {
      void Promise.all(
        [
          "public-session",
          "organizer-roster",
          "organizer-waitlist",
          "organizer-sessions",
          "organizer-dashboard"
        ].map((key) => client.invalidateQueries({ queryKey: [key] }))
      );
    }
  });
}
