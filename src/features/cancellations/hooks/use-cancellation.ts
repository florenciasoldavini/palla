import { useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { beginConversation } from "@/features/chat/services/chat.service";
import type { CancellationContext } from "../domain";
import {
  cancelOccurrence,
  loadCancellation
} from "../services/cancellations.service";
export function useCancellation(id: string, single = false) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["cancellations", user?.id, single ? "item" : "session", id],
    queryFn: () => loadCancellation(id, single),
    enabled: !!user && !!id,
    staleTime: 0
  });
  const cancel = useMutation({
    mutationFn: cancelOccurrence,
    networkMode: "always",
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["discover-sessions"] });
      await Promise.all(
        [
          "cancellations",
          "organizer-sessions",
          "organizer-roster",
          "organizer-waitlist",
          "announcements",
          "notification-inbox",
          "notification-count"
        ].map((key) => client.invalidateQueries({ queryKey: [key, user?.id] }))
      );
    }
  });
  return { query, cancel };
}
export function useCancellationChat(context?: CancellationContext) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: () => {
      if (!user || !context) throw new Error("Chat unavailable");
      return beginConversation(context.organizer_id, user.id);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["chat-inbox", user?.id] });
    }
  });
}
