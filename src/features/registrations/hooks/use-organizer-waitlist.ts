import { AuthContext } from "@/features/auth/auth-provider";
import { useContext, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organizerSessionsKey } from "@/features/sessions/hooks/use-organizer-sessions";
import {
  loadWaitlist,
  manageWaitlist,
  setWaitlistMode
} from "../services/waitlist.service";
export function useOrganizerWaitlist(sessionId: string) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  const key = ["organizer-waitlist", user?.id, sessionId] as const;
  const query = useQuery({
    queryKey: key,
    queryFn: () => loadWaitlist(sessionId),
    enabled: !!sessionId && user?.organizer_status === "active",
    refetchInterval: 15000
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: key }),
      client.invalidateQueries({
        queryKey: ["organizer-roster", user?.id, sessionId]
      }),
      client.invalidateQueries({ queryKey: organizerSessionsKey(user?.id) })
    ]);
  };
  const updatedAt = query.dataUpdatedAt;
  useEffect(() => {
    if (updatedAt)
      void client.invalidateQueries({
        queryKey: ["organizer-roster", user?.id, sessionId]
      });
  }, [updatedAt, client, user?.id, sessionId]);
  const action = useMutation({
    mutationFn: manageWaitlist,
    onSettled: refresh
  });
  const mode = useMutation({
    mutationFn: setWaitlistMode,
    onSuccess: (data) => client.setQueryData(key, data),
    onSettled: refresh
  });
  return { query, action, mode };
}
