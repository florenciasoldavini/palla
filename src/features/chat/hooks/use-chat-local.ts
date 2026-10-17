import { useEffect, useState } from "react";
import {
  chatLocalStore,
  saveChatDraft,
  queueChatMessage,
  queuePhotoMessage,
  retryQueuedMessage,
  discardQueuedMessage
} from "../services/chat-offline.service";
import type { LocalChatState } from "../repositories/chat-local.repository";
export function useChatLocal(actor: string | undefined, id: string) {
  const [loaded, setLoaded] = useState<{
    actor: string;
    state: LocalChatState;
  }>();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!actor) return;
    let live = true;
    const refresh = () => {
      void chatLocalStore
        .load(actor)
        .then((state) => {
          if (live) setLoaded({ actor, state });
        })
        .catch(() => {
          if (live)
            setError(
              "Couldn’t load saved drafts and waiting messages. Try reopening this conversation."
            );
        });
    };
    refresh();
    const stop = chatLocalStore.subscribe(refresh);
    return () => {
      live = false;
      stop();
    };
  }, [actor]);
  const state = loaded && loaded.actor === actor ? loaded.state : undefined;
  const attempt = async (operation: () => Promise<unknown>) => {
    try {
      await operation();
      setError(null);
    } catch (failure) {
      setError(
        "Couldn’t save on this device. Your text is still here. Try again before leaving."
      );
      throw failure;
    }
  };
  return {
    ready: !!state,
    error,
    initialDraft: state?.drafts[id] ?? "",
    replyId: state?.replies[id] ?? null,
    saveReply: (target: string | null) =>
      attempt(() => {
        if (!actor) throw Error("No account");
        return chatLocalStore.saveReply(actor, id, target);
      }),
    pending: state?.outbox.filter((r) => r.conversation_id === id) ?? [],
    saveDraft: (body: string) => {
      if (actor)
        void attempt(() => saveChatDraft(actor, id, body)).catch(
          () => undefined
        );
    },
    enqueue: (body: string, replyTo?: string | null) =>
      attempt(() => {
        if (!actor) throw Error("No account");
        return queueChatMessage(actor, id, body, replyTo);
      }),
    enqueuePhoto: (
      body: string,
      photo: import("../attachment-domain").LocalPhoto,
      replyTo?: string | null
    ) =>
      attempt(() => {
        if (!actor) throw Error("No account");
        return queuePhotoMessage(actor, id, body, photo, replyTo);
      }),
    retry: (messageId: string) => {
      if (actor)
        void attempt(() => retryQueuedMessage(actor, messageId)).catch(
          () => undefined
        );
    },
    discard: (messageId: string) => {
      if (actor)
        void attempt(() => discardQueuedMessage(actor, messageId)).catch(
          () => undefined
        );
    }
  };
}
