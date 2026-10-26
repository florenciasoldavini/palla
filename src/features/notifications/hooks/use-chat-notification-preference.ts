import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadChatNotificationPreference,
  saveChatNotificationPreference
} from "../services/preferences.service";
export const chatNotificationPreferenceKey = (actor: string | undefined) =>
  ["chat-notification-preference", actor] as const;
export function useChatNotificationPreference(actor: string | undefined) {
  return useQuery({
    queryKey: chatNotificationPreferenceKey(actor),
    queryFn: loadChatNotificationPreference,
    enabled: !!actor,
    staleTime: 30_000
  });
}
export function useSaveChatNotificationPreference(actor: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: (enabled: boolean) => {
      if (!actor) throw new Error("Sign in to change notifications.");
      return saveChatNotificationPreference(enabled);
    },
    onMutate: async () => {
      await client.cancelQueries({
        queryKey: chatNotificationPreferenceKey(actor)
      });
    },
    onSuccess: (enabled) => {
      client.setQueryData(chatNotificationPreferenceKey(actor), enabled);
    },
    onSettled: () => {
      void client.invalidateQueries({
        queryKey: chatNotificationPreferenceKey(actor)
      });
    }
  });
}
