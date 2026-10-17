import {
  discardChatPhoto,
  cleanupChatPhotos
} from "../services/chat-photo.service";
import { submitChatReport } from "../services/chat-report.service";
import { AuthContext } from "@/features/auth/auth-provider";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData
} from "@tanstack/react-query";
import {
  beginConversation,
  editChatMessage,
  deleteChatMessage,
  setChatReaction,
  updateChatPreferences,
  loadConversationEntry,
  loadInboxPage,
  loadMessages,
  loadChatMessage,
  markRead,
  sendMessage
} from "../services/chat.service";
import { chatOutbox } from "../services/chat-outbox.service";
import { chatLocalStore } from "../services/chat-offline.service";
import { mergeChatMessages, type ChatMessage } from "../domain";
import {
  flattenInboxPages,
  type InboxCursor,
  type InboxFilter
} from "../inbox-domain";
export const chatKeys = {
  inbox: (actor?: string) => ["chat-inbox", actor] as const,
  messages: (actor?: string, id?: string) =>
    ["chat-messages", actor, id] as const,
  conversation: (actor?: string, id?: string) =>
    ["chat-conversation", actor, id] as const
};
export function useChatInbox(
  search = "",
  unread = false,
  filter?: InboxFilter
) {
  const selectedFilter = filter ?? (unread ? "unread" : "all");
  const { user } = useContext(AuthContext);
  const [term, setTerm] = useState(search.trim());
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useInfiniteQuery({
    queryKey: [...chatKeys.inbox(user?.id), "paged-v2", term, selectedFilter],
    initialPageParam: undefined as InboxCursor | undefined,
    queryFn: ({ pageParam }) =>
      loadInboxPage(term, unread, pageParam, selectedFilter),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    enabled: !!user?.onboarding_completed_at,
    staleTime: 0,
    refetchInterval: 20000
  });
  const data = useMemo(
    () => (query.data ? flattenInboxPages(query.data.pages) : undefined),
    [query.data]
  );
  return {
    ...query,
    data,
    counts: query.data?.pages[0]?.counts,
    isSearching: term !== search.trim()
  };
}
export function useChatConversation(id: string) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  const info = useQuery({
    queryKey: chatKeys.conversation(user?.id, id),
    staleTime: 0,
    refetchInterval: 20000,
    queryFn: () => loadConversationEntry(id, user!.id),
    enabled: !!user?.onboarding_completed_at && !!id
  });
  const messages = useInfiniteQuery({
    queryKey: chatKeys.messages(user?.id, id),
    queryFn: ({ pageParam }) => loadMessages(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.length === 50 ? last[0]?.sequence : undefined,
    enabled: !!user?.onboarding_completed_at && !!info.data,
    staleTime: 0,
    refetchInterval: 20000
  });
  const send = useMutation({
    mutationFn: sendMessage,
    onSuccess: (message) => {
      client.setQueryData<InfiniteData<ChatMessage[], string | undefined>>(
        chatKeys.messages(user?.id, id),
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page, index) =>
                  index === 0 ? mergeChatMessages(page, [message]) : page
                )
              }
            : data
      );
      void client.invalidateQueries({
        queryKey: chatKeys.messages(user?.id, id)
      });
      void client.invalidateQueries({ queryKey: chatKeys.inbox(user?.id) });
    }
  });
  const read = useMutation({
    networkMode: "always",
    mutationFn: (through: string) => markRead(id, through),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: chatKeys.inbox(user?.id) });
    }
  });
  return { info, messages, send, read, actorId: user?.id };
}
export function useStartChat() {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      playerId,
      sessionId
    }: {
      playerId: string;
      sessionId?: string;
    }) => beginConversation(user!.id, playerId, sessionId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: chatKeys.inbox(user?.id) });
    }
  });
}
export function useChatReplyTarget(id: string | null) {
  const { user } = useContext(AuthContext);
  return useQuery({
    queryKey: ["chat-reply", user?.id, id],
    queryFn: () => loadChatMessage(id!),
    enabled: !!id && !!user,
    staleTime: 0,
    refetchInterval: 20000
  });
}

export function useChatInteractions(id?: string) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["chat-search", user?.id, id] });
    await Promise.all([
      client.invalidateQueries({ queryKey: chatKeys.inbox(user?.id) }),
      client.invalidateQueries({ queryKey: chatKeys.messages(user?.id, id) }),
      client.invalidateQueries({
        queryKey: chatKeys.conversation(user?.id, id)
      })
    ]);
  };
  return {
    report: useMutation({
      networkMode: "always",
      mutationFn: async (input: Parameters<typeof submitChatReport>[0]) => {
        const resume = input.block
          ? await chatOutbox.pauseConversation(input.conversation_id)
          : () => {};
        try {
          const result = await submitChatReport(input);
          if (result.blocked && user) {
            const state = await chatLocalStore.load(user.id);
            for (const row of state.outbox.filter(
              (r) => r.conversation_id === input.conversation_id
            ))
              await chatLocalStore.patch(user.id, row.id, {
                state: "failed",
                failure: "rejected"
              });
          }
          return result;
        } finally {
          resume();
        }
      },
      onSettled: async () => {
        await client.invalidateQueries({ queryKey: chatKeys.inbox(user?.id) });
        void cleanupChatPhotos().catch(() => undefined);
        await client.invalidateQueries({
          queryKey: ["chat-conversation", user?.id]
        });
      }
    }),
    react: useMutation({
      networkMode: "always",
      mutationFn: setChatReaction,
      onSettled: refresh
    }),
    edit: useMutation({
      networkMode: "always",
      mutationFn: editChatMessage,
      onSettled: refresh
    }),
    remove: useMutation({
      networkMode: "always",
      mutationFn: async (input: Parameters<typeof deleteChatMessage>[0]) => {
        const result = await deleteChatMessage(input);
        void cleanupChatPhotos().catch(() => undefined);
        return result;
      },
      onSettled: refresh
    }),
    preferences: useMutation({
      networkMode: "always",
      mutationFn: async (
        input: Parameters<typeof updateChatPreferences>[0]
      ) => {
        if (input.action === "block" && user) {
          const resume = await chatOutbox.pauseConversation(input.id);
          try {
            await updateChatPreferences(input);
            const state = await chatLocalStore.load(user.id);
            for (const row of state.outbox.filter(
              (r) => r.conversation_id === input.id
            ))
              await chatLocalStore.patch(user.id, row.id, {
                state: "failed",
                failure: "rejected"
              });
          } finally {
            resume();
          }
          return;
        }
        if (input.action !== "delete" || !user)
          return updateChatPreferences(input);
        const resume = await chatOutbox.pauseConversation(input.id);
        try {
          await updateChatPreferences(input);
          const waiting = (await chatLocalStore.load(user.id)).outbox.filter(
            (r) => r.conversation_id === input.id
          );
          await chatLocalStore.forget(user.id, input.id);
          await Promise.allSettled(
            waiting
              .filter((r) => r.photo)
              .map((r) => discardChatPhoto(user.id, r.photo!))
          );
          client.removeQueries({
            queryKey: chatKeys.messages(user.id, input.id),
            exact: true
          });
          client.removeQueries({
            queryKey: chatKeys.conversation(user.id, input.id),
            exact: true
          });
        } finally {
          resume();
        }
      },
      onSettled: async () => {
        client.removeQueries({ queryKey: ["chat-search", user?.id] });
        // Clearing a chat must also evict any cached pages from another mounted route.
        client.removeQueries({
          queryKey: chatKeys.messages(user?.id),
          exact: false,
          type: "inactive"
        });
        await client.invalidateQueries({
          queryKey: ["chat-messages", user?.id]
        });
        await client.invalidateQueries({
          queryKey: ["chat-conversation", user?.id]
        });
        await client.invalidateQueries({ queryKey: chatKeys.inbox(user?.id) });
        void cleanupChatPhotos().catch(() => undefined);
      }
    })
  };
}
