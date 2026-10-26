import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { subscribeToChat } from "../services/chat.service";
import { useChatInbox } from "../hooks/use-chat";
import { useChatDeliveries } from "../hooks/use-chat-signals";
import { useChatPresence } from "../hooks/use-chat-presence";
export const ChatConnectionContext = createContext<
  "connecting" | "live" | "offline"
>("connecting");
export function ChatRealtimeSync({ children }: { children: React.ReactNode }) {
  const { user, session } = useContext(AuthContext);
  const client = useQueryClient();
  const inbox = useChatInbox();
  const incoming = useMemo(
    () =>
      (inbox.data ?? []).flatMap((row) =>
        row.last_message ? [row.last_message] : []
      ),
    [inbox.data]
  );
  useChatDeliveries(incoming, inbox.dataUpdatedAt);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">(
    "connecting"
  );
  const actorId = user?.onboarding_completed_at ? user.id : undefined;
  useChatPresence(actorId, true);
  const token = session?.access_token;
  const contextOrganizers = [
    ...new Set([
      ...(actorId ? [actorId] : []),
      ...(inbox.data ?? []).map((row) => row.conversation.organizer_id)
    ])
  ]
    .sort()
    .join(",");
  useEffect(() => {
    if (!actorId || !token) return;
    let refreshQueued = false;
    const refresh = () => {
      if (refreshQueued) return;
      refreshQueued = true;
      queueMicrotask(() => {
        refreshQueued = false;
        for (const key of [
          "chat-inbox",
          "chat-conversation",
          "chat-messages",
          "chat-reply",
          "chat-search"
        ])
          void client.invalidateQueries({ queryKey: [key, actorId] });
      });
    };
    let stop = subscribeToChat(
      actorId,
      token,
      refresh,
      setStatus,
      contextOrganizers.split(",")
    );
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        stop();
        stop = subscribeToChat(
          actorId,
          token,
          refresh,
          setStatus,
          contextOrganizers.split(",")
        );
        refresh();
      } else {
        stop();
        setStatus("offline");
      }
    });
    return () => {
      stop();
      listener.remove();
    };
  }, [actorId, token, client, contextOrganizers]);
  return (
    <ChatConnectionContext.Provider value={status}>
      {children}
    </ChatConnectionContext.Provider>
  );
}
