import { useChatPresence } from "../hooks/use-chat-presence";
import {
  AppButton,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonBlock
} from "@/components/atoms";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useContext, useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { ChatConnectionContext } from "../components/chat-realtime-sync";
import { ChatThread } from "../components/chat-thread";
import { useChatLocal } from "../hooks/use-chat-local";
import { mergeChatMessages, toReplyQuote } from "../domain";
import {
  useChatConversation,
  useChatInteractions,
  useChatReplyTarget
} from "../hooks/use-chat";

import {
  useChatDeliveries,
  useConversationTyping
} from "../hooks/use-chat-signals";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Conversation key={id} id={id ?? ""} />;
}
function Conversation({ id }: { id: string }) {
  const router = useRouter();
  const focused = useIsFocused();
  const { info, messages, read, actorId } = useChatConversation(id);
  const actions = useChatInteractions(id);
  const connection = useContext(ChatConnectionContext);
  const local = useChatLocal(actorId, id);
  const replyTarget = useChatReplyTarget(local.replyId);
  const items = useMemo(
    () => mergeChatMessages(...(messages.data?.pages ?? [])),
    [messages.data]
  );
  useChatDeliveries(items, messages.dataUpdatedAt);
  const available = info.data?.messaging_available !== false;
  const { typing, onTypingChange } = useConversationTyping(
    id,
    info.data?.other_participant.id,
    focused && available,
    info.data?.conversation.access_version
  );
  const online = useChatPresence(
    info.data?.other_participant.id,
    false,
    focused && available
  );
  const through = items.at(-1)?.sequence;
  const original =
    items.find((m) => m.id === local.replyId) ?? replyTarget.data;
  const reply = !local.replyId
    ? null
    : original && original.conversation_id === id
      ? toReplyQuote(original)
      : {
          id: local.replyId,
          sender_id: null,
          sequence: null,
          body: null,
          deleted_at: null,
          available: false
        };
  const markRead = read.mutateAsync;
  useEffect(() => {
    const update = () => {
      if (
        focused &&
        info.isFetchedAfterMount &&
        !info.isError &&
        through &&
        AppState.currentState === "active"
      ) {
        void markRead(through).catch(() => undefined);
      }
    };
    update();
    const listener = AppState.addEventListener("change", update);
    return () => listener.remove();
  }, [focused, through, markRead, info.isFetchedAfterMount, info.isError]);
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/messages");
  if (info.isPending || (!info.isFetchedAfterMount && info.isFetching))
    return (
      <Screen>
        <SkeletonBlock height={320} />
      </Screen>
    );
  if (info.isError && !info.data)
    return (
      <Screen>
        <ErrorState
          variant="fullScreen"
          title="Conversation couldn’t load"
          onRetry={() => void info.refetch()}
          retrying={info.isFetching}
        />
        <AppButton variant="ghost" onPress={back}>
          Back to messages
        </AppButton>
      </Screen>
    );
  if (!info.data || !actorId)
    return (
      <Screen>
        <EmptyState
          variant="fullScreen"
          title="Conversation unavailable"
          description="This conversation isn’t available to your account."
          action={{ label: "Back to messages", onPress: back }}
        />
      </Screen>
    );
  return (
    <ChatThread
      key={`${actorId}:${id}`}
      summary={info.data}
      initialReadSequence={info.isError ? undefined : info.data.read_sequence}
      onUnblock={() =>
        actions.preferences.mutateAsync({ id, action: "unblock" })
      }
      actorId={actorId}
      messages={items}
      pending={local.pending}
      draftReady={local.ready}
      initialDraft={local.initialDraft}
      onDraftChange={local.saveDraft}
      reply={reply}
      replyLoading={!!local.replyId && !original && replyTarget.isPending}
      onReply={(message) => local.saveReply(message.id)}
      onCancelReply={() => void local.saveReply(null).catch(() => undefined)}
      onReact={async (message, emoji) => {
        await actions.react.mutateAsync({ id: message.id, emoji });
      }}
      localError={
        local.error ??
        (replyTarget.isError && local.replyId
          ? "Couldn’t load the original message. Check your connection, or cancel the reply."
          : null)
      }
      onDiscard={(row) => local.discard(row.id)}
      connection={connection}
      online={online}
      typing={typing}
      onTypingChange={onTypingChange}
      loading={messages.isPending}
      error={
        messages.isError && !messages.isFetchNextPageError
          ? "Check your connection and try again."
          : null
      }
      onReload={() => void messages.refetch()}
      onBack={back}
      onSend={local.enqueue}
      onPhotoSend={async (body, photo, replyTo) => {
        await local.enqueuePhoto(body, photo, replyTo);
      }}
      onEdit={async (message, body) => {
        await actions.edit.mutateAsync({
          id: message.id,
          revision: message.revision,
          body
        });
      }}
      onDelete={async (message) => {
        await actions.remove.mutateAsync({
          id: message.id,
          revision: message.revision
        });
      }}
      onRetry={(row) => local.retry(row.id)}
      hasEarlier={messages.hasNextPage}
      loadingEarlier={messages.isFetchingNextPage}
      earlierError={messages.isFetchNextPageError}
      onEarlier={() => messages.fetchNextPage()}
    />
  );
}
