import { AuthContext } from "@/features/auth/auth-provider";
import {
  loadOrganizerSessions,
  saveOrganizerSession,
  cancelOrganizerSession,
  deleteOrganizerDraft
} from "@/features/sessions/services/organizer-sessions.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
export const organizerSessionsKey = (id: string | undefined) =>
  ["organizer-sessions", id] as const;
export function useOrganizerSessions() {
  const { user } = useContext(AuthContext);
  return useQuery({
    queryKey: organizerSessionsKey(user?.id),
    queryFn: () => loadOrganizerSessions(user!.id),
    enabled: user?.organizer_status === "active"
  });
}
export function useSessionMutations() {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  const onSuccess = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: organizerSessionsKey(user?.id) }),
      client.invalidateQueries({ queryKey: ["organizer-roster", user?.id] }),
      client.invalidateQueries({ queryKey: ["organizer-waitlist", user?.id] })
    ]);
  };
  return {
    save: useMutation({ mutationFn: saveOrganizerSession, onSuccess }),
    cancel: useMutation({ mutationFn: cancelOrganizerSession, onSuccess }),
    remove: useMutation({
      mutationFn: ({ id, version }: { id: string; version: string }) =>
        deleteOrganizerDraft(id, version),
      onSuccess
    })
  };
}
