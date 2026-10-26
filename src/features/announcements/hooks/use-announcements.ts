import { beginConversation } from "@/features/chat/services/chat.service";
import type { AnnouncementContext } from "../domain";
import { useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import {
  loadAnnouncement,
  loadSessionAnnouncements,
  publishAnnouncement,
  removeAnnouncement
} from "../services/announcements.service";
export function useAnnouncements(id: string, single = false) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["announcements", user?.id, single ? "item" : "session", id],
    queryFn: () =>
      single ? loadAnnouncement(id) : loadSessionAnnouncements(id),
    enabled: !!user && !!id,
    staleTime: 0,
    refetchInterval: 30000
  });
  const refresh = () => {
    for (const key of [
      "announcements",
      "notification-inbox",
      "notification-count"
    ])
      void client.invalidateQueries({ queryKey: [key, user?.id] });
  };
  const send = useMutation({
    mutationFn: publishAnnouncement,
    networkMode: "always",
    onSuccess: refresh
  });
  const remove = useMutation({
    mutationFn: removeAnnouncement,
    networkMode: "always",
    onSuccess: refresh
  });
  return { query, send, remove };
}

export function useAnnouncementChat(context?: AnnouncementContext) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: () => {
      if (!context || !user) throw new Error("Chat unavailable");
      return beginConversation(
        context.organizer_id,
        user.id,
        context.session_id
      );
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["chat-inbox", user?.id] });
    }
  });
}
