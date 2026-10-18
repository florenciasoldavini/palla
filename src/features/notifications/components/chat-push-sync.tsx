import { useContext, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { loadConversations } from "@/features/chat/services/chat.service";
import { parseChatPush, shouldPresentChatPush } from "../push-domain";
import {
  chatNotificationPreferenceKey,
  useChatNotificationPreference
} from "../hooks/use-chat-notification-preference";
import { loadChatNotificationPreference } from "../services/preferences.service";
import {
  cancelPushRegistration,
  pushSupported,
  registerCurrentPushDevice
} from "../services/push.service";

export function ChatPushSync({ ready }: { ready: boolean }) {
  const { user, session } = useContext(AuthContext);
  const actor = ready && session?.user.id === user?.id ? user?.id : undefined;
  const router = useRouter();
  const path = usePathname();
  const client = useQueryClient();
  const preference = useChatNotificationPreference(actor);
  const chatEnabled = preference.data === true;
  const state = useRef({ actor, path, chatEnabled });
  state.current = { actor, path, chatEnabled };
  useEffect(() => {
    if (!pushSupported()) return;
    let alive = true;
    const subscriptions: { remove(): void }[] = [];
    const valid = () => alive && !!actor && state.current.actor === actor;
    const refresh = () => {
      if (valid())
        void client
          .fetchQuery({
            queryKey: chatNotificationPreferenceKey(actor),
            queryFn: loadChatNotificationPreference,
            staleTime: 0
          })
          .then((enabled) => {
            if (enabled && valid())
              return registerCurrentPushDevice(
                actor!,
                () =>
                  valid() &&
                  client.getQueryData(chatNotificationPreferenceKey(actor)) ===
                    true
              );
          })
          .catch(() => undefined);
    };
    void import("expo-notifications")
      .then(async (notifications) => {
        if (!alive) return;
        notifications.setNotificationHandler({
          handleNotification: async (notification) => {
            const current = state.current;
            const open =
              AppState.currentState === "active"
                ? current.path.match(/^\/messages\/([^/]+)$/)?.[1]
                : undefined;
            const show =
              alive &&
              current.chatEnabled &&
              shouldPresentChatPush(
                notification.request.content.data,
                current.actor,
                open
              );
            return {
              shouldShowBanner: show,
              shouldShowList: show,
              shouldPlaySound: show,
              shouldSetBadge: false
            };
          }
        });
        const processing = new Set<string>();
        const handled = new Set<string>();
        const open = async (
          response: import("expo-notifications").NotificationResponse
        ) => {
          if (!valid()) return;
          const responseId = response.notification.request.identifier;
          if (processing.has(responseId) || handled.has(responseId)) return;
          processing.add(responseId);
          try {
            const data = parseChatPush(
              response.notification.request.content.data
            );
            if (!data || data.recipient_id !== actor) {
              await notifications.clearLastNotificationResponseAsync();
              return;
            }
            // Recheck membership and authentication after the async lookup; never trust an arbitrary push URL.
            const rows = await loadConversations(data.conversation_id);
            if (!valid()) return;
            if (
              rows.length &&
              state.current.path !== `/messages/${data.conversation_id}`
            )
              router.push({
                pathname: "/messages/[id]",
                params: { id: data.conversation_id }
              });
            handled.add(responseId);
            await notifications.clearLastNotificationResponseAsync();
          } catch {
            /* Keep the response for a later foreground retry while offline. */
          } finally {
            processing.delete(responseId);
          }
        };
        const initial = async () => {
          const response =
            await notifications.getLastNotificationResponseAsync();
          if (response) await open(response);
        };
        subscriptions.push(
          notifications.addNotificationResponseReceivedListener((r) => {
            void open(r);
          })
        );
        subscriptions.push(
          notifications.addNotificationReceivedListener(() => {
            if (valid())
              void client.invalidateQueries({
                queryKey: ["chat-inbox", actor]
              });
          })
        );
        subscriptions.push(notifications.addPushTokenListener(refresh));
        subscriptions.push({
          remove: onlineManager.subscribe(() => {
            if (onlineManager.isOnline() && AppState.currentState === "active")
              refresh();
          })
        });
        subscriptions.push(
          AppState.addEventListener("change", (s) => {
            if (s === "active") {
              refresh();
              void initial().catch(() => undefined);
            }
          })
        );
        refresh();
        await initial();
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      cancelPushRegistration();
      subscriptions.forEach((s) => s.remove());
    };
  }, [actor, chatEnabled, client, router]);
  return null;
}
