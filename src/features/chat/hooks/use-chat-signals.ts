import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { AuthContext } from "@/features/auth/auth-provider";
import type { ChatMessage } from "../domain";
import {
  acknowledgeDeliveries,
  subscribeToTyping
} from "../services/chat.service";

/** Acknowledge only messages actually fetched by this foreground recipient. */
export function useChatDeliveries(messages: ChatMessage[], revision: number) {
  const { user } = useContext(AuthContext);
  const actor = user?.id;
  useEffect(() => {
    if (!actor) return;
    let cancelled = false;
    const update = async () => {
      if (AppState.currentState !== "active") return;
      const ids = [
        ...new Set(
          messages
            .filter((m) => m.sender_id !== actor && !m.delivered_at)
            .map((m) => m.id)
        )
      ];
      for (let i = 0; i < ids.length && !cancelled; i += 100) {
        if (AppState.currentState !== "active") break;
        try {
          await acknowledgeDeliveries(ids.slice(i, i + 100));
        } catch {
          break;
        } // Foreground refresh/poll retries; never interrupt composing.
      }
    };
    void update();
    const listener = AppState.addEventListener("change", () => void update());
    return () => {
      cancelled = true;
      listener.remove();
    };
  }, [actor, messages, revision]);
}

export function useConversationTyping(
  id: string,
  peer: string | undefined,
  focused: boolean,
  revision = 0
) {
  const { user, session } = useContext(AuthContext);
  const actor = user?.id;
  const token = session?.access_token;
  const [typing, setTyping] = useState(false);
  const transport = useRef<ReturnType<typeof subscribeToTyping> | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const last = useRef(0);
  const sent = useRef(false);
  const onTypingChange = useCallback((hasText: boolean) => {
    clearTimeout(idle.current);
    if (!transport.current) return;
    if (!hasText) {
      if (sent.current) transport.current.setTyping(false);
      sent.current = false;
      return;
    }
    if (!sent.current || Date.now() - last.current >= 1500) {
      transport.current.setTyping(true);
      sent.current = true;
      last.current = Date.now();
    }
    idle.current = setTimeout(() => {
      transport.current?.setTyping(false);
      sent.current = false;
    }, 2500);
  }, []);
  useEffect(() => {
    if (!actor || !token || !peer || !focused) return;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      clearTimeout(idle.current);
      clearTimeout(expiry);
      transport.current?.stop();
      transport.current = null;
      sent.current = false;
      setTyping(false);
    };
    const start = () => {
      stop();
      if (AppState.currentState !== "active") return;
      transport.current = subscribeToTyping(id, actor, peer, token, (value) => {
        clearTimeout(expiry);
        setTyping(value);
        if (value) expiry = setTimeout(() => setTyping(false), 5000);
      });
    };
    start();
    const listener = AppState.addEventListener("change", (state) =>
      state === "active" ? start() : stop()
    );
    return () => {
      listener.remove();
      stop();
    };
  }, [id, actor, token, peer, focused, revision]);
  return { typing, onTypingChange };
}
