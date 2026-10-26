import { useContext } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import {
  loadInbox,
  loadUnreadCount,
  markNotificationsRead,
  loadNotificationSettings,
  saveNotificationSetting,
  loadPushSubscriptions
} from "../services/inbox.service";
import type { NotificationMode } from "../inbox-domain";
export function useNotificationCount(mode: NotificationMode) {
  const { user } = useContext(AuthContext);
  return useQuery({
    queryKey: ["notification-count", user?.id, mode],
    queryFn: () => loadUnreadCount(mode),
    enabled: !!user,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true
  });
}
export function useNotificationInbox(mode: NotificationMode, unread: boolean) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ["notification-inbox", user?.id, mode, unread],
    initialPageParam: undefined as
      { created_at: string; id: string } | undefined,
    queryFn: ({ pageParam }) => loadInbox(mode, unread, pageParam),
    getNextPageParam: (page) =>
      page.length === 30
        ? { created_at: page[29].created_at, id: page[29].id }
        : undefined,
    enabled: !!user,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true
  });
  const read = useMutation({
    networkMode: "always",
    mutationFn: (id: string | null) => markNotificationsRead(mode, id),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["notification-inbox", user?.id]
      });
      void client.invalidateQueries({
        queryKey: ["notification-count", user?.id]
      });
    }
  });
  return { query, read };
}
export function useNotificationSettings(mode: NotificationMode) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  const key = ["notification-settings", user?.id, mode];
  const query = useQuery({
    queryKey: key,
    queryFn: () => loadNotificationSettings(mode),
    enabled: !!user,
    staleTime: 0
  });
  const save = useMutation({
    networkMode: "always",
    mutationFn: ({ type, enabled }: { type: string; enabled: boolean }) =>
      saveNotificationSetting(type, enabled),
    onMutate: () => client.cancelQueries({ queryKey: key }),
    onSuccess: (enabled, { type }) => {
      client.setQueryData<typeof query.data>(key, (rows) =>
        rows?.map((row) =>
          row.key === type ? { ...row, push_enabled: enabled } : row
        )
      );
      if (type === "chat_messages")
        client.setQueryData(
          ["chat-notification-preference", user?.id],
          enabled
        );
    },
    onSettled: () => {
      void client.invalidateQueries({
        queryKey: ["notification-settings", user?.id]
      });
      void client.invalidateQueries({
        queryKey: ["push-subscriptions", user?.id]
      });
    }
  });
  return { query, save };
}
export function usePushSubscriptions(actor: string | undefined) {
  return useQuery({
    queryKey: ["push-subscriptions", actor],
    queryFn: loadPushSubscriptions,
    enabled: !!actor,
    staleTime: 30_000
  });
}
