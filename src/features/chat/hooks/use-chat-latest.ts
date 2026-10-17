import { useEffect, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import type { ChatMessage } from "../domain";
import {
  advanceLatestMessages,
  type LatestMessageState
} from "../latest-message-state";

export function useChatLatest(
  messages: ChatMessage[],
  actorId: string,
  loading: boolean,
  searching: boolean
) {
  const [away, setAway] = useState(false);
  const [count, setCount] = useState(0);
  const arrivals = useRef<LatestMessageState>({ through: null, newIds: [] });
  useEffect(() => {
    if (loading && !messages.length) return;
    arrivals.current = advanceLatestMessages(
      arrivals.current,
      messages,
      actorId,
      away && !searching
    );
    setCount(arrivals.current.newIds.length);
  }, [messages, actorId, away, loading, searching]);
  useEffect(() => {
    // Search uses a separate list which remounts at the latest end on exit.
    setAway(false);
  }, [searching]);
  const reset = () => {
    arrivals.current = { ...arrivals.current, newIds: [] };
    setCount(0);
    setAway(false);
  };
  return {
    away,
    count,
    reset,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!searching) setAway(event.nativeEvent.contentOffset.y > 80);
    }
  };
}
