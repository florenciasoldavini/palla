import { useContext, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { loadConversations } from "@/features/chat/services/chat.service";
import { parseChatPush, shouldPresentChatPush } from "../push-domain";
import { usePushSubscriptions } from "../hooks/use-notifications";
import {
  loadPushSubscriptions,
  loadNotificationTarget
} from "../services/inbox.service";
import { parseReviewPush, type PushSubscriptions } from "../inbox-domain";
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
  const preference = usePushSubscriptions(actor);
  const preferences = preference.data;
  const chatEnabled = preferences?.chat_messages === true;
  const state = useRef({ actor, path, chatEnabled, preferences });
  state.current = { actor, path, chatEnabled, preferences };
  useEffect(() => {
    if (!pushSupported()) return;
    let alive = true;
    const subscriptions: { remove(): void }[] = [];
    const valid = () => alive && !!actor && state.current.actor === actor;
    const refresh = () => {
      if (valid())
        void client
          .fetchQuery({
            queryKey: ["push-subscriptions", actor],
            queryFn: loadPushSubscriptions,
            staleTime: 0
          })
          .then((enabled) => {
            if (Object.values(enabled).some(Boolean) && valid())
              return registerCurrentPushDevice(
                actor!,
                () =>
                  valid() &&
                  Object.values(
                    client.getQueryData<PushSubscriptions>([
                      "push-subscriptions",
                      actor
                    ]) ?? {}
                  ).some(Boolean)
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
            const review = parseReviewPush(notification.request.content.data);
            const reviewEnabled =
              review?.type === "registration_notification" &&
              review.notification_type
                ? current.preferences?.[review.notification_type]
                : review?.type === "cancellation_notification"
                  ? current.preferences?.session_cancellations
                  : review?.type === "announcement_notification"
                    ? current.preferences?.session_announcements
                    : review?.mode === "player"
                      ? current.preferences?.review_reminders
                      : current.preferences?.new_reviews;
            const show =
              alive && review && review.recipient_id === current.actor
                ? reviewEnabled === true
                : alive &&
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
            const review = parseReviewPush(
              response.notification.request.content.data
            );
            if (review && review.recipient_id === actor) {
              const target = await loadNotificationTarget(
                review.notification_id
              );
              if (!valid()) return;
              router.push({
                pathname: "/notifications",
                params: { mode: target.mode, notificationId: target.id }
              });
              handled.add(responseId);
              await notifications.clearLastNotificationResponseAsync();
              return;
            }
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
            if (valid()) {
              for (const key of [
                "chat-inbox",
                "notification-inbox",
                "notification-count"
              ])
                void client.invalidateQueries({ queryKey: [key, actor] });
            }
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
  }, [actor, chatEnabled, preferences, client, router]);
  return null;
}
